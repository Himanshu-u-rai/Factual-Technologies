import { sanitizeSafeUrl } from "@/lib/admin-types";
import {
  stats as defaultStats,
  services as defaultServices,
  projects as defaultProjects,
  siteConfig as defaultSiteConfig,
  testimonials as defaultTestimonials,
  processSteps as defaultProcessSteps,
} from "@/lib/data";

export interface WaveAnimationConfig {
  enabled: boolean;
  activeShape: string;
  autoMorph: boolean;
  ringCount: number;
  baseRadius: number;
  focalLength: number;
  waveSpeed: number;
  waveAmplitude: number;
  autoRotateSpeed: number;
  wireframeTheme: "graphite" | "silver" | "blue" | "dark";
  strokeWidth: number;
}

export interface HeroContent {
  eyebrow: string;
  headlinePrefix: string;
  rotatingPhrases: string[];
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  showWaveAnimation: boolean;
  waveConfig: WaveAnimationConfig;
}

export interface StatContent {
  id: string;
  value: string;
  label: string;
}

export interface ServiceContent {
  id: string;
  title: string;
  description: string;
  icon: string;
  capabilities: string[];
  enabled: boolean;
}

export interface ProcessStepContent {
  id: string;
  step: string;
  title: string;
  description: string;
}

export interface FAQContent {
  id: string;
  q: string;
  a: string;
}

export interface StrategicPillarContent {
  id: string;
  title: string;
  description: string;
  icon: string;
  bullet: string;
}

export interface ServiceMetricContent {
  id: string;
  value: string;
  label: string;
}

export interface ServicesPageContent {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  slaMetric: string;
  slaLabel: string;
  metrics: ServiceMetricContent[];
  strategicPillars: StrategicPillarContent[];
  faqs: FAQContent[];
  processSteps: ProcessStepContent[];
}

export interface ProjectContent {
  id: string;
  title: string;
  category: "ai" | "web" | "cloud" | "mobile";
  metrics: string;
  description: string;
  tags: string[];
  image: string;
  featuredOnHome: boolean;
}

export interface WorkPageContent {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
}

export interface AboutValueContent {
  id: string;
  title: string;
  description: string;
}

export interface TeamMemberContent {
  id: string;
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  linkedIn?: string;
  github?: string;
}

export interface VisionMissionContent {
  visionTitle: string;
  visionText: string;
  visionBullets: string[];
  missionTitle: string;
  missionText: string;
  missionBullets: string[];
}

export interface AboutPageContent {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  foundingConvictionTitle: string;
  foundingConvictionText: string;
  narrativeParagraphs: string[];
  visionMission: VisionMissionContent;
  values: AboutValueContent[];
  teamMembers?: TeamMemberContent[];
}

export interface ContactTimelineContent {
  id: string;
  phase: string;
  timeframe: string;
  title: string;
  description: string;
  icon: string;
}

export interface ContactPageContent {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  officeAddress: string;
  phone: string;
  email: string;
  businessHours: string;
  responseTime: string;
  timeline: ContactTimelineContent[];
  faqs: FAQContent[];
}

export interface TestimonialContent {
  id: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar?: string;
}

export interface TechStackContent {
  marqueeSpeed: number;
  reverseSpeed: number;
}

export interface NavLinkContent {
  id: string;
  label: string;
  href: string;
}

export interface SiteMetaContent {
  name: string;
  tagline: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  copyright: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementLink: string;
  socialLinkedIn: string;
  socialTwitter: string;
  socialGitHub: string;
  navLinks: NavLinkContent[];
  footerCapabilityLinks: NavLinkContent[];
}

