import { NextResponse } from "next/server";
import { chooseSessionRole, STATION_ROLE_IDS } from "@/lib/access";
import { getActiveSession } from "@/lib/store";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// A student confirms the station they will act as for the whole class session.
// Once saved it cannot be changed here; the teacher starts a new session (or unlocks the student).
export async function POST(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  if (guard.user.kind !== "student") {
    return NextResponse.json({ success: false, error: "NOT_ALLOWED", message: "Teachers can use any station and do not need to choose." }, { status: 400 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const role = String(body?.role || "");
    if (!STATION_ROLE_IDS.includes(role)) {
      return NextResponse.json({ success: false, error: "BAD_ROLE", message: "Choose one of the working stations." }, { status: 400 });
    }
    const session = await getActiveSession(tid);
    const result = await chooseSessionRole(tid, session.id, guard.user.id, role);
    return NextResponse.json({ success: true, role: result.role, alreadyChosen: result.alreadyChosen });
  } catch (err) {
    return errorResponse(err);
  }
}
