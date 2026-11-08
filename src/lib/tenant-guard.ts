import { NextResponse } from "next/server";
import { getTenantBySlug, type Tenant } from "./tenants";

/** Finds the institution named in a sign-in request. */
export async function tenantFromSlug(
  slug: unknown
): Promise<{ ok: true; tenant: Tenant } | { ok: false; response: NextResponse }> {
  const s = String(slug || "").trim().toLowerCase();
  if (!s) {
    return { ok: false, response: NextResponse.json({ success: false, error: "TENANT_REQUIRED", message: "Open your institution's page to sign in." }, { status: 400 }) };
  }
  const tenant = await getTenantBySlug(s);
  if (!tenant) {
    return { ok: false, response: NextResponse.json({ success: false, error: "TENANT_NOT_FOUND", message: "That institution was not found." }, { status: 404 }) };
  }
  if (tenant.status !== "active") {
    return { ok: false, response: NextResponse.json({ success: false, error: "TENANT_SUSPENDED", message: "This institution's account is suspended. Please contact the platform owner." }, { status: 403 }) };
  }
  return { ok: true, tenant };
}