export interface InboundMessage {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface CTABannerContent {
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
}

export interface SiteSnapshot {
  id: string;
  name: string;
  timestamp: string;
  author: string;
  content: FullSiteContent;
}

export interface FullSiteContent {
  hero: HeroContent;
  stats: StatContent[];
  services: ServiceContent[];
  servicesPage: ServicesPageContent[];
  projects: ProjectContent[];
  workPage: WorkPageContent;
  aboutPage: AboutPageContent;
  contactPage: ContactPageContent;
  testimonials: TestimonialContent[];
  techStack: TechStackContent;
  clients: string[];
  ctaBanner?: CTABannerContent;
  meta: SiteMetaContent;
  messages: InboundMessage[];
}

export const DEFAULT_SITE_CONTENT: FullSiteContent = {
  hero: {
    eyebrow: "",
    headlinePrefix: "We build",
    rotatingPhrases: [
      "web software",
      "cloud pipelines",
      "internal AI tools",
      "data platforms",
    ],
    subtitle:
      "Senior engineers working alongside your team to design, build, and ship production web software, cloud infrastructure, and internal AI workflows.",
    primaryCtaText: "Book a call",
    primaryCtaLink: "/contact",
    secondaryCtaText: "See case studies",
    secondaryCtaLink: "/work",
    showWaveAnimation: true,
    waveConfig: {
      enabled: true,
      activeShape: "sphere",
      autoMorph: true,
      ringCount: 22,
      baseRadius: 215,
      focalLength: 680,
      waveSpeed: 1.1,
      waveAmplitude: 1.0,
      autoRotateSpeed: 0.0045,
      wireframeTheme: "graphite",
      strokeWidth: 1.55,
    },
  },
  stats: defaultStats.map((s, i) => ({
    id: `stat-${i + 1}`,
    value: s.value,
    label: s.label,
  })),
  services: defaultServices.map((s, i) => ({
    id: `service-${i + 1}`,
    title: s.title,
    description: s.description,
    icon: s.icon,
    capabilities: [...s.capabilities],
    enabled: true,
  })),
  servicesPage: [
    {
      heroBadge: "",
      heroTitle: "Software, cloud infrastructure, and AI systems built for your team",
      heroSubtitle:
        "We work with product and engineering teams to ship customer portals, migrate cloud databases, and build internal AI tools with clear ownership.",
      slaMetric: "Bi-weekly",
      slaLabel: "Release cadence",
      metrics: [
        { id: "sm-1", value: "2 weeks", label: "Discovery & proof of concept" },
        { id: "sm-2", value: "Bi-weekly", label: "Production release cadence" },
        { id: "sm-3", value: "100% IP", label: "Authored in your repository" },
        { id: "sm-4", value: "Zero lock-in", label: "Standard containers & IaC" },
      ],
      strategicPillars: [
        {
          id: "spill-1",
          title: "Predictable Delivery",
          description:
            "Clear module boundaries, automated integration tests, and reproducible CI pipelines keep weekly releases moving without surprises.",
          icon: "Rocket",
          bullet: "Automated checks and staged rollouts",
        },
        {
          id: "spill-2",
          title: "Grounded AI Workflows",
          description:
            "Retrieval pipelines, structured outputs, and prompt evaluations connected to your internal documents and existing permissions.",
          icon: "Brain",
          bullet: "Source citations and access controls",
        },
        {
          id: "spill-3",
          title: "Clean Data Pipelines",
          description:
            "Event streaming, API gateways, and schema migrations designed to keep downstream warehouses and services in sync.",
          icon: "Database",
          bullet: "Idempotent ingestion and monitoring",
        },
      ],
      faqs: [
        {
          id: "faq-s-1",
          q: "How do you handle intellectual property, source repositories, and code handover?",
          a: "All code, architecture schemas, and infrastructure configuration belong to your organization from day one. Work happens directly inside your private GitHub or GitLab repositories.",
        },
        {
          id: "faq-s-2",
          q: "What security standards and regulatory compliance frameworks do you build against?",
          a: "We align builds with SOC2 Type II, ISO 27001, HIPAA, and GDPR requirements, integrating automated dependency checks, static analysis, and least-privilege IAM policies.",
        },
        {
          id: "faq-s-3",
          q: "How does your team integrate with our internal engineering squad?",
          a: "We join your existing Jira or Linear board, pull request workflow, and weekly demos so architecture decisions and code context stay inside your team.",
        },
        {
          id: "faq-s-4",
          q: "What is your typical timeline from architectural discovery to production rollout?",
          a: "Engagements usually open with a 2-week discovery and technical spike, followed by bi-weekly production releases over 6 to 12 weeks.",
        },
      ],
      processSteps: defaultProcessSteps.map((ps) => ({
        id: `ps-${ps.step}`,
        step: ps.step,
        title: ps.title,
        description: ps.description,
      })),
    },
  ],
  projects: defaultProjects.map((p, i) => ({
    id: `proj-${i + 1}`,
    title: p.title,
    category: p.category,
    metrics: p.metrics,
    description: p.description,
    tags: [...p.tags],
    image: p.image,
    featuredOnHome: i < 4,
  })),
  workPage: {
    heroBadge: "",
    heroTitle: "Selected engineering engagements",
    heroSubtitle:
      "Production web software, multi-cloud migrations, and internal AI search tools built alongside client engineering teams.",
  },
  aboutPage: {
    heroBadge: "",
    heroTitle: "Senior software engineering without agency handoffs",
    heroSubtitle: defaultSiteConfig.description,
    foundingConvictionTitle: "Senior engineers from kickoff through production handover",
    foundingConvictionText:
      "We started Factual Technologies so teams hiring outside engineering help get experienced builders who write production code directly inside their codebase.",
    narrativeParagraphs: [
      "Many software consultancies pitch senior leads during discovery and hand delivery off to junior staff once a contract starts. We keep our pods small and staff every engagement with experienced engineers.",
      "Our team works directly inside your issue tracker, pull requests, and staging environments—pairing with your leads rather than operating behind account managers.",
      "When a project wraps, your team inherits readable architecture, test coverage, and runbooks they can maintain independently.",
    ],
    visionMission: {
      visionTitle: "How we build AI systems",
      visionText:
        "Internal AI software only works when outputs are testable, permissions are enforced, and answers link back to primary records.",
      visionBullets: [
        "Evaluation suites run on every prompt and model change",
        "Document retrieval scoped to existing user permissions",
      ],
      missionTitle: "How we run projects",
      missionText:
        "Clear scoping up front, small pull requests every day, and honest estimates when requirements shift.",
      missionBullets: [
        "Weekly demos running in staging",
        "Zero proprietary runtime dependencies",
      ],
    },
    values: [
      {
        id: "val-1",
        title: "Systems Depth",
        description:
          "Hands-on experience with database indexing, distributed queues, API latency, and infrastructure automation.",
      },
      {
        id: "val-2",
        title: "Built for Operations",
        description:
          "Structured logging, alerting thresholds, and rollback paths included before code reaches production.",
      },
      {
        id: "val-3",
        title: "Compliance Ready",
        description:
          "Familiarity with healthcare and financial audit controls translated directly into Terraform and CI guardrails.",
      },
      {
        id: "val-4",
        title: "Direct Collaboration",
        description:
          "Shared Slack channels, transparent repositories, and direct access to the engineers shipping the work.",
      },
    ],
    teamMembers: [
      {
        id: "team-1",
        name: "Priyanshu Rai",
        role: "Principal Systems Architect",
        bio: "Designs and ships production web platforms, permission-scoped AI retrieval systems, and multi-cloud Kubernetes infrastructure alongside client teams.",
        specialties: ["AI Systems & RAG", "Distributed Architecture", "Cloud & DevSecOps"],
      },
      {
        id: "team-2",
        name: "Marcus Chen",
        role: "VP of Engineering",
        bio: "Specializes in multi-region database internals, zero-downtime Kafka migrations across AWS and GCP, and Kubernetes/Terraform delivery automation.",
        specialties: ["Multi-Cloud Infrastructure", "Kafka & PostgreSQL", "Terraform IaC"],
      },
      {
        id: "team-3",
        name: "Sarah Lindqvist",
        role: "Head of Product Innovation",
        bio: "Architects TypeScript web portals, GraphQL API gateways, and offline-first React Native clients for operations and financial reporting teams.",
        specialties: ["Next.js & TypeScript", "GraphQL APIs", "Offline-First Mobile"],
      },
    ],
  },
  contactPage: {
    heroBadge: "",
    heroTitle: "Tell us what you are building",
    heroSubtitle:
      "Share your technical goals, timeline, and stack. An engineering partner will reply within four business hours.",
    officeAddress: defaultSiteConfig.address,
    phone: defaultSiteConfig.phone,
    email: defaultSiteConfig.email,
    businessHours: "Monday - Friday, 8:00 AM - 6:00 PM PST",
    responseTime: "Within 4 business hours",
    timeline: [
      {
        id: "tl-1",
        phase: "Same day",
        timeframe: "Within 4 hours",
        title: "Technical review",
        description:
          "An engineering lead reviews your message and notes architectural questions before the introductory call.",
        icon: "Users",
      },
      {
        id: "tl-2",
        phase: "Days 1-2",
        timeframe: "30 minutes",
        title: "Discovery call",
        description:
          "We walk through system constraints, team structure, timeline expectations, and integration boundaries.",
        icon: "Phone",
      },
      {
        id: "tl-3",
        phase: "Days 3-5",
        timeframe: "Written plan",
        title: "Scope & proposal",
        description:
          "You receive a concise engineering plan with milestones, staffing, and fixed or sprint pricing.",
        icon: "CheckCircle",
      },
    ],
    faqs: [
      {
        id: "faq-c-1",
        q: "How quickly can your team begin an engagement?",
        a: "Following an initial discovery session, we typically stand up dedicated sprint teams within 5 to 10 business days.",
      },
      {
        id: "faq-c-2",
        q: "Do you sign NDAs prior to discovery calls?",
        a: "Yes. We execute mutual non-disclosure agreements before reviewing technical schematics, codebases, or proprietary domain data.",
      },
      {
        id: "faq-c-3",
        q: "Where are your engineering partners located?",
        a: "Our core architecture team is based in San Francisco, CA, with distributed engineering talent across North America and Western Europe.",
      },
    ],
  },
  testimonials: defaultTestimonials.map((t, i) => ({
    id: `test-${i + 1}`,
    quote: t.quote,
    author: t.author,
    role: t.role,
    company: t.company,
    avatar: t.avatar || "",
  })),
  techStack: {
    marqueeSpeed: 45,
    reverseSpeed: 45,
  },
  clients: [
    "TechCorp Systems",
    "InnovateLabs",
    "DataFlow Global",
    "CloudFirst",
    "NeuralPath",
    "ScaleUp Enterprise",
    "CyberForge",
    "QuantumEdge",
  ],
  meta: {
    name: defaultSiteConfig.name,
    tagline: defaultSiteConfig.tagline,
    description: defaultSiteConfig.description,
    email: defaultSiteConfig.email,
    phone: defaultSiteConfig.phone,
    address: defaultSiteConfig.address,
    copyright: "© 2026 Factual Technologies Inc. All rights reserved.",
    announcementEnabled: false,
    announcementText: "Q4 2026 architecture audit slots open for scheduling",
    announcementLink: "/services",
    socialLinkedIn: "https://linkedin.com",
    socialTwitter: "https://twitter.com",
    socialGitHub: "https://github.com",
    navLinks: [
      { id: "nav-1", label: "Home", href: "/" },
      { id: "nav-2", label: "Services", href: "/services" },
      { id: "nav-3", label: "Work", href: "/work" },
      { id: "nav-4", label: "Blog", href: "/blog" },
      { id: "nav-5", label: "About", href: "/about" },
      { id: "nav-6", label: "Contact", href: "/contact" },
    ],
    footerCapabilityLinks: [
      { id: "fcap-1", label: "Digital Product Engineering", href: "/services/digital-product-engineering" },
      { id: "fcap-2", label: "AI Systems & Automation", href: "/services/ai-systems-automation" },
      { id: "fcap-3", label: "Cloud Infrastructure & Data", href: "/services/cloud-infrastructure-data" },
    ],
  },
  ctaBanner: {
    badge: "",
    title: "Discuss your upcoming software roadmap",
    subtitle:
      "Tell us what you are building or migrating. An engineering lead will review your note and reply the same day.",
    buttonText: "Schedule a call",
    buttonHref: "/contact",
    secondaryCtaText: "See case studies",
    secondaryCtaHref: "/work",
  },
  messages: [],
};

/** Merges partial persisted site content with complete defaults and safe link sanitization. */
export function mergeSiteContent(parsed: Partial<FullSiteContent> | null | undefined): FullSiteContent {
  if (!parsed) return DEFAULT_SITE_CONTENT;
  const mergedHero = {
    ...DEFAULT_SITE_CONTENT.hero,
    ...(parsed.hero || {}),
    waveConfig: {
      ...DEFAULT_SITE_CONTENT.hero.waveConfig,
      ...(parsed.hero?.waveConfig || {}),
    },
  };
  const rawNavLinks =
    parsed.meta?.navLinks && parsed.meta.navLinks.length > 0
      ? parsed.meta.navLinks
      : DEFAULT_SITE_CONTENT.meta.navLinks;
  const hasBlogLink = rawNavLinks.some((l) => l.href === "/blog");
  const normalizedNavLinks = hasBlogLink
    ? rawNavLinks
    : (() => {
        const contactIdx = rawNavLinks.findIndex((l) => l.href === "/contact");
        const blogItem: NavLinkContent = { id: "nav-blog", label: "Blog", href: "/blog" };
        if (contactIdx >= 0) {
          return [...rawNavLinks.slice(0, contactIdx), blogItem, ...rawNavLinks.slice(contactIdx)];
        }
        return [...rawNavLinks, blogItem];
      })();

  const rawCapabilities =
    parsed.meta?.footerCapabilityLinks && parsed.meta.footerCapabilityLinks.length > 0
      ? parsed.meta.footerCapabilityLinks
      : DEFAULT_SITE_CONTENT.meta.footerCapabilityLinks;

  const mergedMeta = {
    ...DEFAULT_SITE_CONTENT.meta,
    ...(parsed.meta || {}),
    navLinks: normalizedNavLinks,
    footerCapabilityLinks: rawCapabilities.map((cap) => {
      if (cap.href === "/services") {
        const lower = cap.label.toLowerCase();
        if (lower.includes("ai")) return { ...cap, href: "/services/ai-systems-automation" };
        if (lower.includes("cloud") || lower.includes("data")) return { ...cap, href: "/services/cloud-infrastructure-data" };
        if (lower.includes("product")) return { ...cap, href: "/services/digital-product-engineering" };
      }
      return cap;
    }),
  };
  const mergedBanner = { ...DEFAULT_SITE_CONTENT.ctaBanner!, ...(parsed.ctaBanner || {}) };

  return {
    ...DEFAULT_SITE_CONTENT,
    ...parsed,
    hero: {
      ...mergedHero,
      primaryCtaLink: sanitizeSafeUrl(mergedHero.primaryCtaLink, "/contact"),
      secondaryCtaLink: sanitizeSafeUrl(mergedHero.secondaryCtaLink, "/work"),
    },
    servicesPage: (parsed.servicesPage || DEFAULT_SITE_CONTENT.servicesPage).map((sp, i) => ({
      ...DEFAULT_SITE_CONTENT.servicesPage[i || 0],
      ...sp,
      metrics: sp.metrics && sp.metrics.length > 0 ? sp.metrics : DEFAULT_SITE_CONTENT.servicesPage[0].metrics,
      strategicPillars:
        sp.strategicPillars && sp.strategicPillars.length > 0
          ? sp.strategicPillars
          : DEFAULT_SITE_CONTENT.servicesPage[0].strategicPillars,
      processSteps:
        sp.processSteps && sp.processSteps.length > 0
          ? sp.processSteps
          : DEFAULT_SITE_CONTENT.servicesPage[0].processSteps,
      faqs: sp.faqs || DEFAULT_SITE_CONTENT.servicesPage[0].faqs,
    })),
    projects: (parsed.projects || DEFAULT_SITE_CONTENT.projects).map((p, i) => {
      const fallbackProject = DEFAULT_SITE_CONTENT.projects[i];
      const staleImage = !p.image || /^\/projects\/(project-\d+|fleet|fintech)\.jpg$/.test(p.image);
      const chosenImage = staleImage && fallbackProject ? fallbackProject.image : p.image;
      return {
        ...p,
        image: sanitizeSafeUrl(chosenImage, "/projects/regulatory-search.jpg"),
      };
    }),
    workPage: { ...DEFAULT_SITE_CONTENT.workPage, ...(parsed.workPage || {}) },
    aboutPage: {
      ...DEFAULT_SITE_CONTENT.aboutPage,
      ...(parsed.aboutPage || {}),
      narrativeParagraphs:
        parsed.aboutPage?.narrativeParagraphs && parsed.aboutPage.narrativeParagraphs.length > 0
          ? parsed.aboutPage.narrativeParagraphs
          : DEFAULT_SITE_CONTENT.aboutPage.narrativeParagraphs,
      visionMission: {
        ...DEFAULT_SITE_CONTENT.aboutPage.visionMission,
        ...(parsed.aboutPage?.visionMission || {}),
      },
      values: parsed.aboutPage?.values || DEFAULT_SITE_CONTENT.aboutPage.values,
      teamMembers:
        parsed.aboutPage?.teamMembers && parsed.aboutPage.teamMembers.length > 0
          ? parsed.aboutPage.teamMembers
          : DEFAULT_SITE_CONTENT.aboutPage.teamMembers,
    },
    contactPage: {
      ...DEFAULT_SITE_CONTENT.contactPage,
      ...(parsed.contactPage || {}),
      timeline:
        parsed.contactPage?.timeline && parsed.contactPage.timeline.length > 0
          ? parsed.contactPage.timeline
          : DEFAULT_SITE_CONTENT.contactPage.timeline,
      faqs: parsed.contactPage?.faqs || DEFAULT_SITE_CONTENT.contactPage.faqs,
    },
    testimonials: (parsed.testimonials || DEFAULT_SITE_CONTENT.testimonials).map((t) => {
      const match = DEFAULT_SITE_CONTENT.testimonials.find((d) => d.author === t.author);
      const rawAvatar = t.avatar || match?.avatar;
      return {
        ...t,
        avatar: rawAvatar ? sanitizeSafeUrl(rawAvatar, "") || undefined : undefined,
      };
    }),
    ctaBanner: {
      ...mergedBanner,
      buttonHref: sanitizeSafeUrl(mergedBanner.buttonHref, "/contact"),
      secondaryCtaHref: sanitizeSafeUrl(mergedBanner.secondaryCtaHref, "/work"),
    },
    meta: {
      ...mergedMeta,
      announcementLink: sanitizeSafeUrl(mergedMeta.announcementLink, "/services"),
      socialLinkedIn: sanitizeSafeUrl(mergedMeta.socialLinkedIn, "https://linkedin.com", {
        allowRelative: false,
      }),
      socialTwitter: sanitizeSafeUrl(mergedMeta.socialTwitter, "https://twitter.com", {
        allowRelative: false,
      }),
      socialGitHub: sanitizeSafeUrl(mergedMeta.socialGitHub, "https://github.com", {
        allowRelative: false,
      }),
      navLinks: mergedMeta.navLinks.map((l) => ({
        ...l,
        href: sanitizeSafeUrl(l.href, "/"),
      })),
      footerCapabilityLinks: mergedMeta.footerCapabilityLinks.map((l) => ({
        ...l,
        href: sanitizeSafeUrl(l.href, "/services"),
      })),
    },
    techStack: { ...DEFAULT_SITE_CONTENT.techStack, ...(parsed.techStack || {}) },
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
  };
}
