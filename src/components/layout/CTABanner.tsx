'use client';

import React from 'react';
import { Check } from 'lucide-react';
import Button from '@/components/ui/Button';

export interface CTABannerProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  className?: string;
}

export function CTABanner({
  title = "Discuss your upcoming software roadmap",
  subtitle,
  description = "Tell us what you are building or migrating. An engineering lead will review your note and reply the same day.",
  buttonText = "Book a call",
  buttonHref = "/contact",
  secondaryCtaText = "See case studies",
  secondaryCtaHref = "/work",
  className = "",
}: CTABannerProps) {
  const displayDescription = subtitle || description;

  const highlights = [
    "Code authored in your repository",
    "Direct access to senior engineers",
    "Weekly staging builds",
  ];

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 ${className}`.trim()}>
      <div className="rounded-2xl bg-slate-950 text-white p-8 sm:p-12 md:p-14 border border-slate-800">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white leading-[1.15] [text-wrap:balance]">
            {title}
          </h2>

          <p className="mt-4 font-sans text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed [text-wrap:pretty]">
            {displayDescription}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              href={buttonHref}
              variant="inverted"
              size="lg"
              className="w-full sm:w-auto"
            >
              {buttonText}
            </Button>
            {secondaryCtaText && (
              <Button
                href={secondaryCtaHref}
                variant="outline-dark"
                size="lg"
                className="w-full sm:w-auto"
              >
                {secondaryCtaText}
              </Button>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-300">
            {highlights.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CTABanner;
