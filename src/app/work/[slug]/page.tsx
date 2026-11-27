import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";

export const instant = false;
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import CTABanner from "@/components/layout/CTABanner";
import JsonLd from "@/components/seo/JsonLd";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";
import {
  buildBreadcrumbJsonLd,
  buildCaseStudyArticleJsonLd,
  buildPageMetadata,
} from "@/lib/seo";
import {
  getCaseStudyDetail,
  getCaseStudySlug,
  getServicePillarBySlug,
} from "@/lib/seo-pillars";
import { loadMergedSiteContent } from "@/lib/server/content";
import { DEFAULT_SITE_CONTENT, ProjectContent } from "@/lib/site-defaults";

async function loadPublicProjects(): Promise<ProjectContent[]> {
  try {
    const content = await loadMergedSiteContent({
      includeUnpublishedProjects: false,
      includeMessages: false,
    });
    return content.projects.length > 0 ? content.projects : DEFAULT_SITE_CONTENT.projects;
  } catch {
    return DEFAULT_SITE_CONTENT.projects;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const projects = await loadPublicProjects();
  const project = projects.find((p) => getCaseStudySlug(p) === slug);

  if (!project) {
    return buildPageMetadata({
      title: "Case Study Not Found",
      description: "Browse verified engineering engagements by Factual Technologies.",
      path: "/work",
    });
  }

  return buildPageMetadata({
    title: `${project.title} — Case Study`,
    description: project.description,
    path: `/work/${slug}`,
    keywords: [project.title, project.category.toUpperCase(), ...project.tags, "Case Study"],
    type: "article",
    imagePath: project.image,
  });
}

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const projects = await loadPublicProjects();
  const idx = projects.findIndex((p) => getCaseStudySlug(p) === slug);
  if (idx === -1) {
    notFound();
  }

  const project = projects[idx];
  const detail = getCaseStudyDetail(project);
  const pillar = getServicePillarBySlug(detail.pillarSlug);
  const prevProject = projects[(idx - 1 + projects.length) % projects.length];
  const nextProject = projects[(idx + 1) % projects.length];

  return (
    <>
      <JsonLd
        id="ld-case-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
          { name: project.title, path: `/work/${detail.slug}` },
        ])}
      />
      <JsonLd
        id="ld-case-article"
        data={buildCaseStudyArticleJsonLd(project, detail)}
      />

      <div className="min-h-screen bg-white text-slate-900">
        {/* 1. HERO HEADER */}
        <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-slate-200/70 bg-white">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Work", href: "/work" },
                { name: project.title },
              ]}
              className="mb-6"
            />

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mb-4">
              <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-900 font-semibold">
                {project.category.toUpperCase()}
              </span>
              <span>{detail.timelineLabel}</span>
              <span>·</span>
              <span>{project.metrics}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance]">
              {project.title}
            </h1>

            <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-3xl [text-wrap:pretty]">
              {project.description}
            </p>

            <div className="mt-10">
              <ShowcaseImage
                src={project.image}
                alt={`${project.title} — ${project.metrics}`}
                ratio="16/9"
                priority
              />
            </div>
          </div>
        </section>

        {/* 2. ARCHITECTURE BREAKDOWN */}
        <section className="py-16 sm:py-24 bg-slate-50/40 border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 space-y-14">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <h2 className="md:col-span-4 font-display text-2xl font-bold text-slate-950 tracking-tight">
                Engineering Challenge
              </h2>
              <p className="md:col-span-8 text-base sm:text-lg text-slate-700 leading-[1.7] [text-wrap:pretty]">
                {detail.challenge}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <h2 className="md:col-span-4 font-display text-2xl font-bold text-slate-950 tracking-tight">
                System Architecture
              </h2>
              <ul className="md:col-span-8 space-y-4">
                {detail.solutionArchitecture.map((step) => (
                  <li key={step} className="flex items-start gap-3 text-base text-slate-700 leading-[1.65]">
                    <Check className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-200 pt-12 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <h2 className="md:col-span-4 font-display text-2xl font-bold text-slate-950 tracking-tight">
                Production Outcomes &amp; Stack
              </h2>
              <div className="md:col-span-8 space-y-6">
                <ul className="space-y-3">
                  {detail.outcomes.map((out) => (
                    <li key={out} className="flex items-start gap-3 text-base text-slate-800 font-medium">
                      <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{out}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2 pt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {pillar && (
                  <div className="pt-4">
                    <Button href={`/services/${pillar.slug}`} variant="outline" size="md">
                      Explore {pillar.title} practice
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. ADJACENT CASE STUDIES */}
        <section className="py-12 bg-white border-b border-slate-200/70">
          <div className="max-w-5xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row justify-between gap-4 text-sm">
            {prevProject && getCaseStudySlug(prevProject) !== detail.slug ? (
              <Link
                href={`/work/${getCaseStudySlug(prevProject)}`}
                className="inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-950 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>{prevProject.title}</span>
              </Link>
            ) : (
              <span />
            )}

            {nextProject && getCaseStudySlug(nextProject) !== detail.slug && (
              <Link
                href={`/work/${getCaseStudySlug(nextProject)}`}
                className="inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-950 transition-colors sm:text-right"
              >
                <span>{nextProject.title}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            )}
          </div>
        </section>

        <CTABanner
          title="Planning a similar architecture build?"
          subtitle="Tell us what your engineering team is building or migrating. We reply the same day."
          buttonText="Talk to an engineering lead"
          buttonHref="/contact"
        />
      </div>
    </>
  );
}
