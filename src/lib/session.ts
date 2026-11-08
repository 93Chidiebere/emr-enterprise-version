import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "./db";
import { getTenantById } from "./tenants";

/**
 * Server-side sign-in sessions for students, teachers (institution staff) and the platform owner.
 *  AUTH_SECRET             REQUIRED. A long random text used to sign the login cookie.
 *  PLATFORM_ADMIN_PASSWORD the platform owner's password (for the /platform console).
 * The cookie is httpOnly and signed; it names the institution (tid) the person belongs to, so every
 * database call afterwards is limited to that institution's private tables.
 */

export const SESSION_COOKIE = "cf_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export interface SessionUser {
  kind: "student" | "teacher" | "platform";
  /** institution id ("-" for the platform owner) */
  tid: string;
  id: string;
  name: string;
  role: string; // station role id (teachers are "director")
}

export const authConfigured = () => (process.env.AUTH_SECRET || "").length >= 16;
export const platformAdminConfigured = () => (process.env.PLATFORM_ADMIN_PASSWORD || "").length >= 8;

const secret = () => process.env.AUTH_SECRET || "";
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const hmac = (data: string) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function platformPasswordMatches(input: string): boolean {
  const expected = process.env.PLATFORM_ADMIN_PASSWORD || "";
  if (expected.length < 8) return false;
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function createToken(user: SessionUser): string {
  const payload = b64(JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 }));
  return `${payload}.${hmac(payload)}`;
}

function verifyToken(token: string | undefined): SessionUser | null {
  if (!token || !authConfigured()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(hmac(payload));
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const d = JSON.parse(unb64(payload)) as Partial<SessionUser> & { exp?: number };
    const kindOk = d.kind === "student" || d.kind === "teacher" || d.kind === "platform";
    if (!d.exp || d.exp < Date.now() || !d.id || !d.name || !d.tid || !kindOk) return null;
    return { kind: d.kind as SessionUser["kind"], tid: String(d.tid), id: String(d.id), name: String(d.name), role: String(d.role || "") };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, user: SessionUser) {
  res.cookies.set(SESSION_COOKIE, createToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function sessionFromCookie(): SessionUser | null {
  return verifyToken(cookies().get(SESSION_COOKIE)?.value);
}

const fail = (status: number, error: string, message: string) => ({
  ok: false as const,
  response: NextResponse.json({ success: false, error, message }, { status }),
});

const notConfigured = () =>
  fail(503, "AUTH_NOT_CONFIGURED", "The administrator must set AUTH_SECRET in the Vercel environment variables.");

/** The institution must exist and be active. */
async function checkTenant(tid: string) {
  const tenant = await getTenantById(tid);
  if (!tenant) return fail(401, "LOGIN_REQUIRED", "This institution no longer exists.");
  if (tenant.status !== "active") return fail(403, "TENANT_SUSPENDED", "This institution's account is suspended. Please contact the platform owner.");
  return null;
}

export type UserGuard = { ok: true; user: SessionUser; tid: string } | { ok: false; response: NextResponse };

/** Any signed-in student or teacher of an active institution. Accounts are re-checked in the database so removed people lose access at once. */
export async function requireUser(): Promise<UserGuard> {
  if (!authConfigured()) return notConfigured();
  const user = sessionFromCookie();
  if (!user || user.kind === "platform") return fail(401, "LOGIN_REQUIRED", "Please sign in.");
  const bad = await checkTenant(user.tid);
  if (bad) return bad;
  const c = await db(user.tid);
  const table = user.kind === "student" ? "users" : "staff";
  const rs = await c.execute({ sql: `SELECT 1 AS ok FROM ${table} WHERE id = ?`, args: [user.id] });
  if (rs.rows.length === 0) return fail(401, "LOGIN_REQUIRED", "This account no longer exists.");
  return { ok: true, user, tid: user.tid };
}

export type TeacherGuard = { ok: true; name: string; tid: string; staffId: string; owner: boolean } | { ok: false; response: NextResponse };

/** Teachers (institution staff) only. */
export async function requireTeacher(): Promise<TeacherGuard> {
  if (!authConfigured()) return notConfigured();
  const user = sessionFromCookie();
  if (!user || user.kind !== "teacher") return fail(401, "TEACHER_LOGIN_REQUIRED", "Sign in as a teacher to use this.");
  const bad = await checkTenant(user.tid);
  if (bad) return bad;
  const c = await db(user.tid);
  const rs = await c.execute({ sql: "SELECT role FROM staff WHERE id = ?", args: [user.id] });
  if (rs.rows.length === 0) return fail(401, "TEACHER_LOGIN_REQUIRED", "This teacher account no longer exists.");
  const owner = String((rs.rows[0] as unknown as Record<string, unknown>).role) === "owner";
  return { ok: true, name: user.name, tid: user.tid, staffId: user.id, owner };
}

/** Institution owner only (can change branding and manage teachers). */
export async function requireOwner(): Promise<TeacherGuard> {
  const g = await requireTeacher();
  if (!g.ok) return g;
  if (!g.owner) return fail(403, "OWNER_ONLY", "Only the institution owner can do this.");
  return g;
}

/** The platform owner (you). */
export function requirePlatform(): { ok: true } | { ok: false; response: NextResponse } {
  if (!authConfigured()) return notConfigured();
  if (!platformAdminConfigured()) return fail(503, "PLATFORM_NOT_CONFIGURED", "Set PLATFORM_ADMIN_PASSWORD (at least 8 characters) in the environment variables.");
  const user = sessionFromCookie();
  if (!user || user.kind !== "platform") return fail(401, "PLATFORM_LOGIN_REQUIRED", "Sign in to the platform console.");
  return { ok: true };
}
