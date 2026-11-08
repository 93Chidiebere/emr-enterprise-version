import type { InStatement } from "@libsql/client/web";
import { db } from "./db";
import { toCsv } from "./csv";
import type { Patient } from "@/types/emr";
import { collectActorKeys, renameActorInPatient } from "./actors";
import { getTenantById } from "./tenants";

export class SessionClosedError extends Error {
  constructor() {
    super("SESSION_CLOSED");
    this.name = "SessionClosedError";
  }
}

export interface SessionInfo {
  id: string;
  name: string;
  status: "active" | "archived";
  createdAt: string;
  createdBy: string | null;
  archivedAt: string | null;
  patientCount?: number;
}

const nowIso = () => new Date().toISOString();
const BUMP_REV: InStatement = "UPDATE meta SET value = value + 1 WHERE key = 'rev'";

type Row = Record<string, unknown>;
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

function toSession(r: Row): SessionInfo {
  return {
    id: str(r.id),
    name: str(r.name),
    status: str(r.status) === "archived" ? "archived" : "active",
    createdAt: str(r.created_at),
    createdBy: r.created_by === null || r.created_by === undefined ? null : str(r.created_by),
    archivedAt: r.archived_at === null || r.archived_at === undefined ? null : str(r.archived_at),
    patientCount: r.patient_count === undefined ? undefined : Number(r.patient_count),
  };
}

export function formatHospitalNumber(seq: number, prefix = "REC"): string {
  return `${prefix}-${new Date().getFullYear()}-${String(seq).padStart(5, "0")}`;
}

/* ---------------------------- sessions ---------------------------- */

export async function getActiveSession(tid: string): Promise<SessionInfo> {
  const c = await db(tid);
  const rs = await c.execute(
    "SELECT id, name, status, created_at, created_by, archived_at FROM sessions WHERE status = 'active' ORDER BY created_at DESC LIMIT 1"
  );
  if (rs.rows.length > 0) return toSession(rs.rows[0] as unknown as Row);

  // Should never happen (schema seeds one), but recover instead of failing.
  const id = `ses-${Date.now()}`;
  const created = nowIso();
  await c.execute({
    sql: "INSERT INTO sessions (id, name, status, next_seq, created_at, created_by) VALUES (?, 'Class session 1', 'active', 1, ?, 'system')",
    args: [id, created],
  });
  return { id, name: "Class session 1", status: "active", createdAt: created, createdBy: "system", archivedAt: null };
}

export async function listSessions(tid: string): Promise<SessionInfo[]> {
  const c = await db(tid);
  const rs = await c.execute(
    `SELECT s.id, s.name, s.status, s.created_at, s.created_by, s.archived_at,
            (SELECT COUNT(*) FROM patients p WHERE p.session_id = s.id) AS patient_count
       FROM sessions s ORDER BY s.created_at DESC`
  );
  return rs.rows.map((r) => toSession(r as unknown as Row));
}

/** Archives the current class session and opens a new session without deleting or moving its data. */
export async function startNewSession(tid: string, name: string | undefined, createdBy: string): Promise<SessionInfo> {
  const c = await db(tid);
  const created = nowIso();
  const id = `ses-${Date.now()}`;
  const countRs = await c.execute("SELECT COUNT(*) AS n FROM sessions");
  const finalName = (name || "").trim().slice(0, 80) || `Class session ${Number((countRs.rows[0] as unknown as Row).n) + 1}`;

  await c.batch(
    [
      { sql: "UPDATE sessions SET status = 'archived', archived_at = ? WHERE status = 'active'", args: [created] },
      {
        sql: "INSERT INTO sessions (id, name, status, next_seq, created_at, created_by) VALUES (?, ?, 'active', 1, ?, ?)",
        args: [id, finalName, created, createdBy],
      },
      BUMP_REV,
    ],
    "write"
  );
  return { id, name: finalName, status: "active", createdAt: created, createdBy, archivedAt: null };
}

