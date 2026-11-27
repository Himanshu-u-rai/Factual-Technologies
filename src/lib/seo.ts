import type { Metadata } from "next";
import { BlogArticle } from "@/lib/articles-shared";
import {
  industries,
  projects as defaultProjects,
  services as defaultServices,
  techStack,
} from "@/lib/data";
import { CaseStudyArchitectureDetail, ServicePillarSpec, getCaseStudySlug } from "@/lib/seo-pillars";
import { ProjectContent, SiteMetaContent, TeamMemberContent } from "@/lib/site-defaults";

export const SITE_URL = "https://factualtechnologies.tech";
export const SITE_NAME = "Factual Technologies";
export const SITE_LEGAL_NAME = "Factual Technologies Inc.";
export const SITE_TAGLINE = "Production Software, Cloud & AI Engineering";
export const OG_IMAGE_PATH = "/opengraph-image";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export interface FaqEntry {
  readonly id?: string;
  readonly q: string;
  readonly a: string;
}

export interface ComparisonRow {
  readonly dimension: string;
  readonly factual: string;
  readonly agency: string;
  readonly inHouse: string;
}

/**
 * Visible on-page FAQs rendered on "/" and paired 1:1 with FAQPage JSON-LD
 * for Answer Engine Optimization (Google AI Overviews, Featured Snippets, Perplexity, ChatGPT).
 */
export const HOME_FAQS: readonly FaqEntry[] = [
  {
    id: "faq-h-1",
    q: "What does Factual Technologies specialize in?",
    a: "Factual Technologies is a senior software, cloud, and AI engineering studio based in San Francisco. We embed experienced engineers directly alongside client teams to design and ship custom web platforms, internal AI search and workflow systems, and multi-cloud Kubernetes infrastructure.",
  },
  {
    id: "faq-h-2",
    q: "How quickly can your engineers start and ship a production release?",
    a: "Dedicated senior engineering pods typically start within 5 to 10 business days after discovery. Engagements open with a 2-week architecture review and technical spike, followed by weekly working builds in staging and bi-weekly production releases over 6 to 12 weeks.",
  },
  {
    id: "faq-h-3",
    q: "Who owns the source code, intellectual property, and cloud accounts?",
    a: "Your organization owns 100% of the source code, infrastructure-as-code templates, evaluation harnesses, and runbooks from day one. All commits, pull requests, and CI/CD deployments run inside your private GitHub or GitLab repositories and your own cloud accounts.",
  },
  {
    id: "faq-h-4",
    q: "How do you make internal enterprise AI and RAG systems reliable in production?",
    a: "We scope document retrieval strictly to existing user permissions, run automated evaluation suites on every prompt and model change, and attach primary-source citations before outputs reach analysts or clinical specialists.",
  },
  {
    id: "faq-h-5",
    q: "How does Factual Technologies integrate with an internal engineering team?",
    a: "Rather than working behind layers of account managers, our senior engineers join your Slack channels, Jira or Linear issue trackers, pull request reviews, and staging environments directly so system context stays inside your organization.",
  },
];

/**
 * Scannable comparison matrix rendered on /services and exposed via /llms-full.txt
 * to give buyers and generative engines clear, verifiable delivery trade-offs.
 */
