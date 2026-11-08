import { NextResponse } from "next/server";
import { registerStudent } from "@/lib/users";
import { authConfigured, setSessionCookie } from "@/lib/session";
import { tenantFromSlug } from "@/lib/tenant-guard";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ success: false, error: "AUTH_NOT_CONFIGURED", message: "Sign-in is not set up yet. Ask the administrator." }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const t = await tenantFromSlug(body?.tenant);
    if (!t.ok) return t.response;
    const tid = t.tenant.id;
    const result = await registerStudent(tid, String(body?.name || ""), String(body?.role || ""), String(body?.password || ""), String(body?.email || ""));
    if (!result.ok) {
      const status = result.code === "NAME_TAKEN" ? 409 : 400;
      return NextResponse.json({ success: false, error: result.code, message: result.message }, { status });
    }
    const res = NextResponse.json({
      success: true,
      user: { id: result.user.id, fullName: result.user.fullName, assignedRole: result.user.role, createdAt: result.user.createdAt, email: result.user.email ?? null },
    });
    setSessionCookie(res, { kind: "student", tid, id: result.user.id, name: result.user.fullName, role: result.user.role });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
