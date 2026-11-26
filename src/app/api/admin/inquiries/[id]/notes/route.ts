import { NextResponse } from "next/server";
import { InquiryNote, sanitizeInput } from "@/lib/admin-types";
import { requireAdmin } from "@/lib/server/auth";
import { DbInquiryRow, mapRowToInquiry } from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";

/** Appends a timestamped internal engineering review note onto an inquiry. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid inquiry ID." }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const cleanText = sanitizeInput((body?.text || "").trim()).slice(0, 2000);
  if (!cleanText) {
    return NextResponse.json({ error: "Note text cannot be empty." }, { status: 400 });
  }

  const currentRes = await dbQuery<DbInquiryRow>("SELECT * FROM inquiries WHERE id = $1", [id]);
  const existing = currentRes.rows[0];
  if (!existing) {
    return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  }

  const existingNotes: InquiryNote[] = Array.isArray(existing.notes) ? existing.notes : [];
  const nextNote: InquiryNote = {
    id: `note-${Date.now()}`,
    author: auth.admin.name,
    text: cleanText,
    createdAt: new Date().toISOString(),
  };

  const updated = await dbQuery<DbInquiryRow>(
    "UPDATE inquiries SET notes = $2::jsonb WHERE id = $1 RETURNING *",
    [id, JSON.stringify([...existingNotes, nextNote])]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Inquiry",
    action: "Engineering Note Added",
    ipAddress: getClientIp(req),
    details: `Appended note onto inquiry ${id}.`,
  });

  return NextResponse.json(
    { ok: true, inquiry: mapRowToInquiry(updated.rows[0]), note: nextNote },
    { status: 201 }
  );
}