export const SERVICES_COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    dimension: "Engineering seniority",
    factual: "Senior systems, cloud, and AI builders from kickoff through production handover",
    agency: "Senior leads during sales; day-to-day delivery often handed to junior staff",
    inHouse: "Varies by candidate pool; long specialist search for AI and cloud roles",
  },
  {
    dimension: "Time to first commit",
    factual: "Dedicated pod within 5–10 business days; 2-week architectural discovery spike",
    agency: "4–8 weeks onboarding with waterfall specification handoffs",
    inHouse: "3–6+ months recruiting, interviews, and ramp-up per engineer",
  },
  {
    dimension: "Workflow integration",
    factual: "Works directly inside your GitHub/GitLab, Linear/Jira, CI/CD, and Slack",
    agency: "External repositories and gated status reporting through account managers",
    inHouse: "Native internal workflow once hiring completes",
  },
  {
    dimension: "AI & security posture",
    factual: "Permission-scoped RAG, primary citations, SOC2 Type II / HIPAA / GDPR controls",
    agency: "Prompt wrappers with manual QA and limited automated regression harnesses",
    inHouse: "Must be architected internally unless specialist MLOps hires are on staff",
  },
  {
    dimension: "Code & IP handover",
    factual: "100% client-owned repos, Terraform IaC, automated tests, and team runbooks",
    agency: "Often retains proprietary accelerators or ongoing maintenance dependency",
    inHouse: "Retained internally with ongoing payroll overhead",
  },
];

/** Joins a route path cleanly against the canonical production origin. */
export function normalizeSiteUrl(path = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanPath === "/" ? SITE_URL : `${SITE_URL}${cleanPath}`;
}

/** Filters out generic placeholder social domains so only real brand profiles emit in Schema.org sameAs. */
export function resolveVerifiedSocialUrls(meta?: Partial<SiteMetaContent>): string[] {
  if (!meta) return [];
  const candidates = [meta.socialLinkedIn, meta.socialTwitter, meta.socialGitHub];
  return candidates.filter((url): url is string => {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:") return false;
      const pathDepth = parsed.pathname.replace(/\/+$/, "").length;
      return pathDepth > 1;
    } catch {
      return false;
    }
  });
}

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  absoluteTitle?: boolean;
  type?: "website" | "article";
  imagePath?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

