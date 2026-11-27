import type { Metadata } from "next";
import AboutClient from "./AboutClient";
import JsonLd from "@/components/seo/JsonLd";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-defaults";
import {
  buildAboutPageJsonLd,
  buildBreadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About — Senior Engineering Pods Without Agency Handoffs",
  description:
    "Learn how Factual Technologies staffs senior systems, cloud, and AI builders directly inside client repositories with testable AI guardrails and clean production handover.",
  path: "/about",
  keywords: [
    "About Factual Technologies",
    "Embedded Senior Engineering Pods",
    "Software Consultancy Without Handoffs",
    "San Francisco Software Engineering Studio",
    "AI Evaluation and Permissions Architecture",
  ],
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        id="ld-about-breadcrumb"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <JsonLd
        id="ld-about-page"
        data={buildAboutPageJsonLd(DEFAULT_SITE_CONTENT.aboutPage.teamMembers)}
      />
      <AboutClient />
    </>
  );
}
