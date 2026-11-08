import { NextResponse } from "next/server";
import { authConfigured, sessionFromCookie } from "@/lib/session";
import { db } from "@/lib/db";
import { getTenantById } from "@/lib/tenants";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

// Who is signed in (if anyone)? The page asks this when it opens.
export async function GET(request: Request) {
  const noStore = { "Cache-Control": "no-store" };
  if (!authConfigured()) return NextResponse.json({ configured: false, user: null, warnings: [] }, { headers: noStore });

  const s = sessionFromCookie();
  const wanted = new URL(request.url).searchParams.get("tenant");
  if (!s || s.kind === "platform") return NextResponse.json({ configured: true, user: null, warnings: [] }, { headers: noStore });

  // a sign-in for a different institution does not count here
  const tenant = await getTenantById(s.tid);
  if (!tenant || tenant.status !== "active" || (wanted && tenant.slug !== wanted.toLowerCase())) {
    return NextResponse.json({ configured: true, user: null, warnings: [] }, { headers: noStore });
  }

  try {
    const c = await db(s.tid);
    if (s.kind === "teacher") {
      const rs = await c.execute({ sql: "SELECT id, full_name, email, role, created_at FROM staff WHERE id = ?", args: [s.id] });
      if (!rs.rows.length) return NextResponse.json({ configured: true, user: null, warnings: [] }, { headers: noStore });
      const r = rs.rows[0] as unknown as Record<string, unknown>;
      return NextResponse.json(
        { configured: true, user: { id: String(r.id), fullName: String(r.full_name), email: String(r.email), assignedRole: "director", isAdmin: true, owner: String(r.role) === "owner", createdAt: String(r.created_at) }, warnings: [] },
        { headers: noStore }
      );
    }
    const rs = await c.execute({ sql: "SELECT id, full_name, role, created_at, email FROM users WHERE id = ?", args: [s.id] });
    if (!rs.rows.length) return NextResponse.json({ configured: true, user: null, warnings: [] }, { headers: noStore });
    const r = rs.rows[0] as unknown as Record<string, unknown>;
    return NextResponse.json(
      { configured: true, user: { id: String(r.id), fullName: String(r.full_name), assignedRole: String(r.role), createdAt: String(r.created_at), email: r.email ? String(r.email) : null }, warnings: [] },
      { headers: noStore }
    );
  } catch {
    return NextResponse.json({ configured: true, user: null, warnings: [], error: "DB_UNAVAILABLE" }, { headers: noStore });
  }
}
