import { slugifyText } from "@/lib/articles-shared";
import { services as defaultServices } from "@/lib/data";
import { ProjectContent } from "@/lib/site-defaults";

export interface ServicePillarSpec {
  slug: string;
  title: string;
  shortName: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  heroSummary: string;
  outcomes: string[];
  architectureHighlights: Array<{ title: string; detail: string }>;
  deliverables: string[];
  complianceStandards: string[];
  relatedCaseStudySlugs: string[];
  relatedArticleSlugs: string[];
  faqs: Array<{ q: string; a: string }>;
}

export const SERVICE_PILLARS: readonly ServicePillarSpec[] = [
  {
    slug: "digital-product-engineering",
    title: "Digital Product Engineering",
    shortName: "Product Engineering",
    seoTitle: "Digital Product Engineering — Next.js, TypeScript & Mobile Platforms",
    seoDescription:
      "Senior full-stack TypeScript, Next.js, GraphQL, and React Native engineering pods building fast customer portals, decoupled retail platforms, and offline-first mobile software.",
    keywords: [
      "Digital Product Engineering",
      "Next.js TypeScript Agency",
      "Enterprise Client Portal Engineering",
      "Headless Commerce Re-Platforming",
      "Offline-First React Native Development",
      "Legacy Software Modernization",
    ],
    heroSummary:
      "We partner directly with product and engineering leaders to design, build, and modernize customer portals, transactional web platforms, and field-ready mobile apps inside your existing GitHub or GitLab workflows.",
    outcomes: [
      "Clean, strongly typed TypeScript codebases built directly in your repositories",
      "Automated integration suites and staging previews shipping every Friday",
      "Full source ownership, clear documentation, and runbooks handed directly to your team",
    ],
    architectureHighlights: [
      {
        title: "Modular Web Portals & GraphQL/REST APIs",
        detail:
          "Replace slow monolithic dashboards with server-rendered Next.js portals, role-scoped APIs, and predictable PostgreSQL or Redis caching strategies.",
      },
      {
        title: "Decoupled Checkout & High-Throughput Services",
        detail:
          "Extract fragile catalog, inventory, and pricing paths out of legacy monoliths into containerized Node.js and FastAPI services without downtime.",
      },
      {
        title: "Offline-First React Native Field Clients",
        detail:
          "Engineer local mutation outboxes, idempotent API replay keys, and deterministic conflict resolution so field teams keep moving offline.",
      },
    ],
    deliverables: [
      ...defaultServices[0].capabilities,
      "Automated end-to-end verification and Core Web Vitals profiling",
      "Developer onboarding documentation and zero-lock-in code handover",
    ],
    complianceStandards: ["SOC2 Type II", "OWASP ASVS", "WCAG AA Accessibility"],
    relatedCaseStudySlugs: [
      "institutional-portfolio-reporting-portal",
      "field-operations-dispatch-app",
      "headless-retail-checkout-re-platform",
    ],
    relatedArticleSlugs: ["offline-first-mobile-sync-conflict-resolution"],
    faqs: [
      {
        q: "Can you modernize part of our legacy application without a full rewrite?",
        a: "Yes. We routinely decouple highest-pain modules—such as customer reporting portals, authentication boundaries, or checkout APIs—behind clean service contracts so production traffic migrates safely in increments.",
      },
      {
        q: "How do your product engineers collaborate with internal designers and PMs?",
        a: "We work directly in your Linear or Jira boards, Slack channels, and Figma review cycles, shipping live staging URLs weekly for real product inspection.",
      },
    ],
  },
  {
    slug: "ai-systems-automation",
    title: "AI Systems & Automation",
    shortName: "AI Systems & RAG",
    seoTitle: "Enterprise AI Systems, Production RAG & Workflow Automation",
    seoDescription:
      "Build production internal AI search, permission-scoped RAG pipelines, document triage queues, and automated evaluation harnesses grounded in primary records.",
    keywords: [
      "Enterprise AI Engineering",
      "Permission-Scoped RAG Systems",
      "Production AI Search Consulting",
      "Clinical & Regulatory AI Pipelines",
      "LLM Evaluation Harness CI/CD",
      "FastAPI PyTorch AI Engineering",
    ],
    heroSummary:
      "We engineer internal AI search, regulatory citation pipelines, and triage queues where document ACLs, structured extraction schemas, and automated prompt evaluation suites protect accuracy in production.",
    outcomes: [
      "Permission-scoped retrieval enforcing user ACLs prior to vector similarity ranking",
      "Primary-source citations verified against indexed archival chunk records",
      "Deterministic CI evaluation suites catching regressions on every prompt or model update",
    ],
    architectureHighlights: [
      {
        title: "ACL-First Document Retrieval & Hybrid Indexing",
        detail:
          "Combine dense embeddings with BM25 lexical matching and strict tenant/role metadata filters so confidential records never enter unauthorized prompts.",
      },
      {
        title: "Cited Extraction & Structured Triage Queues",
        detail:
          "Pair PyTorch and FastAPI inference workers with human-in-the-loop review queues attaching bounding metadata, source filing links, and audit trails.",
      },
      {
        title: "Automated Evaluation Suites & Latency Budgets",
        detail:
          "Every model route ships with repeatable precision/recall checks, hallucination guards, and cost/latency telemetry before deployment.",
      },
    ],
    deliverables: [
      ...defaultServices[1].capabilities,
      "Primary-source citation pipeline linking claims directly to primary records",
      "Versioned golden dataset evaluation harness running in CI/CD",
    ],
    complianceStandards: ["HIPAA Cloud Controls", "SOC2 Type II", "GDPR Data Residency"],
    relatedCaseStudySlugs: [
      "regulatory-technical-knowledge-search",
      "clinical-pathology-triage-queue",
    ],
    relatedArticleSlugs: [
      "permission-scoped-rag-architecture-compliance",
      "soc2-hipaa-terraform-ci-guardrails",
    ],
    faqs: [
      {
        q: "How do you prevent enterprise RAG search from surfacing unauthorized documents?",
        a: "Every indexed chunk carries tenant and role ACL permissions filtered before similarity ranking executes, then re-verified against live caller permissions when citations resolve.",
      },
      {
        q: "Do we get locked into a single model vendor?",
        a: "No. We abstract model routing behind clean TypeScript or FastAPI interfaces with portable evaluation harnesses so you can switch open-weight, OpenAI, Anthropic, or Vertex endpoints without rewriting workflows.",
      },
    ],
  },
  {
    slug: "cloud-infrastructure-data",
    title: "Cloud Infrastructure & Data",
    shortName: "Cloud & Data",
    seoTitle: "Multi-Cloud Infrastructure, Kafka & Zero-Downtime Data Engineering",
    seoDescription:
      "Senior cloud architects delivering zero-downtime AWS and GCP migrations, partitioned Kafka pipelines, Kubernetes clusters, Terraform IaC, and SOC2/HIPAA guardrails.",
    keywords: [
      "Multi-Cloud Architecture Consulting",
      "AWS GCP Migration Engineers",
      "Kafka Event Ingestion Pipeline",
      "Kubernetes & Terraform IaC",
      "PostgreSQL Database Migration",
      "SOC2 HIPAA Cloud Architecture",
    ],
    heroSummary:
      "We migrate mission-critical workloads across AWS and GCP, replace brittle nightly batch scripts with partitioned streaming pipelines, and codify reproducible Terraform infrastructure with full observability.",
    outcomes: [
      "Zero-downtime database and streaming cutovers verified by continuous shadow parity checks",
      "Reproducible Terraform and Kubernetes manifests living in your Git repositories",
      "Automated alerting thresholds, structured audit trails, and tested rollback playbooks",
    ],
    architectureHighlights: [
      {
        title: "Partitioned Kafka & Event-Driven Ingestion",
        detail:
          "Transition fragile cron batch jobs to idempotent Kafka consumers, deterministic settlement ordering, and dead-letter topic recovery.",
      },
      {
        title: "Multi-Region AWS & GCP Infrastructure as Code",
        detail:
          "Provision Kubernetes workloads, isolated VPC subnets, least-privilege IAM roles, and automated GitHub Actions deployments cleanly with Terraform.",
      },
      {
        title: "Operations-First Monitoring & Audit Controls",
        detail:
          "Bake structured logging, Datadog/Grafana SLO dashboards, and SOC2/HIPAA compliance policies into CI pipelines from day one.",
      },
    ],
    deliverables: [
      ...defaultServices[2].capabilities,
      "Zero-downtime schema migration & dual-write reconciliation tooling",
      "Datadog/Grafana SLO monitoring dashboards and incident runbooks",
    ],
    complianceStandards: ["SOC2 Type II", "ISO 27001", "HIPAA", "GDPR"],
    relatedCaseStudySlugs: [
      "multi-cloud-event-ingestion-pipeline",
      "clinical-pathology-triage-queue",
    ],
    relatedArticleSlugs: [
      "zero-downtime-kafka-postgres-multi-cloud-migration",
      "soc2-hipaa-terraform-ci-guardrails",
    ],
    faqs: [
      {
        q: "How do you migrate active production databases without dropping transactions or settlement windows?",
        a: "We pair change-data-capture or dual-write pipelines with shadow parity validation checks and idempotent consumer keys before shifting traffic in small reversible increments.",
      },
      {
        q: "Will our internal SRE or platform team be able to manage the Terraform modules afterwards?",
        a: "Yes. We write straightforward, documented Terraform modules using your existing state backend and CI workflows—never opaque proprietary wrappers.",
      },
    ],
  },
];

