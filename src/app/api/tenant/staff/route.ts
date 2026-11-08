import { NextResponse } from "next/server";
import { createStaff, listStaff } from "@/lib/staff";
import { requireOwner, requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ success: true, data: await listStaff(guard.tid) });
  } catch (err) {
    return errorResponse(err);
  }
}

// The owner adds another teacher (and gives them a first password to change).
export async function POST(request: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;
  try {
    const b = await request.json().catch(() => ({}));
    const r = await createStaff(guard.tid, { fullName: String(b?.fullName || ""), email: String(b?.email || ""), password: String(b?.password || ""), role: "teacher" });
    if (!r.ok) return NextResponse.json({ success: false, error: r.code, message: r.message }, { status: r.code === "EMAIL_TAKEN" ? 409 : 400 });
    return NextResponse.json({ success: true, data: r.staff }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
