import { NextResponse } from "next/server";
import { changeOwnStaffPassword } from "@/lib/staff";
import { requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// A teacher changes their own password.
export async function PATCH(request: Request) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  try {
    const b = await request.json().catch(() => ({}));
    const r = await changeOwnStaffPassword(guard.tid, guard.staffId, String(b?.current || ""), String(b?.next || ""));
    return r.ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, message: r.message }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}
