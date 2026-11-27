import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/server/db";

/** Lightweight readiness probe for Docker HEALTHCHECK and reverse-proxy monitoring. */
export async function GET() {
  try {
    await dbQuery("SELECT 1");
    return NextResponse.json(
      { ok: true, status: "healthy" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Healthcheck failed:", err);
    return NextResponse.json(
      { ok: false, status: "unhealthy" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
