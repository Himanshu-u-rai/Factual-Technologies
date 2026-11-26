import { NextResponse } from "next/server";
import { FullSiteContent, mergeSiteContent } from "@/lib/site-defaults";
import { requireAdmin } from "@/lib/server/auth";
import {
  loadMergedSiteContent,
  loadSiteSnapshots,
  syncProjectsInTransaction,
} from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog, withTransaction } from "@/lib/server/db";

/** Restores the live studio website content to a saved PostgreSQL snapshot. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid snapshot ID." }, { status: 400 });
  }
  const snapRes = await dbQuery<{
    id: string;
    name: string;
    content: Partial<FullSiteContent>;
  }>("SELECT id, name, content FROM site_snapshots WHERE id = $1", [id]);

  const snap = snapRes.rows[0];
  if (!snap) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  const restored = mergeSiteContent({ ...snap.content, messages: [] });
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO site_content (id, data, updated_at)
       VALUES ('live', $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data,
             updated_at = NOW()`,
      [JSON.stringify({ ...restored, messages: [] })]
    );
    await syncProjectsInTransaction(client, restored.projects);
  });

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Snapshot Restored",
    ipAddress: getClientIp(req),
    details: `Restored CMS content from snapshot "${snap.name}" (${snap.id}).`,
  });

  const content = await loadMergedSiteContent({
    includeUnpublishedProjects: true,
    includeMessages: true,
  });
  return NextResponse.json({ ok: true, content });
}

/** Deletes a saved CMS snapshot by ID. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid snapshot ID." }, { status: 400 });
  }
  const del = await dbQuery<{ id: string }>(
    "DELETE FROM site_snapshots WHERE id = $1 RETURNING id",
    [id]
  );

  if (del.rowCount === 0) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Snapshot Deleted",
    ipAddress: getClientIp(req),
    details: `Removed snapshot ${id}.`,
  });

  const snapshots = await loadSiteSnapshots();
  return NextResponse.json({ ok: true, snapshots });
}
