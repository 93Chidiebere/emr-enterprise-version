import { NextResponse } from "next/server";
import { getActiveSession, listPatientsForReport, listSessions } from "@/lib/store";
import { buildSummary } from "@/lib/reports";
import { loadNameResolver } from "@/lib/users";
import { requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const active = await getActiveSession(tid);
    const requested = new URL(request.url).searchParams.get("session") || active.id;
    const sessions = await listSessions(tid);
    const scope = requested === "all" ? "all" : sessions.find((s) => s.id === requested)?.id || active.id;
    const patients = await listPatientsForReport(tid, scope);
    return NextResponse.json(
      {
        success: true,
        scope,
        activeSessionId: active.id,
        sessions,
        summary: buildSummary(patients, await loadNameResolver(tid)),
        patients: patients.map((p) => ({
          hospitalNumber: p.hospitalNumber,
          fullName: p.fullName,
          age: p.age,
          gender: p.gender,
          currentDepartment: p.currentDepartment,
          status: p.status,
          registeredBy: p.registeredBy,
          registeredAt: p.registeredAt,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
