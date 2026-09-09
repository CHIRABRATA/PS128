import { NextResponse } from "next/server";

/**
 * Dedicated Next.js Reachability & Frontend Health Endpoint
 * Used by offline sync manager to verify real server reachability (decoupled from Telegram).
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Maitri Next.js App Server",
  });
}
