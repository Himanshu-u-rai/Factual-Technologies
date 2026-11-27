import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Clock } from "lucide-react";

import MarkdownArticle from "@/components/blog/MarkdownArticle";
import CTABanner from "@/components/layout/CTABanner";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";
import FaqList from "@/components/ui/FaqList";
import { extractMarkdownHeadings } from "@/lib/articles-shared";
import {
  buildBlogArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
} from "@/lib/seo";
import { loadArticleBySlug, loadPublishedArticles } from "@/lib/server/articles";

function formatArticleDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const article = await loadArticleBySlug(slug);

  if (!article) {
    return buildPageMetadata({
      title: "Article Not Found",
      description: "Explore Factual Technologies engineering articles and architecture guides.",
      path: "/blog",
    });
  }

  return buildPageMetadata({
    title: article.metaTitle || article.title,
    description: article.metaDescription || article.excerpt,
    path: `/blog/${article.slug}`,
    keywords: [article.focusKeyword, article.category, ...article.tags].filter(Boolean),
    type: "article",
    imagePath: article.coverImage,
    publishedTime: article.publishedAt || article.createdAt,
    modifiedTime: article.updatedAt,
    authors: [article.authorName],
  });
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const [article, allArticles] = await Promise.all([
    loadArticleBySlug(slug),
    loadPublishedArticles(),
  ]);

  if (!article) {
    notFound();
  }

  const tocHeadings = extractMarkdownHeadings(article.contentMarkdown);
  const relatedArticles = allArticles
    .filter((other) => other.slug !== article.slug)
    .sort((a, b) => Number(b.category === article.category) - Number(a.category === article.category))
    .slice(0, 3);

  return (
    <>
      <JsonLd
        id="ld-article-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: article.title, path: `/blog/${article.slug}` },
        ])}
      />
      <JsonLd id="ld-article-main" data={buildBlogArticleJsonLd(article)} />
      {article.faqs.length > 0 && (
        <JsonLd id="ld-article-faq" data={buildFaqJsonLd(article.faqs)} />
      )}

      <div className="min-h-screen bg-white text-slate-900">
        {/* 1. ARTICLE HEADER */}
        <article>
          <header className="pt-32 pb-12 sm:pt-40 sm:pb-16 border-b border-slate-200/70 bg-white">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
              <Breadcrumbs
                items={[
                  { name: "Home", href: "/" },
                  { name: "Blog", href: "/blog" },
                  { name: article.title },
                ]}
                className="mb-6"
              />

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mb-5">
                <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-semibold">
                  {article.category}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {article.readingTimeMinutes} min read
                </span>
                <span>·</span>
                <span>{article.wordCount} words</span>
                {article.publishedAt && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />{" "}
                      {formatArticleDate(article.publishedAt)}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.1] [text-wrap:balance]">
                {article.title}
              </h1>

              {article.subtitle && (
                <p className="mt-5 font-sans text-lg sm:text-xl leading-relaxed text-slate-600 [text-wrap:pretty]">
                  {article.subtitle}
                </p>
              )}

              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-950 text-sm">{article.authorName}</div>
                  {article.authorRole && (
                    <div className="text-xs text-slate-500 mt-0.5">{article.authorRole}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <ShowcaseImage
                  src={article.coverImage}
                  alt={article.coverImageAlt || article.title}
                  ratio="16/9"
                  priority
                />
              </div>
            </div>
          </header>

          {/* 2. ARTICLE BODY + STICKY TOC */}
          <div className="py-14 sm:py-20 bg-white border-b border-slate-200/70">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
              {tocHeadings.length > 0 && (
                <aside className="lg:col-span-4 lg:order-last">
                  <div className="lg:sticky lg:top-28 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>On This Page</span>
                    </div>
                    <nav aria-label="Table of Contents" className="space-y-2">
                      {tocHeadings.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={`block text-sm hover:text-blue-700 transition-colors ${
                            h.level === 3
                              ? "pl-4 text-slate-500"
                              : "font-medium text-slate-800"
                          }`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                </aside>
              )}

              <div className={tocHeadings.length > 0 ? "lg:col-span-8" : "lg:col-span-10 lg:col-start-2"}>
                <MarkdownArticle markdown={article.contentMarkdown} />

                {/* AEO FAQ BLOCK INSIDE ARTICLE */}
                {article.faqs.length > 0 && (
                  <section className="mt-14 pt-10 border-t border-slate-200">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight mb-6">
                      Frequently Asked Questions
                    </h2>
                    <FaqList faqs={article.faqs} surface="flat" defaultOpenFirst />
                  </section>
                )}

                {/* AUTHOR E-E-A-T CARD */}
                <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
                      Written By
                    </div>
                    <h2 className="font-display text-xl font-bold text-slate-950">
                      {article.authorName}
                    </h2>
                    {article.authorRole && (
                      <div className="text-sm font-medium text-blue-700">{article.authorRole}</div>
                    )}
                    {article.authorBio && (
                      <p className="text-sm text-slate-600 leading-[1.6]">{article.authorBio}</p>
                    )}
                  </div>
                  <Link
                    href="/about"
                    className="min-h-[44px] inline-flex items-center text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 shrink-0"
                  >
                    About our engineering team
                  </Link>
                </section>
              </div>
            </div>
          </div>
        </article>

        {/* 3. RELATED ARTICLES */}
        {relatedArticles.length > 0 && (
          <section className="py-16 sm:py-20 bg-slate-50/40 border-b border-slate-200/70">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
              <div className="flex items-center justify-between gap-4 mb-8">
                <h2 className="font-display text-2xl font-bold text-slate-950 tracking-tight">
                  More Engineering Guides
                </h2>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4" /> All articles
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((other) => (
                  <article
                    key={other.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="text-xs font-mono text-slate-500">
                        {other.category} · {other.readingTimeMinutes} min read
                      </div>
                      <h3 className="font-display text-lg font-bold text-slate-950 tracking-tight">
                        <Link
                          href={`/blog/${other.slug}`}
                          className="hover:text-blue-700 transition-colors"
                        >
                          {other.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-3 leading-[1.55]">
                        {other.excerpt}
                      </p>
                    </div>
                    <Link
                      href={`/blog/${other.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-blue-600"
                    >
                      Read guide <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <CTABanner
          title="Need senior engineers working inside your repository?"
          subtitle="Tell us about your upcoming AI, cloud migration, or product build. An engineering lead replies the same day."
          buttonText="Book an architecture call"
          buttonHref="/contact"
        />
      </div>
    </>
  );
}
