import { NextResponse } from "next/server";
import { EXPORT_TABLES, exportCsv, getActiveSession, listPatientsForReport, listSessions } from "@/lib/store";
import { requireTeacher } from "@/lib/session";
import { exportStudentsCsv } from "@/lib/users";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// GET /api/reports/export?table=patients|vitals|consultations|lab_orders|radiology_orders|medications|routing_events|backup&session=<id|all>
export async function GET(request: Request) {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const params = new URL(request.url).searchParams;
    const table = params.get("table") || "patients";
    const active = await getActiveSession(tid);
    const sessions = await listSessions(tid);
    const requested = params.get("session") || active.id;
    const scope = requested === "all" ? "all" : sessions.find((s) => s.id === requested)?.id || active.id;
    const stamp = new Date().toISOString().slice(0, 10);

    if (table === "backup") {
      const patients = await listPatientsForReport(tid, scope);
      const body = JSON.stringify({ exportedAt: new Date().toISOString(), scope, sessions, patients }, null, 2);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="trinity-backup-${stamp}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (table === "students") {
      return new NextResponse(await exportStudentsCsv(tid), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="student_accounts-${stamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (!EXPORT_TABLES[table]) {
      return NextResponse.json({ success: false, error: "Unknown table" }, { status: 400 });
    }
    const out = await exportCsv(tid, table, scope);
    if (!out) return NextResponse.json({ success: false, error: "Unknown table" }, { status: 400 });
    return new NextResponse(out.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${out.filename}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
