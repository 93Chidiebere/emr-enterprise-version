import { NextResponse } from "next/server";
import { clearSessionRole } from "@/lib/access";
import { getActiveSession } from "@/lib/store";
import { requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Teacher lets ONE student pick their station again (for example after a wrong click).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const session = await getActiveSession(tid);
    await clearSessionRole(tid, session.id, params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
