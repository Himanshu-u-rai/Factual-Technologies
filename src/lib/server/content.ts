import "server-only";

import { PoolClient } from "pg";
import {
  AuditLog,
  CaseStudy,
  Inquiry,
  InquiryPriority,
  InquiryStatus,
  ProjectCategory,
  sanitizeInput,
} from "@/lib/admin-types";
import {
  DEFAULT_SITE_CONTENT,
  FullSiteContent,
  InboundMessage,
  ProjectContent,
  SiteSnapshot,
  mergeSiteContent,
} from "@/lib/site-defaults";
import { dbQuery } from "@/lib/server/db";

export interface DbProjectRow {
  id: string;
  title: string;
  category: string;
  metrics: string;
  description: string;
  tags: unknown;
  image: string;
  published: boolean;
  featured_on_home: boolean;
  sort_order: number;
  updated_at: Date;
}

export interface DbInquiryRow {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  status: string;
  priority: string;
  assigned_architect: string | null;
  estimated_value: string | null;
  tags: unknown;
  notes: unknown;
  read: boolean;
  created_at: Date;
}

export interface DbAuditLogRow {
  id: string;
  timestamp: Date;
  actor: string;
  category: AuditLog["category"];
  action: string;
  ip_address: string;
  details: string;
}

function normalizeCategory(value: string): ProjectCategory {
  if (value === "ai" || value === "web" || value === "cloud" || value === "mobile") {
    return value;
  }
  return "web";
}

/** Maps a PostgreSQL projects row to a CMS ProjectContent object. */
export function mapRowToSiteProject(row: DbProjectRow): ProjectContent {
  return {
    id: row.id,
    title: row.title,
    category: normalizeCategory(row.category),
    metrics: row.metrics,
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    image: row.image || "/projects/regulatory-search.jpg",
    featuredOnHome: Boolean(row.featured_on_home),
  };
}

/** Maps a PostgreSQL projects row to an admin CaseStudy record. */
export function mapRowToCaseStudy(row: DbProjectRow): CaseStudy {
  return {
    id: row.id,
    title: row.title,
    category: normalizeCategory(row.category),
    metrics: row.metrics,
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    image: row.image || "/projects/regulatory-search.jpg",
    published: Boolean(row.published),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Maps a PostgreSQL inquiries row to an admin Inquiry record. */
export function mapRowToInquiry(row: DbInquiryRow): Inquiry {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    message: row.message,
    status: row.status as InquiryStatus,
    priority: row.priority as InquiryPriority,
    assignedArchitect: row.assigned_architect ?? undefined,
    estimatedValue: row.estimated_value ?? undefined,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    notes: Array.isArray(row.notes) ? row.notes : [],
    read: Boolean(row.read),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Maps a PostgreSQL audit_logs row to an admin AuditLog record. */
export function mapRowToAuditLog(row: DbAuditLogRow): AuditLog {
  return {
    id: row.id,
    timestamp: new Date(row.timestamp).toISOString(),
    actor: row.actor,
    category: row.category,
    action: row.action,
    ipAddress: row.ip_address,
    details: row.details,
  };
}

/** Reads merged studio site content from PostgreSQL (authoritative live state + projects). */
export async function loadMergedSiteContent(options?: {
  includeUnpublishedProjects?: boolean;
  includeMessages?: boolean;
}): Promise<FullSiteContent> {
  const [contentRes, projectsRes, inquiriesRes] = await Promise.all([
    dbQuery<{ data: Partial<FullSiteContent> }>("SELECT data FROM site_content WHERE id = 'live'"),
    dbQuery<DbProjectRow>(
      options?.includeUnpublishedProjects
        ? "SELECT * FROM projects ORDER BY sort_order ASC, updated_at DESC"
        : "SELECT * FROM projects WHERE published = true ORDER BY sort_order ASC, updated_at DESC"
    ),
    options?.includeMessages
      ? dbQuery<DbInquiryRow>("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 100")
      : Promise.resolve({ rows: [] as DbInquiryRow[] }),
  ]);

  const rawContent = contentRes.rows[0]?.data || DEFAULT_SITE_CONTENT;
  const projectList = projectsRes.rows.map(mapRowToSiteProject);
  const messages: InboundMessage[] = options?.includeMessages
    ? inquiriesRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        company: r.company,
        message: r.message,
        createdAt: new Date(r.created_at).toISOString(),
        read: Boolean(r.read),
      }))
    : [];

  return mergeSiteContent({
    ...rawContent,
    projects: projectList.length > 0 ? projectList : options?.includeUnpublishedProjects ? [] : rawContent.projects,
    messages,
  });
}

/** Lists saved CMS version snapshots from PostgreSQL. */
export async function loadSiteSnapshots(): Promise<SiteSnapshot[]> {
  const res = await dbQuery<{
    id: string;
    name: string;
    author: string;
    content: Partial<FullSiteContent>;
    created_at: Date;
  }>("SELECT id, name, author, content, created_at FROM site_snapshots ORDER BY created_at DESC LIMIT 50");

  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    author: row.author,
    timestamp: new Date(row.created_at).toISOString(),
    content: mergeSiteContent(row.content),
  }));
}

/** Synchronizes CMS projects array into PostgreSQL projects table inside an active transaction. */
export async function syncProjectsInTransaction(
  client: PoolClient,
  projects: ProjectContent[]
): Promise<void> {
  const existingRes = await client.query<{ id: string; published: boolean }>(
    "SELECT id, published FROM projects"
  );
  const existingMap = new Map(existingRes.rows.map((r) => [r.id, r.published]));
  const incomingIds = new Set(projects.map((p) => p.id));

  for (const existingId of existingMap.keys()) {
    if (!incomingIds.has(existingId)) {
      await client.query("DELETE FROM projects WHERE id = $1", [existingId]);
    }
  }

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const published = existingMap.get(p.id) ?? true;
    await client.query(
      `INSERT INTO projects (id, title, category, metrics, description, tags, image, published, featured_on_home, sort_order, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, NOW())
       ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title,
             category = EXCLUDED.category,
             metrics = EXCLUDED.metrics,
             description = EXCLUDED.description,
             tags = EXCLUDED.tags,
             image = EXCLUDED.image,
             featured_on_home = EXCLUDED.featured_on_home,
             sort_order = EXCLUDED.sort_order,
             updated_at = NOW()`,
      [
        sanitizeInput(p.id).slice(0, 80) || `proj-${Date.now()}-${i}`,
        sanitizeInput(p.title).slice(0, 200),
        normalizeCategory(p.category),
        sanitizeInput(p.metrics).slice(0, 160),
        sanitizeInput(p.description).slice(0, 2000),
        JSON.stringify((p.tags || []).map((t) => sanitizeInput(String(t)).slice(0, 40))),
        sanitizeInput(p.image || "/projects/regulatory-search.jpg").slice(0, 500),
        published,
        Boolean(p.featuredOnHome),
        i,
      ]
    );
  }
}
