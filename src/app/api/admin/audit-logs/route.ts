import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { DbAuditLogRow, mapRowToAuditLog } from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";

/** Lists immutable audit events stored in PostgreSQL (newest first). */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const res = await dbQuery<DbAuditLogRow>(
    "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 250"
  );
  return NextResponse.json({ logs: res.rows.map(mapRowToAuditLog) });
}

/** Clears old audit entries and writes a single audit-reset record. */
export async function DELETE(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  await dbQuery("DELETE FROM audit_logs");
  await recordAuditLog({
    actor: auth.admin.email,
    category: "Security",
    action: "Audit Trail Reset",
    ipAddress: getClientIp(req),
    details: "Audit log history cleared by authenticated administrator.",
  });

  const res = await dbQuery<DbAuditLogRow>(
    "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50"
  );
  return NextResponse.json({ ok: true, logs: res.rows.map(mapRowToAuditLog) });
}
