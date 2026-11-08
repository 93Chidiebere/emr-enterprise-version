import { db } from "./db";
import { hashPassword, verifyPassword } from "./passwords";
import { HOSPITAL_ROLES } from "@/types/emr";
import { actorKey } from "./actors";
import { rewriteActorNames } from "./store";
import { toCsv } from "./csv";

export interface StudentRecord {
  id: string;
  fullName: string;
  role: string;
  email?: string | null;
  /** station chosen for the current class session (null = not chosen yet) */
  sessionRole?: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  locked: boolean;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export const nameKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
export const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");
export const cleanEmail = (email: string) => email.trim().toLowerCase();
export function validateEmail(email: string): string | null {
  const normalized = cleanEmail(email);
  if (!normalized || normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Enter a valid email address.";
  }
  return null;
}

export const STUDENT_ROLE_IDS: string[] = HOSPITAL_ROLES.filter((r) => r.id !== "director").map((r) => r.id);

export type RegisterResult =
  | { ok: true; user: StudentRecord }
  | { ok: false; code: "NAME_TAKEN" | "BAD_NAME" | "BAD_ROLE" | "BAD_PASSWORD" | "BAD_EMAIL"; message: string };

export function validatePassword(pw: string): string | null {
  if (pw.length < 6) return "Password must be at least 6 characters.";
  if (pw.length > 100) return "Password is too long.";
  return null;
}

export async function registerStudent(tid: string, rawName: string, role: string, password: string, rawEmail: string): Promise<RegisterResult> {
  const name = cleanName(rawName);
  const emailProblem = validateEmail(rawEmail);
  if (emailProblem) return { ok: false, code: "BAD_EMAIL", message: emailProblem };
  const email = cleanEmail(rawEmail);
  if (name.length < 2 || name.length > 80) return { ok: false, code: "BAD_NAME", message: "Enter your full name (2 to 80 characters)." };
  if (!STUDENT_ROLE_IDS.includes(role)) return { ok: false, code: "BAD_ROLE", message: "Choose a valid station role." };
  const pwProblem = validatePassword(password);
  if (pwProblem) return { ok: false, code: "BAD_PASSWORD", message: pwProblem };

  const c = await db(tid);
  const reserved = await c.execute({ sql: "SELECT 1 AS x FROM user_aliases WHERE alias_key = ?", args: [nameKey(name)] });
  if (reserved.rows.length) {
    return { ok: false, code: "NAME_TAKEN", message: `'${name}' was used by another account and cannot be taken. Please use a different name.` };
  }
  const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const created = new Date().toISOString();
  const hash = await hashPassword(password);
  try {
    await c.execute({
      sql: "INSERT INTO users (id, full_name, name_key, role, password_hash, email, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, name, nameKey(name), role, hash, email, created, created],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/unique|constraint/i.test(msg)) {
      return { ok: false, code: "NAME_TAKEN", message: `'${name}' is already registered. Please sign in instead.` };
    }
    throw err;
  }
  return { ok: true, user: { id, fullName: name, role, email, createdAt: created, lastLoginAt: created, locked: false } };
}

export type LoginResult =
  | { ok: true; user: StudentRecord }
  | { ok: false; code: "BAD_LOGIN" | "LOCKED"; message: string };

export async function loginStudent(tid: string, rawName: string, password: string): Promise<LoginResult> {
  const c = await db(tid);
  const rs = await c.execute({
    sql: "SELECT id, full_name, role, email, password_hash, created_at, failed_count, locked_until FROM users WHERE name_key = ?",
    args: [nameKey(rawName)],
  });
  const bad: LoginResult = { ok: false, code: "BAD_LOGIN", message: "Incorrect name or password." };
  if (rs.rows.length === 0) {
    // do comparable work so timing does not reveal whether the name exists
    await verifyPassword(password, "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA").catch(() => false);
    return bad;
  }
  const row = rs.rows[0] as unknown as Row;

  const lockedUntil = row.locked_until ? new Date(str(row.locked_until)).getTime() : 0;
  if (lockedUntil > Date.now()) {
    const mins = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
    return { ok: false, code: "LOCKED", message: `Too many wrong attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask your teacher to reset your password.` };
  }

  const match = await verifyPassword(password, str(row.password_hash));
  if (!match) {
    const failed = Number(row.failed_count) + 1;
    if (failed >= MAX_FAILED_ATTEMPTS) {
      await c.execute({
        sql: "UPDATE users SET failed_count = 0, locked_until = ? WHERE id = ?",
        args: [new Date(Date.now() + LOCK_MINUTES * 60000).toISOString(), str(row.id)],
      });
    } else {
      await c.execute({ sql: "UPDATE users SET failed_count = ? WHERE id = ?", args: [failed, str(row.id)] });
    }
    return bad;
  }

  const now = new Date().toISOString();
  await c.execute({
    sql: "UPDATE users SET failed_count = 0, locked_until = NULL, last_login_at = ? WHERE id = ?",
    args: [now, str(row.id)],
  });
  return {
    ok: true,
    user: { id: str(row.id), fullName: str(row.full_name), role: str(row.role), email: row.email ? str(row.email) : null, createdAt: str(row.created_at), lastLoginAt: now, locked: false },
  };
}

export async function updateStudentEmail(tid: string, userId: string, rawEmail: string): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const problem = validateEmail(rawEmail);
  if (problem) return { ok: false, message: problem };
  const email = cleanEmail(rawEmail);
  const c = await db(tid);
  const rs = await c.execute({ sql: "UPDATE users SET email = ? WHERE id = ?", args: [email, userId] });
  if (!rs.rowsAffected) return { ok: false, message: "This account no longer exists. Please sign in again." };
  return { ok: true, email };
}

export async function listStudents(tid: string): Promise<StudentRecord[]> {
  const c = await db(tid);
  const rs = await c.execute(
    `SELECT u.id, u.full_name, u.role, u.created_at, u.last_login_at, u.locked_until,
            (SELECT sr.role FROM session_roles sr
               WHERE sr.user_id = u.id
                 AND sr.session_id = (SELECT id FROM sessions WHERE status = 'active' ORDER BY created_at DESC LIMIT 1)) AS session_role
       FROM users u ORDER BY u.created_at DESC`
  );
  return rs.rows.map((r) => {
    const row = r as unknown as Row;
    return {
      id: str(row.id),
      fullName: str(row.full_name),
      role: str(row.role),
      sessionRole: row.session_role ? str(row.session_role) : null,
      createdAt: str(row.created_at),
      lastLoginAt: row.last_login_at ? str(row.last_login_at) : null,
      locked: row.locked_until ? new Date(str(row.locked_until)).getTime() > Date.now() : false,
    };
  });
}

export async function resetStudentPassword(tid: string, id: string, newPassword: string): Promise<boolean> {
  const c = await db(tid);
  const hash = await hashPassword(newPassword);
  const rs = await c.execute({
    sql: "UPDATE users SET password_hash = ?, failed_count = 0, locked_until = NULL WHERE id = ?",
    args: [hash, id],
  });
  return rs.rowsAffected > 0;
}

export async function removeStudent(tid: string, id: string): Promise<boolean> {
  const c = await db(tid);
  await c.execute({ sql: "DELETE FROM user_aliases WHERE user_id = ?", args: [id] });
  const rs = await c.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
  return rs.rowsAffected > 0;
}

export type RenameResult =
  | { ok: true; user: StudentRecord; recordsUpdated: number }
  | { ok: false; code: "BAD_NAME" | "NAME_TAKEN" | "BAD_PASSWORD" | "NOT_FOUND" | "SAME_NAME"; message: string };

/**
 * Renames a student account. The new name is used for sign-in from now on, every record that
 * carried the old name is updated to the new one, and the old name is kept as a reserved alias
 * so the student's history stays linked to them and nobody else can take it.
 * Pass `confirmPassword` for a self-service rename; omit it when a teacher does the rename.
 */
export async function renameStudent(tid: string, userId: string, rawNewName: string, confirmPassword?: string): Promise<RenameResult> {
  const newName = cleanName(rawNewName);
  if (newName.length < 2 || newName.length > 80) {
    return { ok: false, code: "BAD_NAME", message: "Enter the full name (2 to 80 characters)." };
  }
  const c = await db(tid);
  const cur = await c.execute({ sql: "SELECT id, full_name, name_key, role, password_hash, created_at FROM users WHERE id = ?", args: [userId] });
  if (!cur.rows.length) return { ok: false, code: "NOT_FOUND", message: "This account no longer exists." };
  const row = cur.rows[0] as unknown as Row;
  const oldName = str(row.full_name);
  const oldKey = str(row.name_key);
  const newKey = nameKey(newName);

  if (confirmPassword !== undefined) {
    const okPw = await verifyPassword(confirmPassword, str(row.password_hash));
    if (!okPw) return { ok: false, code: "BAD_PASSWORD", message: "Incorrect password. Your name was not changed." };
  }
  if (newName === oldName) return { ok: false, code: "SAME_NAME", message: "That is already your name." };

  // the new name must not belong to anybody else, now or in the past
  const taken = await c.execute({ sql: "SELECT 1 AS x FROM users WHERE name_key = ? AND id <> ?", args: [newKey, userId] });
  const reserved = await c.execute({ sql: "SELECT 1 AS x FROM user_aliases WHERE alias_key = ? AND user_id <> ?", args: [newKey, userId] });
  if (taken.rows.length || reserved.rows.length) {
    return { ok: false, code: "NAME_TAKEN", message: `'${newName}' is already used by another account. Please choose a different name.` };
  }

  const aliasRs = await c.execute({ sql: "SELECT alias_key FROM user_aliases WHERE user_id = ?", args: [userId] });
  const formerKeys = aliasRs.rows.map((r) => str((r as unknown as Row).alias_key));
  const now = new Date().toISOString();

  const stmts: Array<string | { sql: string; args: Array<string | number | null> }> = [
    { sql: "UPDATE users SET full_name = ?, name_key = ? WHERE id = ?", args: [newName, newKey, userId] },
    { sql: "DELETE FROM user_aliases WHERE user_id = ? AND alias_key = ?", args: [userId, newKey] }, // renaming back to an old name
  ];
  if (oldKey !== newKey) {
    stmts.push({
      sql: "INSERT OR REPLACE INTO user_aliases (alias_key, user_id, former_name, created_at) VALUES (?, ?, ?, ?)",
      args: [oldKey, userId, oldName, now],
    });
  }
  try {
    await c.batch(stmts, "write");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/unique|constraint/i.test(msg)) {
      return { ok: false, code: "NAME_TAKEN", message: `'${newName}' is already used by another account. Please choose a different name.` };
    }
    throw err;
  }

