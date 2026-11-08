import { NextResponse } from "next/server";
import { removeStudent, resetStudentPassword, validatePassword } from "@/lib/users";
import { requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Teacher sets a new password for a student who forgot theirs (also unlocks the account).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || "");
    const problem = validatePassword(password);
    if (problem) return NextResponse.json({ success: false, error: "BAD_PASSWORD", message: problem }, { status: 400 });
    const ok = await resetStudentPassword(tid, params.id, password);
    if (!ok) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}

// Remove a student account (their past records stay in the reports).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const ok = await removeStudent(tid, params.id);
    if (!ok) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
