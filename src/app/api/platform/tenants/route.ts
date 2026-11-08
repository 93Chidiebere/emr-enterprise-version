import { NextResponse } from "next/server";
import { listTenantsForPlatform } from "@/lib/tenants";
import { requirePlatform } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export async function GET() {
  const guard = requirePlatform();
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ success: true, data: await listTenantsForPlatform() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return errorResponse(err);
  }
}
