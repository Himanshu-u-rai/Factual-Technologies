import React from "react";
import { ChevronDown } from "lucide-react";

export interface FaqListItem {
  readonly id?: string;
  readonly q: string;
  readonly a: string;
}

interface FaqListProps {
  faqs: ReadonlyArray<FaqListItem>;
  surface?: "flat" | "card";
  defaultOpenFirst?: boolean;
}

/**
 * Renders SSR-visible native <details> FAQ rows so search engines and AI crawlers
 * index full Q&A text directly in HTML while keeping interactive accordion ergonomics.
 */
export default function FaqList({
  faqs,
  surface = "flat",
  defaultOpenFirst = true,
}: FaqListProps) {
  const wrapperClass =
    surface === "card"
      ? "w-full divide-y divide-slate-200 border border-slate-200 bg-white rounded-2xl px-6 py-2 shadow-xs"
      : "w-full divide-y divide-slate-200 border-y border-slate-200";

  return (
    <div className={wrapperClass}>
      {faqs.map((faq, i) => (
        <details
          key={faq.id || i}
          open={defaultOpenFirst ? i === 0 : false}
          className="group py-2"
        >
          <summary className="w-full min-h-[44px] py-5 text-left flex justify-between items-center cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-md">
            <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950 tracking-tight pr-6">
              {faq.q}
            </h3>
            <ChevronDown
              aria-hidden="true"
              className="w-5 h-5 text-slate-400 group-hover:text-slate-900 shrink-0 transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <div className="pb-6 text-base font-normal text-slate-600 leading-[1.6] max-w-[65ch] [text-wrap:pretty]">
            <p>{faq.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
