import { NextResponse } from "next/server";
import { sanitizeInput } from "@/lib/admin-types";
import { requireAdmin } from "@/lib/server/auth";
import { loadMergedSiteContent, loadSiteSnapshots } from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";

/** Lists saved studio configuration snapshots. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const snapshots = await loadSiteSnapshots();
  return NextResponse.json({ snapshots });
}

/** Creates a timestamped snapshot of the live PostgreSQL studio content. */
export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const cleanName =
    sanitizeInput((body?.name || "").trim()).slice(0, 120) ||
    `Snapshot ${new Date().toLocaleString()}`;

  const currentContent = await loadMergedSiteContent({
    includeUnpublishedProjects: true,
    includeMessages: false,
  });

  const id = `snap-${Date.now()}`;
  await dbQuery(
    `INSERT INTO site_snapshots (id, name, author, content)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [id, cleanName, auth.admin.name, JSON.stringify({ ...currentContent, messages: [] })]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Snapshot Created",
    ipAddress: getClientIp(req),
    details: `Saved CMS snapshot "${cleanName}" (${id}).`,
  });

  const snapshots = await loadSiteSnapshots();
  return NextResponse.json({ ok: true, id, snapshots }, { status: 201 });
}
