import { NextResponse } from "next/server";
import { getTenantAsset, getTenantBySlug } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Public logo / hero image of an institution (cached by browsers; the page adds ?v=<version> when it changes).
export async function GET(_req: Request, { params }: { params: { slug: string; kind: string } }) {
  if (params.kind !== "logo" && params.kind !== "hero") return new NextResponse("Not found", { status: 404 });
  const tenant = await getTenantBySlug(params.slug);
  if (!tenant || tenant.status !== "active") return new NextResponse("Not found", { status: 404 });
  const asset = await getTenantAsset(tenant.id, params.kind);
  if (!asset) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: { "Content-Type": asset.mime, "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
