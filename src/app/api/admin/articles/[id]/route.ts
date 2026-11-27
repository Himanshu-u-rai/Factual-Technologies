import { NextResponse } from "next/server";
import { BlogArticle } from "@/lib/articles-shared";
import { requireAdmin } from "@/lib/server/auth";
import {
  DbArticleRow,
  ensureUniqueArticleSlug,
  mapRowToBlogArticle,
  sanitizeArticleInput,
} from "@/lib/server/articles";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";
import { submitUrlsToIndexNow } from "@/lib/server/indexnow";

/** Returns a single blog article record for Admin editing. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: "Invalid article ID." }, { status: 400 });
  }

  const res = await dbQuery<DbArticleRow>("SELECT * FROM articles WHERE id = $1 LIMIT 1", [id]);
  if (!res.rows[0]) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  return NextResponse.json({ article: mapRowToBlogArticle(res.rows[0]) });
}

/** Updates an existing blog article in PostgreSQL (content, SEO, FAQs, status, featured flag). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: "Invalid article ID." }, { status: 400 });
  }

  const existingRes = await dbQuery<DbArticleRow>(
    "SELECT * FROM articles WHERE id = $1 LIMIT 1",
    [id]
  );
  if (!existingRes.rows[0]) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const existing = mapRowToBlogArticle(existingRes.rows[0]);
  const body = (await req.json().catch(() => null)) as Partial<BlogArticle> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  const normalized = sanitizeArticleInput(body, existing);
  if (!normalized.title || !normalized.contentMarkdown) {
    return NextResponse.json(
      { error: "Article headline and body cannot be empty." },
      { status: 400 }
    );
  }

  const nextSlug =
    body.slug !== undefined && body.slug !== existing.slug
      ? await ensureUniqueArticleSlug(body.slug, id)
      : existing.slug;

  const excerpt =
    normalized.excerpt ||
    normalized.contentMarkdown.slice(0, 220).replace(/[#`>*_\n]+/g, " ").trim();

  const updated = await dbQuery<DbArticleRow>(
    `UPDATE articles
     SET slug = $2,
         title = $3,
         subtitle = $4,
         excerpt = $5,
         content_markdown = $6,
         category = $7,
         tags = $8::jsonb,
         cover_image = $9,
         cover_image_alt = $10,
         author_name = $11,
         author_role = $12,
         author_bio = $13,
         author_linkedin = $14,
         meta_title = $15,
         meta_description = $16,
         canonical_url = $17,
         focus_keyword = $18,
         faqs = $19::jsonb,
         status = $20,
         featured = $21,
         reading_time_minutes = $22,
         word_count = $23,
         published_at = $24::timestamptz,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      nextSlug,
      normalized.title,
      normalized.subtitle,
      excerpt,
      normalized.contentMarkdown,
      normalized.category,
      JSON.stringify(normalized.tags),
      normalized.coverImage,
      normalized.coverImageAlt || normalized.title,
      normalized.authorName,
      normalized.authorRole,
      normalized.authorBio,
      normalized.authorLinkedIn,
      normalized.metaTitle || normalized.title,
      normalized.metaDescription || excerpt,
      normalized.canonicalUrl,
      normalized.focusKeyword,
      JSON.stringify(normalized.faqs),
      normalized.status,
      normalized.featured,
      normalized.readingTimeMinutes,
      normalized.wordCount,
      normalized.publishedAt,
    ]
  );

  const saved = mapRowToBlogArticle(updated.rows[0]);
  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Article Updated",
    ipAddress: getClientIp(req),
    details: `Updated article "${saved.title}" (${saved.status}, /blog/${saved.slug}).`,
  });

  if (saved.status === "published") {
    void submitUrlsToIndexNow(
      ["/blog", `/blog/${saved.slug}`, "/sitemap.xml", "/rss.xml"],
      {
        actor: auth.admin.email,
        ipAddress: getClientIp(req),
        quiet: true,
      }
    );
  }

  return NextResponse.json({ ok: true, article: saved });
}

/** Deletes a blog article permanently from PostgreSQL cleanly. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: "Invalid article ID." }, { status: 400 });
  }

  const del = await dbQuery<{ id: string; title: string; slug: string }>(
    "DELETE FROM articles WHERE id = $1 RETURNING id, title, slug",
    [id]
  );

  if (del.rowCount === 0) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Article Deleted",
    ipAddress: getClientIp(req),
    details: `Deleted article "${del.rows[0].title}" (/blog/${del.rows[0].slug}).`,
  });

  return NextResponse.json({ ok: true, id });
}
