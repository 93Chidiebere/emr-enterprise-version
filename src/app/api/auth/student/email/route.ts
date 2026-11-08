import { NextResponse } from "next/server";
import { updateStudentEmail } from "@/lib/users";
import { requireUser } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  if (guard.user.kind !== "student") return NextResponse.json({ success: false, message: "Only students have a contact email here." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({}));
    const result = await updateStudentEmail(tid, guard.user.id, String(body?.email || ""));
    if (!result.ok) return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    return NextResponse.json({ success: true, email: result.email });
  } catch (err) {
    return errorResponse(err);
  }
}
