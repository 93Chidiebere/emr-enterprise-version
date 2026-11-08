import { NextResponse } from "next/server";
import { removeStaff, resetStaffPassword, validateStaffPassword } from "@/lib/staff";
import { requireOwner } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Owner sets a new password for a teacher who forgot theirs.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;
  try {
    const b = await request.json().catch(() => ({}));
    const problem = validateStaffPassword(String(b?.password || ""));
    if (problem) return NextResponse.json({ success: false, message: problem }, { status: 400 });
    const ok = await resetStaffPassword(guard.tid, params.id, String(b.password));
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;
  try {
    const ok = await removeStaff(guard.tid, params.id);
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, message: "The owner account cannot be removed." }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}
