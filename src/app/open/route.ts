import { NextRequest, NextResponse } from "next/server";
import { slugify } from "@/lib/tenants";

export function GET(request: NextRequest) {
  const slug = slugify(request.nextUrl.searchParams.get("slug") || "");
  return NextResponse.redirect(new URL(`/${encodeURIComponent(slug)}`, request.url));
}
