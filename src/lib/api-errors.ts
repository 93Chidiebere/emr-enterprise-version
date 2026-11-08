import { NextResponse } from "next/server";
import { DbNotConfiguredError } from "./db";
import { SessionClosedError } from "./store";

export type DbProblemCode =
  | "DB_AUTH_FAILED"
  | "DB_PERMISSION"
  | "DB_NOT_FOUND"
  | "DB_UNREACHABLE"
  | "DB_BAD_URL"
  | "DB_ERROR";

/** Turns a raw database error into a short, safe explanation (no secrets). */
export function classifyDbError(err: unknown): { code: DbProblemCode; message: string } {
  const raw = err instanceof Error ? `${err.name} ${err.message} ${String((err as { code?: unknown }).code ?? "")}` : String(err);

  if (/URL_SCHEME|URL_INVALID|invalid url|scheme|protocol/i.test(raw)) {
    return {
      code: "DB_BAD_URL",
      message: "TURSO_DATABASE_URL is not a valid database address. It should look like libsql://your-database-yourname.turso.io",
    };
  }
  if (/\b401\b|unauthorized|unauthenticated|auth.?failed|invalid.?token|jwt|expired/i.test(raw)) {
    return {
      code: "DB_AUTH_FAILED",
      message: "Turso rejected the database token. Create a new database token in Turso and update TURSO_AUTH_TOKEN in Vercel.",
    };
  }
  if (/\b403\b|forbidden|read.?only|permission|not allowed/i.test(raw)) {
    return {
      code: "DB_PERMISSION",
      message: "The Turso token cannot write to this database. Create a token with Read & Write (full access) for this database.",
    };
  }
  if (/\b404\b|no such database|database .*not (found|exist)/i.test(raw)) {
    return {
      code: "DB_NOT_FOUND",
      message: "Turso could not find that database. Check that TURSO_DATABASE_URL matches the database you created.",
    };
  }
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|fetch failed|network|socket|getaddrinfo|timed? ?out/i.test(raw)) {
    return {
      code: "DB_UNREACHABLE",
      message: "The server could not reach the database. Check TURSO_DATABASE_URL for typing mistakes and that the database still exists.",
    };
  }
  return { code: "DB_ERROR", message: "The database returned an error. Check the Vercel logs for details." };
}

/** Turns storage errors into clear JSON responses. */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof DbNotConfiguredError) {
    return NextResponse.json(
      { success: false, error: "DB_NOT_CONFIGURED", message: "The database is not connected yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (err instanceof SessionClosedError) {
    return NextResponse.json(
      { success: false, error: "SESSION_CLOSED", message: "This class session has been closed by the teacher." },
      { status: 409 }
    );
  }
  // Full details go to the Vercel logs; the browser only gets a safe explanation.
  console.error("[server error]", err);
  const problem = classifyDbError(err);
  return NextResponse.json(
    { success: false, error: problem.code, message: problem.message },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}
