import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import JsonLd from "@/components/seo/JsonLd";
import {
  HOME_FAQS,
  SITE_NAME,
  SITE_TAGLINE,
  buildFaqJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  absoluteTitle: true,
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    "Senior software, cloud, and AI engineers embedded inside your team to design, build, and deploy production web platforms, enterprise RAG search, and multi-cloud infrastructure.",
  path: "/",
  keywords: [
    "Custom Software Engineering",
    "Enterprise AI Engineering",
    "Production RAG Search",
    "Multi-Cloud Architecture Consulting",
    "Senior Software Engineers San Francisco",
    "Full-Stack TypeScript Next.js Agency",
    "Kubernetes Terraform Cloud Migration",
    "Factual Technologies",
  ],
});

export default function HomePage() {
  return (
    <>
      <JsonLd id="ld-home-faq" data={buildFaqJsonLd(HOME_FAQS)} />
      <HomeClient />
    </>
  );
}
