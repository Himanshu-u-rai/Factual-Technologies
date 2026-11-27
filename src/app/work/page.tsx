import type { Metadata } from "next";
import WorkClient from "./WorkClient";
import JsonLd from "@/components/seo/JsonLd";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWorkCollectionJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Selected Work & Production Case Studies",
  description:
    "Explore verified engineering builds across regulatory AI search, institutional reporting portals, multi-cloud Kafka pipelines, HIPAA clinical triage, and retail checkout platforms.",
  path: "/work",
  keywords: [
    "Software Engineering Case Studies",
    "Enterprise AI Search Case Study",
    "Multi-Cloud Kafka Migration Case Study",
    "HIPAA Clinical Triage Engineering",
    "Headless Next.js Checkout Re-Platform",
    "Offline-First React Native Dispatch",
  ],
});

export default function WorkPage() {
  return (
    <>
      <JsonLd
        id="ld-work-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
        ])}
      />
      <JsonLd id="ld-work-collection" data={buildWorkCollectionJsonLd()} />
      <WorkClient />
    </>
  );
}
