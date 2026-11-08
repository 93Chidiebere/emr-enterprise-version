import { NextResponse } from "next/server";
import { slugAvailable, slugify, validateSlug } from "@/lib/tenants";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Is this web address free? (used while registering an institution)
export async function GET(request: Request) {
  try {
    const slug = slugify(new URL(request.url).searchParams.get("slug") || "");
    const problem = validateSlug(slug);
    if (problem) return NextResponse.json({ slug, available: false, message: problem });
    const available = await slugAvailable(slug);
    return NextResponse.json({ slug, available, message: available ? "Available" : "Already taken" });
  } catch (err) {
    return errorResponse(err);
  }
}
