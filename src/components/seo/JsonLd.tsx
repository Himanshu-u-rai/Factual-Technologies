import React from "react";

interface JsonLdProps {
  id?: string;
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Renders structured Schema.org JSON-LD safely in SSR HTML, escaping HTML-significant
 * characters so inline <script> boundaries cannot be broken by dynamic strings.
 */
export default function JsonLd({ id, data }: JsonLdProps) {
  const safeJson = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