export async function getRev(tid: string): Promise<{ rev: number; sessionId: string }> {
  const c = await db(tid);
  const rs = await c.batch(
    [
      "SELECT value FROM meta WHERE key = 'rev'",
      "SELECT id FROM sessions WHERE status = 'active' ORDER BY created_at DESC LIMIT 1",
    ],
    "read"
  );
  const rev = rs[0].rows.length ? Number((rs[0].rows[0] as unknown as Row).value) : 0;
  const sessionId = rs[1].rows.length ? str((rs[1].rows[0] as unknown as Row).id) : "";
  return { rev, sessionId };
}

/* ---------------------------- patients ---------------------------- */

export async function listPatients(tid: string, sessionId: string): Promise<Patient[]> {
  const c = await db(tid);
  const rs = await c.execute({
    sql: "SELECT data FROM patients WHERE session_id = ? ORDER BY registered_at DESC",
    args: [sessionId],
  });
  const out: Patient[] = [];
  for (const r of rs.rows) {
    try {
      out.push(JSON.parse(str((r as unknown as Row).data)) as Patient);
    } catch {
      // skip a corrupted row instead of failing the whole list
    }
  }
  return out;
}

export async function getPatient(tid: string, id: string): Promise<Patient | undefined> {
  const c = await db(tid);
  const rs = await c.execute({ sql: "SELECT data FROM patients WHERE id = ?", args: [id] });
  if (!rs.rows.length) return undefined;
  return JSON.parse(str((rs.rows[0] as unknown as Row).data)) as Patient;
}

