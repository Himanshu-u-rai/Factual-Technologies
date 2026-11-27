'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen } from 'lucide-react';

import Button from '@/components/ui/Button';
import { ShowcaseImage } from '@/components/ui/EditorialMedia';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CTABanner from '@/components/layout/CTABanner';
import { getCaseStudySlug } from '@/lib/seo-pillars';
import { projects as defaultProjects } from '@/lib/data';
import { useSiteContent } from '@/lib/site-store';
import { AnimatedBackground } from '@/components/motion-primitives';

const filterTabs = ['All', 'AI', 'Web', 'Cloud', 'Mobile'] as const;
type FilterTab = (typeof filterTabs)[number];

export default function WorkPage() {
  const { content } = useSiteContent();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const workPage = content.workPage || {
    heroBadge: "",
    heroTitle: "Selected engineering engagements",
    heroSubtitle: "Production web software, multi-cloud migrations, and internal AI search tools built alongside client engineering teams.",
  };

  const projectList = content.projects && content.projects.length > 0 ? content.projects : defaultProjects;

  const filteredProjects = projectList.filter((project) => {
    if (activeFilter === 'All') return true;
    return project.category.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* 1. HERO SECTION */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-slate-200/70 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Work" },
            ]}
            className="mb-6"
          />
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance] max-w-4xl">
            {workPage.heroTitle || "Selected engineering engagements"}
          </h1>

          <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl [text-wrap:pretty]">
            {workPage.heroSubtitle ||
              "Production web software, multi-cloud migrations, and internal AI search tools built alongside client engineering teams."}
          </p>
        </div>
      </section>

      {/* 2. FILTER TABS & PROJECTS */}
      <section className="py-16 sm:py-24 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-start gap-2 mb-12 flex-wrap">
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1 border border-slate-200/80">
              <AnimatedBackground
                defaultValue={activeFilter}
                onValueChange={(id) => id && setActiveFilter(id as FilterTab)}
                className="rounded-full bg-slate-900 shadow-xs"
                transition={{
                  type: "spring",
                  bounce: 0.15,
                  duration: 0.3,
                }}
              >
                {filterTabs.map((tab) => {
                  const isActive = activeFilter === tab;
                  return (
                    <button
                      key={tab}
                      data-id={tab}
                      type="button"
                      className={`relative z-10 font-medium text-xs sm:text-sm transition-colors duration-150 rounded-full px-5 py-2.5 min-h-[44px] flex items-center justify-center cursor-pointer [touch-action:manipulation] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </AnimatedBackground>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="max-w-md py-14 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <FolderOpen className="w-5 h-5" />
              </div>
              <h2 className="font-display text-xl font-bold text-slate-950">
                No case studies under {activeFilter}
              </h2>
              <p className="text-base text-slate-600 leading-[1.6]">
                Reset the category filter to browse all engagements or get in touch about your project.
              </p>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setActiveFilter('All')}
                >
                  Show all projects
                </Button>
              </div>
            </div>
          ) : (
            <motion.div
              layout
              className="divide-y divide-slate-200 border-t border-slate-200"
            >
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project, idx) => (
                  <motion.article
                    key={(project as { id?: string }).id || project.title}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="py-9 sm:py-11 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                  >
                    <div className={`lg:col-span-6 ${idx % 2 === 1 ? 'lg:order-last' : ''}`}>
                      <ShowcaseImage
                        src={project.image}
                        alt={`${project.title} — ${project.metrics}`}
                        ratio="16/10"
                      />
                    </div>

                    <div className="lg:col-span-6 space-y-4">
                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                        <Link
                          href={`/work/${getCaseStudySlug(project)}`}
                          className="hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                        >
                          {project.title}
                        </Link>
                      </h2>

                      <p className="text-base font-normal text-slate-600 leading-[1.6] max-w-[58ch] [text-wrap:pretty]">
                        {project.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500">
                        <span className="capitalize">{project.category}</span>
                        <span>{project.tags.join(", ")}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80 text-sm">
                        <span className="font-medium text-slate-900">
                          {project.metrics}
                        </span>
                        <div className="flex items-center gap-5 shrink-0">
                          <Link
                            href={`/work/${getCaseStudySlug(project)}`}
                            className="min-h-[44px] inline-flex items-center font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                          >
                            Architecture breakdown
                          </Link>
                          <Link
                            href="/contact"
                            className="min-h-[44px] inline-flex items-center font-medium text-slate-500 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                          >
                            Ask about build
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {/* 3. CTA BANNER */}
      <CTABanner
        title="Planning a similar migration or product build?"
        subtitle="Share your current stack and schedule constraints. An engineering lead will respond the same day."
        buttonText="Book a call"
        buttonHref="/contact"
      />
    </div>
  );
}
