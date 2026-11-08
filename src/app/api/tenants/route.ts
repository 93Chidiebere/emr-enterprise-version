import { NextResponse } from "next/server";
import { createTenant, slugAvailable, slugify, validateSlug } from "@/lib/tenants";
import { createStaff } from "@/lib/staff";
import { authConfigured, setSessionCookie } from "@/lib/session";
import { errorResponse } from "@/lib/api-errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// A university or trainer registers their own institution. The person registering becomes its owner.
export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ success: false, error: "AUTH_NOT_CONFIGURED", message: "The platform is not fully set up yet." }, { status: 503 });
  }
  try {
    const b = await request.json().catch(() => ({}));
    const name = String(b?.name || "").trim();
    if (name.length < 3) return NextResponse.json({ success: false, message: "Enter the institution's name." }, { status: 400 });
    const slug = slugify(String(b?.slug || name));
    const slugProblem = validateSlug(slug);
    if (slugProblem) return NextResponse.json({ success: false, message: slugProblem }, { status: 400 });
    if (!(await slugAvailable(slug))) return NextResponse.json({ success: false, message: `The address '${slug}' is already taken. Please choose another.` }, { status: 409 });

    // validate the owner BEFORE creating anything
    const ownerName = String(b?.ownerName || "").trim();
    const ownerEmail = String(b?.ownerEmail || "").trim();
    const ownerPassword = String(b?.ownerPassword || "");
    if (ownerName.length < 2) return NextResponse.json({ success: false, message: "Enter your full name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(ownerEmail)) return NextResponse.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
    if (ownerPassword.length < 8) return NextResponse.json({ success: false, message: "Password must be at least 8 characters." }, { status: 400 });

    const tenant = await createTenant({
      slug, name,
      hospitalName: String(b?.hospitalName || ""), department: String(b?.department || ""), location: String(b?.location || ""),
      tagline: String(b?.tagline || ""), primaryColor: String(b?.primaryColor || ""), accentColor: String(b?.accentColor || ""),
      recordPrefix: String(b?.recordPrefix || ""), ownerEmail,
    });
    const owner = await createStaff(tenant.id, { fullName: ownerName, email: ownerEmail, password: ownerPassword, role: "owner" });
    if (!owner.ok) return NextResponse.json({ success: false, message: owner.message }, { status: 400 });

    const res = NextResponse.json({ success: true, slug: tenant.slug }, { status: 201 });
    setSessionCookie(res, { kind: "teacher", tid: tenant.id, id: owner.staff.id, name: owner.staff.fullName, role: "director" });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
