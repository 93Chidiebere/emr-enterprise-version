import { NextResponse } from "next/server";
import { listSessions, startNewSession } from "@/lib/store";
import { requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const sessions = await listSessions(tid);
    return NextResponse.json({ success: true, data: sessions }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}

// Close the current class session (data is kept) and open a new empty one.
export async function POST(request: Request) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const body = await request.json().catch(() => ({}));
    const session = await startNewSession(tid, typeof body?.name === "string" ? body.name : undefined, guard.name);
    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