function patientStatements(p: Patient, sessionId: string): InStatement[] {
  const stmts: InStatement[] = [];

  stmts.push({
    sql: `INSERT INTO patients (id, session_id, hospital_number, full_name, age, gender, payment_type,
            current_department, status, registered_at, registered_by, last_updated,
            next_of_kin_name, next_of_kin_relation, next_of_kin_phone, data)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            hospital_number = excluded.hospital_number, full_name = excluded.full_name, age = excluded.age,
            gender = excluded.gender, payment_type = excluded.payment_type,
            current_department = excluded.current_department, status = excluded.status,
            registered_by = excluded.registered_by,
            last_updated = excluded.last_updated, next_of_kin_name = excluded.next_of_kin_name,
            next_of_kin_relation = excluded.next_of_kin_relation, next_of_kin_phone = excluded.next_of_kin_phone,
            data = excluded.data`,
    args: [
      p.id, sessionId, p.hospitalNumber, p.fullName, p.age ?? null, p.gender ?? null, p.paymentType ?? null,
      p.currentDepartment ?? null, p.status ?? null, p.registeredAt ?? null, p.registeredBy ?? null, p.lastUpdated ?? null,
      p.nextOfKin?.name ?? null, p.nextOfKin?.relation ?? null, p.nextOfKin?.phone ?? null,
      JSON.stringify(p),
    ],
  });

  // Rebuild the analysis tables for this patient
  for (const t of ["vitals", "consultations", "lab_orders", "radiology_orders", "medications", "routing_events"]) {
    stmts.push({ sql: `DELETE FROM ${t} WHERE patient_id = ?`, args: [p.id] });
  }

  for (const v of p.vitalsHistory || []) {
    stmts.push({
      sql: `INSERT OR REPLACE INTO vitals (id, patient_id, session_id, recorded_at, taken_by, systolic, diastolic, pulse,
              temperature, resp_rate, spo2, weight_kg, height_cm, bmi, urgency, chief_complaint, triage_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        v.id, p.id, sessionId, v.timestamp ?? null, v.takenBy ?? null, v.bloodPressureSystolic ?? null,
        v.bloodPressureDiastolic ?? null, v.pulseRate ?? null, v.temperature ?? null, v.respiratoryRate ?? null,
        v.spO2 ?? null, v.weightKg ?? null, v.heightCm ?? null, v.bmi ?? null, v.urgency ?? null,
        v.chiefComplaint ?? null, v.triageNotes ?? null,
      ],
    });
  }

  for (const n of p.doctorNotes || []) {
    stmts.push({
      sql: `INSERT OR REPLACE INTO consultations (id, patient_id, session_id, created_at, doctor_name, history, exam_findings,
              provisional_dx, provisional_icd10_code, provisional_icd10_desc,
              definitive_dx, definitive_icd10_code, definitive_icd10_desc, clinical_plan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        n.id, p.id, sessionId, n.timestamp ?? null, n.doctorName ?? null, n.historyOfPresentIllness ?? null,
        n.physicalExamFindings ?? null, n.provisionalDiagnosis ?? null, n.provisionalIcd10?.code ?? null,
        n.provisionalIcd10?.description ?? null, n.definitiveDiagnosis ?? null, n.definitiveIcd10?.code ?? null,
        n.definitiveIcd10?.description ?? null, n.clinicalPlan ?? null,
      ],
    });
  }

  for (const o of p.labOrders || []) {
    stmts.push({
      sql: `INSERT OR REPLACE INTO lab_orders (id, patient_id, session_id, ordered_at, ordered_by, test_name, priority, indication,
              status, completed_at, completed_by, result, value, reference_range, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        o.id, p.id, sessionId, o.timestampOrdered ?? null, o.doctorName ?? null, o.testName ?? null, o.priority ?? null,
        o.clinicalIndication ?? null, o.status ?? null, o.timestampCompleted ?? null, o.scientistName ?? null,
        o.resultFindings ?? null, o.quantitativeValue ?? null, o.referenceRange ?? null, o.scientistComments ?? null,
      ],
    });
  }

  for (const o of p.radiologyOrders || []) {
    stmts.push({
      sql: `INSERT OR REPLACE INTO radiology_orders (id, patient_id, session_id, ordered_at, ordered_by, study_type, indication,
              status, completed_at, radiographer, findings, impression)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        o.id, p.id, sessionId, o.timestampOrdered ?? null, o.doctorName ?? null, o.studyType ?? null, o.indication ?? null,
        o.status ?? null, o.timestampCompleted ?? null, o.radiographerName ?? null, o.findingsReport ?? null, o.impression ?? null,
      ],
    });
  }

  for (const m of p.medications || []) {
    stmts.push({
      sql: `INSERT OR REPLACE INTO medications (id, patient_id, session_id, ordered_at, ordered_by, drug_name, dosage, route,
              frequency, instructions, status, administered_at, nurse_name, injection_site, nurse_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        m.id, p.id, sessionId, m.timestampOrdered ?? null, m.doctorName ?? null, m.drugName ?? null, m.dosage ?? null,
        m.route ?? null, m.frequency ?? null, m.instructions ?? null, m.status ?? null, m.timestampAdministered ?? null,
        m.nurseName ?? null, m.injectionSite ?? null, m.nurseNotes ?? null,
      ],
    });
  }

  for (const r of p.routingHistory || []) {
    stmts.push({
      sql: `INSERT OR REPLACE INTO routing_events (id, patient_id, session_id, occurred_at, from_dept, to_dept, authorized_by, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [r.id, p.id, sessionId, r.timestamp ?? null, r.fromDepartment ?? null, r.toDepartment ?? null, r.authorizedBy ?? null, r.reason ?? null],
    });
  }

  // who worked on this patient (lets each station look back at the patients it treated)
  stmts.push({ sql: "DELETE FROM patient_actors WHERE patient_id = ?", args: [p.id] });
  for (const key of collectActorKeys(p)) {
    stmts.push({
      sql: "INSERT OR IGNORE INTO patient_actors (patient_id, session_id, actor_key) VALUES (?, ?, ?)",
      args: [p.id, sessionId, key],
    });
  }

  stmts.push(BUMP_REV);
  return stmts;
}

