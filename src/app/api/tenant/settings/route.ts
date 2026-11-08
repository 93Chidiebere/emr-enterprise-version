import { NextResponse } from "next/server";
import { getTenantById, setTenantAsset, updateTenantBranding } from "@/lib/tenants";
import { requireOwner, requireTeacher } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET() {
  const guard = await requireTeacher();
  if (!guard.ok) return guard.response;
  const tenant = await getTenantById(guard.tid);
  return NextResponse.json({ success: true, tenant, owner: guard.owner });
}

// The owner changes the institution's name, colours, logo, record prefix...
export async function PATCH(request: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;
  try {
    const b = await request.json().catch(() => ({}));
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    await updateTenantBranding(guard.tid, {
      name: str(b?.name), hospitalName: str(b?.hospitalName), department: str(b?.department), location: str(b?.location),
      tagline: str(b?.tagline), primaryColor: str(b?.primaryColor), accentColor: str(b?.accentColor), recordPrefix: str(b?.recordPrefix),
    });
    for (const [field, kind] of [["logoDataUrl", "logo"], ["heroDataUrl", "hero"]] as const) {
      if (b && field in b) {
        const r = await setTenantAsset(guard.tid, kind, b[field] === null ? null : String(b[field]));
        if (!r.ok) return NextResponse.json({ success: false, message: r.message }, { status: 400 });
      }
    }
    return NextResponse.json({ success: true, tenant: await getTenantById(guard.tid) });
  } catch (err) {
    return errorResponse(err);
  }
}
