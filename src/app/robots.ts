import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PUBLIC_ALLOW_PATHS = [
  "/",
  "/services",
  "/services/",
  "/work",
  "/work/",
  "/blog",
  "/blog/",
  "/about",
  "/contact",
  "/llms.txt",
  "/llms-full.txt",
  "/rss.xml",
  "/sitemap.xml",
  "/opengraph-image",
  "/manifest.webmanifest",
  "/indexnow-key.txt",
  "/.well-known/security.txt",
];

const PRIVATE_DISALLOW_PATHS = ["/admin", "/admin/", "/api", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "Googlebot",
          "Google-Extended",
          "Bingbot",
          "Applebot",
          "Applebot-Extended",
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "PerplexityBot",
          "Perplexity-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "DuckDuckBot",
        ],
        allow: PUBLIC_ALLOW_PATHS,
        disallow: PRIVATE_DISALLOW_PATHS,
      },
      {
        userAgent: "*",
        allow: PUBLIC_ALLOW_PATHS,
        disallow: PRIVATE_DISALLOW_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