export interface CaseStudyArchitectureDetail {
  slug: string;
  challenge: string;
  solutionArchitecture: string[];
  outcomes: string[];
  pillarSlug: string;
  timelineLabel: string;
}

const ARCHITECTURAL_DETAILS_BY_SLUG: Record<string, CaseStudyArchitectureDetail> = {
  "regulatory-technical-knowledge-search": {
    slug: "regulatory-technical-knowledge-search",
    challenge:
      "Analysts had to cross-reference thousands of technical specifications and regulatory compliance filings manually, while earlier prototype LLM tools lacked permission filtering and invented unverified clause citations.",
    solutionArchitecture: [
      "Built an ingestion pipeline indexing normalized document chunks, section headings, revision timestamps, and role ACL metadata in vector + relational storage.",
      "Implemented FastAPI retrieval APIs enforcing caller group permissions prior to dense + lexical hybrid ranking.",
      "Added deterministic answer validation requiring every generated sentence to map directly to primary source chunk identifiers.",
      "Established CI evaluation suites testing retrieval precision and citation integrity across every prompt or schema modification.",
    ],
    outcomes: [
      "Verifiable click-through citations linking directly to source filings",
      "Zero unauthorized document exposure across multi-team roles",
      "Repeatable regression eval suite integrated into repository CI",
    ],
    pillarSlug: "ai-systems-automation",
    timelineLabel: "8-week embedded build",
  },
  "institutional-portfolio-reporting-portal": {
    slug: "institutional-portfolio-reporting-portal",
    challenge:
      "Institutional stakeholders relied on an aging manual export tool that suffered slow quarterly statement rendering and inconsistent permission checks across fund holdings breakdowns.",
    solutionArchitecture: [
      "Engineered a TypeScript and Next.js client reporting portal backed by cleanly typed GraphQL resolvers.",
      "Structured holdings aggregations and statement exports with strict tenant isolation and role-based audit logging.",
      "Added automated integration tests covering quarterly portfolio rollups and PDF statement generation pipelines.",
    ],
    outcomes: [
      "Unified TypeScript web portal replacing manual legacy exports",
      "Automated quarterly statement workflows with consistent audit checks",
      "Maintainable GraphQL API schemas handed over with full test coverage",
    ],
    pillarSlug: "digital-product-engineering",
    timelineLabel: "10-week modernization sprint",
  },
  "multi-cloud-event-ingestion-pipeline": {
    slug: "multi-cloud-event-ingestion-pipeline",
    challenge:
      "Nightly batch ingestion across financial settlement feeds struggled with volume spikes and single-cloud failure modes, risking delayed daily settlement completion.",
    solutionArchitecture: [
      "Designed partitioned Apache Kafka ingestion topics keyed deterministically per settlement entity.",
      "Deployed Kubernetes worker services spanning AWS and GCP infrastructure managed end-to-end via Terraform modules.",
      "Built shadow parity validators and idempotent upsert keys so cutover verification confirmed 100% balance match before retiring legacy batch cron jobs.",
    ],
    outcomes: [
      "Continuous multi-region AWS and GCP event ingestion",
      "Zero dropped or duplicated settlement windows across live cutover",
      "Full Terraform IaC and Grafana observability runbooks transferred internally",
    ],
    pillarSlug: "cloud-infrastructure-data",
    timelineLabel: "12-week cross-cloud migration",
  },
  "field-operations-dispatch-app": {
    slug: "field-operations-dispatch-app",
    challenge:
      "Field technicians regularly lost mobile connectivity inside equipment facilities, causing lost inspection checklists and synchronization conflicts when schedules changed mid-route.",
    solutionArchitecture: [
      "Authored an offline-first React Native client backed by a durable FIFO local command queue and TypeScript domain state machines.",
      "Implemented idempotent server sync endpoints with field-level merge precedence between dispatcher updates and technician job completions.",
      "Separated background media uploads from critical schedule status updates to maintain fast responsiveness on weak uplinks.",
    ],
    outcomes: [
      "Reliable offline job execution and inspection capture",
      "Predictable automatic reconciliation when connectivity resumes",
      "Clean TypeScript client architecture aligned with internal backend APIs",
    ],
    pillarSlug: "digital-product-engineering",
    timelineLabel: "9-week mobile delivery",
  },
  "clinical-pathology-triage-queue": {
    slug: "clinical-pathology-triage-queue",
    challenge:
      "Clinical laboratories lacked automated prioritization across incoming pathology workloads, requiring specialists to review high-urgency files sequentially without attached imaging context.",
    solutionArchitecture: [
      "Built a PyTorch inference pipeline and FastAPI triage queue routing incoming reports inside HIPAA-aligned cloud subnets.",
      "Attached structured imaging metadata and traceable scoring evidence directly inside the specialist review workbench.",
      "Encoded least-privilege IAM boundaries, KMS encryption, and immutable access logging in Terraform infrastructure.",
    ],
    outcomes: [
      "Prioritized review ordering highlighting urgent pathology cases immediately",
      "Contextual imaging metadata surfaced in one clinical workspace",
      "HIPAA-aligned access audit logs and isolated VPC deployment",
    ],
    pillarSlug: "ai-systems-automation",
    timelineLabel: "10-week regulated AI build",
  },
  "headless-retail-checkout-re-platform": {
    slug: "headless-retail-checkout-re-platform",
    challenge:
      "Peak promotional traffic saturated a tightly coupled monolithic store, making independent scaling of catalog reads and payment checkout workflows fragile.",
    solutionArchitecture: [
      "Decoupled high-throughput product catalog and inventory reads onto Redis-cached Node.js microservices behind clean REST boundaries.",
      "Delivered a containerized Next.js storefront and isolated checkout flow able to scale independently during seasonal peaks.",
      "Verified parity and latency under simulated checkout load in staging prior to progressive traffic shift.",
    ],
    outcomes: [
      "Independent horizontal scaling across catalog, inventory, and checkout",
      "Containerized Node.js, Redis, and Next.js deployment topology",
      "Staged zero-downtime transition off monolithic checkout coupling",
    ],
    pillarSlug: "digital-product-engineering",
    timelineLabel: "10-week re-platform",
  },
};

