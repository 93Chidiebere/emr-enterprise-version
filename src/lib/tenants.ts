import crypto from "crypto";
import { rawDb, db, ensureTenantSchema } from "./db";
import { DEFAULT_ACCENT, DEFAULT_PRIMARY, isHex, normalizeAccent, normalizePrimary } from "./colors";

export type TenantStatus = "active" | "suspended";

export interface Tenant {
  id: string;
  slug: string;
  name: string; // institution, for example a university or training provider
  hospitalName: string; // name of the institution's simulated training hospital
  department: string; // e.g. "Faculty of Nursing & Health Sciences"
  location: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  recordPrefix: string; // hospital numbers look like TUH-2026-00001
  hasLogo: boolean;
  hasHero: boolean;
  brandVersion: number;
  status: TenantStatus;
  plan: string;
  createdAt: string;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Names that would clash with the platform's own pages. */
export const RESERVED_SLUGS = new Set([
  "api", "app", "admin", "platform", "register", "login", "logout", "signin", "signup", "settings", "reports",
  "static", "assets", "public", "_next", "favicon", "robots", "sitemap", "www", "mail", "help", "support",
  "billing", "pricing", "about", "contact", "terms", "privacy", "demo", "test", "null", "undefined",
]);

export const DEFAULT_TAGLINE = "Clinical Data Flow & Patient Journey Simulation System";

export function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Returns an error message, or null when the address name is fine. */
export function validateSlug(slug: string): string | null {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) {
    return "Use 3 to 40 letters, numbers or hyphens (no spaces), starting and ending with a letter or number.";
  }
  if (RESERVED_SLUGS.has(slug)) return "That name is reserved. Please choose another.";
  return null;
}

export function defaultRecordPrefix(source: string): string {
  const words = (source || "").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const initials = words.map((w) => w[0]).join("").toUpperCase();
  const prefix = (initials.length >= 2 ? initials : (words[0] || "REC").slice(0, 3).toUpperCase()).slice(0, 5);
  return /^[A-Z0-9]{2,6}$/.test(prefix) ? prefix : "REC";
}

function toTenant(r: Row): Tenant {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    hospitalName: str(r.hospital_name),
    department: str(r.department),
    location: str(r.location),
    tagline: str(r.tagline) || DEFAULT_TAGLINE,
    primaryColor: str(r.primary_color) || DEFAULT_PRIMARY,
    accentColor: str(r.accent_color) || DEFAULT_ACCENT,
    recordPrefix: str(r.record_prefix) || "REC",
    hasLogo: Boolean(r.has_logo),
    hasHero: Boolean(r.has_hero),
    brandVersion: Number(r.brand_version) || 1,
    status: str(r.status) === "suspended" ? "suspended" : "active",
    plan: str(r.plan) || "free",
    createdAt: str(r.created_at),
  };
}

const COLUMNS = `id, slug, name, hospital_name, department, location, tagline, primary_color, accent_color,
  record_prefix, (logo_data IS NOT NULL) AS has_logo, (hero_data IS NOT NULL) AS has_hero, brand_version, status, plan, created_at`;

// small in-memory cache so every request does not re-read the institution row
const cache = new Map<string, { at: number; tenant: Tenant | null }>();
const TTL_MS = 15000;
export const clearTenantCache = (id?: string) => (id ? cache.delete(id) : cache.clear());

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const c = await rawDb();
  const rs = await c.execute({ sql: `SELECT ${COLUMNS} FROM cf_tenants WHERE slug = ?`, args: [slug.toLowerCase()] });
  return rs.rows.length ? toTenant(rs.rows[0] as unknown as Row) : null;
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.tenant;
  const c = await rawDb();
  const rs = await c.execute({ sql: `SELECT ${COLUMNS} FROM cf_tenants WHERE id = ?`, args: [id] });
  const tenant = rs.rows.length ? toTenant(rs.rows[0] as unknown as Row) : null;
  cache.set(id, { at: Date.now(), tenant });
  return tenant;
}

export async function slugAvailable(slug: string): Promise<boolean> {
  const c = await rawDb();
  const rs = await c.execute({ sql: "SELECT 1 AS x FROM cf_tenants WHERE slug = ?", args: [slug] });
  return rs.rows.length === 0;
}

export interface NewTenantInput {
  slug: string;
  name: string;
  hospitalName?: string;
  department?: string;
  location?: string;
  tagline?: string;
  primaryColor?: string;
  accentColor?: string;
  recordPrefix?: string;
  ownerEmail: string;
}

const newTenantId = () => "t" + crypto.randomBytes(8).toString("hex").slice(0, 11); // e.g. t3f9a1c20b7d

