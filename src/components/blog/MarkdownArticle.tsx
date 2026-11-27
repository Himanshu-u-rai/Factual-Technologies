import React from "react";
import Link from "next/link";
import { sanitizeSafeUrl } from "@/lib/admin-types";
import { slugifyText } from "@/lib/articles-shared";

interface MarkdownArticleProps {
  markdown: string;
}

/** Renders inline bold, italic, code spans, and safe links using pure React nodes (zero raw HTML XSS). */
function renderInlineTokens(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(text.slice(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      tokens.push(
        <strong key={keyIdx++} className="font-semibold text-slate-950">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      tokens.push(
        <em key={keyIdx++} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      tokens.push(
        <code
          key={keyIdx++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 border border-slate-200/80 font-mono text-[0.86em] text-slate-900"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const label = linkMatch[1];
        const safeHref = sanitizeSafeUrl(linkMatch[2], "");
        if (safeHref) {
          const isExternal = safeHref.startsWith("http://") || safeHref.startsWith("https://");
          tokens.push(
            isExternal ? (
              <a
                key={keyIdx++}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 hover:text-blue-900 underline underline-offset-4 decoration-blue-200 hover:decoration-blue-600 transition-colors"
              >
                {label}
              </a>
            ) : (
              <Link
                key={keyIdx++}
                href={safeHref}
                className="font-medium text-slate-950 hover:text-blue-700 underline underline-offset-4 decoration-slate-300 hover:decoration-blue-600 transition-colors"
              >
                {label}
              </Link>
            )
          );
        } else {
          tokens.push(label);
        }
      } else {
        tokens.push(token);
      }
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    tokens.push(text.slice(lastIdx));
  }
  return tokens;
}

/**
 * Pure React Markdown renderer with anchor heading IDs, code fences, tables, lists,
 * blockquotes, and XSS-safe inline links.
 */
export default function MarkdownArticle({ markdown }: MarkdownArticleProps) {
  const lines = (markdown || "").split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  const headingSeen = new Map<string, number>();

  let i = 0;
  let keyCounter = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal divider
    if (/^(---|\*\*\*)$/.test(trimmed)) {
      blocks.push(<hr key={keyCounter++} className="my-10 border-slate-200" />);
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing fence
      blocks.push(
        <div
          key={keyCounter++}
          className="my-6 rounded-xl border border-slate-200 bg-slate-950 text-slate-100 overflow-hidden"
        >
          {lang && (
            <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              {lang}
            </div>
          )}
          <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Heading (# / ## / ### / #### -> normalized into clean H2/H3 structure inside article)
    const headingMatch = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(trimmed);
    if (headingMatch) {
      const rawLevel = headingMatch[1].length;
      const text = headingMatch[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
      const baseId = slugifyText(text);
      const count = headingSeen.get(baseId) ?? 0;
      headingSeen.set(baseId, count + 1);
      const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

      if (rawLevel <= 2) {
        blocks.push(
          <h2
            key={keyCounter++}
            id={id}
            className="scroll-mt-28 font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight mt-10 mb-4"
          >
            {renderInlineTokens(headingMatch[2])}
          </h2>
        );
      } else {
        blocks.push(
          <h3
            key={keyCounter++}
            id={id}
            className="scroll-mt-28 font-display text-xl font-bold text-slate-950 tracking-tight mt-8 mb-3"
          >
            {renderInlineTokens(headingMatch[2])}
          </h3>
        );
      }
      i++;
      continue;
    }

    // Markdown Image on its own line ![alt](src)
    const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imgMatch) {
      const safeSrc = sanitizeSafeUrl(imgMatch[2], "");
      if (safeSrc) {
        blocks.push(
          <figure key={keyCounter++} className="my-8">
            <img
              src={safeSrc}
              alt={imgMatch[1] || "Engineering illustration"}
              loading="lazy"
              className="w-full rounded-xl border border-slate-200 object-cover"
            />
            {imgMatch[1] && (
              <figcaption className="mt-2 text-xs text-slate-500 text-center">
                {imgMatch[1]}
              </figcaption>
            )}
          </figure>
        );
      }
      i++;
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const parseRow = (row: string) =>
        row
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());

      const headers = tableLines.length > 0 ? parseRow(tableLines[0]) : [];
      const bodyRows = tableLines.slice(1).filter((r) => !/^[|\s:-]+$/.test(r)).map(parseRow);

      if (headers.length > 0) {
        blocks.push(
          <div key={keyCounter++} className="my-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="py-3 px-4 font-semibold text-slate-950">
                      {renderInlineTokens(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bodyRows.map((cells, rIdx) => (
                  <tr key={rIdx}>
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="py-3 px-4 text-slate-700 leading-relaxed">
                        {renderInlineTokens(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={keyCounter++}
          className="my-6 border-l-2 border-slate-900 pl-5 py-1 text-slate-800 italic text-base sm:text-lg leading-[1.65]"
        >
          {renderInlineTokens(quoteLines.join(" "))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={keyCounter++} className="my-5 space-y-2.5 pl-6 list-disc marker:text-slate-400">
          {items.map((item, idx) => (
            <li key={idx} className="text-slate-700 text-base leading-[1.7]">
              {renderInlineTokens(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={keyCounter++} className="my-5 space-y-2.5 pl-6 list-decimal marker:text-slate-500 marker:font-mono marker:text-sm">
          {items.map((item, idx) => (
            <li key={idx} className="text-slate-700 text-base leading-[1.7]">
              {renderInlineTokens(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (gather contiguous non-structural lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s+|```|>|[-*+]\s+|\d+\.\s+|\||!\[|---|\*\*\*)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push(
      <p key={keyCounter++} className="my-4 text-slate-700 text-base sm:text-[17px] leading-[1.75] [text-wrap:pretty]">
        {renderInlineTokens(paraLines.join(" "))}
      </p>
    );
  }

  return <div className="prose-editorial max-w-none">{blocks}</div>;
}
