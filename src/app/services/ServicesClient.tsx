'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import { ShowcaseImage } from '@/components/ui/EditorialMedia';
import CTABanner from '@/components/layout/CTABanner';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import FaqList from '@/components/ui/FaqList';
import { SERVICES_COMPARISON_ROWS } from '@/lib/seo';
import { getServicePillarHref } from '@/lib/seo-pillars';
import { services as defaultServices, processSteps as defaultProcessSteps } from '@/lib/data';
import { useSiteContent } from '@/lib/site-store';

export default function ServicesPage() {
  const { content } = useSiteContent();
  const services = content.services || defaultServices;
  const sp = content.servicesPage?.[0] || {
    heroBadge: "",
    heroTitle: "Software, cloud infrastructure, and AI systems built for your team",
    heroSubtitle:
      "We work with product and engineering teams to ship customer portals, migrate cloud databases, and build internal AI tools with clear ownership.",
    slaMetric: "Bi-weekly",
    slaLabel: "Release cadence",
    faqs: [
      {
        id: "faq-s-1",
        q: "How do you handle intellectual property, source repositories, and code handover?",
        a: "All code, architecture schemas, and infrastructure configuration belong to your organization from day one. Work happens directly inside your private GitHub or GitLab repositories.",
      },
      {
        id: "faq-s-2",
        q: "What security standards and regulatory compliance frameworks do you build against?",
        a: "We align builds with SOC2 Type II, ISO 27001, HIPAA, and GDPR requirements, integrating automated dependency checks, static analysis, and least-privilege IAM policies.",
      },
      {
        id: "faq-s-3",
        q: "How does your team integrate with our internal engineering squad?",
        a: "We join your existing Jira or Linear board, pull request workflow, and weekly demos so architecture decisions and code context stay inside your team.",
      },
      {
        id: "faq-s-4",
        q: "What is your typical timeline from architectural discovery to production rollout?",
        a: "Engagements usually open with a 2-week discovery and technical spike, followed by bi-weekly production releases over 6 to 12 weeks.",
      },
    ],
    processSteps: defaultProcessSteps.map((ps) => ({
      id: `ps-${ps.step}`,
      step: ps.step,
      title: ps.title,
      description: ps.description,
    })),
  };

  const processStepsList = sp.processSteps && sp.processSteps.length > 0 ? sp.processSteps : defaultProcessSteps;
  const technicalFaqs = sp.faqs && sp.faqs.length > 0 ? sp.faqs : [];
  const metricsList = sp.metrics && sp.metrics.length > 0 ? sp.metrics : [
    { id: "sm-1", value: "2 weeks", label: "Discovery & proof of concept" },
    { id: "sm-2", value: "Bi-weekly", label: "Production release cadence" },
    { id: "sm-3", value: "100% IP", label: "Authored in your repository" },
    { id: "sm-4", value: "Zero lock-in", label: "Standard containers & IaC" },
  ];
  const strategicPillars = sp.strategicPillars && sp.strategicPillars.length > 0 ? sp.strategicPillars : [
    {
      id: "spill-1",
      title: "Predictable Delivery",
      description: "Clear module boundaries, automated integration tests, and reproducible CI pipelines keep weekly releases moving without surprises.",
      icon: "Rocket",
      bullet: "Automated checks and staged rollouts",
    },
    {
      id: "spill-2",
      title: "Grounded AI Workflows",
      description: "Retrieval pipelines, structured outputs, and prompt evaluations connected to your internal documents and existing permissions.",
      icon: "Brain",
      bullet: "Source citations and access controls",
    },
    {
      id: "spill-3",
      title: "Clean Data Pipelines",
      description: "Event streaming, API gateways, and schema migrations designed to keep downstream warehouses and services in sync.",
      icon: "Database",
      bullet: "Idempotent ingestion and monitoring",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* 1. HERO SECTION */}
      <section className="pt-32 pb-20 sm:pt-40 sm:pb-24 border-b border-slate-200/70 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <Breadcrumbs
                items={[
                  { name: "Home", href: "/" },
                  { name: "Services" },
                ]}
                className="mb-6"
              />
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-950 leading-[1.08] [text-wrap:balance] max-w-4xl">
                {sp.heroTitle || "Software, cloud infrastructure, and AI systems built for your team"}
              </h1>

              <p className="mt-6 font-sans text-base sm:text-lg leading-relaxed text-slate-600 max-w-2xl [text-wrap:pretty]">
                {sp.heroSubtitle ||
                  "We work with product and engineering teams to ship customer portals, migrate cloud databases, and build internal AI tools with clear ownership."}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button href="/contact" variant="primary" size="lg">
                  Book a call
                </Button>
                <Button href="/work" variant="outline" size="lg">
                  See case studies
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ShowcaseImage
                src="/images/architecture-board.jpg"
                alt="Hand-drawn system architecture flow sketch and laptop on the studio conference table"
                ratio="4/3"
              />
            </div>
          </div>

          <div className="mt-16 pt-10 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-8">
            {metricsList.map((metric) => (
              <div key={metric.id}>
                <p className="text-xl sm:text-2xl font-bold text-slate-950 font-display tabular-nums">
                  {metric.value}
                </p>
                <p className="text-sm text-slate-600 mt-1">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. CORE SERVICES */}
      <section id="core-services" className="py-20 sm:py-28 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="Core Services"
            subtitle="Three practice areas covering application engineering, internal AI systems, and cloud infrastructure."
          />

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {services.filter((s) => s.enabled !== false).map((service) => (
              <div
                key={service.id || service.title}
                className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start"
              >
                <div className="lg:col-span-5 space-y-2.5">
                  <h3 className="font-display text-2xl font-bold text-slate-950 tracking-tight">
                    {service.title}
                  </h3>
                  <p className="text-slate-600 text-base font-normal leading-[1.6] max-w-[46ch] [text-wrap:pretty]">
                    {service.description}
                  </p>
                </div>

                <ul className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {service.capabilities.map((cap, capIdx) => (
                    <li
                      key={capIdx}
                      className="flex items-start gap-2.5 text-sm text-slate-700"
                    >
                      <Check className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>

                <div className="lg:col-span-2 flex flex-row lg:flex-col items-start lg:items-end gap-4 lg:gap-1">
                  <Link
                    href={getServicePillarHref(service.title)}
                    className="min-h-[44px] inline-flex items-center text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded whitespace-nowrap"
                  >
                    Architecture &amp; deliverables
                  </Link>
                  <Link
                    href="/contact"
                    className="min-h-[44px] inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    Discuss scope
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW ENGAGEMENTS RUN (Horizontal editorial index — no numbered pills or 4-col grid) */}
      <section className="py-20 sm:py-28 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="How Projects Move from Kickoff to Handover"
            subtitle="Structured around weekly working builds rather than slide decks."
          />

          <div className="divide-y divide-slate-200 border-y border-slate-200 mt-10">
            {processStepsList.map((step) => (
              <div
                key={step.step}
                className="py-7 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline"
              >
                <p className="md:col-span-3 text-sm font-semibold text-slate-500">
                  {step.step}
                </p>
                <div className="md:col-span-9 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-8 items-baseline">
                  <h3 className="lg:col-span-5 font-display text-xl font-bold text-slate-950 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="lg:col-span-7 text-slate-600 text-base font-normal leading-[1.6] [text-wrap:pretty]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TECHNICAL FOCUS AREAS */}
      <section className="py-20 sm:py-28 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-12">
            <div className="lg:col-span-5">
              <SectionHeader
                align="left"
                title="Engineering Standards"
                subtitle="Practices built into our repositories from the first commit."
                className="!mb-0"
              />
            </div>
            <div className="lg:col-span-7">
              <ShowcaseImage
                src="/images/engineering-pair.jpg"
                alt="Engineers pairing on code and repository architecture in our workspace"
                ratio="16/9"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200 mt-10">
            {strategicPillars.map((pillar) => (
              <div
                key={pillar.id}
                className="py-7 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-baseline"
              >
                <h3 className="md:col-span-4 font-display text-xl font-bold text-slate-950 tracking-tight">
                  {pillar.title}
                </h3>
                <p className="md:col-span-5 text-slate-600 text-base font-normal leading-[1.6] [text-wrap:pretty]">
                  {pillar.description}
                </p>
                {pillar.bullet && (
                  <p className="md:col-span-3 md:text-right text-xs font-medium text-slate-500">
                    {pillar.bullet}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ENGAGEMENT COMPARISON MATRIX */}
      <section id="comparison" className="py-20 sm:py-28 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="How Embedded Engineering Compares"
            subtitle="Practical trade-offs between working with our senior engineering pods, traditional agencies, or building exclusively through slow hiring cycles."
          />

          <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th scope="col" className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dimension
                  </th>
                  <th scope="col" className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-slate-950">
                    Factual Technologies
                  </th>
                  <th scope="col" className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Traditional Agency
                  </th>
                  <th scope="col" className="py-4 px-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    In-House Hiring Only
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {SERVICES_COMPARISON_ROWS.map((row) => (
                  <tr key={row.dimension} className="align-top">
                    <th scope="row" className="py-5 px-5 font-display font-bold text-slate-950 whitespace-nowrap">
                      {row.dimension}
                    </th>
                    <td className="py-5 px-5 font-medium text-slate-900 leading-[1.6] bg-slate-50/40">
                      {row.factual}
                    </td>
                    <td className="py-5 px-5 text-slate-600 leading-[1.6]">
                      {row.agency}
                    </td>
                    <td className="py-5 px-5 text-slate-600 leading-[1.6]">
                      {row.inHouse}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="py-20 sm:py-28 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <SectionHeader
            align="left"
            title="Common Questions"
            subtitle="Straight answers about source ownership, security practices, and team integration."
          />

          <div className="mt-10">
            <FaqList faqs={technicalFaqs} surface="flat" defaultOpenFirst />
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <CTABanner
        title={content.ctaBanner?.title || "Discuss your upcoming software roadmap"}
        subtitle={content.ctaBanner?.subtitle || "Tell us what you are building or migrating. An engineering lead will review your note and reply the same day."}
        buttonText={content.ctaBanner?.buttonText || "Book a call"}
        buttonHref={content.ctaBanner?.buttonHref || "/contact"}
      />
    </div>
  );
}
