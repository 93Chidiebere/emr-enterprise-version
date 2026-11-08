import { NextResponse } from "next/server";
import { rawDb, dbConfigured } from "@/lib/db";
import { classifyDbError } from "@/lib/api-errors";
import { authConfigured, platformAdminConfigured } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

/** Open /api/health to see what is missing in the setup. It never shows secret values. */
export async function GET() {
  const checks = {
    TURSO_DATABASE_URL: dbConfigured ? "set" : "MISSING",
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN?.trim() ? "set" : "MISSING",
    AUTH_SECRET: authConfigured() ? "set" : "MISSING or shorter than 16 characters",
    PLATFORM_ADMIN_PASSWORD: platformAdminConfigured() ? "set" : "MISSING or shorter than 8 characters",
  };
  let database: { status: string; problem?: string; message?: string } = { status: "not_checked", message: "Set TURSO_DATABASE_URL first." };
  if (dbConfigured) {
    try {
      const c = await rawDb();
      await c.execute("SELECT 1");
      database = { status: "ok" };
    } catch (err) {
      console.error("[health] database check failed", err);
      const p = classifyDbError(err);
      database = { status: "failed", problem: p.code, message: p.message };
    }
  }
  const allGood = database.status === "ok" && authConfigured() && platformAdminConfigured() && Boolean(process.env.TURSO_AUTH_TOKEN?.trim());
  return NextResponse.json({ ok: allGood, settings: checks, database }, { status: allGood ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