/** Patients with these ids (used for a student's station-limited view). */
export async function listPatientsByIds(tid: string, ids: string[]): Promise<Patient[]> {
  if (ids.length === 0) return [];
  const c = await db(tid);
  const out: Patient[] = [];
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const rs = await c.execute({
      sql: `SELECT data FROM patients WHERE id IN (${chunk.map(() => "?").join(", ")})`,
      args: chunk,
    });
    for (const r of rs.rows) {
      try {
        out.push(JSON.parse(str((r as unknown as Row).data)) as Patient);
      } catch {
        // skip corrupted row
      }
    }
  }
  return out.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
}

/**
 * After a student is renamed: every record that carries one of their former names now carries the
 * new name (in closed sessions too, so the history stays consistent). Returns how many were updated.
 */
export async function rewriteActorNames(tid: string, fromKeys: string[], newName: string): Promise<number> {
  if (fromKeys.length === 0) return 0;
  const c = await db(tid);
  const found = await c.execute({
    sql: `SELECT DISTINCT patient_id, session_id FROM patient_actors WHERE actor_key IN (${fromKeys.map(() => "?").join(", ")})`,
    args: fromKeys,
  });

  let updated = 0;
  let pending: InStatement[] = [];
  let pendingPatients = 0;
  const flush = async () => {
    if (pending.length) await c.batch(pending, "write");
    pending = [];
    pendingPatients = 0;
  };

  for (const row of found.rows) {
    const r = row as unknown as Row;
    const stored = await c.execute({ sql: "SELECT data FROM patients WHERE id = ?", args: [str(r.patient_id)] });
    if (!stored.rows.length) continue;
    let patient: Patient;
    try {
      patient = JSON.parse(str((stored.rows[0] as unknown as Row).data)) as Patient;
    } catch {
      continue;
    }
    if (!renameActorInPatient(patient, fromKeys, newName)) continue;
    pending.push(...patientStatements(patient, str(r.session_id)));
    updated += 1;
    pendingPatients += 1;
    if (pendingPatients >= 4) await flush();
  }
  await flush();
  return updated;
}

export interface PatientDetails {
  fullName: string;
  age: number;
  gender: string;
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  paymentType: string;
  nextOfKin: { name: string; relation: string; phone: string };
}

/**
 * Changes ONLY the personal details of a patient, inside the database, so a Front Desk correction
 * can never overwrite clinical entries that another station saved at the same moment.
 */
export async function updatePatientDetails(tid: string, id: string, d: PatientDetails): Promise<Patient | undefined> {
  const c = await db(tid);
  const exists = await c.execute({
    sql: "SELECT id FROM patients WHERE id = ?",
    args: [id],
  });
  if (!exists.rows.length) return undefined;
  const now = nowIso();
  await c.batch(
    [
      {
        sql: `UPDATE patients SET
                full_name = ?, age = ?, gender = ?, payment_type = ?, last_updated = ?,
                next_of_kin_name = ?, next_of_kin_relation = ?, next_of_kin_phone = ?,
                data = json_set(data,
                  '$.fullName', ?, '$.age', ?, '$.gender', ?, '$.dateOfBirth', ?, '$.phoneNumber', ?,
                  '$.address', ?, '$.paymentType', ?, '$.nextOfKin', json(?), '$.lastUpdated', ?)
              WHERE id = ?`,
        args: [
          d.fullName, d.age, d.gender, d.paymentType, now,
          d.nextOfKin.name, d.nextOfKin.relation, d.nextOfKin.phone,
          d.fullName, d.age, d.gender, d.dateOfBirth, d.phoneNumber,
          d.address, d.paymentType, JSON.stringify(d.nextOfKin), now,
          id,
        ],
      },
      BUMP_REV,
    ],
    "write"
  );
  return getPatient(tid, id);
}

