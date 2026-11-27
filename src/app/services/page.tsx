import type { Metadata } from "next";
import ServicesClient from "./ServicesClient";
import JsonLd from "@/components/seo/JsonLd";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-defaults";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildPageMetadata,
  buildServicesCatalogJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Services — Software, Cloud & AI Systems Engineering",
  description:
    "Custom digital product engineering, cited internal AI & RAG automation, and zero-downtime AWS/GCP cloud migrations delivered directly inside your repositories.",
  path: "/services",
  keywords: [
    "Digital Product Engineering",
    "AI Systems and Workflow Automation",
    "Enterprise RAG Pipelines",
    "AWS GCP Multi-Cloud Infrastructure",
    "Legacy Application Modernization",
    "SOC2 Type II HIPAA Engineering",
  ],
});

export default function ServicesPage() {
  const defaultFaqs = DEFAULT_SITE_CONTENT.servicesPage[0].faqs;

  return (
    <>
      <JsonLd
        id="ld-services-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <JsonLd id="ld-services-catalog" data={buildServicesCatalogJsonLd()} />
      <JsonLd id="ld-services-faq" data={buildFaqJsonLd(defaultFaqs)} />
      <ServicesClient />
    </>
  );
}
