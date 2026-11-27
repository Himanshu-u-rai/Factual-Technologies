"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Search } from "lucide-react";

import CTABanner from "@/components/layout/CTABanner";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";
import { ARTICLE_CATEGORIES, BlogArticle } from "@/lib/articles-shared";

interface BlogIndexClientProps {
  articles: BlogArticle[];
}

function formatPublishedDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function BlogIndexClient({ articles }: BlogIndexClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [query, setQuery] = useState<string>("");

  const categories = ["All", ...ARTICLE_CATEGORIES];

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((art) => {
      if (selectedCategory !== "All" && art.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.tags.some((t) => t.toLowerCase().includes(q)) ||
        art.authorName.toLowerCase().includes(q)
      );
    });
  }, [articles, selectedCategory, query]);

  const leadArticle = filteredArticles.find((a) => a.featured) || filteredArticles[0];
  const restArticles = leadArticle
    ? filteredArticles.filter((a) => a.id !== leadArticle.id)
    : [];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* 1. HERO HEADER */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-slate-200/70 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Engineering Blog" },
            ]}
            className="mb-6"
          />

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance]">
                Engineering Guides &amp; Field Notes
              </h1>
              <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl [text-wrap:pretty]">
                Architecture notes from production builds covering permission-scoped RAG search, zero-downtime multi-cloud migrations, offline-first systems, and security automation.
              </p>
            </div>

            <div className="w-full lg:w-80">
              <label htmlFor="blog-search" className="sr-only">
                Search articles
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="blog-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by stack, topic, or author..."
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[40px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:text-slate-950 hover:bg-slate-200/70"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. ARTICLES LIST */}
      <section className="py-16 sm:py-24 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 space-y-14">
          {filteredArticles.length === 0 ? (
            <div className="py-14 text-center max-w-md mx-auto space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-950">
                No articles match this filter
              </h2>
              <p className="text-sm text-slate-600">
                Reset the topic filter or clear your search term to browse all published guides.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("All");
                  setQuery("");
                }}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Show all articles
              </button>
            </div>
          ) : (
            <>
              {/* Featured Lead Article */}
              {leadArticle && (
                <article className="rounded-2xl border border-slate-200 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-6">
                    <ShowcaseImage
                      src={leadArticle.coverImage}
                      alt={leadArticle.coverImageAlt || leadArticle.title}
                      ratio="16/10"
                      className="!rounded-none !border-0 h-full"
                      priority
                    />
                  </div>
                  <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500">
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-semibold">
                          {leadArticle.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {leadArticle.readingTimeMinutes} min read
                        </span>
                        {leadArticle.publishedAt && (
                          <span>{formatPublishedDate(leadArticle.publishedAt)}</span>
                        )}
                      </div>

                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight leading-[1.2]">
                        <Link
                          href={`/blog/${leadArticle.slug}`}
                          className="hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                        >
                          {leadArticle.title}
                        </Link>
                      </h2>

                      <p className="text-sm sm:text-base text-slate-600 leading-[1.65]">
                        {leadArticle.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                      <div className="text-xs">
                        <div className="font-semibold text-slate-950">{leadArticle.authorName}</div>
                        {leadArticle.authorRole && (
                          <div className="text-slate-500">{leadArticle.authorRole}</div>
                        )}
                      </div>

                      <Link
                        href={`/blog/${leadArticle.slug}`}
                        className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300"
                      >
                        Read guide <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )}

              {/* Article Grid */}
              {restArticles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restArticles.map((article) => (
                    <article
                      key={article.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <ShowcaseImage
                          src={article.coverImage}
                          alt={article.coverImageAlt || article.title}
                          ratio="16/10"
                          className="!rounded-none !border-0 !border-b"
                        />
                        <div className="p-6 space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                            <span className="font-semibold text-slate-800">{article.category}</span>
                            <span>·</span>
                            <span>{article.readingTimeMinutes} min read</span>
                          </div>

                          <h2 className="font-display text-xl font-bold text-slate-950 tracking-tight leading-[1.25]">
                            <Link
                              href={`/blog/${article.slug}`}
                              className="hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                            >
                              {article.title}
                            </Link>
                          </h2>

                          <p className="text-sm text-slate-600 leading-[1.6] line-clamp-3">
                            {article.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="px-6 py-4 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-slate-700 truncate">
                          {article.authorName}
                        </span>
                        <Link
                          href={`/blog/${article.slug}`}
                          className="min-h-[36px] inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 shrink-0"
                        >
                          Read article <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <CTABanner
        title="Working on a complex software, cloud, or AI build?"
        subtitle="Discuss your roadmap directly with the senior engineers shipping these architectures."
        buttonText="Schedule technical discovery"
        buttonHref="/contact"
      />
    </div>
  );
}
