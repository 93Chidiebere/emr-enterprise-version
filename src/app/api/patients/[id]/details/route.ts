import { NextResponse } from "next/server";
import { updatePatientDetails, type PatientDetails } from "@/lib/store";
import { studentAccess, studentCanRead, stationDepartments } from "@/lib/access";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { actorKey } from "@/lib/actors";
import { ageFromDateOfBirth } from "@/lib/patient-age";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// Front Desk corrections: fill in a missing phone number, fix a spelling, and so on.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    if (guard.user.kind === "student") {
      const access = await studentAccess(tid, guard.user);
      if (access.role !== "receptionist") {
        return NextResponse.json({ success: false, error: "NOT_ALLOWED", message: "Only the Front Desk can edit patient details." }, { status: 403 });
      }
      // patients waiting at the Front Desk / discharged, or patients this student enrolled or handled
      let allowed = await studentCanRead(tid, access, params.id);
      if (allowed) {
        // reading is not enough: the patient must be at the desk or one this student personally registered
        const c = await db(tid);
        const rs = await c.execute({ sql: "SELECT current_department, registered_by FROM patients WHERE id = ?", args: [params.id] });
        if (rs.rows.length) {
          const row = rs.rows[0] as unknown as Record<string, unknown>;
          const atDesk = (stationDepartments("receptionist") as string[]).includes(String(row.current_department));
          const mine = access.keys.includes(actorKey(String(row.registered_by || "")));
          allowed = atDesk || mine;
        } else allowed = false;
      }
      if (!allowed) {
        return NextResponse.json({ success: false, error: "NOT_ALLOWED", message: "You can only edit patients you enrolled or those waiting at the Front Desk." }, { status: 403 });
      }
    }

    const b = await request.json().catch(() => ({}));
    const kin = (b?.nextOfKin || {}) as Record<string, unknown>;
    const dateOfBirth = clip(b?.dateOfBirth, 20);
    const age = ageFromDateOfBirth(dateOfBirth);
    if (age === null) {
      return NextResponse.json({ success: false, error: "BAD_DATE_OF_BIRTH", message: "Enter a valid date of birth that is not in the future." }, { status: 400 });
    }
    const details: PatientDetails = {
      fullName: clip(b?.fullName, 120),
      age,
      gender: ["Female", "Male", "Other"].includes(String(b?.gender)) ? String(b.gender) : "Other",
      dateOfBirth,
      phoneNumber: clip(b?.phoneNumber, 30),
      address: clip(b?.address, 250),
      paymentType: clip(b?.paymentType, 60) || "Out-of-Pocket / Cash",
      nextOfKin: { name: clip(kin.name, 120), relation: clip(kin.relation, 60), phone: clip(kin.phone, 30) },
    };
    if (!details.fullName) {
      return NextResponse.json({ success: false, error: "BAD_REQUEST", message: "The patient's name cannot be empty." }, { status: 400 });
    }
    if (!details.nextOfKin.name || !details.nextOfKin.relation || details.nextOfKin.phone.replace(/\D/g, "").length < 7) {
      return NextResponse.json(
        { success: false, error: "BAD_REQUEST", message: "Emergency contact is compulsory: name, relationship and a valid phone number." },
        { status: 400 }
      );
    }

    const updated = await updatePatientDetails(tid, params.id, details);
    if (!updated) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
