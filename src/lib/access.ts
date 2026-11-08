import { db } from "./db";
import { HOSPITAL_ROLES, type Department } from "@/types/emr";
import { getActiveSession, type SessionInfo } from "./store";
import type { SessionUser } from "./session";
import { actorKey } from "./actors";

/**
 * Station rules, enforced on the SERVER (so they cannot be bypassed from the browser):
 *  - A student picks ONE station per class session. It is saved and stays fixed until the teacher
 *    starts a new session (or unlocks that student).
 *  - Students can read patients in every session, so existing queues remain visible after a new
 *    session starts. Writes remain restricted to the student's current station.
 *  - Only the Front Desk can enroll patients and edit patient details.
 *  - Teachers can see and do everything.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export const STATION_ROLE_IDS: string[] = HOSPITAL_ROLES.filter((r) => r.id !== "director").map((r) => r.id);

export function stationDepartments(role: string): Department[] {
  const base = HOSPITAL_ROLES.find((r) => r.id === role)?.department;
  if (!base) return [];
  return role === "receptionist" ? ["RECEPTION", "DISCHARGED"] : [base];
}

export async function getSessionRole(tid: string, sessionId: string, userId: string): Promise<string | null> {
  const c = await db(tid);
  const rs = await c.execute({ sql: "SELECT role FROM session_roles WHERE session_id = ? AND user_id = ?", args: [sessionId, userId] });
  return rs.rows.length ? str((rs.rows[0] as unknown as Row).role) : null;
}

/** Saves the choice the first time only. A second attempt returns the role already chosen. */
export async function chooseSessionRole(tid: string, 
  sessionId: string,
  userId: string,
  role: string
): Promise<{ role: string; alreadyChosen: boolean }> {
  const c = await db(tid);
  await c.execute({
    sql: "INSERT OR IGNORE INTO session_roles (session_id, user_id, role, chosen_at) VALUES (?, ?, ?, ?)",
    args: [sessionId, userId, role, new Date().toISOString()],
  });
  const saved = (await getSessionRole(tid, sessionId, userId)) || role;
  return { role: saved, alreadyChosen: saved !== role };
}

export async function clearSessionRole(tid: string, sessionId: string, userId: string): Promise<void> {
  const c = await db(tid);
  await c.batch(
    [
      { sql: "DELETE FROM session_roles WHERE session_id = ? AND user_id = ?", args: [sessionId, userId] },
      // tell every open screen that something changed, so the student's screen asks them to choose again
      "UPDATE meta SET value = value + 1 WHERE key = 'rev'",
    ],
    "write"
  );
}

export interface StudentAccess {
  session: SessionInfo;
  role: string | null;
  /** the student's current name and every former name (as comparison keys) */
  keys: string[];
}

export async function studentAccess(tid: string, user: SessionUser): Promise<StudentAccess> {
  const session = await getActiveSession(tid);
  const role = await getSessionRole(tid, session.id, user.id);
  const c = await db(tid);
  // use the name stored in the database, not the one inside the sign-in cookie (it may be out of date after a rename)
  const nameRs = await c.execute({ sql: "SELECT full_name FROM users WHERE id = ?", args: [user.id] });
  const current = nameRs.rows.length ? str((nameRs.rows[0] as unknown as Row).full_name) : user.name;
  const aliasRs = await c.execute({ sql: "SELECT alias_key FROM user_aliases WHERE user_id = ?", args: [user.id] });
  const keys = Array.from(new Set([actorKey(current), ...aliasRs.rows.map((r) => str((r as unknown as Row).alias_key))]));
  return { session, role, keys };
}

/** Patient queues persist across sessions; station components filter these records by location. */
export async function visiblePatientIds(tid: string, access: StudentAccess): Promise<Array<{ id: string; dept: string }>> {
  if (!access.role) return [];
  const c = await db(tid);
  const rs = await c.execute({
    sql: "SELECT id, current_department FROM patients ORDER BY registered_at DESC",
    args: [],
  });
  return rs.rows.map((r) => ({ id: str((r as unknown as Row).id), dept: str((r as unknown as Row).current_department) }));
}

export async function studentCanRead(tid: string, access: StudentAccess, patientId: string): Promise<boolean> {
  return (await visiblePatientIds(tid, access)).some((p) => p.id === patientId);
}

/** Writes are allowed only while the patient is at the student's own station. */
export async function studentCanWrite(tid: string, access: StudentAccess, patientId: string): Promise<boolean> {
  if (!access.role) return false;
  const depts = stationDepartments(access.role);
  const c = await db(tid);
  const rs = await c.execute({
    sql: "SELECT current_department FROM patients WHERE id = ?",
    args: [patientId],
  });
  if (!rs.rows.length) return false;
  const row = rs.rows[0] as unknown as Row;
  return (depts as string[]).includes(str(row.current_department));
}
