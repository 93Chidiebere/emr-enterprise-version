import { NextResponse } from "next/server";
import { getPatient, savePatient } from "@/lib/store";
import { studentAccess, studentCanRead, studentCanWrite } from "@/lib/access";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/session";
import type { Patient } from "@/types/emr";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const forbidden = (message: string) =>
  NextResponse.json({ success: false, error: "NOT_ALLOWED", message }, { status: 403 });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    if (guard.user.kind === "student") {
      const access = await studentAccess(tid, guard.user);
      if (!(await studentCanRead(tid, access, params.id))) return forbidden("You do not have access to this patient.");
    }
    const patient = await getPatient(tid, params.id);
    if (!patient) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: patient });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  const tid = guard.tid;
  try {
    const updated: Patient = await request.json();
    if (!updated || updated.id !== params.id) {
      return NextResponse.json({ success: false, error: "Patient id mismatch" }, { status: 400 });
    }
    if (guard.user.kind === "student") {
      const access = await studentAccess(tid, guard.user);
      if (!access.role) {
        return NextResponse.json({ success: false, error: "ROLE_NOT_CHOSEN", message: "Choose your station for this session first." }, { status: 409 });
      }
      if (!(await studentCanWrite(tid, access, params.id))) {
        return forbidden("This patient is not at your station, so you can only view the record.");
      }
    }
    const saved = await savePatient(tid, updated);
    return NextResponse.json({ success: true, data: saved });
  } catch (err) {
    return errorResponse(err);
  }
}
