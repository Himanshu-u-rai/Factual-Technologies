import "server-only";

import { sanitizeInput, sanitizeSafeUrl } from "@/lib/admin-types";
import { ARTICLES_2027 } from "@/lib/articles-2027";
import { ARTICLES_LATEST_2026 } from "@/lib/articles-latest-2026";
import {
  ArticleFaqItem,
  BlogArticle,
  INITIAL_ARTICLES,
  calculateReadingMetrics,
  normalizeArticleCategory,
  normalizeArticleStatus,
  sanitizeArticleFaqs,
  slugifyText,
} from "@/lib/articles-shared";
import { dbQuery } from "@/lib/server/db";

const ALL_SEED_ARTICLES = [...ARTICLES_LATEST_2026, ...ARTICLES_2027, ...INITIAL_ARTICLES];

export interface DbArticleRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content_markdown: string;
  category: string;
  tags: unknown;
  cover_image: string;
  cover_image_alt: string;
  author_name: string;
  author_role: string;
  author_bio: string;
  author_linkedin: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  focus_keyword: string;
  faqs: unknown;
  status: string;
  featured: boolean;
  reading_time_minutes: number;
  word_count: number;
  view_count: number;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Maps a PostgreSQL articles row safely to a strongly typed BlogArticle object. */
export function mapRowToBlogArticle(row: DbArticleRow): BlogArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || "",
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    category: normalizeArticleCategory(row.category),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    coverImage: sanitizeSafeUrl(row.cover_image, "/blog/enterprise-rag-2027.jpg"),
    coverImageAlt: row.cover_image_alt || row.title,
    authorName: row.author_name || "Factual Technologies Engineering",
    authorRole: row.author_role || "",
    authorBio: row.author_bio || "",
    authorLinkedIn: row.author_linkedin
      ? sanitizeSafeUrl(row.author_linkedin, "", { allowRelative: false }) || undefined
      : undefined,
    metaTitle: row.meta_title || row.title,
    metaDescription: row.meta_description || row.excerpt,
    canonicalUrl: row.canonical_url
      ? sanitizeSafeUrl(row.canonical_url, "", { allowRelative: false }) || undefined
      : undefined,
    focusKeyword: row.focus_keyword || "",
    faqs: sanitizeArticleFaqs(row.faqs),
    status: normalizeArticleStatus(row.status),
    featured: Boolean(row.featured),
    readingTimeMinutes: Number(row.reading_time_minutes) || 1,
    wordCount: Number(row.word_count) || 0,
    viewCount: Number(row.view_count) || 0,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Loads all published articles for public /blog, sitemap, RSS, and /llms.txt cleanly. */
export async function loadPublishedArticles(): Promise<BlogArticle[]> {
  try {
    const res = await dbQuery<DbArticleRow>(
      `SELECT * FROM articles
       WHERE status = 'published'
       ORDER BY featured DESC, published_at DESC NULLS LAST, updated_at DESC`
    );
    return res.rows.map(mapRowToBlogArticle);
  } catch {
    return ALL_SEED_ARTICLES.filter((a) => a.status === "published");
  }
}

/** Loads a single article by slug with safe static fallback when DB is unreachable during build. */
export async function loadArticleBySlug(
  slug: string,
  options?: { includeUnpublished?: boolean }
): Promise<BlogArticle | null> {
  const cleanSlug = slugifyText(slug);
  try {
    const res = await dbQuery<DbArticleRow>(
      options?.includeUnpublished
        ? "SELECT * FROM articles WHERE slug = $1 LIMIT 1"
        : "SELECT * FROM articles WHERE slug = $1 AND status = 'published' LIMIT 1",
      [cleanSlug]
    );
    if (res.rows[0]) {
      return mapRowToBlogArticle(res.rows[0]);
    }
    return null;
  } catch {
    return (
      ALL_SEED_ARTICLES.find(
        (a) => a.slug === cleanSlug && (options?.includeUnpublished || a.status === "published")
      ) || null
    );
  }
}

