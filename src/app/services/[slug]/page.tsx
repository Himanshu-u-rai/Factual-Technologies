import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Layers, Shield } from "lucide-react";

import CTABanner from "@/components/layout/CTABanner";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import FaqList from "@/components/ui/FaqList";
import SectionHeader from "@/components/ui/SectionHeader";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";
import { INITIAL_ARTICLES } from "@/lib/articles-shared";
import { projects as defaultProjects } from "@/lib/data";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
  buildServicePillarJsonLd,
} from "@/lib/seo";
import {
  SERVICE_PILLARS,
  getCaseStudySlug,
  getServicePillarBySlug,
} from "@/lib/seo-pillars";

export function generateStaticParams() {
  return SERVICE_PILLARS.map((pillar) => ({ slug: pillar.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pillar = getServicePillarBySlug(slug);
  if (!pillar) {
    return buildPageMetadata({
      title: "Engineering Service Not Found",
      description: "Explore Factual Technologies software, cloud, and AI engineering services.",
      path: "/services",
    });
  }

  return buildPageMetadata({
    title: pillar.seoTitle,
    description: pillar.seoDescription,
    path: `/services/${pillar.slug}`,
    keywords: pillar.keywords,
  });
}

export default async function ServicePillarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pillar = getServicePillarBySlug(slug);
  if (!pillar) {
    notFound();
  }

  const relatedProjects = defaultProjects.filter((p) =>
    pillar.relatedCaseStudySlugs.includes(getCaseStudySlug(p))
  );
  const relatedArticles = INITIAL_ARTICLES.filter((a) =>
    pillar.relatedArticleSlugs.includes(a.slug)
  );
  const siblingPillars = SERVICE_PILLARS.filter((p) => p.slug !== pillar.slug);

  return (
    <>
      <JsonLd
        id="ld-pillar-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: pillar.title, path: `/services/${pillar.slug}` },
        ])}
      />
      <JsonLd id="ld-pillar-service" data={buildServicePillarJsonLd(pillar)} />
      <JsonLd id="ld-pillar-faq" data={buildFaqJsonLd(pillar.faqs)} />

      <div className="min-h-screen bg-white text-slate-900">
        {/* 1. HERO */}
        <section className="pt-32 pb-20 sm:pt-40 sm:pb-24 border-b border-slate-200/70 bg-white">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Services", href: "/services" },
                { name: pillar.title },
              ]}
              className="mb-6"
            />

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance]">
              {pillar.title}
            </h1>

            <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-3xl [text-wrap:pretty]">
              {pillar.heroSummary}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button href="/contact" variant="primary" size="lg">
                Scope your engagement
              </Button>
              <Button href="/work" variant="outline" size="lg">
                Browse production builds
              </Button>
            </div>
          </div>
        </section>

        {/* 2. OUTCOMES & COMPLIANCE POSTURE */}
        <section className="py-16 sm:py-24 bg-slate-50/40 border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-7 space-y-6">
              <SectionHeader
                align="left"
                title="Production Outcomes"
                subtitle="Built by embedded senior engineers directly inside your source repositories."
                className="!mb-0"
              />
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {pillar.outcomes.map((outcome) => (
                  <li key={outcome} className="py-4 flex items-start gap-3 text-base text-slate-800">
                    <Check className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 self-start">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-slate-900" />
                <h2 className="font-display text-xl font-bold text-slate-950">
                  Core Deliverables
                </h2>
              </div>
              <ul className="space-y-3 text-sm text-slate-700">
                {pillar.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-2">
                {pillar.complianceStandards.map((std) => (
                  <span
                    key={std}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-700"
                  >
                    {std}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. SYSTEM ARCHITECTURE PATTERNS */}
        <section className="py-20 sm:py-28 bg-white border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <SectionHeader
              align="left"
              title="Architecture Standards in Practice"
              subtitle="Engineering patterns applied across every sprint from discovery to handover."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              {pillar.architectureHighlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50/40 p-6 space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-900">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-950 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 leading-[1.6]">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 4. RELATED CASE STUDIES & TECHNICAL GUIDES */}
        <section className="py-20 sm:py-28 bg-slate-50/40 border-b border-slate-200/70">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
            {relatedProjects.length > 0 && (
              <div>
                <SectionHeader
                  align="left"
                  title="Representative Case Studies"
                  subtitle={`Production builds delivered under our ${pillar.title} practice.`}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                  {relatedProjects.map((project) => {
                    const projectSlug = getCaseStudySlug(project);
                    return (
                      <article
                        key={projectSlug}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <ShowcaseImage
                            src={project.image}
                            alt={`${project.title} — ${project.metrics}`}
                            ratio="16/10"
                            className="!rounded-none !border-0 !border-b"
                          />
                          <div className="p-6 space-y-3">
                            <h3 className="font-display text-xl font-bold text-slate-950 tracking-tight">
                              <Link
                                href={`/work/${projectSlug}`}
                                className="hover:text-blue-700 transition-colors"
                              >
                                {project.title}
                              </Link>
                            </h3>
                            <p className="text-sm text-slate-600 leading-[1.6]">
                              {project.description}
                            </p>
                          </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200/80 flex items-center justify-between text-xs font-semibold">
                          <span className="font-mono text-slate-500">{project.category.toUpperCase()}</span>
                          <Link
                            href={`/work/${projectSlug}`}
                            className="inline-flex items-center gap-1 text-slate-900 hover:text-blue-600"
                          >
                            Read breakdown <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {relatedArticles.length > 0 && (
              <div>
                <SectionHeader
                  align="left"
                  title="Related Engineering Guides"
                  subtitle="Architectural implementation notes from our engineering leads."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {relatedArticles.map((article) => (
                    <article
                      key={article.slug}
                      className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3"
                    >
                      <div className="text-xs font-mono text-slate-500">
                        {article.category} · {article.readingTimeMinutes} min read
                      </div>
                      <h3 className="font-display text-xl font-bold text-slate-950 tracking-tight">
                        <Link
                          href={`/blog/${article.slug}`}
                          className="hover:text-blue-700 transition-colors"
                        >
                          {article.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-slate-600 leading-[1.6]">{article.excerpt}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. PILLAR FAQ */}
        <section className="py-20 sm:py-24 bg-white border-b border-slate-200/70">
          <div className="max-w-4xl mx-auto px-6 lg:px-8">
            <SectionHeader
              align="left"
              title={`${pillar.shortName} Questions`}
              subtitle="Direct answers on architecture scoping, ownership, and team workflows."
            />
            <div className="mt-10">
              <FaqList faqs={pillar.faqs} surface="flat" defaultOpenFirst />
            </div>

            <div className="mt-14 pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Other core practices:</span>
              <div className="flex flex-wrap gap-4">
                {siblingPillars.map((other) => (
                  <Link
                    key={other.slug}
                    href={`/services/${other.slug}`}
                    className="text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300"
                  >
                    {other.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. CTA */}
        <CTABanner
          title="Discuss your system architecture"
          subtitle={`Share your roadmap and constraints around ${pillar.title.toLowerCase()}. An engineering lead will respond the same day.`}
          buttonText="Schedule technical discovery"
          buttonHref="/contact"
        />
      </div>
    </>
  );
}