  // every former name (old and older) now reads as the new name in the records
  const recordsUpdated = await rewriteActorNames(tid, Array.from(new Set([oldKey, ...formerKeys])), newName);

  return {
    ok: true,
    recordsUpdated,
    user: { id: userId, fullName: newName, role: str(row.role), createdAt: str(row.created_at), lastLoginAt: null, locked: false },
  };
}

/** key (current or former name) -> the student's CURRENT name. Used to group reports by person. */
export async function loadNameResolver(tid: string): Promise<(key: string) => string | undefined> {
  const c = await db(tid);
  const map = new Map<string, string>();
  const users = await c.execute("SELECT full_name, name_key FROM users");
  for (const r of users.rows) {
    const row = r as unknown as Row;
    map.set(str(row.name_key), str(row.full_name));
  }
  const aliases = await c.execute("SELECT a.alias_key AS alias_key, u.full_name AS full_name FROM user_aliases a JOIN users u ON u.id = a.user_id");
  for (const r of aliases.rows) {
    const row = r as unknown as Row;
    map.set(str(row.alias_key), str(row.full_name));
  }
  return (key: string) => map.get(key);
}

/** Student accounts with their former names, for analysis (links old names in the records to one person). */
export async function exportStudentsCsv(tid: string): Promise<string> {
  const c = await db(tid);
  const rs = await c.execute(
    `SELECT u.full_name, u.role, u.created_at, u.last_login_at,
            (SELECT group_concat(a.former_name, '; ') FROM user_aliases a WHERE a.user_id = u.id) AS former_names
       FROM users u ORDER BY u.created_at`
  );
  const columns = ["full_name", "former_names", "registered_station", "created_at", "last_login_at"];
  const rows = rs.rows.map((r) => {
    const row = r as unknown as Row;
    return {
      full_name: row.full_name,
      former_names: row.former_names,
      registered_station: row.role,
      created_at: row.created_at,
      last_login_at: row.last_login_at,
    };
  });
  return toCsv(columns, rows);
}