/** Creates a patient in the active session. The hospital number starts at 1 for each session. */
export async function createPatient(tid: string, build: (hospitalNumber: string, id: string) => Patient): Promise<Patient> {
  const c = await db(tid);
  const session = await getActiveSession(tid);

  // Atomic counter: two students registering at the same moment can never get the same number.
  const rs = await c.execute({
    sql: "UPDATE sessions SET next_seq = next_seq + 1 WHERE id = ? RETURNING next_seq",
    args: [session.id],
  });
  const seq = Number((rs.rows[0] as unknown as Row).next_seq) - 1;

  const prefix = (await getTenantById(tid))?.recordPrefix || "REC";
  const patient = build(formatHospitalNumber(seq, prefix), `pat-${Date.now()}-${seq}`);
  patient.lastUpdated = nowIso();
  await c.batch(patientStatements(patient, session.id), "write");
  return patient;
}

/** Saves a patient into the session where it was originally registered, including archived sessions. */
export async function savePatient(tid: string, patient: Patient): Promise<Patient> {
  const c = await db(tid);
  const rs = await c.execute({
    sql: "SELECT session_id FROM patients WHERE id = ?",
    args: [patient.id],
  });

  let sessionId: string;
  if (rs.rows.length) {
    const row = rs.rows[0] as unknown as Row;
    sessionId = str(row.session_id);
  } else {
    sessionId = (await getActiveSession(tid)).id;
  }

  const stored: Patient = { ...patient, lastUpdated: nowIso() };
  await c.batch(patientStatements(stored, sessionId), "write");
  return stored;
}

/* ---------------------------- exports ---------------------------- */

interface TableSpec {
  filename: string;
  columns: string[];
  sql: string;
}

const JOIN = `JOIN patients p ON p.id = t.patient_id JOIN sessions s ON s.id = t.session_id`;
const SCOPE = `WHERE (? = 'all' OR t.session_id = ?)`;

