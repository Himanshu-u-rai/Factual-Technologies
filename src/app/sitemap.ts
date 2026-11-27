import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { OG_IMAGE_PATH, SITE_URL, normalizeSiteUrl } from "@/lib/seo";
import { SERVICE_PILLARS, getCaseStudySlug } from "@/lib/seo-pillars";
import { loadPublishedArticles } from "@/lib/server/articles";
import { loadMergedSiteContent } from "@/lib/server/content";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-defaults";

const FALLBACK_MODIFIED = "2026-11-26T16:00:00.000Z";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const ogImageUrl = normalizeSiteUrl(OG_IMAGE_PATH);

  let projects = DEFAULT_SITE_CONTENT.projects;
  try {
    const content = await loadMergedSiteContent({
      includeUnpublishedProjects: false,
      includeMessages: false,
    });
    if (content.projects && content.projects.length > 0) {
      projects = content.projects;
    }
  } catch {
    // Fallback to static default case studies when DB is offline
  }

  const articles = await loadPublishedArticles();

  const coreEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "weekly",
      priority: 1.0,
      images: [ogImageUrl, ...projects.slice(0, 4).map((p) => normalizeSiteUrl(p.image))],
    },
    {
      url: normalizeSiteUrl("/services"),
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [ogImageUrl],
    },
    ...SERVICE_PILLARS.map((pillar) => ({
      url: normalizeSiteUrl(`/services/${pillar.slug}`),
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      images: [ogImageUrl],
    })),
    {
      url: normalizeSiteUrl("/work"),
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "weekly",
      priority: 0.9,
      images: [ogImageUrl, ...projects.map((p) => normalizeSiteUrl(p.image))],
    },
    ...projects.map((project) => ({
      url: normalizeSiteUrl(`/work/${getCaseStudySlug(project)}`),
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "monthly" as const,
      priority: 0.85,
      images: [normalizeSiteUrl(project.image)],
    })),
    {
      url: normalizeSiteUrl("/blog"),
      lastModified: articles[0]?.updatedAt || FALLBACK_MODIFIED,
      changeFrequency: "daily",
      priority: 0.9,
      images: [ogImageUrl],
    },
    ...articles.map((article) => ({
      url: normalizeSiteUrl(`/blog/${article.slug}`),
      lastModified: article.updatedAt || article.publishedAt || FALLBACK_MODIFIED,
      changeFrequency: "weekly" as const,
      priority: article.featured ? 0.85 : 0.8,
      images: [normalizeSiteUrl(article.coverImage)],
    })),
    {
      url: normalizeSiteUrl("/about"),
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [
        ogImageUrl,
        `${SITE_URL}/images/about-studio-1.jpg`,
        `${SITE_URL}/images/about-studio-2.jpg`,
      ],
    },
    {
      url: normalizeSiteUrl("/contact"),
      lastModified: FALLBACK_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [ogImageUrl],
    },
  ];

  return coreEntries;
}
