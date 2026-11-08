import { NextResponse } from "next/server";
import { renameStudent } from "@/lib/users";
import { requireUser, setSessionCookie } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 30; // updating many records can take a few seconds

// A student changes their OWN name. They must confirm with their current password.
export async function PATCH(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  if (guard.user.kind !== "student") {
    return NextResponse.json({ success: false, error: "NOT_ALLOWED", message: "Only student accounts can be renamed here." }, { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const result = await renameStudent(tid, guard.user.id, String(body?.name || ""), String(body?.password ?? ""));
    if (!result.ok) {
      const status = result.code === "NAME_TAKEN" ? 409 : result.code === "BAD_PASSWORD" ? 403 : result.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ success: false, error: result.code, message: result.message }, { status });
    }
    const res = NextResponse.json({
      success: true,
      recordsUpdated: result.recordsUpdated,
      user: { id: result.user.id, fullName: result.user.fullName, assignedRole: result.user.role, createdAt: result.user.createdAt },
    });
    // the sign-in cookie carries the name, so issue a fresh one
    setSessionCookie(res, { kind: "student", tid, id: result.user.id, name: result.user.fullName, role: result.user.role });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
