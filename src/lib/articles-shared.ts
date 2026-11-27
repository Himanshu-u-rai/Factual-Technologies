import { sanitizeInput, sanitizeSafeUrl } from "@/lib/admin-types";

export type ArticleStatus = "draft" | "published" | "archived";

export type ArticleCategory =
  | "AI Systems"
  | "Cloud & Infra"
  | "Product Engineering"
  | "Security & Compliance"
  | "Engineering Culture";

export const ARTICLE_CATEGORIES: readonly ArticleCategory[] = [
  "AI Systems",
  "Cloud & Infra",
  "Product Engineering",
  "Security & Compliance",
  "Engineering Culture",
];

export interface ArticleFaqItem {
  q: string;
  a: string;
}

export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  contentMarkdown: string;
  category: ArticleCategory;
  tags: string[];
  coverImage: string;
  coverImageAlt: string;
  authorName: string;
  authorRole: string;
  authorBio: string;
  authorLinkedIn?: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  focusKeyword: string;
  faqs: ArticleFaqItem[];
  status: ArticleStatus;
  featured: boolean;
  readingTimeMinutes: number;
  wordCount: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarkdownHeading {
  level: 2 | 3;
  text: string;
  id: string;
}

export interface ArticleSeoAuditResult {
  score: number;
  checks: Array<{
    id: string;
    label: string;
    passed: boolean;
    hint: string;
  }>;
}