/** Creates the institution and its private tables, plus its first class session. */
export async function createTenant(input: NewTenantInput): Promise<Tenant> {
  const c = await rawDb();
  const id = newTenantId();
  const created = new Date().toISOString();
  const name = input.name.trim().slice(0, 100);
  const prefixRaw = (input.recordPrefix || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = /^[A-Z0-9]{2,6}$/.test(prefixRaw) ? prefixRaw : defaultRecordPrefix(name);
  const primary = normalizePrimary(isHex(input.primaryColor) ? input.primaryColor : DEFAULT_PRIMARY);
  const accent = normalizeAccent(isHex(input.accentColor) ? input.accentColor : DEFAULT_ACCENT);

  await c.execute({
    sql: `INSERT INTO cf_tenants (id, slug, name, hospital_name, department, location, tagline, primary_color, accent_color,
            record_prefix, status, plan, owner_email, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'free', ?, ?)`,
    args: [
      id, input.slug, name,
      (input.hospitalName || `${name} Training Hospital`).trim().slice(0, 100),
      (input.department || "").trim().slice(0, 120),
      (input.location || "").trim().slice(0, 100),
      (input.tagline || "").trim().slice(0, 160),
      primary, accent, prefix, input.ownerEmail.trim().toLowerCase(), created,
    ],
  });
  await ensureTenantSchema(id);
  clearTenantCache(id);
  return (await getTenantById(id)) as Tenant;
}

export interface BrandingPatch {
  name?: string;
  hospitalName?: string;
  department?: string;
  location?: string;
  tagline?: string;
  primaryColor?: string;
  accentColor?: string;
  recordPrefix?: string;
}

export async function updateTenantBranding(id: string, p: BrandingPatch): Promise<Tenant | null> {
  const c = await rawDb();
  const sets: string[] = [];
  const args: Array<string | number> = [];
  const put = (col: string, val: string | undefined, max: number, required = false) => {
    if (val === undefined) return;
    const v = val.trim().slice(0, max);
    if (required && !v) return;
    sets.push(`${col} = ?`);
    args.push(v);
  };
  put("name", p.name, 100, true);
  put("hospital_name", p.hospitalName, 100, true);
  put("department", p.department, 120);
  put("location", p.location, 100);
  put("tagline", p.tagline, 160);
  if (isHex(p.primaryColor)) { sets.push("primary_color = ?"); args.push(normalizePrimary(p.primaryColor)); }
  if (isHex(p.accentColor)) { sets.push("accent_color = ?"); args.push(normalizeAccent(p.accentColor)); }
  if (p.recordPrefix !== undefined) {
    const pre = p.recordPrefix.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (/^[A-Z0-9]{2,6}$/.test(pre)) { sets.push("record_prefix = ?"); args.push(pre); }
  }
  if (sets.length) {
    sets.push("brand_version = brand_version + 1");
    await c.execute({ sql: `UPDATE cf_tenants SET ${sets.join(", ")} WHERE id = ?`, args: [...args, id] });
  }
  clearTenantCache(id);
  return getTenantById(id);
}

export type AssetKind = "logo" | "hero";
const MAX_ASSET_CHARS: Record<AssetKind, number> = { logo: 350_000, hero: 900_000 };
const DATA_URL_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;

export async function setTenantAsset(id: string, kind: AssetKind, dataUrl: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  const c = await rawDb();
  const column = kind === "logo" ? "logo_data" : "hero_data";
  if (dataUrl !== null) {
    if (!DATA_URL_RE.test(dataUrl)) return { ok: false, message: "Use a PNG, JPG or WebP image." };
    if (dataUrl.length > MAX_ASSET_CHARS[kind]) return { ok: false, message: `That image is too large. Please use a smaller ${kind} image.` };
  }
  await c.execute({ sql: `UPDATE cf_tenants SET ${column} = ?, brand_version = brand_version + 1 WHERE id = ?`, args: [dataUrl, id] });
  clearTenantCache(id);
  return { ok: true };
}

export async function getTenantAsset(id: string, kind: AssetKind): Promise<{ mime: string; bytes: Buffer } | null> {
  const c = await rawDb();
  const column = kind === "logo" ? "logo_data" : "hero_data";
  const rs = await c.execute({ sql: `SELECT ${column} AS d FROM cf_tenants WHERE id = ?`, args: [id] });
  if (!rs.rows.length) return null;
  const d = (rs.rows[0] as unknown as Row).d;
  const m = typeof d === "string" ? d.match(DATA_URL_RE) : null;
  return m ? { mime: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}

export interface PlatformTenantRow extends Tenant {
  ownerEmail: string;
  students: number;
  staff: number;
  patients: number;
}

/** For the platform console: every institution with simple usage counts. */
export async function listTenantsForPlatform(): Promise<PlatformTenantRow[]> {
  const c = await rawDb();
  const rs = await c.execute(`SELECT ${COLUMNS}, owner_email FROM cf_tenants ORDER BY created_at DESC`);
  const out: PlatformTenantRow[] = [];
  for (const r of rs.rows) {
    const row = r as unknown as Row;
    const t = toTenant(row);
    let students = 0, staff = 0, patients = 0;
    try {
      const d = await db(t.id);
      const n = (sql: string) => d.execute(sql).then((x) => Number((x.rows[0] as unknown as Row).n));
      [students, staff, patients] = await Promise.all([
        n("SELECT COUNT(*) AS n FROM users"), n("SELECT COUNT(*) AS n FROM staff"), n("SELECT COUNT(*) AS n FROM patients"),
      ]);
    } catch {
      // an institution whose tables cannot be read simply shows zeros
    }
    out.push({ ...t, ownerEmail: str(row.owner_email), students, staff, patients });
  }
  return out;
}

export async function setTenantStatus(id: string, status: TenantStatus): Promise<boolean> {
  const c = await rawDb();
  const rs = await c.execute({ sql: "UPDATE cf_tenants SET status = ? WHERE id = ?", args: [status, id] });
  clearTenantCache(id);
  return rs.rowsAffected > 0;
}
