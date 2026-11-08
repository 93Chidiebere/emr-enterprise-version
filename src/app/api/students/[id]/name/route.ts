import { NextResponse } from "next/server";
import { renameStudent } from "@/lib/users";
import { requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 30;

// A teacher corrects a student's name (for example a misspelling the student cannot fix themselves).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const body = await request.json().catch(() => ({}));
    const result = await renameStudent(tid, params.id, String(body?.name || ""));
    if (!result.ok) {
      const status = result.code === "NAME_TAKEN" ? 409 : result.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ success: false, error: result.code, message: result.message }, { status });
    }
    return NextResponse.json({ success: true, recordsUpdated: result.recordsUpdated, name: result.user.fullName });
  } catch (err) {
    return errorResponse(err);
  }
}
