import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";
import {
  loadMergedSiteContent,
  loadSiteSnapshots,
  mapRowToCaseStudy,
} from "@/lib/server/content";
import { DbProjectRow } from "@/lib/server/content";
import { CaseStudy, ProjectCategory, sanitizeInput, sanitizeSafeUrl } from "@/lib/admin-types";

function normalizeCategory(value?: string): ProjectCategory {
  if (value === "ai" || value === "web" || value === "cloud" || value === "mobile") {
    return value;
  }
  return "web";
}

/** Lists all case studies ordered for CMS / admin project management. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const res = await dbQuery<DbProjectRow>(
    "SELECT * FROM projects ORDER BY sort_order ASC, updated_at DESC"
  );
  return NextResponse.json({ projects: res.rows.map(mapRowToCaseStudy) });
}

/** Creates a new case study record in PostgreSQL. */
export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as Partial<CaseStudy> & {
    featuredOnHome?: boolean;
  } | null;

  const title = sanitizeInput((body?.title || "").trim());
  const description = sanitizeInput((body?.description || "").trim());
  if (!title || !description) {
    return NextResponse.json(
      { error: "Project title and description are required." },
      { status: 400 }
    );
  }

  const id = `cs-${Date.now()}`;
  const tags = Array.isArray(body?.tags)
    ? body.tags.map((t) => sanitizeInput(String(t)).slice(0, 40)).filter(Boolean)
    : [];

  const orderRes = await dbQuery<{ max_order: number | null }>(
    "SELECT MAX(sort_order) AS max_order FROM projects"
  );
  const nextOrder = (orderRes.rows[0]?.max_order ?? -1) + 1;

  const inserted = await dbQuery<DbProjectRow>(
    `INSERT INTO projects (id, title, category, metrics, description, tags, image, published, featured_on_home, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
     RETURNING *`,
    [
      id,
      title.slice(0, 200),
      normalizeCategory(body?.category),
      sanitizeInput((body?.metrics || "Production deployment").trim()).slice(0, 160),
      description.slice(0, 2000),
      JSON.stringify(tags),
      sanitizeSafeUrl(body?.image, "/projects/regulatory-search.jpg").slice(0, 500),
      body?.published !== undefined ? Boolean(body.published) : true,
      Boolean(body?.featuredOnHome),
      nextOrder,
    ]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "CMS",
    action: "Project Created",
    ipAddress: getClientIp(req),
    details: `Created case study "${title}" (${id}).`,
  });

  // Also return refreshed site snapshots/content helpers cleanly
  void loadMergedSiteContent;
  void loadSiteSnapshots;

  return NextResponse.json(
    { ok: true, project: mapRowToCaseStudy(inserted.rows[0]) },
    { status: 201 }
  );
}