/** Converts a heading or title cleanly into a URL-safe lowercase slug. */
export function slugifyText(input: string): string {
  const cleaned = sanitizeInput(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return cleaned || "engineering-article";
}

/** Counts prose words and computes estimated reading time (~210 words/min). */
export function calculateReadingMetrics(markdown: string): {
  wordCount: number;
  readingTimeMinutes: number;
} {
  const plain = (markdown || "")
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/`[^`]+`/g, " token ")
    .replace(/[#>*_\-\[\]()|]/g, " ");
  const words = plain
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 210));
  return { wordCount: words, readingTimeMinutes };
}

/** Extracts H2 and H3 headings from Markdown with deterministic anchor IDs for Table of Contents. */
export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const lines = (markdown || "").split(/\r?\n/);
  const headings: MarkdownHeading[] = [];
  const seen = new Map<string, number>();
  let inCodeFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    const text = m[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
    if (!text) continue;

    const baseId = slugifyText(text);
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    headings.push({ level, text, id });
  }

  return headings;
}

/** Normalizes article category safely onto supported editorial taxonomy. */
export function normalizeArticleCategory(input?: string): ArticleCategory {
  if (ARTICLE_CATEGORIES.includes(input as ArticleCategory)) {
    return input as ArticleCategory;
  }
  return "Product Engineering";
}

/** Normalizes article publication lifecycle status cleanly. */
export function normalizeArticleStatus(input?: string): ArticleStatus {
  if (input === "published" || input === "archived" || input === "draft") {
    return input;
  }
  return "draft";
}

/** Evaluates live SEO + AEO + GEO readiness (0-100) for the Admin Article Editor. */
export function evaluateArticleSeo(input: {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageAlt: string;
  faqs: ArticleFaqItem[];
}): ArticleSeoAuditResult {
  const keyword = (input.focusKeyword || "").trim().toLowerCase();
  const titleLower = (input.title || "").toLowerCase();
  const metaTitle = (input.metaTitle || input.title || "").trim();
  const metaDesc = (input.metaDescription || input.excerpt || "").trim();
  const headings = extractMarkdownHeadings(input.contentMarkdown);
  const { wordCount } = calculateReadingMetrics(input.contentMarkdown);
  const validFaqs = (input.faqs || []).filter((f) => f.q.trim() && f.a.trim());

  const checks = [
    {
      id: "keyword-presence",
      label: "Focus keyword in title & slug",
      passed:
        Boolean(keyword) &&
        titleLower.includes(keyword) &&
        (input.slug || "").toLowerCase().includes(slugifyText(keyword)),
      hint: "Set a target keyword and include it naturally in the article headline and URL slug.",
    },
    {
      id: "meta-title-len",
      label: "SEO Title length (35–65 chars)",
      passed: metaTitle.length >= 35 && metaTitle.length <= 65,
      hint: `Currently ${metaTitle.length} chars; aim for 45–60 chars to avoid SERP truncation.`,
    },
    {
      id: "meta-desc-len",
      label: "Meta description (110–165 chars)",
      passed: metaDesc.length >= 110 && metaDesc.length <= 165,
      hint: `Currently ${metaDesc.length} chars; summarize key technical value in 120–160 chars.`,
    },
    {
      id: "depth-words",
      label: "Technical depth (500+ words)",
      passed: wordCount >= 500,
      hint: `Currently ${wordCount} words; generative engines favor 600–1,500+ word concrete architecture notes.`,
    },
    {
      id: "structured-headings",
      label: "Structured H2/H3 outline (3+ sections)",
      passed: headings.filter((h) => h.level === 2).length >= 3,
      hint: "Include at least three clear H2 sections for Table of Contents and Featured Snippets.",
    },
    {
      id: "aeo-faqs",
      label: "AEO FAQ Q&A schema items (2+ questions)",
      passed: validFaqs.length >= 2,
      hint: "Add at least two concise Q&A items so FAQPage JSON-LD powers AI answer engines.",
    },
    {
      id: "cover-alt",
      label: "Descriptive cover image alt text",
      passed: (input.coverImageAlt || "").trim().length >= 15,
      hint: "Describe what the editorial visual shows so Google Images can index it cleanly.",
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  return { score, checks };
}

/** Sanitizes FAQ arrays for storage cleanly. */
export function sanitizeArticleFaqs(faqs: unknown): ArticleFaqItem[] {
  if (!Array.isArray(faqs)) return [];
  return faqs
    .map((item) => {
      const obj = item as Partial<ArticleFaqItem>;
      return {
        q: sanitizeInput(String(obj?.q || "")).trim().slice(0, 260),
        a: sanitizeInput(String(obj?.a || "")).trim().slice(0, 1200),
      };
    })
    .filter((f) => f.q.length > 0 && f.a.length > 0)
    .slice(0, 12);
}

/** Default editorial attribution for Factual Technologies engineering publications. */
export const PRINCIPAL_BLOG_AUTHOR = {
  authorName: "Priyanshu Rai",
  authorRole: "Principal Systems Architect",
  authorBio:
    "Designs and ships production software platforms, enterprise AI retrieval systems, and multi-cloud Kubernetes architectures alongside client engineering teams.",
} as const;

export type SeedArticleDraft = Omit<BlogArticle, "readingTimeMinutes" | "wordCount" | "viewCount">;

/** Computes reading metrics and attaches initial telemetry counters for seed articles. */
export function finalizeSeedArticles(items: SeedArticleDraft[]): BlogArticle[] {
  return items.map((art) => {
    const { wordCount, readingTimeMinutes } = calculateReadingMetrics(art.contentMarkdown);
    return {
      ...art,
      wordCount,
      readingTimeMinutes,
      viewCount: 0,
    };
  });
}

/** Curated seed technical engineering guides matching Factual Technologies' real capabilities. */
export const INITIAL_ARTICLES: BlogArticle[] = [
  {
    id: "art-rag-permissions",
    slug: "permission-scoped-rag-architecture-compliance",
    title: "Permission-Scoped RAG Architecture for Regulatory & Enterprise Search",
    subtitle: "How to enforce document-level ACLs, attach verifiable primary citations, and gate model changes with CI evaluation suites.",
    excerpt:
      "Enterprise retrieval fails when vector indexes bypass identity permissions or invent citations. Here is our blueprint for FastAPI, PostgreSQL/pgvector, and automated evaluation suites.",
    focusKeyword: "permission-scoped RAG",
    metaTitle: "Permission-Scoped RAG Architecture for Enterprise Search",
    metaDescription:
      "Design production permission-scoped RAG pipelines with primary-source citations, FastAPI access filters, and automated CI evaluation harnesses.",
    category: "AI Systems",
    tags: ["RAG", "FastAPI", "Vector Search", "AI Evaluation", "Compliance"],
    coverImage: "/blog/permission-rag-acl.jpg",
    coverImageAlt: "Frosted glass louvers casting directional light over an archival stack bound with a cobalt steel clip illustrating document ACL filtering",
    authorName: "Priyanshu Rai",
    authorRole: "Principal Systems Architect",
    authorBio: "Designs and ships production software platforms, enterprise AI retrieval systems, and cloud infrastructure alongside client engineering teams.",
    faqs: [
      {
        q: "Why does naive vector similarity search leak private enterprise documents?",
        a: "Standard vector embeddings strip access metadata unless ACLs are stored alongside every chunk and filtered before similarity ranking executes. Post-filtering top-k matches is unsafe and yields incomplete or empty context windows.",
      },
      {
        q: "How should teams validate prompt and model updates before shipping to production?",
        a: "Maintain a versioned evaluation dataset of golden queries, expected source chunk IDs, and citation formatting rules, running automated precision/recall and faithfulness assertions inside CI on every pull request.",
      },
    ],
    status: "published",
    featured: true,
    contentMarkdown: `## Why Naive Enterprise RAG Fails in Production

Most internal AI search prototypes fail not because the foundation model is weak, but because document security, chunk provenance, and regression testing are bolted on after demo day. In regulated legal, financial, and clinical teams, surfacing one paragraph from an unauthorized filing breaks audit requirements immediately.

Permission-scoped RAG solves this by treating identity enforcement and primary-source verification as database invariants rather than prompt instructions.

## Enforcing Document ACLs Before Ranking

Never rely on the LLM prompt to ignore confidential snippets, and never retrieve global top-k results before stripping restricted records. Instead:

- Store tenant, group, and role ACL arrays directly on every indexed chunk row.
- Filter candidate vectors cleanly inside the query plan **prior** to ranking (\`WHERE tenant_id = $1 AND allowed_roles && $2\`).
- Re-verify document visibility against the caller's live session token right before returning citations to the UI.

### Chunk Provenance & Verifiable Citations

Analysts should click straight from an answer claim to the exact clause and revision timestamp:

1. Persist stable document IDs, section headers, page numbers, and SHA-256 content digests at ingestion time.
2. Require structured JSON output mapping each synthesized sentence to exact retrieved chunk identifiers.
3. Strip or flag any claim whose cited chunk ID did not originate from the retrieved context set.

## Continuous Evaluation Harnesses in CI/CD

Prompt changes are code changes. Without regression evals, improving tone for one workflow often breaks extraction accuracy in another. Every AI service we ship pairs FastAPI retrieval endpoints with a deterministic CI gate:

- **Retrieval Recall@K**: Ensures architectural spec and regulatory filing updates still surface primary clauses.
- **Faithfulness Assertions**: Rejects outputs introducing unsupported numbers, dates, or legal thresholds.
- **Latency & Cost Budgets**: Tracks P95 embedding, re-ranking, and token completion budgets before merge.

> Internal AI software only earns daily adoption when analysts verify every answer directly against primary records.

Explore how we applied this architecture in our [Regulatory & Technical Knowledge Search case study](/work/regulatory-technical-knowledge-search) or review our [AI Systems & Automation practice](/services/ai-systems-automation).`,
    readingTimeMinutes: 4,
    wordCount: 350,
    viewCount: 0,
    publishedAt: "2026-11-18T09:00:00Z",
    createdAt: "2026-11-18T09:00:00Z",
    updatedAt: "2026-11-18T09:00:00Z",
  },
  {
    id: "art-kafka-migration",
    slug: "zero-downtime-kafka-postgres-multi-cloud-migration",
    title: "Zero-Downtime Partitioned Kafka & PostgreSQL Migration Across AWS and GCP",
    subtitle: "Dual-write parity verification, consumer group cutovers, and deterministic rollback plans for daily financial settlement.",
    excerpt:
      "Moving batch ingestion and state stores across cloud providers cannot afford maintenance downtime during settlement windows. A field guide to multi-cloud streaming cutovers.",
    focusKeyword: "multi-cloud Kafka migration",
    metaTitle: "Zero-Downtime Kafka & Postgres Multi-Cloud Migration",
    metaDescription:
      "Execute zero-downtime AWS and GCP migrations using partitioned Kafka topics, dual-write parity reconciliation, and safe Terraform rollbacks.",
    category: "Cloud & Infra",
    tags: ["Kafka", "Kubernetes", "PostgreSQL", "AWS", "GCP", "Terraform"],
    coverImage: "/blog/kafka-migration.jpg",
    coverImageAlt: "Twin brushed metal channels joined by an anodized cobalt synchronization valve on honed stone representing zero-downtime dual writes",
    authorName: "Priyanshu Rai",
    authorRole: "Principal Systems Architect",
    authorBio: "Designs and ships production software platforms, enterprise AI retrieval systems, and cloud infrastructure alongside client engineering teams.",
    faqs: [
      {
        q: "How do you guarantee zero message loss or duplicate ledger posting during a cloud cutover?",
        a: "Enforce deterministic idempotency keys on every event consumer, assign immutable transaction sequence IDs at ingestion, and run background row-level hash checks comparing legacy batch totals with streaming sink tables before retiring legacy jobs.",
      },
      {
        q: "Why run Terraform and canary consumers before switching production settlement traffic?",
        a: "Shadowing production partitions onto canary consumers validates cross-cloud network latency, IAM permissions, and dead-letter queue retry behavior under real message payloads with zero customer impact.",
      },
    ],
    status: "published",
    featured: true,
    contentMarkdown: `## The Trap of Big-Bang Cloud Cutovers

Financial and logistics platforms rarely fail during steady-state operation—they fail during big-bang cutover weekends when schema assumptions, network latency, and undocumented batch edge cases surface simultaneously.

Instead of scheduling fragile downtime windows, our engineering pods decompose cross-cloud migrations across AWS and GCP into verifiable, reversible stages.

## Stage 1: Partitioned Ingestion & Idempotency Keys

Before any traffic shifts between clouds, consumers must tolerate replay safely:

- Key Kafka topic partitions by account or settlement entity ID so ordering per entity stays strict.
- Require globally unique \`idempotency_key\` tokens stored atomically alongside target PostgreSQL ledger writes.
- Isolate dead-letter topics with structured error metadata so transient schema mismatches never block partition offsets.

### Shadow Validation & Parity Checks

Run the target AWS/GCP streaming pipeline as a shadow subscriber alongside the legacy batch ETL:

1. Replay 14 days of historical events into staging clusters provisioned with Terraform.
2. Compare aggregate daily settlement balances, row counts, and rounding precision automatically every hour.
3. Alert immediately on sub-cent drift before routing live settlement sinks to the new pipeline.

## Stage 2: Reversible Traffic Shift via Terraform & DNS

Once shadow pipelines hit 100% parity across multiple consecutive settlement cycles:

- Shift low-volume accounts or regional partitions incrementally while leaving rollback producers warm.
- Monitor P99 consumer lag, database connection pool saturation, and cross-region replication lag in Datadog and Grafana.
- Decommission legacy batch cron jobs only after a full 30-day audit stabilization window.

See this pattern running in production inside our [Multi-Cloud Event Ingestion Pipeline case study](/work/multi-cloud-event-ingestion-pipeline) or learn about our [Cloud Infrastructure & Data engineering services](/services/cloud-infrastructure-data).`,
    readingTimeMinutes: 3,
    wordCount: 310,
    viewCount: 0,
    publishedAt: "2026-11-12T09:00:00Z",
    createdAt: "2026-11-12T09:00:00Z",
    updatedAt: "2026-11-12T09:00:00Z",
  } as BlogArticle,
  {
    id: "art-offline-sync",
    slug: "offline-first-mobile-sync-conflict-resolution",
    title: "Designing Offline-First Dispatch Systems with Deterministic Conflict Resolution",
    subtitle: "Building React Native field applications with durable local mutation queues, background route sync, and resilient API contracts.",
    excerpt:
      "Field crews work in basements, rural corridors, and steel warehouses where cellular handoffs drop requests mid-flight. Here is how to design reliable offline-first sync.",
    focusKeyword: "offline-first mobile architecture",
    metaTitle: "Offline-First Mobile Dispatch & Sync Architecture",
    metaDescription:
      "Build reliable React Native offline-first mobile applications with durable local queues, idempotent API endpoints, and predictable state reconciliation.",
    category: "Product Engineering",
    tags: ["React Native", "TypeScript", "Offline Sync", "Next.js", "APIs"],
    coverImage: "/blog/conflict-sync.jpg",
    coverImageAlt: "Interlocking dark anodized and brushed titanium plates converging on chrome rails beneath a cobalt datum pin illustrating deterministic sync merge",
    authorName: "Priyanshu Rai",
    authorRole: "Principal Systems Architect",
    authorBio: "Designs and ships production software platforms, enterprise AI retrieval systems, and cloud infrastructure alongside client engineering teams.",
    faqs: [
      {
        q: "Why are optimistic UI updates unsafe without an ordered local mutation log?",
        a: "Without a persisted FIFO outbox storing client timestamps and idempotency tokens, closing the app or reconnecting on flaky networks drops state transitions or replays out-of-order updates that overwrite newer dispatcher assignments.",
      },
      {
        q: "How should field apps handle dispatcher vs technician edit conflicts?",
        a: "Use field-level merge rules rather than whole-record last-write-wins: technician checklist completions append cleanly while dispatcher priority or schedule changes preserve clear audit precedence.",
      },
    ],
    status: "published",
    featured: false,
    contentMarkdown: `## Connectivity Drops Are a Normal State, Not an Edge Case

Many B2B mobile apps treat network loss as a blocking error dialog. For regional service crews completing inspections inside substations or transit depots, treating offline intervals as exceptions halts fieldwork.

## Durable Outbox Queue Architecture

Treat every local action—updating job status, capturing an equipment reading, signing an inspection checklist—as an immutable command written first to encrypted local persistence before UI feedback resolves.

- **Idempotency per action**: Every queued mutation carries a UUID generated on creation so safe server retries never duplicate inspection submissions.
- **Explicit sync state UI**: Show crews cleanly which jobs are synced, queued locally, or awaiting attachment upload without blocking navigation.
- **Chunked media uploads**: Separate lightweight JSON state transitions from photo or signature uploads so dispatch boards update even over weak 3G uplinks.

### Field-Level Conflict Merging

Never overwrite an entire job payload on sync:

1. Version each mutable field group separately (route assignment vs equipment checklist vs notes).
2. Make append-only logs (crew timestamps, safety sign-offs) strictly additive on the backend.
3. Preserve dispatcher schedule updates with clear change notifications on next foreground sync.

Read the corresponding build overview in our [Field Operations Dispatch App case study](/work/field-operations-dispatch-app) and our [Digital Product Engineering practice](/services/digital-product-engineering).`,
    readingTimeMinutes: 3,
    wordCount: 250,
    viewCount: 0,
    publishedAt: "2026-11-06T09:00:00Z",
    createdAt: "2026-11-06T09:00:00Z",
    updatedAt: "2026-11-06T09:00:00Z",
  } as BlogArticle,
  {
    id: "art-soc2-hipaa-ci",
    slug: "soc2-hipaa-terraform-ci-guardrails",
    title: "Translating SOC2 Type II & HIPAA Controls into Terraform & CI Guardrails",
    subtitle: "Moving compliance out of spreadsheet binders and directly into Pull Requests, IAM boundaries, and immutable audit trails.",
    excerpt:
      "Manual pre-audit scrambling slows engineering teams down. Learn how to codify least-privilege cloud boundaries, static scanning, and audit logs into everyday delivery.",
    focusKeyword: "SOC2 HIPAA Terraform guardrails",
    metaTitle: "SOC2 Type II & HIPAA Controls in Terraform & CI",
    metaDescription:
      "Codify SOC2 Type II and HIPAA security controls directly into Terraform modules, least-privilege IAM roles, and automated CI checks.",
    category: "Security & Compliance",
    tags: ["SOC2", "HIPAA", "Terraform", "DevSecOps", "CI/CD"],
    coverImage: "/blog/terraform-ci.jpg",
    coverImageAlt: "Four sequential architectural metal calibration portals locking a cobalt structural bar representing automated Terraform CI policy gates",
    authorName: "Priyanshu Rai",
    authorRole: "Principal Systems Architect",
    authorBio: "Designs and ships production software platforms, enterprise AI retrieval systems, and cloud infrastructure alongside client engineering teams.",
    faqs: [
      {
        q: "Can startups and mid-market engineering teams satisfy SOC2 without slowing down weekly releases?",
        a: "Yes. When branch protection, static analysis, dependency vulnerability checks, and infrastructure-as-code plan reviews run automatically in GitHub Actions, engineers maintain weekly release speed while generating continuous audit evidence.",
      },
      {
        q: "What is the biggest gap in cloud HIPAA compliance architectures?",
        a: "Overly broad IAM service roles, unencrypted temporary buckets or log sinks leaking PHI, and missing access-audit trails tying human administrative actions to authenticated tickets.",
      },
    ],
    status: "published",
    featured: false,
    contentMarkdown: `## Compliance Belongs in Your Pull Request Pipeline

When security rules live exclusively inside quarterly PDF policies, developers discover violations right before an external audit or enterprise procurement review. Encoding controls directly into Terraform and CI pipelines eliminates drift from commit one.

## Practical Infrastructure Guardrails

Start with deterministic cloud defaults rather than hero code reviews:

- **Zero wildcard IAM roles**: Enforce tight resource ARNs and explicit KMS key policies across S3, GCS, and database backups.
- **Isolated PHI/PII VPC boundaries**: Keep inference queues, clinical databases, and storage endpoints off public subnets behind private service endpoints.
- **Automated policy-as-code**: Run \`tfsec\` / \`checkov\` and dependency audits automatically on every PR before infra plans apply.

### Application-Level Audit & Access Hygiene

Infrastructure alone does not secure multi-tenant data:

1. Emit immutable append-only audit events for authentication, role transitions, data exports, and configuration changes.
2. Enforce HTTP-only signed sessions, strict Content Security Policy headers, and cross-origin protections at the application proxy boundary.
3. Strip secret environment files from Docker image build contexts while injecting credentials dynamically at runtime.

Explore how these safeguards support regulated healthcare builds in our [Clinical Pathology Triage Queue case study](/work/clinical-pathology-triage-queue) or [book an architecture review](/contact).`,
    readingTimeMinutes: 3,
    wordCount: 240,
    viewCount: 0,
    publishedAt: "2026-10-29T09:00:00Z",
    createdAt: "2026-10-29T09:00:00Z",
    updatedAt: "2026-10-29T09:00:00Z",
  } as BlogArticle,
];

// Normalize reading metrics accurately across INITIAL_ARTICLES
for (const article of INITIAL_ARTICLES) {
  const { wordCount, readingTimeMinutes } = calculateReadingMetrics(article.contentMarkdown);
  article.wordCount = wordCount;
  article.readingTimeMinutes = readingTimeMinutes;
  article.coverImage = sanitizeSafeUrl(article.coverImage, "/blog/enterprise-rag-2027.jpg");
  delete (article as unknown as { coverImageSafe?: unknown }).coverImageSafe;
}