/** Builds consistent Next.js route Metadata with canonical, OpenGraph, Twitter, and robot indexing hints. */
export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  absoluteTitle = false,
  type = "website",
  imagePath = OG_IMAGE_PATH,
  publishedTime,
  modifiedTime,
  authors,
}: PageMetadataInput): Metadata {
  const canonicalUrl = normalizeSiteUrl(path);
  const fullSocialTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const resolvedImage = imagePath.startsWith("https://") ? imagePath : normalizeSiteUrl(imagePath);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    alternates: {
      canonical: path,
      types: {
        "text/plain": [
          { url: "/llms.txt", title: `${SITE_NAME} LLMs Summary` },
          { url: "/llms-full.txt", title: `${SITE_NAME} Full Engineering Context` },
        ],
        "application/rss+xml": [
          { url: "/rss.xml", title: `${SITE_NAME} Engineering Blog RSS` },
        ],
      },
    },
    openGraph:
      type === "article"
        ? {
            type: "article",
            locale: "en_US",
            siteName: SITE_NAME,
            url: canonicalUrl,
            title: fullSocialTitle,
            description,
            publishedTime,
            modifiedTime,
            authors,
            images: [
              {
                url: resolvedImage,
                width: 1200,
                height: 630,
                alt: `${fullSocialTitle} — ${SITE_NAME}`,
              },
            ],
          }
        : {
            type: "website",
            locale: "en_US",
            siteName: SITE_NAME,
            url: canonicalUrl,
            title: fullSocialTitle,
            description,
            images: [
              {
                url: resolvedImage,
                width: 1200,
                height: 630,
                alt: `${fullSocialTitle} — ${SITE_NAME}`,
              },
            ],
          },
    twitter: {
      card: "summary_large_image",
      title: fullSocialTitle,
      description,
      images: [resolvedImage],
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
}

/** Returns Organization + ProfessionalService Schema.org graph entity for global embedding. */
export function buildOrganizationJsonLd(meta?: Partial<SiteMetaContent>): Record<string, unknown> {
  const allTopics = Array.from(
    new Set([
      ...techStack.flatMap((category) => category.items),
      ...industries,
      "Production Software Engineering",
      "Enterprise RAG Systems",
      "Multi-Cloud Migration",
      "Infrastructure as Code",
      "SOC2 Type II Engineering",
      "HIPAA Cloud Architecture",
    ])
  );

  const sameAs = resolveVerifiedSocialUrls(meta);
  const email = meta?.email && !meta.email.toLowerCase().endsWith(".example") ? meta.email : undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}${OG_IMAGE_PATH}`,
    description:
      "Senior software, cloud, and AI engineers working alongside internal teams to design, build, and deploy production systems.",
    slogan: SITE_TAGLINE,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Howard Street, SoMa",
      addressLocality: "San Francisco",
      addressRegion: "CA",
      addressCountry: "US",
    },
    areaServed: ["United States", "North America", "Western Europe"],
    knowsAbout: allTopics,
    serviceType: defaultServices.map((s) => s.title),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "engineering inquiries",
      ...(email ? { email } : {}),
      url: `${SITE_URL}/contact`,
      availableLanguage: ["English"],
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "18:00",
      },
    },
  };
}

/** Returns WebSite Schema.org entity for brand identity in search results. */
export function buildWebSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_TAGLINE,
    inLanguage: "en-US",
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  };
}

/** Returns BreadcrumbList Schema.org payload matching visible route hierarchy. */
export function buildBreadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: normalizeSiteUrl(item.path),
    })),
  };
}

/** Returns FAQPage Schema.org entity strictly mirroring visible on-page Q&As. */
export function buildFaqJsonLd(
  faqs: ReadonlyArray<{ q: string; a: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

/** Returns Service OfferCatalog Schema.org payload representing core engineering practices. */
export function buildServicesCatalogJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Software, Cloud & AI Engineering Consulting",
    provider: {
      "@id": ORGANIZATION_ID,
    },
    areaServed: ["United States", "North America", "Western Europe"],
    url: `${SITE_URL}/services`,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Engineering Capabilities",
      itemListElement: defaultServices.map((service, idx) => ({
        "@type": "Offer",
        position: idx + 1,
        itemOffered: {
          "@type": "Service",
          name: service.title,
          description: service.description,
          serviceOutput: service.capabilities.join(", "),
        },
      })),
    },
  };
}

/** Returns dedicated Service Schema.org payload for a granular pillar page (/services/[slug]). */
export function buildServicePillarJsonLd(pillar: ServicePillarSpec): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: pillar.title,
    serviceType: pillar.title,
    description: pillar.seoDescription,
    url: normalizeSiteUrl(`/services/${pillar.slug}`),
    provider: {
      "@id": ORGANIZATION_ID,
    },
    areaServed: ["United States", "North America", "Western Europe"],
    serviceOutput: pillar.deliverables.join("; "),
  };
}

/** Returns CollectionPage + ItemList Schema.org payload for engineering case studies. */
export function buildWorkCollectionJsonLd(
  projectsList?: ReadonlyArray<ProjectContent>
): Record<string, unknown> {
  const items = projectsList && projectsList.length > 0 ? projectsList : defaultProjects;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Selected Engineering Engagements & Case Studies",
    description:
      "Production web software, multi-cloud migrations, mobile dispatch systems, and enterprise AI search pipelines built alongside client engineering teams.",
    url: `${SITE_URL}/work`,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((project, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "CreativeWork",
          name: project.title,
          description: project.description,
          url: normalizeSiteUrl(`/work/${getCaseStudySlug(project)}`),
          image: normalizeSiteUrl(project.image),
          keywords: project.tags.join(", "),
          creator: {
            "@id": ORGANIZATION_ID,
          },
        },
      })),
    },
  };
}

/** Returns TechArticle Schema.org payload for an individual case study permalink (/work/[slug]). */
export function buildCaseStudyArticleJsonLd(
  project: ProjectContent,
  detail: CaseStudyArchitectureDetail
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: project.title,
    description: project.description,
    url: normalizeSiteUrl(`/work/${detail.slug}`),
    image: normalizeSiteUrl(project.image),
    keywords: project.tags.join(", "),
    articleSection: project.category.toUpperCase(),
    author: {
      "@id": ORGANIZATION_ID,
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    isPartOf: {
      "@id": WEBSITE_ID,
    },
  };
}

/** Returns AboutPage Schema.org payload enriched with named Person leadership E-E-A-T profiles. */
export function buildAboutPageJsonLd(team?: ReadonlyArray<TeamMemberContent>): Record<string, unknown> {
  const memberEntities =
    team && team.length > 0
      ? team.map((person) => ({
          "@type": "Person",
          name: person.name,
          jobTitle: person.role,
          description: person.bio,
          knowsAbout: person.specialties,
          worksFor: {
            "@id": ORGANIZATION_ID,
          },
          ...(person.linkedIn || person.github
            ? { sameAs: [person.linkedIn, person.github].filter(Boolean) }
            : {}),
        }))
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${SITE_NAME}`,
    description:
      "Senior software engineering without agency handoffs. Embedded systems, cloud, and AI engineers shipping readable, testable production code inside client repositories.",
    url: `${SITE_URL}/about`,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    mainEntity: {
      "@id": ORGANIZATION_ID,
      ...(memberEntities ? { member: memberEntities } : {}),
    },
    about: {
      "@id": ORGANIZATION_ID,
    },
  };
}

