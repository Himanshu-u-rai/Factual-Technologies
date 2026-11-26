import { NextResponse } from "next/server";
import { stripCrlf } from "@/lib/admin-types";
import { FullSiteContent, mergeSiteContent } from "@/lib/site-defaults";
import { requireAdmin } from "@/lib/server/auth";
import {
  loadMergedSiteContent,
  loadSiteSnapshots,
  syncProjectsInTransaction,
} from "@/lib/server/content";
import { deepSanitizeStrings, getClientIp } from "@/lib/server/crypto";
import { recordAuditLog, withTransaction } from "@/lib/server/db";

const MAX_CMS_PAYLOAD_BYTES = 512 * 1024;

/** Protected admin CMS endpoint returning full studio content, projects, and snapshots. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const [content, snapshots] = await Promise.all([
    loadMergedSiteContent({
      includeUnpublishedProjects: true,
      includeMessages: true,
    }),
    loadSiteSnapshots(),
  ]);

  return NextResponse.json(
    { content, snapshots },
    { headers: { "Cache-Control": "no-store, private" } }
  );
}

/** Protected admin CMS update endpoint persisting sanitized site content and project changes. */
export async function PUT(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  try {
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_CMS_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload exceeds 512 KB CMS limit." }, { status: 413 });
    }

    const body = JSON.parse(rawBody) as {
      content?: Partial<FullSiteContent>;
      reason?: string;
    } | null;

    if (!body?.content || typeof body.content !== "object") {
      return NextResponse.json({ error: "Invalid site content payload." }, { status: 400 });
    }

    const sanitizedPartial = deepSanitizeStrings(body.content);
    const current = await loadMergedSiteContent({
      includeUnpublishedProjects: true,
      includeMessages: false,
    });
    const nextMerged = mergeSiteContent({
      ...current,
      ...sanitizedPartial,
      messages: [],
    });

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO site_content (id, data, updated_at)
         VALUES ('live', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
           SET data = EXCLUDED.data,
               updated_at = NOW()`,
        [JSON.stringify({ ...nextMerged, messages: [] })]
      );

      if (Array.isArray(sanitizedPartial.projects)) {
        await syncProjectsInTransaction(client, nextMerged.projects);
      }
    });

    const reasonText = body.reason ? stripCrlf(deepSanitizeStrings(String(body.reason))).slice(0, 240) : "";
    await recordAuditLog({
      actor: auth.admin.email,
      category: "CMS",
      action: "Site Content Updated",
      ipAddress: getClientIp(req),
      details: reasonText || "Saved live website content updates to PostgreSQL.",
    });

    const refreshed = await loadMergedSiteContent({
      includeUnpublishedProjects: true,
      includeMessages: true,
    });
    return NextResponse.json({ ok: true, content: refreshed });
  } catch (err) {
    console.error("Failed to persist admin site content:", err);
    return NextResponse.json({ error: "Failed to save site content." }, { status: 400 });
  }
}
