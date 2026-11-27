import { NextResponse } from "next/server";
import { SERVICE_PILLARS, getCaseStudySlug } from "@/lib/seo-pillars";
import { requireAdmin } from "@/lib/server/auth";
import { loadPublishedArticles } from "@/lib/server/articles";
import { loadMergedSiteContent } from "@/lib/server/content";
import { getClientIp } from "@/lib/server/crypto";
import { submitUrlsToIndexNow } from "@/lib/server/indexnow";

/** Admin trigger to push all or specific canonical URLs to IndexNow (Bing / ChatGPT Search / Copilot). */
export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { urls?: string[] } | null;
  let targetUrls = Array.isArray(body?.urls) ? body.urls.map(String) : [];

  if (targetUrls.length === 0) {
    const [content, articles] = await Promise.all([
      loadMergedSiteContent({ includeUnpublishedProjects: false, includeMessages: false }),
      loadPublishedArticles(),
    ]);

    targetUrls = [
      "/",
      "/services",
      ...SERVICE_PILLARS.map((p) => `/services/${p.slug}`),
      "/work",
      ...content.projects.map((p) => `/work/${getCaseStudySlug(p)}`),
      "/blog",
      ...articles.map((a) => `/blog/${a.slug}`),
      "/about",
      "/contact",
    ];
  }

  const result = await submitUrlsToIndexNow(targetUrls, {
    actor: auth.admin.email,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(result, { status: result.submitted ? 200 : 502 });
}
