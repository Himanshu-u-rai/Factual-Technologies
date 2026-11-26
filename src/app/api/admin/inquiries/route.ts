import { NextResponse } from "next/server";
import { ARCHITECTS, InquiryPriority, InquiryStatus, sanitizeInput } from "@/lib/admin-types";
import { getServerSettings, requireAdmin } from "@/lib/server/auth";
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

/** Lists all inbound client inquiries stored in PostgreSQL. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const res = await dbQuery<DbInquiryRow>("SELECT * FROM inquiries ORDER BY created_at DESC");
  return NextResponse.json({ inquiries: res.rows.map(mapRowToInquiry) });
}

/** Creates an inquiry directly from the admin CRM console. */
export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    company?: string;
    message?: string;
    priority?: string;
    estimatedValue?: string;
    tags?: string[];
  } | null;

  const name = sanitizeInput((body?.name || "").trim());
  const email = sanitizeInput((body?.email || "").trim().toLowerCase());
  const company = sanitizeInput((body?.company || "").trim()) || "Direct Inquiry";
  const message = sanitizeInput((body?.message || "").trim());

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  const settings = await getServerSettings();
  const id = `INQ-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}-${String(
    Date.now()
  ).slice(-4)}`;
  const priority: InquiryPriority =
    body?.priority === "Critical" || body?.priority === "High" ? body.priority : "Normal";
  const assignedArchitect = settings.autoAssignEnabled
    ? ARCHITECTS[Math.floor(Math.random() * ARCHITECTS.length)].name
    : null;
  const cleanTags = Array.isArray(body?.tags)
    ? body.tags.map((t) => sanitizeInput(String(t)).slice(0, 40)).filter(Boolean)
    : [];

  const inserted = await dbQuery<DbInquiryRow>(
    `INSERT INTO inquiries (id, name, email, company, message, status, priority, assigned_architect, estimated_value, tags, notes, read)
     VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9::jsonb, '[]'::jsonb, false)
     RETURNING *`,
    [
      id,
      name.slice(0, 120),
      email.slice(0, 160),
      company.slice(0, 160),
      message.slice(0, 5000),
      priority,
      assignedArchitect,
      body?.estimatedValue ? sanitizeInput(body.estimatedValue).slice(0, 60) : null,
      JSON.stringify(cleanTags),
    ]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Inquiry",
    action: "Inquiry Added Manually",
    ipAddress: getClientIp(req),
    details: `Added CRM inquiry ${id} for ${name} (${company}).`,
  });

  return NextResponse.json(
    { ok: true, inquiry: mapRowToInquiry(inserted.rows[0]) },
    { status: 201 }
  );
}

/** Bulk updates inquiry statuses in PostgreSQL. */
export async function PATCH(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as {
    ids?: string[];
    status?: InquiryStatus;
  } | null;

  if (
    !body?.ids ||
    !Array.isArray(body.ids) ||
    body.ids.length === 0 ||
    !body.status ||
    !VALID_STATUSES.includes(body.status)
  ) {
    return NextResponse.json({ error: "Invalid bulk inquiry update request." }, { status: 400 });
  }

  const res = await dbQuery<DbInquiryRow>(
    `UPDATE inquiries SET status = $2 WHERE id = ANY($1::text[]) RETURNING *`,
    [body.ids, body.status]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Inquiry",
    action: "Bulk Inquiry Status Updated",
    ipAddress: getClientIp(req),
    details: `Moved ${res.rowCount ?? 0} inquiries to "${body.status}".`,
  });

  return NextResponse.json({ ok: true, count: res.rowCount ?? 0 });
}

/** Bulk deletes selected inquiries from PostgreSQL. */
export async function DELETE(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as { ids?: string[] } | null;
  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "No inquiry IDs provided." }, { status: 400 });
  }

  const del = await dbQuery<{ id: string }>(
    "DELETE FROM inquiries WHERE id = ANY($1::text[]) RETURNING id",
    [body.ids]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Inquiry",
    action: "Bulk Inquiries Deleted",
    ipAddress: getClientIp(req),
    details: `Deleted ${del.rowCount ?? 0} inquiries.`,
  });

  return NextResponse.json({ ok: true, deletedIds: del.rows.map((r) => r.id) });
}