export const EXPORT_TABLES: Record<string, TableSpec> = {
  patients: {
    filename: "patients",
    columns: [
      "session", "hospital_number", "full_name", "age", "gender", "payment_type", "registered_at", "registered_by",
      "current_department", "status", "next_of_kin_name", "next_of_kin_relation", "next_of_kin_phone", "last_updated",
    ],
    sql: `SELECT s.name AS session, t.hospital_number, t.full_name, t.age, t.gender, t.payment_type, t.registered_at,
                 t.registered_by, t.current_department, t.status, t.next_of_kin_name, t.next_of_kin_relation,
                 t.next_of_kin_phone, t.last_updated
            FROM patients t JOIN sessions s ON s.id = t.session_id ${SCOPE} ORDER BY s.created_at, t.registered_at`,
  },
  vitals: {
    filename: "vitals",
    columns: [
      "session", "hospital_number", "patient", "recorded_at", "taken_by", "systolic", "diastolic", "pulse", "temperature",
      "resp_rate", "spo2", "weight_kg", "height_cm", "bmi", "urgency", "chief_complaint", "triage_notes",
    ],
    sql: `SELECT s.name AS session, p.hospital_number, p.full_name AS patient, t.recorded_at, t.taken_by, t.systolic,
                 t.diastolic, t.pulse, t.temperature, t.resp_rate, t.spo2, t.weight_kg, t.height_cm, t.bmi, t.urgency,
                 t.chief_complaint, t.triage_notes
            FROM vitals t ${JOIN} ${SCOPE} ORDER BY s.created_at, t.recorded_at`,
  },
  consultations: {
    filename: "consultations_icd10",
    columns: [
      "session", "hospital_number", "patient", "created_at", "doctor_name", "history", "exam_findings", "provisional_dx",
      "provisional_icd10_code", "provisional_icd10_desc", "definitive_dx", "definitive_icd10_code",
      "definitive_icd10_desc", "clinical_plan",
    ],
    sql: `SELECT s.name AS session, p.hospital_number, p.full_name AS patient, t.created_at, t.doctor_name, t.history,
                 t.exam_findings, t.provisional_dx, t.provisional_icd10_code, t.provisional_icd10_desc, t.definitive_dx,
                 t.definitive_icd10_code, t.definitive_icd10_desc, t.clinical_plan
            FROM consultations t ${JOIN} ${SCOPE} ORDER BY s.created_at, t.created_at`,
  },
  lab_orders: {
    filename: "lab_orders",
    columns: [
      "session", "hospital_number", "patient", "ordered_at", "ordered_by", "test_name", "priority", "indication", "status",
      "completed_at", "completed_by", "result", "value", "reference_range", "comments",
    ],
    sql: `SELECT s.name AS session, p.hospital_number, p.full_name AS patient, t.ordered_at, t.ordered_by, t.test_name,
                 t.priority, t.indication, t.status, t.completed_at, t.completed_by, t.result, t.value, t.reference_range,
                 t.comments
            FROM lab_orders t ${JOIN} ${SCOPE} ORDER BY s.created_at, t.ordered_at`,
  },
  radiology_orders: {
    filename: "imaging_orders",
    columns: [
      "session", "hospital_number", "patient", "ordered_at", "ordered_by", "study_type", "indication", "status",
      "completed_at", "radiographer", "findings", "impression",
    ],
    sql: `SELECT s.name AS session, p.hospital_number, p.full_name AS patient, t.ordered_at, t.ordered_by, t.study_type,
                 t.indication, t.status, t.completed_at, t.radiographer, t.findings, t.impression
            FROM radiology_orders t ${JOIN} ${SCOPE} ORDER BY s.created_at, t.ordered_at`,
  },
  medications: {
    filename: "pharmacy_medications",
    columns: [
      "session", "hospital_number", "patient", "ordered_at", "ordered_by", "drug_name", "dosage", "route", "frequency",
      "instructions", "status", "administered_at", "nurse_name", "injection_site", "nurse_notes",
    ],
    sql: `SELECT s.name AS session, p.hospital_number, p.full_name AS patient, t.ordered_at, t.ordered_by, t.drug_name,
                 t.dosage, t.route, t.frequency, t.instructions, t.status, t.administered_at, t.nurse_name,
                 t.injection_site, t.nurse_notes
            FROM medications t ${JOIN} ${SCOPE} ORDER BY s.created_at, t.ordered_at`,
  },
  routing_events: {
    filename: "patient_flow",
    columns: ["session", "hospital_number", "patient", "occurred_at", "from_dept", "to_dept", "authorized_by", "reason"],
    sql: `SELECT s.name AS session, p.hospital_number, p.full_name AS patient, t.occurred_at, t.from_dept, t.to_dept,
                 t.authorized_by, t.reason
            FROM routing_events t ${JOIN} ${SCOPE} ORDER BY s.created_at, t.occurred_at`,
  },
};

export async function exportCsv(tid: string, table: string, sessionId: string): Promise<{ filename: string; csv: string } | null> {
  const spec = EXPORT_TABLES[table];
  if (!spec) return null;
  const c = await db(tid);
  const rs = await c.execute({ sql: spec.sql, args: [sessionId, sessionId] });
  const rows = rs.rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const col of spec.columns) o[col] = (r as unknown as Row)[col];
    return o;
  });
  return { filename: spec.filename, csv: toCsv(spec.columns, rows) };
}

/** All patients of one session, or of every session when sessionId === "all". */
export async function listPatientsForReport(tid: string, sessionId: string): Promise<Patient[]> {
  if (sessionId !== "all") return listPatients(tid, sessionId);
  const c = await db(tid);
  const rs = await c.execute("SELECT data FROM patients ORDER BY registered_at");
  const out: Patient[] = [];
  for (const r of rs.rows) {
    try {
      out.push(JSON.parse(str((r as unknown as Row).data)) as Patient);
    } catch {
      // ignore corrupted row
    }
  }
  return out;
}
