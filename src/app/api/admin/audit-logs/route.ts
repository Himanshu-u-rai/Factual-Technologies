import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { DbAuditLogRow, mapRowToAuditLog } from "@/lib/server/content";
import { dbQuery } from "@/lib/server/db";

/** Lists immutable audit events stored in PostgreSQL (newest first). */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const res = await dbQuery<DbAuditLogRow>(
    "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 250"
  );
  return NextResponse.json({ logs: res.rows.map(mapRowToAuditLog) });
}

/** Rejects deletion to preserve append-only audit trail integrity. */
export async function DELETE() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  return NextResponse.json(
    { error: "Audit logs are immutable and cannot be deleted." },
    { status: 405, headers: { Allow: "GET" } }
  );
}