/** Generates a unique URL slug avoiding collisions against existing rows cleanly. */
export async function ensureUniqueArticleSlug(
  candidate: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugifyText(candidate);
  let attempt = baseSlug;
  let suffix = 2;

  while (suffix < 50) {
    const res = await dbQuery<{ id: string }>(
      excludeId
        ? "SELECT id FROM articles WHERE slug = $1 AND id <> $2 LIMIT 1"
        : "SELECT id FROM articles WHERE slug = $1 LIMIT 1",
      excludeId ? [attempt, excludeId] : [attempt]
    );
    if (res.rowCount === 0) return attempt;
    attempt = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return `${baseSlug}-${Date.now()}`;
}

/** Sanitizes and normalizes inbound admin article payloads before writing to PostgreSQL. */
export function sanitizeArticleInput(
  body: Partial<BlogArticle>,
  existing?: BlogArticle
): {
  title: string;
  subtitle: string;
  excerpt: string;
  contentMarkdown: string;
  category: string;
  tags: string[];
  coverImage: string;
  coverImageAlt: string;
  authorName: string;
  authorRole: string;
  authorBio: string;
  authorLinkedIn: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  focusKeyword: string;
  faqs: ArticleFaqItem[];
  status: "draft" | "published" | "archived";
  featured: boolean;
  readingTimeMinutes: number;
  wordCount: number;
  publishedAt: string | null;
} {
  const title = sanitizeInput(
    (body.title !== undefined ? body.title : existing?.title || "").trim()
  ).slice(0, 200);
  const subtitle = sanitizeInput(
    (body.subtitle !== undefined ? body.subtitle : existing?.subtitle || "").trim()
  ).slice(0, 280);
  const excerpt = sanitizeInput(
    (body.excerpt !== undefined ? body.excerpt : existing?.excerpt || "").trim()
  ).slice(0, 600);
  const contentMarkdown = sanitizeInput(
    body.contentMarkdown !== undefined
      ? body.contentMarkdown
      : existing?.contentMarkdown || ""
  ).slice(0, 120_000);

  const category = normalizeArticleCategory(
    body.category !== undefined ? body.category : existing?.category
  );
  const tags = Array.isArray(body.tags)
    ? Array.from(
        new Set(
          body.tags
            .map((t) => sanitizeInput(String(t)).trim().slice(0, 40))
            .filter(Boolean)
        )
      ).slice(0, 10)
    : existing?.tags || [];

  const coverImage = sanitizeSafeUrl(
    body.coverImage !== undefined ? body.coverImage : existing?.coverImage,
    "/blog/enterprise-rag-2027.jpg"
  ).slice(0, 500);

  const coverImageAlt = sanitizeInput(
    (body.coverImageAlt !== undefined
      ? body.coverImageAlt
      : existing?.coverImageAlt || title
    ).trim()
  ).slice(0, 240);

  const authorName =
    sanitizeInput(
      (body.authorName !== undefined
        ? body.authorName
        : existing?.authorName || "Priyanshu Rai"
      ).trim()
    ).slice(0, 120) || "Priyanshu Rai";

  const authorRole = sanitizeInput(
    (body.authorRole !== undefined
      ? body.authorRole
      : existing?.authorRole || "Engineering Lead"
    ).trim()
  ).slice(0, 120);

  const authorBio = sanitizeInput(
    (body.authorBio !== undefined ? body.authorBio : existing?.authorBio || "").trim()
  ).slice(0, 400);

  const authorLinkedIn = sanitizeSafeUrl(
    body.authorLinkedIn !== undefined
      ? body.authorLinkedIn
      : existing?.authorLinkedIn || "",
    "",
    { allowRelative: false }
  ).slice(0, 300);

  const metaTitle = sanitizeInput(
    (body.metaTitle !== undefined ? body.metaTitle : existing?.metaTitle || title).trim()
  ).slice(0, 120);

  const metaDescription = sanitizeInput(
    (body.metaDescription !== undefined
      ? body.metaDescription
      : existing?.metaDescription || excerpt
    ).trim()
  ).slice(0, 320);

  const canonicalUrl = sanitizeSafeUrl(
    body.canonicalUrl !== undefined ? body.canonicalUrl : existing?.canonicalUrl || "",
    "",
    { allowRelative: false }
  ).slice(0, 400);

  const focusKeyword = sanitizeInput(
    (body.focusKeyword !== undefined ? body.focusKeyword : existing?.focusKeyword || "").trim()
  ).slice(0, 120);

  const faqs =
    body.faqs !== undefined ? sanitizeArticleFaqs(body.faqs) : existing?.faqs || [];

  const status = normalizeArticleStatus(
    body.status !== undefined ? body.status : existing?.status
  );

  const featured =
    body.featured !== undefined ? Boolean(body.featured) : existing?.featured ?? false;

  const { wordCount, readingTimeMinutes } = calculateReadingMetrics(contentMarkdown);

  let publishedAt: string | null = existing?.publishedAt ?? null;
  if (body.publishedAt !== undefined) {
    if (body.publishedAt === null || body.publishedAt === "") {
      publishedAt = status === "published" ? new Date().toISOString() : null;
    } else {
      const parsed = new Date(body.publishedAt);
      publishedAt = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    }
  } else if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  return {
    title,
    subtitle,
    excerpt,
    contentMarkdown,
    category,
    tags,
    coverImage,
    coverImageAlt,
    authorName,
    authorRole,
    authorBio,
    authorLinkedIn,
    metaTitle,
    metaDescription,
    canonicalUrl,
    focusKeyword,
    faqs,
    status,
    featured,
    readingTimeMinutes,
    wordCount,
    publishedAt,
  };
}
