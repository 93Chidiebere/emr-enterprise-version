import { NextResponse } from "next/server";
import { createPatient, getActiveSession, getRev, listPatientsForReport, listPatientsByIds } from "@/lib/store";
import { studentAccess, visiblePatientIds } from "@/lib/access";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/session";
import type { Patient } from "@/types/emr";
import { ageFromDateOfBirth } from "@/lib/patient-age";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

// Queues persist across sessions. Teachers and students receive the full patient list;
// station views filter it by current location and writes remain station-restricted.
export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const session = await getActiveSession(tid);
    const { rev } = await getRev(tid);
    const base = { success: true, rev, session: { id: session.id, name: session.name }, storage: "turso", ephemeral: false };

    if (guard.user.kind === "teacher") {
      const patients = await listPatientsForReport(tid, "all");
      return NextResponse.json({ ...base, count: patients.length, data: patients, myRole: null, needsRole: false }, { headers: noStore });
    }

    const access = await studentAccess(tid, guard.user);
    if (!access.role) {
      // the student has not chosen a station for this class session yet
      return NextResponse.json({ ...base, count: 0, data: [], myRole: null, needsRole: true }, { headers: noStore });
    }
    const ids = (await visiblePatientIds(tid, access)).map((p) => p.id);
    const patients = await listPatientsByIds(tid, ids);
    return NextResponse.json({ ...base, count: patients.length, data: patients, myRole: access.role, needsRole: false }, { headers: noStore });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    if (guard.user.kind === "student") {
      const access = await studentAccess(tid, guard.user);
      if (!access.role) {
        return NextResponse.json({ success: false, error: "ROLE_NOT_CHOSEN", message: "Choose your station for this session first." }, { status: 409 });
      }
      if (access.role !== "receptionist") {
        return NextResponse.json(
          { success: false, error: "NOT_ALLOWED", message: "Only the Front Desk can enroll new patients." },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    if (!body.fullName || !String(body.fullName).trim()) {
      return NextResponse.json({ success: false, error: "Full name is required" }, { status: 400 });
    }

    const dateOfBirth = String(body.dateOfBirth || "");
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age === null) {
      return NextResponse.json({ success: false, error: "BAD_DATE_OF_BIRTH", message: "Enter a valid date of birth that is not in the future." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const startDept = body.currentDepartment || "TRIAGE";
    const registeredBy = body.registeredBy || "Staff Officer (REC)";

    const created = await createPatient(tid, 
      (hospitalNumber, id): Patient => ({
        id,
        hospitalNumber,
        fullName: String(body.fullName).trim(),
        age,
        gender: body.gender || "Other",
        dateOfBirth,
        phoneNumber: body.phoneNumber || "",
        address: body.address || "",
        nextOfKin: body.nextOfKin || { name: "", relation: "", phone: "" },
        paymentType: body.paymentType || "Out-of-Pocket / Cash",
        registeredAt: now,
        registeredBy,
        currentDepartment: startDept,
        lastUpdated: now,
        status: "Active",
        vitalsHistory: [],
        doctorNotes: [],
        labOrders: [],
        radiologyOrders: [],
        medications: [],
        routingHistory: [
          {
            id: `rt-${Date.now()}`,
            timestamp: now,
            fromDepartment: "RECEPTION",
            toDepartment: startDept,
            authorizedBy: registeredBy,
            reason: body.initialReason || "Patient enrolled at Front Desk and routed.",
          },
        ],
      })
    );

    return NextResponse.json({ success: true, data: created }, { status: 201, headers: noStore });
  } catch (err) {
    return errorResponse(err);
  }
}
