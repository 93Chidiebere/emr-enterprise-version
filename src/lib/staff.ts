import { db } from "./db";
import { hashPassword, verifyPassword } from "./passwords";

export interface StaffRecord {
  id: string;
  fullName: string;
  email: string;
  role: "owner" | "teacher";
  createdAt: string;
  lastLoginAt: string | null;
  locked: boolean;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const cleanStaffEmail = (raw: string): string | null => {
  const e = (raw || "").trim();
  return e.length >= 5 && e.length <= 120 && EMAIL_RE.test(e) ? e : null;
};
export const staffEmailKey = (e: string) => e.trim().toLowerCase();

export const MAX_FAILED = 5;
const LOCK_MINUTES = 5;

export function validateStaffPassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 100) return "Password is too long.";
  return null;
}

function toStaff(r: Row): StaffRecord {
  return {
    id: str(r.id),
    fullName: str(r.full_name),
    email: str(r.email),
    role: str(r.role) === "owner" ? "owner" : "teacher",
    createdAt: str(r.created_at),
    lastLoginAt: r.last_login_at ? str(r.last_login_at) : null,
    locked: r.locked_until ? new Date(str(r.locked_until)).getTime() > Date.now() : false,
  };
}

export type StaffCreateResult =
  | { ok: true; staff: StaffRecord }
  | { ok: false; code: "BAD_NAME" | "BAD_EMAIL" | "BAD_PASSWORD" | "EMAIL_TAKEN"; message: string };

export async function createStaff(
  tid: string,
  input: { fullName: string; email: string; password: string; role: "owner" | "teacher" }
): Promise<StaffCreateResult> {
  const name = input.fullName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return { ok: false, code: "BAD_NAME", message: "Enter the full name (2 to 80 characters)." };
  const email = cleanStaffEmail(input.email);
  if (!email) return { ok: false, code: "BAD_EMAIL", message: "Enter a valid email address." };
  const pw = validateStaffPassword(input.password);
  if (pw) return { ok: false, code: "BAD_PASSWORD", message: pw };

  const c = await db(tid);
  const used = await c.execute({ sql: "SELECT 1 AS x FROM staff WHERE email_key = ?", args: [staffEmailKey(email)] });
  if (used.rows.length) return { ok: false, code: "EMAIL_TAKEN", message: "A teacher with that email already exists." };

  const id = `stf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created = new Date().toISOString();
  await c.execute({
    sql: "INSERT INTO staff (id, full_name, email, email_key, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, name, email, staffEmailKey(email), input.role, await hashPassword(input.password), created],
  });
  return { ok: true, staff: { id, fullName: name, email, role: input.role, createdAt: created, lastLoginAt: null, locked: false } };
}

export type StaffLoginResult =
  | { ok: true; staff: StaffRecord }
  | { ok: false; code: "BAD_LOGIN" | "LOCKED"; message: string };

export async function loginStaff(tid: string, rawEmail: string, password: string): Promise<StaffLoginResult> {
  const c = await db(tid);
  const rs = await c.execute({
    sql: "SELECT id, full_name, email, role, password_hash, created_at, last_login_at, failed_count, locked_until FROM staff WHERE email_key = ?",
    args: [staffEmailKey(rawEmail)],
  });
  const bad: StaffLoginResult = { ok: false, code: "BAD_LOGIN", message: "Incorrect email or password." };
  if (!rs.rows.length) {
    await verifyPassword(password, "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA").catch(() => false); // similar timing
    return bad;
  }
  const row = rs.rows[0] as unknown as Row;
  const lockedUntil = row.locked_until ? new Date(str(row.locked_until)).getTime() : 0;
  if (lockedUntil > Date.now()) {
    const mins = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
    return { ok: false, code: "LOCKED", message: `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }
  if (!(await verifyPassword(password, str(row.password_hash)))) {
    const failed = Number(row.failed_count) + 1;
    if (failed >= MAX_FAILED) {
      await c.execute({ sql: "UPDATE staff SET failed_count = 0, locked_until = ? WHERE id = ?", args: [new Date(Date.now() + LOCK_MINUTES * 60000).toISOString(), str(row.id)] });
    } else {
      await c.execute({ sql: "UPDATE staff SET failed_count = ? WHERE id = ?", args: [failed, str(row.id)] });
    }
    return bad;
  }
  const now = new Date().toISOString();
  await c.execute({ sql: "UPDATE staff SET failed_count = 0, locked_until = NULL, last_login_at = ? WHERE id = ?", args: [now, str(row.id)] });
  return { ok: true, staff: { ...toStaff(row), lastLoginAt: now } };
}

export async function listStaff(tid: string): Promise<StaffRecord[]> {
  const c = await db(tid);
  const rs = await c.execute("SELECT id, full_name, email, role, created_at, last_login_at, locked_until FROM staff ORDER BY created_at");
  return rs.rows.map((r) => toStaff(r as unknown as Row));
}

export async function getStaff(tid: string, id: string): Promise<StaffRecord | null> {
  const c = await db(tid);
  const rs = await c.execute({ sql: "SELECT id, full_name, email, role, created_at, last_login_at, locked_until FROM staff WHERE id = ?", args: [id] });
  return rs.rows.length ? toStaff(rs.rows[0] as unknown as Row) : null;
}

export async function resetStaffPassword(tid: string, id: string, newPassword: string): Promise<boolean> {
  const c = await db(tid);
  const rs = await c.execute({
    sql: "UPDATE staff SET password_hash = ?, failed_count = 0, locked_until = NULL WHERE id = ?",
    args: [await hashPassword(newPassword), id],
  });
  return rs.rowsAffected > 0;
}

/** A teacher changes their OWN password (must know the current one). */
export async function changeOwnStaffPassword(tid: string, id: string, current: string, next: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const c = await db(tid);
  const rs = await c.execute({ sql: "SELECT password_hash FROM staff WHERE id = ?", args: [id] });
  if (!rs.rows.length) return { ok: false, message: "This account no longer exists." };
  if (!(await verifyPassword(current, str((rs.rows[0] as unknown as Row).password_hash)))) return { ok: false, message: "Your current password is incorrect." };
  const problem = validateStaffPassword(next);
  if (problem) return { ok: false, message: problem };
  await resetStaffPassword(tid, id, next);
  return { ok: true };
}

/** The owner cannot be removed. */
export async function removeStaff(tid: string, id: string): Promise<boolean> {
  const c = await db(tid);
  const rs = await c.execute({ sql: "DELETE FROM staff WHERE id = ? AND role <> 'owner'", args: [id] });
  return rs.rowsAffected > 0;
}
