'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import { ShowcaseImage } from '@/components/ui/EditorialMedia';
import CTABanner from '@/components/layout/CTABanner';
import { siteConfig as defaultSiteConfig, stats as defaultStats } from '@/lib/data';
import { DEFAULT_SITE_CONTENT, useSiteContent } from '@/lib/site-store';

export default function AboutPage() {
  const { content } = useSiteContent();
  const about = content.aboutPage || {
    heroBadge: "",
    heroTitle: "Senior software engineering without agency handoffs",
    heroSubtitle: defaultSiteConfig.description,
    foundingConvictionTitle: "Senior engineers from kickoff through production handover",
    foundingConvictionText:
      "We started Factual Technologies so teams hiring outside engineering help get experienced builders who write production code directly inside their codebase.",
    values: [
      {
        id: "val-1",
        title: "Systems Depth",
        description:
          "Hands-on experience with database indexing, distributed queues, API latency, and infrastructure automation.",
      },
      {
        id: "val-2",
        title: "Built for Operations",
        description:
          "Structured logging, alerting thresholds, and rollback paths included before code reaches production.",
      },
      {
        id: "val-3",
        title: "Compliance Ready",
        description:
          "Familiarity with healthcare and financial audit controls translated directly into Terraform and CI guardrails.",
      },
      {
        id: "val-4",
        title: "Direct Collaboration",
        description:
          "Shared Slack channels, transparent repositories, and direct access to the engineers shipping the work.",
      },
    ],
  };

  const topStats = (content.stats && content.stats.length > 0 ? content.stats : defaultStats).slice(0, 3);
  const valuesList = about.values && about.values.length > 0 ? about.values : [];
  const narrativeParagraphs =
    about.narrativeParagraphs && about.narrativeParagraphs.length > 0
      ? about.narrativeParagraphs
      : [
          about.foundingConvictionText ||
            "Many software consultancies pitch senior leads during discovery and hand delivery off to junior staff once a contract starts. We keep our pods small and staff every engagement with experienced engineers.",
          "Our team works directly inside your issue tracker, pull requests, and staging environments—pairing with your leads rather than operating behind account managers.",
          "When a project wraps, your team inherits readable architecture, test coverage, and runbooks they can maintain independently.",
        ];

  const vm = about.visionMission || {
    visionTitle: "How we build AI systems",
    visionText:
      "Internal AI software only works when outputs are testable, permissions are enforced, and answers link back to primary records.",
    visionBullets: [
      "Evaluation suites run on every prompt and model change",
      "Document retrieval scoped to existing user permissions",
    ],
    missionTitle: "How we run projects",
    missionText:
      "Clear scoping up front, small pull requests every day, and honest estimates when requirements shift.",
    missionBullets: [
      "Weekly demos running in staging",
      "Zero proprietary runtime dependencies",
    ],
  };

  return (
    <div className="w-full bg-white text-slate-900">
      {/* 1. HERO SECTION */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-24 border-b border-slate-200/70 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <Breadcrumbs
                items={[
                  { name: "Home", href: "/" },
                  { name: "About" },
                ]}
                className="mb-6"
              />
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance] max-w-4xl">
                {about.heroTitle || "Senior software engineering without agency handoffs"}
              </h1>

              <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl [text-wrap:pretty]">
                {about.heroSubtitle || defaultSiteConfig.description}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button href="/contact" variant="primary" size="lg">
                  Book a call
                </Button>
                <Button href="#who-we-are" variant="outline" size="lg">
                  How we work
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ShowcaseImage
                src="/images/engineering-pair.jpg"
                alt="Two senior engineers collaborating at the studio desk"
                ratio="4/3"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRACTICE FACTS ROW */}
      <section className="py-12 sm:py-16 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {topStats.map((stat, idx) => (
              <AnimatedCounter key={idx} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. WHO WE ARE */}
      <section id="who-we-are" className="py-20 sm:py-28 bg-white border-b border-slate-200/70 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5 space-y-6">
              <blockquote className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 leading-snug [text-wrap:balance]">
                {about.foundingConvictionTitle || "Senior engineers from kickoff through production handover"}
              </blockquote>
              <div className="pt-6 border-t border-slate-200 text-sm text-slate-600 space-y-1">
                <div className="font-semibold text-slate-900">
                  Factual Technologies
                </div>
                <div>
                  San Francisco, California — distributed across North America and Europe
                </div>
              </div>
              <ShowcaseImage
                src="/images/architecture-board.jpg"
                alt="Architecture notes and schematic review in the Factual Technologies office"
                ratio="16/10"
              />
            </div>

            <div className="lg:col-span-7 space-y-6 text-slate-600 text-base sm:text-lg leading-relaxed [text-wrap:pretty]">
              {narrativeParagraphs.map((para, pIdx) => (
                <p key={pIdx}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. OPERATING APPROACH */}
      <section className="py-20 sm:py-28 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="Engineering Priorities"
            subtitle="Practical rules that guide how our teams write, test, and hand over software."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-10">
            <div className="border-t border-slate-200 pt-7 space-y-5">
              <h3 className="font-display text-2xl font-bold text-slate-950 tracking-tight">
                {vm.visionTitle || "How we build AI systems"}
              </h3>
              <p className="text-slate-600 font-normal text-base leading-[1.6] max-w-[60ch]">
                {vm.visionText}
              </p>
              <div className="pt-2 space-y-2.5 text-sm text-slate-700">
                {(vm.visionBullets || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-7 space-y-5">
              <h3 className="font-display text-2xl font-bold text-slate-950 tracking-tight">
                {vm.missionTitle || "How we run projects"}
              </h3>
              <p className="text-slate-600 font-normal text-base leading-[1.6] max-w-[60ch]">
                {vm.missionText}
              </p>
              <div className="pt-2 space-y-2.5 text-sm text-slate-700">
                {(vm.missionBullets || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ENGINEERING LEADERSHIP (E-E-A-T Authority) */}
      <section className="py-20 sm:py-28 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <SectionHeader
              align="left"
              title="Engineering Leadership"
              subtitle="The senior systems, AI, and cloud architects leading active builds and engineering writeups."
              className="!mb-0"
            />
            <Link
              href="/blog"
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors shrink-0"
            >
              Read engineering articles
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {(about.teamMembers && about.teamMembers.length > 0
              ? about.teamMembers
              : DEFAULT_SITE_CONTENT.aboutPage.teamMembers || []
            ).map((member) => (
              <article
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/40 p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2.5">
                  <div>
                    <h3 className="font-display text-xl font-bold text-slate-950 tracking-tight">
                      {member.name}
                    </h3>
                    <p className="text-sm font-medium text-blue-700 mt-0.5">{member.role}</p>
                  </div>
                  <p className="text-sm text-slate-600 leading-[1.6]">{member.bio}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200/80">
                  {member.specialties.map((spec) => (
                    <span
                      key={spec}
                      className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. WORKING PRINCIPLES */}
      <section className="py-20 sm:py-28 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="What Clients Rely On"
            subtitle="Direct ownership and transparent habits rather than layered management."
          />

          <div className="divide-y divide-slate-200 border-y border-slate-200 mt-10">
            {valuesList.map((val) => (
              <div
                key={val.id || val.title}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-8 items-baseline"
              >
                <h3 className="md:col-span-4 font-display text-lg font-bold text-slate-950 tracking-tight">
                  {val.title}
                </h3>
                <p className="md:col-span-8 text-slate-600 text-base font-normal leading-[1.6] [text-wrap:pretty]">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA BANNER */}
      <CTABanner
        title={content.ctaBanner?.title || "Discuss your upcoming software roadmap"}
        subtitle={content.ctaBanner?.subtitle || "Tell us what you are building or migrating. An engineering lead will review your note and reply the same day."}
        buttonText={content.ctaBanner?.buttonText || "Book a call"}
        buttonHref={content.ctaBanner?.buttonHref || "/contact"}
      />
    </div>
  );
}