/** Returns ContactPage Schema.org payload linked cleanly to the Organization contactPoint. */
export function buildContactPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SITE_NAME}`,
    description:
      "Start a technical engineering engagement, architecture review, cloud migration, or internal AI build with Factual Technologies.",
    url: `${SITE_URL}/contact`,
    isPartOf: {
      "@id": WEBSITE_ID,
    },
    mainEntity: {
      "@id": ORGANIZATION_ID,
    },
  };
}

/** Returns Blog Collection Schema.org graph linking all published engineering articles. */
export function buildBlogIndexJsonLd(articles: ReadonlyArray<BlogArticle>): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Engineering Blog`,
    description:
      "Practical engineering architecture guides on permission-scoped RAG search, zero-downtime multi-cloud migrations, offline-first systems, and SOC2/HIPAA automation.",
    url: normalizeSiteUrl("/blog"),
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    blogPost: articles.map((art) => ({
      "@type": "BlogPosting",
      headline: art.title,
      description: art.excerpt,
      url: normalizeSiteUrl(`/blog/${art.slug}`),
      image: normalizeSiteUrl(art.coverImage),
      datePublished: art.publishedAt || art.createdAt,
      dateModified: art.updatedAt,
      author: {
        "@type": "Person",
        name: art.authorName,
        ...(art.authorRole ? { jobTitle: art.authorRole } : {}),
      },
    })),
  };
}

/** Returns detailed TechArticle Schema.org payload for individual blog article pages. */
export function buildBlogArticleJsonLd(article: BlogArticle): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    alternativeHeadline: article.subtitle || undefined,
    description: article.metaDescription || article.excerpt,
    url: article.canonicalUrl || normalizeSiteUrl(`/blog/${article.slug}`),
    image: normalizeSiteUrl(article.coverImage),
    articleSection: article.category,
    keywords: [article.focusKeyword, ...article.tags].filter(Boolean).join(", "),
    wordCount: article.wordCount,
    timeRequired: `PT${Math.max(1, article.readingTimeMinutes)}M`,
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    author: {
      "@type": "Person",
      name: article.authorName,
      ...(article.authorRole ? { jobTitle: article.authorRole } : {}),
      ...(article.authorBio ? { description: article.authorBio } : {}),
      ...(article.authorLinkedIn ? { sameAs: [article.authorLinkedIn] } : {}),
      worksFor: {
        "@id": ORGANIZATION_ID,
      },
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.canonicalUrl || normalizeSiteUrl(`/blog/${article.slug}`),
    },
  };
}
