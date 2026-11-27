import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: ReadonlyArray<BreadcrumbItem>;
  className?: string;
}

/**
 * Visible editorial breadcrumb bar synced 1:1 with BreadcrumbList JSON-LD structured data.
 */
export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 ${className}`.trim()}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={`${item.name}-${idx}`}>
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            )}
            {isLast || !item.href ? (
              <span
                className={isLast ? "text-slate-900 font-semibold truncate max-w-[36ch]" : ""}
                aria-current={isLast ? "page" : undefined}
              >
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-slate-950 transition-colors py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                {item.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
