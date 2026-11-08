import { NextResponse } from "next/server";
import { loginStaff } from "@/lib/staff";
import { authConfigured, setSessionCookie } from "@/lib/session";
import { tenantFromSlug } from "@/lib/tenant-guard";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Teachers of an institution sign in with their email and password.
export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ success: false, error: "AUTH_NOT_CONFIGURED", message: "Sign-in is not set up yet. Ask the administrator." }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const t = await tenantFromSlug(body?.tenant);
    if (!t.ok) return t.response;
    const tid = t.tenant.id;
    const result = await loginStaff(tid, String(body?.email || ""), String(body?.password || ""));
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.code, message: result.message }, { status: result.code === "LOCKED" ? 429 : 401 });
    }
    const s = result.staff;
    const res = NextResponse.json({
      success: true,
      user: { id: s.id, fullName: s.fullName, email: s.email, assignedRole: "director", isAdmin: true, owner: s.role === "owner", createdAt: s.createdAt },
    });
    setSessionCookie(res, { kind: "teacher", tid, id: s.id, name: s.fullName, role: "director" });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
