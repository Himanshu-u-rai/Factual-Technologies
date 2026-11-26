'use client';

import React from "react";

export interface SectionHeaderProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  align?: "left" | "center";
  gradientText?: string;
  className?: string;
  as?: "h1" | "h2";
}

export function SectionHeader({
  title = "",
  subtitle,
  align = "left",
  gradientText,
  className = "",
  as = "h2",
}: SectionHeaderProps) {
  const alignmentClasses =
    align === "left" ? "text-left" : "text-center mx-auto max-w-3xl";

  const containerClasses = `flex flex-col ${
    align === "left" ? "items-start" : "items-center"
  } mb-10 sm:mb-14 ${alignmentClasses} ${className}`.trim();

  const HeadingTag = as;

  const renderTitle = () => {
    if (!gradientText || !gradientText.trim() || !title) {
      return title;
    }

    const escaped = gradientText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = title.split(regex);

    if (parts.length === 1) {
      return title;
    }

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === gradientText.toLowerCase() ? (
            <span
              key={index}
              className="text-slate-900 font-medium"
            >
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={containerClasses}>
      {title ? (
        <HeadingTag className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-slate-950 leading-[1.12] [text-wrap:balance]">
          {renderTitle()}
        </HeadingTag>
      ) : null}
      {subtitle && (
        <p className="mt-4 font-sans font-normal text-base sm:text-[17px] text-slate-600 max-w-[65ch] leading-[1.6] [text-wrap:pretty]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeader;
