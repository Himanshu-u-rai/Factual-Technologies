'use client';

import React, { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import {
  stats as defaultStats,
  services as defaultServices,
  projects as defaultProjects,
  testimonials,
} from "@/lib/data";
import { allTechs } from "@/components/ui/TechIcons";
import { useSiteContent } from "@/lib/site-store";

import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { ShowcaseImage, PortraitAvatar } from "@/components/ui/EditorialMedia";
import CTABanner from "@/components/layout/CTABanner";
import HeroSection from "@/components/sections/HeroSection";
import { InfiniteSlider } from "@/components/motion-primitives";
import FaqList from "@/components/ui/FaqList";
import { HOME_FAQS } from "@/lib/seo";
import { getCaseStudySlug, getServicePillarHref } from "@/lib/seo-pillars";

const marqueeCompanies = [
  "TechCorp Systems",
  "InnovateLabs",
  "DataFlow Global",
  "CloudFirst",
  "NeuralPath",
  "ScaleUp Enterprise",
  "CyberForge",
  "QuantumEdge",
];

const SERVICE_VISUALS = [
  {
    src: "/images/engineering-pair.jpg",
    alt: "Senior engineers collaborating on production web applications and code reviews",
  },
  {
    src: "/projects/regulatory-search.jpg",
    alt: "Internal knowledge search and citation application running on a studio laptop",
  },
  {
    src: "/images/architecture-board.jpg",
    alt: "Cloud infrastructure topology and data pipeline architecture diagram",
  },
];

type AutoAdvanceState = {
  index: number;
  hovered: boolean;
  focused: boolean;
  cadence: "auto" | "hold";
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function useAutoAdvance(length: number, intervalMs = 3500, manualHoldMs = 8000) {
  const [state, setState] = useState<AutoAdvanceState>({
    index: 0,
    hovered: false,
    focused: false,
    cadence: "auto",
  });
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );

  const safeIndex = length > 0 ? Math.min(state.index, length - 1) : 0;
  const isUserPaused = state.hovered || state.focused || reducedMotion;

  useEffect(() => {
    if (length <= 1 || isUserPaused) return;
    const delay = state.cadence === "hold" ? manualHoldMs : intervalMs;
    const timerId = window.setTimeout(() => {
      setState((prev) => ({
        ...prev,
        index: (prev.index + 1) % length,
        cadence: "auto",
      }));
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [length, isUserPaused, state.index, state.cadence, intervalMs, manualHoldMs]);

  const select = (nextIdx: number) => {
    setState((prev) => ({
      ...prev,
      index: nextIdx,
      cadence: "hold",
    }));
  };

  const containerProps = {
    onMouseEnter: () => setState((prev) => ({ ...prev, hovered: true })),
    onMouseLeave: () => setState((prev) => ({ ...prev, hovered: false })),
    onFocusCapture: () => setState((prev) => ({ ...prev, focused: true })),
    onBlurCapture: (e: React.FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setState((prev) => ({ ...prev, focused: false }));
      }
    },
  };

  return {
    index: safeIndex,
    select,
    isAutoPlaying: length > 1 && !isUserPaused && state.cadence === "auto",
    intervalSeconds: intervalMs / 1000,
    containerProps,
  };
}

export default function HomePage() {
  const { content } = useSiteContent();

  const activeStats = content.stats && content.stats.length > 0
    ? content.stats
    : defaultStats.map((s, i) => ({ id: `s-${i}`, value: s.value, label: s.label }));

  const activeClients = content.clients && content.clients.length > 0
    ? content.clients
    : marqueeCompanies;

  const activeServices = content.services && content.services.length > 0
    ? content.services.filter((s) => s.enabled !== false)
    : defaultServices;

  const activeProjects = content.projects && content.projects.length > 0
    ? content.projects.filter((p) => p.featuredOnHome !== false)
    : defaultProjects.slice(0, 4);

  const activeTestimonials = content.testimonials && content.testimonials.length > 0
    ? content.testimonials
    : testimonials;

  const cta = content.ctaBanner;

  const marqueeSpeed = content.techStack?.marqueeSpeed || 45;
  const reverseSpeed = content.techStack?.reverseSpeed || 45;

  const servicesCarousel = useAutoAdvance(activeServices.length, 3600, 8000);
  const workCarousel = useAutoAdvance(activeProjects.length, 3400, 8000);

  const safeServiceIdx = servicesCarousel.index;
  const currentService = activeServices[safeServiceIdx];
  const currentServiceVisual = SERVICE_VISUALS[safeServiceIdx % SERVICE_VISUALS.length];

  const safeWorkIdx = workCarousel.index;
  const currentProject = activeProjects[safeWorkIdx];

  return (
    <div className="flex flex-col w-full bg-white text-slate-900 overflow-hidden">
      {/* 1. HERO */}
      <HeroSection />

      {/* 2. HOW WE WORK FACTS STRIP */}
      <section className="py-12 sm:py-16 border-b border-slate-200/70 bg-slate-50/40">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {activeStats.map((stat, idx) => (
              <AnimatedCounter
                key={stat.id || idx}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. CLIENT LIST MARQUEE */}
      <section className="py-14 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <p className="text-sm font-medium text-slate-500 mb-6">
            Engineering partners across fintech, healthcare, and enterprise SaaS
          </p>

          <div className="relative w-full overflow-hidden">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10"
              aria-hidden="true"
            />

            <InfiniteSlider gap={36} speed={40} speedOnHover={15}>
              {activeClients.map((name, i) => (
                <div
                  key={`m-${i}`}
                  className="text-slate-700 font-display font-bold text-lg tracking-tight select-none whitespace-nowrap"
                >
                  {name}
                </div>
              ))}
            </InfiniteSlider>
          </div>
        </div>
      </section>

      {/* 4. SERVICES OVERVIEW (Compact auto-cycling workbench stage, pauses on hover/focus/click) */}
      <section id="services" className="py-16 sm:py-22 bg-slate-50/40 border-b border-slate-200/70">
        <div
          className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12"
          {...servicesCarousel.containerProps}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Heading + Interactive Practice Selector */}
            <div className="lg:col-span-5 space-y-6">
              <SectionHeader
                align="left"
                title="Core Engineering Services"
                subtitle="Select a discipline to inspect deliverables and studio workflow."
                className="!mb-0"
              />

              <div
                role="tablist"
                aria-label="Core engineering services"
                className="flex flex-col gap-2 pt-2"
              >
                {activeServices.map((service, idx) => {
                  const isActive = idx === safeServiceIdx;
                  return (
                    <button
                      key={(service as { id?: string }).id || idx}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => servicesCarousel.select(idx)}
                      className={`relative overflow-hidden w-full min-h-[52px] px-4 py-3.5 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        isActive
                          ? "bg-white text-slate-950 shadow-xs ring-1 ring-slate-200"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80"
                      }`}
                    >
                      <span className="font-display text-base sm:text-lg font-bold tracking-tight">
                        {service.title}
                      </span>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          isActive ? "text-blue-600 font-semibold" : "text-slate-400"
                        }`}
                      >
                        {isActive ? "Active" : "Inspect"}
                      </span>
                      {isActive && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-100 overflow-hidden">
                          {servicesCarousel.isAutoPlaying ? (
                            <motion.span
                              key={`svc-bar-${safeServiceIdx}`}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: servicesCarousel.intervalSeconds, ease: "linear" }}
                              className="block h-full w-full origin-left bg-blue-600"
                            />
                          ) : (
                            <span className="block h-full w-full bg-blue-600" />
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <Link
                  href="/services"
                  className="inline-flex items-center min-h-[44px] text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  Compare all engineering services
                </Link>
              </div>
            </div>

            {/* Right Column: Live Service Detail & Visual Panel */}
            <div className="lg:col-span-7">
              {currentService && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={safeServiceIdx}
                    role="tabpanel"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-6"
                  >
                    <ShowcaseImage
                      src={currentServiceVisual.src}
                      alt={currentServiceVisual.alt}
                      ratio="16/9"
                    />

                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                        <h3 className="font-display text-2xl font-bold text-slate-950 tracking-tight">
                          {currentService.title}
                        </h3>
                      </div>

                      <p className="text-base font-normal text-slate-600 leading-[1.6] max-w-[60ch]">
                        {currentService.description}
                      </p>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-3 border-t border-slate-200/80">
                        {currentService.capabilities.map((cap, cIdx) => (
                          <li
                            key={cIdx}
                            className="flex items-start gap-2.5 text-sm text-slate-700"
                          >
                            <Check className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-2">
                        <Link
                          href={getServicePillarHref(currentService.title)}
                          className="min-h-[44px] inline-flex items-center text-sm font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                        >
                          Explore {currentService.title} architecture
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SELECTED WORK (Auto-cycling spotlight stage + contact-sheet selector strip) */}
      <section id="work" className="py-16 sm:py-22 bg-white border-b border-slate-200/70">
        <div
          className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12"
          {...workCarousel.containerProps}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <SectionHeader
              align="left"
              title="Selected Engineering Work"
              subtitle="Switch through recent builds across document retrieval, finance, cloud streaming, and field operations."
              className="!mb-0"
            />
            <Button href="/work" variant="outline" size="md" className="shrink-0">
              See all case studies
            </Button>
          </div>

          {currentProject && (
            <div className="border-t border-slate-200 pt-8 sm:pt-10">
              <AnimatePresence mode="wait">
                <motion.article
                  key={safeWorkIdx}
                  role="tabpanel"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
                >
                  <div className="lg:col-span-7">
                    <ShowcaseImage
                      src={currentProject.image}
                      alt={`${currentProject.title} — ${currentProject.metrics}`}
                      ratio="16/10"
                    />
                  </div>

                  <div className="lg:col-span-5 space-y-4">
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                      {currentProject.title}
                    </h3>

                    <p className="text-base font-normal text-slate-600 leading-[1.6]">
                      {currentProject.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500">
                      <span>{currentProject.category.toUpperCase()}</span>
                      <span>{currentProject.tags.slice(0, 3).join(", ")}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200/80 text-sm">
                      <span className="font-medium text-slate-900">
                        {currentProject.metrics}
                      </span>
                      <Link
                        href={`/work/${getCaseStudySlug(currentProject)}`}
                        className="min-h-[44px] inline-flex items-center font-semibold text-slate-900 hover:text-blue-600 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded shrink-0"
                      >
                        Read case study
                      </Link>
                    </div>
                  </div>
                </motion.article>
              </AnimatePresence>

              {/* Contact-sheet filmstrip selector */}
              {activeProjects.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Selected engineering case studies"
                  className="mt-8 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                  {activeProjects.map((project, idx) => {
                    const isSelected = idx === safeWorkIdx;
                    return (
                      <button
                        key={(project as { id?: string }).id || idx}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => workCarousel.select(idx)}
                        className="text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md pb-2"
                      >
                        <div className="h-0.5 w-full mb-3 bg-slate-200 group-hover:bg-slate-400 transition-colors overflow-hidden">
                          {isSelected && (
                            workCarousel.isAutoPlaying ? (
                              <motion.div
                                key={`work-bar-${safeWorkIdx}`}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: workCarousel.intervalSeconds, ease: "linear" }}
                                className="h-full w-full origin-left bg-slate-950"
                              />
                            ) : (
                              <div className="h-full w-full bg-slate-950" />
                            )
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row items-start gap-2.5 sm:gap-3">
                          <ShowcaseImage
                            src={project.image}
                            alt={`${project.title} engineering case study preview`}
                            ratio="16/10"
                            className="!rounded-md w-full sm:w-16 shrink-0"
                          />
                          <div className="min-w-0">
                            <span
                              className={`block text-xs sm:text-sm font-semibold leading-snug line-clamp-2 ${
                                isSelected
                                  ? "text-slate-950"
                                  : "text-slate-600 group-hover:text-slate-950"
                              }`}
                            >
                              {project.title}
                            </span>
                            <span className="mt-1 block text-[11px] text-slate-500 capitalize">
                              {project.category}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. TECHNOLOGY STACK (Clean borderless icon stream) */}
      <section id="tech-stack" className="py-16 sm:py-20 bg-slate-50/40 border-b border-slate-200/70 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <SectionHeader
            align="left"
            title="Tools We Ship With"
            subtitle="Open-source runtimes, cloud primitives, and typed application frameworks chosen for long-term maintenance."
          />

          <div className="relative w-full overflow-hidden mt-8 py-2">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-slate-50 to-transparent z-10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-slate-50 to-transparent z-10"
              aria-hidden="true"
            />

            <div className="mb-4">
              <InfiniteSlider gap={44} speed={marqueeSpeed} speedOnHover={15} className="py-2">
                {allTechs.slice(0, 12).map((tech) => {
                  const Icon = tech.Icon;
                  return (
                    <div
                      key={`r1-${tech.name}`}
                      title={tech.name}
                      aria-label={tech.name}
                      className="flex flex-col items-center gap-2 text-slate-600 hover:text-slate-950 transition-colors cursor-default shrink-0"
                    >
                      <Icon className="w-8 h-8 sm:w-9 sm:h-9" />
                      <span className="text-xs font-medium">{tech.name}</span>
                    </div>
                  );
                })}
              </InfiniteSlider>
            </div>

            <div>
              <InfiniteSlider gap={44} speed={reverseSpeed} speedOnHover={15} reverse className="py-2">
                {allTechs.slice(12).map((tech) => {
                  const Icon = tech.Icon;
                  return (
                    <div
                      key={`r2-${tech.name}`}
                      title={tech.name}
                      aria-label={tech.name}
                      className="flex flex-col items-center gap-2 text-slate-600 hover:text-slate-950 transition-colors cursor-default shrink-0"
                    >
                      <Icon className="w-8 h-8 sm:w-9 sm:h-9" />
                      <span className="text-xs font-medium">{tech.name}</span>
                    </div>
                  );
                })}
              </InfiniteSlider>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TESTIMONIALS (Asymmetric 5:7 split with client portraits) */}
      <section id="testimonials" className="py-16 sm:py-22 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <SectionHeader
            align="left"
            title="Client Feedback"
            subtitle="Notes from engineering leaders we have worked alongside."
          />

          <div className="border-t border-slate-200 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {activeTestimonials[0] && (
              <blockquote className="lg:col-span-5 flex flex-col justify-between space-y-8">
                <p className="text-slate-950 font-display text-xl sm:text-2xl font-medium leading-[1.45] [text-wrap:pretty]">
                  &ldquo;{activeTestimonials[0].quote}&rdquo;
                </p>

                <footer className="flex items-center gap-3.5">
                  <PortraitAvatar
                    src={activeTestimonials[0].avatar}
                    name={activeTestimonials[0].author}
                    size="lg"
                  />
                  <div>
                    <div className="font-bold text-slate-950 text-sm">
                      {activeTestimonials[0].author}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {activeTestimonials[0].role}, {activeTestimonials[0].company}
                    </div>
                  </div>
                </footer>
              </blockquote>
            )}

            {activeTestimonials.length > 1 && (
              <div className="lg:col-span-7 divide-y divide-slate-200 border-t lg:border-t-0 lg:border-l border-slate-200 pt-8 lg:pt-0 lg:pl-12">
                {activeTestimonials.slice(1).map((test, idx) => (
                  <blockquote
                    key={(test as { id?: string }).id || idx}
                    className="py-8 first:pt-0 last:pb-0 space-y-5"
                  >
                    <p className="text-slate-800 text-base sm:text-[17px] font-normal leading-[1.6] [text-wrap:pretty]">
                      &ldquo;{test.quote}&rdquo;
                    </p>

                    <footer className="flex items-center gap-3">
                      <PortraitAvatar
                        src={test.avatar}
                        name={test.author}
                      />
                      <div>
                        <div className="font-bold text-slate-950 text-sm">
                          {test.author}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {test.role}, {test.company}
                        </div>
                      </div>
                    </footer>
                  </blockquote>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. FREQUENTLY ASKED QUESTIONS (AEO / Direct Answer Block) */}
      <section id="faq" className="py-16 sm:py-22 bg-slate-50/40 border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
          <SectionHeader
            align="left"
            title="Frequently Asked Questions"
            subtitle="Direct answers on code ownership, timelines, AI evaluation guardrails, and how our engineers work inside your team."
          />

          <div className="mt-10">
            <FaqList faqs={HOME_FAQS} surface="flat" defaultOpenFirst />
          </div>
        </div>
      </section>

      {/* 9. CTA BANNER */}
      <CTABanner
        title={cta?.title}
        subtitle={cta?.subtitle}
        buttonText={cta?.buttonText}
        buttonHref={cta?.buttonHref}
        secondaryCtaText={cta?.secondaryCtaText}
        secondaryCtaHref={cta?.secondaryCtaHref}
      />
    </div>
  );
}
