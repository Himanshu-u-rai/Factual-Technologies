import { NextResponse } from "next/server";
import {
  InquiryPriority,
  InquiryStatus,
  sanitizeInput,
} from "@/lib/admin-types";
import { requireAdmin } from "@/lib/server/auth";
import { DbInquiryRow, mapRowToInquiry } from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";

const VALID_STATUSES: InquiryStatus[] = [
  "New",
  "In Review",
  "NDA Sent",
  "Discovery Scheduled",
  "Converted",
  "Archived",
];
const VALID_PRIORITIES: InquiryPriority[] = ["Critical", "High", "Normal"];

/** Updates an inquiry status, priority, assigned architect, read flag, or metadata. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid inquiry ID." }, { status: 400 });
  }
  const currentRes = await dbQuery<DbInquiryRow>("SELECT * FROM inquiries WHERE id = $1", [id]);
  const existing = currentRes.rows[0];
  if (!existing) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: InquiryStatus;
    priority?: InquiryPriority;
    assignedArchitect?: string | null;
    estimatedValue?: string;
    read?: boolean;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const nextStatus =
    body.status && VALID_STATUSES.includes(body.status) ? body.status : (existing.status as InquiryStatus);
  const nextPriority =
    body.priority && VALID_PRIORITIES.includes(body.priority)
      ? body.priority
      : (existing.priority as InquiryPriority);
  const nextArchitect =
    body.assignedArchitect !== undefined
      ? body.assignedArchitect
        ? sanitizeInput(body.assignedArchitect).slice(0, 120)
        : null
      : existing.assigned_architect;
  const nextEstimated =
    body.estimatedValue !== undefined
      ? sanitizeInput(body.estimatedValue).slice(0, 60) || null
      : existing.estimated_value;
  const nextRead = body.read !== undefined ? Boolean(body.read) : existing.read;

  const updated = await dbQuery<DbInquiryRow>(
    `UPDATE inquiries
     SET status = $2,
         priority = $3,
         assigned_architect = $4,
         estimated_value = $5,
         read = $6
     WHERE id = $1
     RETURNING *`,
    [id, nextStatus, nextPriority, nextArchitect, nextEstimated, nextRead]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Inquiry",
    action: "Inquiry Updated",
    ipAddress: getClientIp(req),
    details: `Updated inquiry ${id} (status: ${nextStatus}, priority: ${nextPriority}).`,
  });

  return NextResponse.json({ ok: true, inquiry: mapRowToInquiry(updated.rows[0]) });
}

/** Deletes a single inquiry from PostgreSQL. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid inquiry ID." }, { status: 400 });
  }
  const del = await dbQuery<{ id: string }>(
    "DELETE FROM inquiries WHERE id = $1 RETURNING id",
    [id]
  );

  if (del.rowCount === 0) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Inquiry",
    action: "Inquiry Deleted",
    ipAddress: getClientIp(req),
    details: `Deleted inquiry ${id}.`,
  });

  return NextResponse.json({ ok: true, id });
}
