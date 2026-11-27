import type { Metadata } from "next";
import { connection } from "next/server";

export const instant = false;
import BlogIndexClient from "./BlogIndexClient";
import JsonLd from "@/components/seo/JsonLd";
import {
  buildBlogIndexJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";
import { loadPublishedArticles } from "@/lib/server/articles";

export const metadata: Metadata = buildPageMetadata({
  title: "Engineering Blog — AI Search, Multi-Cloud & Production Software",
  description:
    "Practical technical guides authored by Factual Technologies engineers covering permission-scoped RAG pipelines, zero-downtime Kafka migrations, offline-first sync, and SOC2/HIPAA Terraform guardrails.",
  path: "/blog",
  keywords: [
    "Software Engineering Blog",
    "Permission-Scoped RAG Architecture",
    "Multi-Cloud Kafka Migration Guide",
    "Offline-First React Native Architecture",
    "SOC2 HIPAA Terraform Automation",
    "Factual Technologies Engineering",
  ],
});

export default async function BlogPage() {
  await connection();
  const articles = await loadPublishedArticles();

  return (
    <>
      <JsonLd
        id="ld-blog-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <JsonLd id="ld-blog-collection" data={buildBlogIndexJsonLd(articles)} />
      <BlogIndexClient articles={articles} />
    </>
  );
}
