import { NextResponse } from "next/server";
import { authConfigured, platformAdminConfigured, platformPasswordMatches, setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The platform owner signs in to the /platform console.
export async function POST(request: Request) {
  if (!authConfigured() || !platformAdminConfigured()) {
    return NextResponse.json({ success: false, message: "Set AUTH_SECRET and PLATFORM_ADMIN_PASSWORD (8+ characters) first." }, { status: 503 });
  }
  const b = await request.json().catch(() => ({}));
  if (!platformPasswordMatches(String(b?.password || ""))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ success: false, message: "Incorrect password." }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  setSessionCookie(res, { kind: "platform", tid: "-", id: "platform", name: "Platform owner", role: "platform" });
  return res;
}
