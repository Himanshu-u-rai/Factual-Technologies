'use client';

import React from "react";
import Button from "@/components/ui/Button";
import { TextLoop } from "@/components/motion-primitives";
import MorphingWaveAnimation from "@/components/animations/MorphingWaveAnimation";
import { useSiteContent } from "@/lib/site-store";

export interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className = "" }: HeroSectionProps) {
  const { content } = useSiteContent();
  const hero = content.hero;
  const phrases = hero.rotatingPhrases && hero.rotatingPhrases.length > 0
    ? hero.rotatingPhrases
    : ["web software", "cloud pipelines", "internal AI tools", "data platforms"];

  return (
    <section
      className={`relative lg:min-h-[85vh] flex items-center bg-white border-b border-slate-200/70 overflow-hidden ${className}`.trim()}
    >
      {/* Main Content Container - 2-Column Split Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full pt-28 pb-16 sm:pt-36 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Left Column: Plain Headline & Direct CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start text-left z-10">
          <h1 className="font-display text-[34px] sm:text-6xl md:text-7xl lg:text-[72px] font-bold tracking-tight text-slate-950 leading-[1.08] sm:leading-[1.08] text-left pr-28 sm:pr-40 lg:pr-0">
            <span>{hero.headlinePrefix || "We build"}</span>
            <span className="block mt-1 sm:mt-2 text-slate-950">
              <TextLoop
                className="inline-block"
                interval={3.2}
                transition={{ type: "spring", stiffness: 900, damping: 80, mass: 10 }}
              >
                {phrases.map((phrase, idx) => (
                  <span key={idx}>{phrase}</span>
                ))}
              </TextLoop>
            </span>
          </h1>

          <p className="font-sans font-normal text-base sm:text-lg leading-relaxed text-slate-600 max-w-xl mt-6 text-left [text-wrap:pretty]">
            {hero.subtitle ||
              "Senior engineers working alongside your team to design, build, and ship production web software, cloud infrastructure, and internal AI workflows."}
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {hero.primaryCtaText && (
              <Button
                href={hero.primaryCtaLink || "/contact"}
                variant="primary"
                size="lg"
                className="w-full sm:w-auto justify-center"
              >
                {hero.primaryCtaText}
              </Button>
            )}
            {hero.secondaryCtaText && (
              <Button
                href={hero.secondaryCtaLink || "/work"}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto justify-center"
              >
                {hero.secondaryCtaText}
              </Button>
            )}
          </div>
        </div>

        {/* Morphing Wave Animation: small top-right corner on mobile/tablet, full right column on desktop */}
        {hero.showWaveAnimation !== false && (
          <div className="pointer-events-none select-none absolute top-20 right-4 w-28 h-28 sm:top-24 sm:right-6 sm:w-36 sm:h-36 lg:pointer-events-auto lg:static lg:col-span-5 lg:w-full lg:h-[600px] xl:h-[650px] flex items-center justify-center lg:justify-end z-0 lg:z-auto opacity-90 lg:opacity-100">
            <MorphingWaveAnimation className="w-full h-full max-w-[640px]" />
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroSection;
