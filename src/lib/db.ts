import { createClient, type Client, type InArgs, type ResultSet, type TransactionMode } from "@libsql/client/web";

/**
 * Turso (libSQL) connection for LIVE class records and reports.
 * Environment variables (Vercel > Project > Settings > Environment Variables):
 *   TURSO_DATABASE_URL   e.g. libsql://your-db-name-yourorg.turso.io
 *   TURSO_AUTH_TOKEN     database token created in the Turso dashboard
 */

export class DbNotConfiguredError extends Error {
  constructor() {
    super("DB_NOT_CONFIGURED");
    this.name = "DbNotConfiguredError";
  }
}

// Values pasted into Vercel often carry stray spaces, line breaks or quote marks. Clean them.
const clean = (v: string | undefined) => (v ? v.trim().replace(/^["']+|["']+$/g, "").trim() : undefined) || undefined;

const url = clean(process.env.TURSO_DATABASE_URL);
const authToken = clean(process.env.TURSO_AUTH_TOKEN);

export const dbConfigured = Boolean(url);

let client: Client | null = null;
function getClient(): Client {
  if (!client) {
    client = createClient({
      url: url as string,
      authToken,
      // Next.js caches identical fetch() calls by default, which would make the database
      // return old answers. Always bypass that cache.
      fetch: (input: unknown, init?: unknown) =>
        fetch(input as RequestInfo, { ...((init as RequestInit) || {}), cache: "no-store" }),
    });
  }
  return client;
}

/*
 * MULTI-TENANT DESIGN
 * ------------------
 * - `cf_tenants` is the only shared table: one row per institution (name, colours, status...).
 * - Everything else (patients, students, sessions, reports data...) lives in a private set of
 *   tables for each institution, named  t_<tenantid>_<table>.  Queries are written exactly as for a
 *   single institution; `db(tenantId)` rewrites the table names, so a request can only ever reach
 *   the tables of the institution it is signed in to. A mistake can only fail with
 *   "no such table", never show another institution's data.
 * - Each patient is stored as one JSON document AND copied into plain tables (vitals, consultations,
 *   orders, routing...) so reports and Excel/SPSS/Python analysis can use ordinary rows and columns.
 */

const TENANT_TABLES = [
  "meta", "sessions", "patients", "vitals", "consultations", "lab_orders", "radiology_orders",
  "medications", "routing_events", "users", "session_roles", "patient_actors", "user_aliases", "staff",
];

const TABLE_REF = new RegExp(String.raw`\b(FROM|JOIN|INTO|UPDATE|TABLE IF NOT EXISTS|ON)\s+(${TENANT_TABLES.join("|")})\b`, "gi");

export const TENANT_ID_RE = /^[a-z0-9]{6,24}$/;

/** Points every table name in a SQL statement at one institution's private tables. */
export function scopeSql(sql: string, tenantId: string): string {
  if (!TENANT_ID_RE.test(tenantId)) throw new Error("INVALID_TENANT_ID");
  const prefix = `t_${tenantId}_`;
  return sql.replace(TABLE_REF, (_m, kw: string, table: string) => `${kw} ${prefix}${table.toLowerCase()}`);
}

const TENANT_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)`,
  `INSERT OR IGNORE INTO meta (key, value) VALUES ('rev', 0)`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    next_seq INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    created_by TEXT,
    archived_at TEXT
  )`,
  `INSERT OR IGNORE INTO sessions (id, name, status, next_seq, created_at, created_by)
     SELECT 'ses-initial', 'Class session 1', 'active', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 'system'
     WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE status = 'active')`,

  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    hospital_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    payment_type TEXT,
    current_department TEXT,
    status TEXT,
    registered_at TEXT,
    registered_by TEXT,
    last_updated TEXT,
    next_of_kin_name TEXT,
    next_of_kin_relation TEXT,
    next_of_kin_phone TEXT,
    data TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_patients_session ON patients (session_id)`,

  `CREATE TABLE IF NOT EXISTS vitals (
    id TEXT NOT NULL, patient_id TEXT NOT NULL, session_id TEXT NOT NULL,
    recorded_at TEXT, taken_by TEXT,
    systolic INTEGER, diastolic INTEGER, pulse INTEGER, temperature REAL,
    resp_rate INTEGER, spo2 INTEGER, weight_kg REAL, height_cm REAL, bmi REAL,
    urgency TEXT, chief_complaint TEXT, triage_notes TEXT,
    PRIMARY KEY (patient_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_vitals_session ON vitals (session_id)`,

  `CREATE TABLE IF NOT EXISTS consultations (
    id TEXT NOT NULL, patient_id TEXT NOT NULL, session_id TEXT NOT NULL,
    created_at TEXT, doctor_name TEXT,
    history TEXT, exam_findings TEXT,
    provisional_dx TEXT, provisional_icd10_code TEXT, provisional_icd10_desc TEXT,
    definitive_dx TEXT, definitive_icd10_code TEXT, definitive_icd10_desc TEXT,
    clinical_plan TEXT,
    PRIMARY KEY (patient_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_consultations_session ON consultations (session_id)`,

  `CREATE TABLE IF NOT EXISTS lab_orders (
    id TEXT NOT NULL, patient_id TEXT NOT NULL, session_id TEXT NOT NULL,
    ordered_at TEXT, ordered_by TEXT, test_name TEXT, priority TEXT, indication TEXT,
    status TEXT, completed_at TEXT, completed_by TEXT,
    result TEXT, value TEXT, reference_range TEXT, comments TEXT,
    PRIMARY KEY (patient_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lab_session ON lab_orders (session_id)`,

  `CREATE TABLE IF NOT EXISTS radiology_orders (
    id TEXT NOT NULL, patient_id TEXT NOT NULL, session_id TEXT NOT NULL,
    ordered_at TEXT, ordered_by TEXT, study_type TEXT, indication TEXT,
    status TEXT, completed_at TEXT, radiographer TEXT, findings TEXT, impression TEXT,
    PRIMARY KEY (patient_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_rad_session ON radiology_orders (session_id)`,

  `CREATE TABLE IF NOT EXISTS medications (
    id TEXT NOT NULL, patient_id TEXT NOT NULL, session_id TEXT NOT NULL,
    ordered_at TEXT, ordered_by TEXT, drug_name TEXT, dosage TEXT, route TEXT,
    frequency TEXT, instructions TEXT, status TEXT,
    administered_at TEXT, nurse_name TEXT, injection_site TEXT, nurse_notes TEXT,
    PRIMARY KEY (patient_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_med_session ON medications (session_id)`,

  `CREATE TABLE IF NOT EXISTS routing_events (
    id TEXT NOT NULL, patient_id TEXT NOT NULL, session_id TEXT NOT NULL,
    occurred_at TEXT, from_dept TEXT, to_dept TEXT, authorized_by TEXT, reason TEXT,
    PRIMARY KEY (patient_id, id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_routing_session ON routing_events (session_id)`,

  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    failed_count INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  )`,

  // which station each student chose for each class session (fixed until the session is closed)
  `CREATE TABLE IF NOT EXISTS session_roles (
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    chosen_at TEXT NOT NULL,
    PRIMARY KEY (session_id, user_id)
  )`,

  // who worked on which patient, so every station can look back at the patients it treated
  `CREATE TABLE IF NOT EXISTS patient_actors (
    patient_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    actor_key TEXT NOT NULL,
    PRIMARY KEY (patient_id, actor_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_actors_lookup ON patient_actors (session_id, actor_key)`,

  // names a student used before renaming (so history stays linked and nobody else can take them)
  `CREATE TABLE IF NOT EXISTS user_aliases (
    alias_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    former_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_aliases_user ON user_aliases (user_id)`,

  // teachers / instructors of this institution (the first one is the owner)
  `CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    email_key TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'teacher',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT,
    failed_count INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  )`,
];

const GLOBAL_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS cf_tenants (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    department TEXT,
    location TEXT,
    tagline TEXT,
    primary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    record_prefix TEXT NOT NULL,
    logo_data TEXT,
    hero_data TEXT,
    brand_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'free',
    owner_email TEXT,
    created_at TEXT NOT NULL
  )`,
];

export interface ScopedDb {
  execute(stmt: string | { sql: string; args?: InArgs }): Promise<ResultSet>;
  batch(stmts: Array<string | { sql: string; args?: InArgs }>, mode?: TransactionMode): Promise<ResultSet[]>;
}

let globalReady: Promise<Client> | null = null;

/** The shared client (used for the institutions table and for creating a new institution's tables). */
export function rawDb(): Promise<Client> {
  if (!url) return Promise.reject(new DbNotConfiguredError());
  if (!globalReady) {
    globalReady = (async () => {
      const c = getClient();
      await c.batch(GLOBAL_SCHEMA, "write");
      return c;
    })().catch((err) => {
      globalReady = null;
      throw err;
    });
  }
  return globalReady;
}

const tenantReady = new Map<string, Promise<void>>();

/** Creates (once per server instance) the private tables of one institution. */
export function ensureTenantSchema(tenantId: string): Promise<void> {
  let p = tenantReady.get(tenantId);
  if (!p) {
    p = (async () => {
      const c = await rawDb();
      const prefix = `t_${tenantId}_`;
      const stmts = TENANT_SCHEMA.map((sql) => scopeSql(sql, tenantId).replace(/\bidx_/g, `${prefix}idx_`));
      await c.batch(stmts, "write");
      // accounts created before student emails existed
      const cols = await c.execute(`PRAGMA table_info(${prefix}users)`);
      if (!cols.rows.some((row) => String((row as Record<string, unknown>).name) === "email")) {
        await c.execute(`ALTER TABLE ${prefix}users ADD COLUMN email TEXT`);
      }
    })().catch((err) => {
      tenantReady.delete(tenantId);
      throw err;
    });
    tenantReady.set(tenantId, p);
  }
  return p;
}

/** A database handle that can only see ONE institution's tables. */
export async function db(tenantId: string): Promise<ScopedDb> {
  if (!TENANT_ID_RE.test(tenantId)) throw new Error("INVALID_TENANT_ID");
  await ensureTenantSchema(tenantId);
  const c = await rawDb();
  const scope = (st: string | { sql: string; args?: InArgs }) =>
    typeof st === "string" ? scopeSql(st, tenantId) : { sql: scopeSql(st.sql, tenantId), args: st.args };
  return {
    execute: (st) => c.execute(scope(st) as never),
    batch: (sts, mode) => c.batch(sts.map(scope) as never, mode),
  };
}
