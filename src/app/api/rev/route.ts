import { NextResponse } from "next/server";
import { getRev } from "@/lib/store";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Cheap "has anything changed?" check used by every open screen (reads one row).
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const { rev, sessionId } = await getRev(tid);
    return NextResponse.json({ success: true, rev, sessionId }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
