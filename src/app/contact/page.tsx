import type { Metadata } from "next";
import ContactClient from "./ContactClient";
import JsonLd from "@/components/seo/JsonLd";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-defaults";
import {
  buildBreadcrumbJsonLd,
  buildContactPageJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact — Start an Engineering Audit or Sprint",
  description:
    "Share your technical stack, timeline, and product goals with Factual Technologies. An engineering lead reviews every note with same-day response and NDA support.",
  path: "/contact",
  keywords: [
    "Contact Factual Technologies",
    "Hire Senior AI Engineers",
    "Software Architecture Discovery Call",
    "Cloud Migration Consulting San Francisco",
  ],
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        id="ld-contact-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <JsonLd id="ld-contact-page" data={buildContactPageJsonLd()} />
      <JsonLd id="ld-contact-faq" data={buildFaqJsonLd(DEFAULT_SITE_CONTENT.contactPage.faqs)} />
      <ContactClient />
    </>
  );
}
