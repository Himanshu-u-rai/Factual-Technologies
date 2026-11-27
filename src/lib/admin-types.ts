export type InquiryStatus =
  | "New"
  | "In Review"
  | "NDA Sent"
  | "Discovery Scheduled"
  | "Converted"
  | "Archived";

export type InquiryPriority = "Critical" | "High" | "Normal";

export interface InquiryNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  createdAt: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  assignedArchitect?: string;
  notes: InquiryNote[];
  estimatedValue?: string;
  tags?: string[];
  read?: boolean;
}

export type ProjectCategory = "ai" | "web" | "cloud" | "mobile";

export interface CaseStudy {
  id: string;
  title: string;
  category: ProjectCategory;
  metrics: string;
  description: string;
  tags: string[];
  image: string;
  published: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  category: "Auth" | "Inquiry" | "CMS" | "Security" | "System";
  action: string;
  ipAddress: string;
  details: string;
}

export type AnalyticsProvider = "none" | "ga4" | "plausible" | "umami";

export interface SystemSettings {
  slaThreshold: number;
  webhookUrl: string;
  apiKey: string;
  apiKeyHash?: string;
  apiKeyPreview?: string;
  alertEmail: string;
  autoAssignEnabled: boolean;
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  indexNowKey?: string;
  analyticsProvider?: AnalyticsProvider;
  analyticsId?: string;
  complianceBadges: {
    name: string;
    code: string;
    status: "Certified" | "Compliant" | "Active";
    auditDate: string;
  }[];
}

export interface AdminUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AdminSession {
  token: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
  lastActiveAt: number;
  ttlMinutes: number;
}

export interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
}

export const ARCHITECTS = [
  { name: "Priyanshu Rai", role: "Principal Systems Architect", initials: "PR" },
  { name: "Marcus Chen", role: "VP of Engineering", initials: "MC" },
  { name: "Sarah Lindqvist", role: "Head of Product Innovation", initials: "SL" },
];

export const INITIAL_INQUIRIES: Inquiry[] = [
  {
    id: "INQ-9482",
    name: "Elena Rostova",
    email: "e.rostova@vanguardmobility.com",
    company: "Vanguard Mobility Systems",
    message:
      "We need a retrieval pipeline indexing 45,000 regulatory documents and fleet telemetry with source citations and SOC2 access controls.",
    createdAt: "2026-11-23T16:30:00Z",
    status: "Discovery Scheduled",
    priority: "Critical",
    assignedArchitect: "Elena Rostova",
    estimatedValue: "$250,000",
    tags: ["AI Retrieval", "Compliance", "Telemetry"],
    read: false,
    notes: [
      {
        id: "note-1",
        author: "Alex Vance",
        text: "Initial architectural brief verified. Client requires multi-region PostgreSQL and strict access controls.",
        createdAt: "2026-11-23T17:00:00Z",
      },
    ],
  },
  {
    id: "INQ-9481",
    name: "Marcus Chen",
    email: "m.chen@aetherfintech.io",
    company: "Aether Financial Technologies",
    message:
      "Evaluating a multi-cloud migration from legacy on-premise Oracle DB to Postgres, Kafka, and Kubernetes with a staged cutover.",
    createdAt: "2026-11-23T14:15:00Z",
    status: "In Review",
    priority: "High",
    assignedArchitect: "Marcus Chen",
    estimatedValue: "$180,000",
    tags: ["Kafka", "AWS/GCP", "Migration"],
    read: true,
    notes: [
      {
        id: "note-2",
        author: "Marcus Chen",
        text: "Architecture review scheduled for Thursday 2pm EST.",
        createdAt: "2026-11-23T15:00:00Z",
      },
    ],
  },
];

export const INITIAL_PROJECTS: CaseStudy[] = [
  {
    id: "cs-1",
    title: "Autonomous Fleet Intelligence Platform",
    category: "ai",
    metrics: "Fleet document search",
    description:
      "Multi-agent retrieval workflow indexing vehicle diagnostics and compliance records for operations teams.",
    tags: ["RAG", "Multi-Agent", "Vector DB", "TypeScript"],
    image: "/projects/regulatory-search.jpg",
    published: true,
    updatedAt: "2026-11-23T12:00:00Z",
  },
  {
    id: "cs-2",
    title: "High-Frequency Financial Settlement Gateway",
    category: "cloud",
    metrics: "Automated daily reconciliation",
    description:
      "Event-streaming pipeline migrating an on-prem settlement ledger onto Kafka and PostgreSQL.",
    tags: ["Kafka", "Kubernetes", "PostgreSQL", "Go"],
    image: "/projects/cloud-pipeline.jpg",
    published: true,
    updatedAt: "2026-11-23T10:00:00Z",
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-11-23T16:30:00Z",
    actor: "System Engine",
    category: "System",
    action: "Database Schema Seeded",
    ipAddress: "127.0.0.1",
    details: "Initialized PostgreSQL tables and baseline studio records.",
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  slaThreshold: 99.99,
  webhookUrl: "",
  apiKey: "",
  alertEmail: "",
  autoAssignEnabled: true,
  twoFactorRequired: false,
  sessionTimeoutMinutes: 30,
  indexNowKey: "",
  analyticsProvider: "none",
  analyticsId: "",
  complianceBadges: [
    { name: "SOC2 Type II", code: "SOC2-T2", status: "Certified", auditDate: "Oct 2026" },
    { name: "HIPAA Compliant", code: "HIPAA-HITECH", status: "Compliant", auditDate: "Sep 2026" },
    { name: "GDPR Enforced", code: "EU-GDPR", status: "Active", auditDate: "Nov 2026" },
    { name: "ISO 27001", code: "ISO-27001", status: "Certified", auditDate: "Aug 2026" },
  ],
};

/** Strips ASCII control characters, HTML script/active tags, inline event handlers, and scriptable URL schemes. */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed|form|svg|math|base|link|meta)[^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/** Strips CR/LF characters to prevent header injection in emails and audit records. */
export function stripCrlf(input: string): string {
  return (input || "").replace(/[\r\n]+/g, " ").trim();
}

/** Validates URL values against safe HTTP(S) or single-slash relative routes, blocking script/data/protocol-relative URLs. */
export function sanitizeSafeUrl(
  input: string | undefined | null,
  fallback = "/",
  options?: { allowRelative?: boolean }
): string {
  const allowRelative = options?.allowRelative !== false;
  const raw = sanitizeInput(typeof input === "string" ? input : "").trim();
  if (!raw) return fallback;

  if (allowRelative && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Reject unparseable or unsafe schemes
  }
  return fallback;
}

/** Enforces password length (10-128) and character-class diversity across auth endpoints. */
export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string") {
    return "Password is required.";
  }
  if (password.length < 10) {
    return "Password must be at least 10 characters long.";
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  let classes = 0;
  if (/[a-z]/.test(password)) classes++;
  if (/[A-Z]/.test(password)) classes++;
  if (/[0-9]/.test(password)) classes++;
  if (/[^a-zA-Z0-9]/.test(password)) classes++;
  if (classes < 3) {
    return "Password must include at least 3 character types (uppercase, lowercase, number, symbol).";
  }
  return null;
}
