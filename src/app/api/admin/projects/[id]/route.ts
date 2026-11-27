import { NextResponse } from "next/server";
import { CaseStudy, ProjectCategory, sanitizeInput, sanitizeSafeUrl } from "@/lib/admin-types";
import { requireAdmin } from "@/lib/server/auth";
import { DbProjectRow, mapRowToCaseStudy } from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";
import { getCaseStudySlug } from "@/lib/seo-pillars";
import { submitUrlsToIndexNow } from "@/lib/server/indexnow";

function normalizeCategory(value?: string): ProjectCategory {
  if (value === "ai" || value === "web" || value === "cloud" || value === "mobile") {
    return value;
  }
  return "web";
}

/** Updates an existing case study in PostgreSQL (including publish state & homepage spotlight). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  }
  const existingRes = await dbQuery<DbProjectRow>("SELECT * FROM projects WHERE id = $1", [id]);
  const existing = existingRes.rows[0];
  if (!existing) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Partial<CaseStudy> & {
    featuredOnHome?: boolean;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const nextTitle =
    body.title !== undefined ? sanitizeInput(body.title.trim()).slice(0, 200) : existing.title;
  const nextCategory =
    body.category !== undefined
      ? normalizeCategory(body.category)
      : normalizeCategory(existing.category);
  const nextMetrics =
    body.metrics !== undefined
      ? sanitizeInput(body.metrics.trim()).slice(0, 160)
      : existing.metrics;
  const nextDescription =
    body.description !== undefined
      ? sanitizeInput(body.description.trim()).slice(0, 2000)
      : existing.description;
  const nextTags =
    Array.isArray(body.tags)
      ? body.tags.map((t) => sanitizeInput(String(t)).slice(0, 40)).filter(Boolean)
      : Array.isArray(existing.tags)
      ? existing.tags.map(String)
      : [];
  const nextImage =
    body.image !== undefined
      ? sanitizeSafeUrl(body.image, "/projects/regulatory-search.jpg").slice(0, 500)
      : existing.image;
  const nextPublished =
    body.published !== undefined ? Boolean(body.published) : existing.published;
  const nextFeatured =
    body.featuredOnHome !== undefined ? Boolean(body.featuredOnHome) : existing.featured_on_home;

  const updated = await dbQuery<DbProjectRow>(
    `UPDATE projects
     SET title = $2,
         category = $3,
         metrics = $4,
         description = $5,
         tags = $6::jsonb,
         image = $7,
         published = $8,
         featured_on_home = $9,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      nextTitle,
      nextCategory,
      nextMetrics,
      nextDescription,
      JSON.stringify(nextTags),
      nextImage,
      nextPublished,
      nextFeatured,
    ]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Project Updated",
    ipAddress: getClientIp(req),
    details: `Updated case study "${nextTitle}" (${id}).`,
  });

  const updatedProject = mapRowToCaseStudy(updated.rows[0]);
  if (updatedProject.published) {
    void submitUrlsToIndexNow(
      ["/work", `/work/${getCaseStudySlug(updatedProject)}`, "/sitemap.xml"],
      {
        actor: auth.admin.email,
        ipAddress: getClientIp(req),
        quiet: true,
      }
    );
  }

  return NextResponse.json({ ok: true, project: updatedProject });
}

/** Deletes a case study from PostgreSQL. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
  }
  const del = await dbQuery<{ id: string; title: string }>(
    "DELETE FROM projects WHERE id = $1 RETURNING id, title",
    [id]
  );

  if (del.rowCount === 0) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Project Deleted",
    ipAddress: getClientIp(req),
    details: `Deleted case study "${del.rows[0].title}" (${id}).`,
  });

  return NextResponse.json({ ok: true, id });
}
