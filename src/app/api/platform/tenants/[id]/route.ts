import { NextResponse } from "next/server";
import { setTenantStatus } from "@/lib/tenants";
import { requirePlatform } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Suspend or reactivate an institution.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const guard = requirePlatform();
  if (!guard.ok) return guard.response;
  try {
    const b = await request.json().catch(() => ({}));
    if (b?.status !== "active" && b?.status !== "suspended") return NextResponse.json({ success: false, message: "Status must be active or suspended." }, { status: 400 });
    const ok = await setTenantStatus(params.id, b.status);
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  } catch (err) {
    return errorResponse(err);
  }
}