/** Finds a Service Pillar cleanly by slug. */
export function getServicePillarBySlug(slug: string): ServicePillarSpec | undefined {
  return SERVICE_PILLARS.find((p) => p.slug === slug);
}

/** Resolves a service card title cleanly to its dedicated pillar page path. */
export function getServicePillarHref(serviceTitle: string): string {
  const lower = (serviceTitle || "").toLowerCase();
  if (lower.includes("ai") || lower.includes("automation")) {
    return "/services/ai-systems-automation";
  }
  if (lower.includes("cloud") || lower.includes("data") || lower.includes("infra")) {
    return "/services/cloud-infrastructure-data";
  }
  return "/services/digital-product-engineering";
}

/** Deterministic slug for any portfolio case study item. */
export function getCaseStudySlug(project: Pick<ProjectContent, "title">): string {
  return slugifyText(project.title);
}

/** Returns architectural breakdown metadata for any seeded or CMS-created case study. */
export function getCaseStudyDetail(project: ProjectContent): CaseStudyArchitectureDetail {
  const slug = getCaseStudySlug(project);
  const exact = ARCHITECTURAL_DETAILS_BY_SLUG[slug];
  if (exact) return exact;

  const fallbackPillar =
    project.category === "ai"
      ? "ai-systems-automation"
      : project.category === "cloud"
      ? "cloud-infrastructure-data"
      : "digital-product-engineering";

  return {
    slug,
    challenge: project.description,
    solutionArchitecture: [
      `Architected inside the client's existing repositories using ${project.tags.slice(0, 4).join(", ") || "modular production components"}.`,
      "Structured automated test suites, staging parity checks, and clean observability from early sprints.",
      "Delivered comprehensive documentation and direct team handover with zero proprietary runtime lock-in.",
    ],
    outcomes: [
      project.metrics || "Verified production release",
      "100% client-owned code and infrastructure configuration",
    ],
    pillarSlug: fallbackPillar,
    timelineLabel: "Embedded production engagement",
  };
}
