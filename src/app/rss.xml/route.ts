import { NextResponse, connection } from "next/server";
import { SITE_NAME, SITE_TAGLINE, normalizeSiteUrl } from "@/lib/seo";
import { loadPublishedArticles } from "@/lib/server/articles";

function escapeXml(value: string): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Serves RSS 2.0 XML syndication feed for Factual Technologies Engineering Blog articles. */
export async function GET() {
  await connection();
  const articles = await loadPublishedArticles();
  const lastBuildDate =
    articles[0]?.publishedAt || articles[0]?.updatedAt || new Date().toISOString();

  const itemsXml = articles
    .map((art) => {
      const link = normalizeSiteUrl(`/blog/${art.slug}`);
      const pubDate = new Date(art.publishedAt || art.updatedAt).toUTCString();
      const categoriesXml = [art.category, ...art.tags]
        .map((c) => `      <category>${escapeXml(c)}</category>`)
        .join("\n");

      return `    <item>
      <title>${escapeXml(art.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(art.excerpt || art.metaDescription)}</description>
      <author>${escapeXml(art.authorName)}</author>
      <pubDate>${escapeXml(pubDate)}</pubDate>
${categoriesXml}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Engineering Blog</title>
    <link>${escapeXml(normalizeSiteUrl("/blog"))}</link>
    <description>${escapeXml(`${SITE_TAGLINE} — technical guides on production AI search, cloud migrations, and resilient software engineering.`)}</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(new Date(lastBuildDate).toUTCString())}</lastBuildDate>
    <atom:link href="${escapeXml(normalizeSiteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
      "X-Robots-Tag": "all",
    },
  });
}
