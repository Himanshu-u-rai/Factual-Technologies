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

/** Lists all blog articles (draft, published, archived) for the Admin Blog Studio. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const res = await dbQuery<DbArticleRow>(
    `SELECT * FROM articles
     ORDER BY featured DESC, COALESCE(published_at, updated_at) DESC`
  );
  return NextResponse.json({ articles: res.rows.map(mapRowToBlogArticle) });
}

/** Creates a new blog article or technical guide in PostgreSQL cleanly. */
export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as Partial<BlogArticle> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid article payload." }, { status: 400 });
  }

  const normalized = sanitizeArticleInput(body);
  if (!normalized.title || !normalized.contentMarkdown) {
    return NextResponse.json(
      { error: "Article headline and markdown body are required." },
      { status: 400 }
    );
  }

  const slug = await ensureUniqueArticleSlug(body.slug || normalized.title);
  const id = `art-${Date.now()}`;
  const excerpt =
    normalized.excerpt || normalized.contentMarkdown.slice(0, 220).replace(/[#`>*_\n]+/g, " ").trim();

  const inserted = await dbQuery<DbArticleRow>(
    `INSERT INTO articles (
      id, slug, title, subtitle, excerpt, content_markdown, category, tags,
      cover_image, cover_image_alt, author_name, author_role, author_bio, author_linkedin,
      meta_title, meta_description, canonical_url, focus_keyword, faqs, status, featured,
      reading_time_minutes, word_count, view_count, published_at, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
      $9, $10, $11, $12, $13, $14,
      $15, $16, $17, $18, $19::jsonb, $20, $21,
      $22, $23, 0, $24::timestamptz, NOW(), NOW()
    ) RETURNING *`,
    [
      id,
      slug,
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

  const created = mapRowToBlogArticle(inserted.rows[0]);
  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Article Created",
    ipAddress: getClientIp(req),
    details: `Created ${created.status} article "${created.title}" (/blog/${created.slug}).`,
  });

  if (created.status === "published") {
    void submitUrlsToIndexNow(
      ["/blog", `/blog/${created.slug}`, "/sitemap.xml", "/rss.xml"],
      {
        actor: auth.admin.email,
        ipAddress: getClientIp(req),
        quiet: true,
      }
    );
  }

  return NextResponse.json({ ok: true, article: created }, { status: 201 });
}
