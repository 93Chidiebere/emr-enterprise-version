import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Retired: wiping records from the browser is no longer possible.
// Teachers now use "Start new session" (keeps all earlier data for reports).
// This file can be deleted.
export async function POST() {
  return NextResponse.json(
    { success: false, error: "GONE", message: "Use 'Start new session' as a signed-in teacher." },
    { status: 410 }
  );
}
