import React, { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Sulphur_Point, Poppins, Spline_Sans, Alexandria } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BackToTop from "@/components/layout/BackToTop";
import JsonLd from "@/components/seo/JsonLd";
import TelemetryBeacon from "@/components/seo/TelemetryBeacon";
import {
  OG_IMAGE_PATH,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo";

const sulphurPoint = Sulphur_Point({
  variable: "--font-sulphur-point",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const splineSans = Spline_Sans({
  variable: "--font-spline-sans",
  subsets: ["latin"],
  display: "swap",
});

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Senior software, cloud, and AI engineers working alongside your team to design, build, and deploy production systems.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Software Engineering & AI Consulting",
  keywords: [
    "Custom Software Engineering",
    "AI Engineering Studio",
    "Production RAG Systems",
    "Multi-Cloud Architecture",
    "Kubernetes & Terraform Consulting",
    "Enterprise Software Modernization",
    "Factual Technologies",
  ],
  alternates: {
    canonical: "/",
    types: {
      "text/plain": [
        { url: "/llms.txt", title: `${SITE_NAME} LLMs Summary` },
        { url: "/llms-full.txt", title: `${SITE_NAME} Full Engineering Context` },
      ],
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Senior software, cloud, and AI engineers working alongside your team to design, build, and deploy production systems.",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Senior software, cloud, and AI engineers working alongside your team to design, build, and deploy production systems.",
    images: [OG_IMAGE_PATH],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${sulphurPoint.variable} ${splineSans.variable} ${alexandria.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-white text-slate-900 selection:bg-slate-200 selection:text-slate-900 font-sans">
        <JsonLd id="ld-organization" data={buildOrganizationJsonLd()} />
        <JsonLd id="ld-website" data={buildWebSiteJsonLd()} />
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
        <BackToTop />
        <Suspense fallback={null}>
          <TelemetryBeacon />
        </Suspense>
      </body>
    </html>
  );
}
