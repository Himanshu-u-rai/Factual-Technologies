import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { dbQuery } from "@/lib/server/db";

/** Admin analytics endpoint summarizing 30-day page views and search/AI referrer domains. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    const [topSourcesRes, topPathsRes, totalRes] = await Promise.all([
      dbQuery<{ source_domain: string; views: number }>(
        `SELECT source_domain, SUM(views)::int AS views
         FROM referral_stats
         WHERE day >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY source_domain
         ORDER BY views DESC
         LIMIT 15`
      ),
      dbQuery<{ path: string; views: number }>(
        `SELECT path, SUM(views)::int AS views
         FROM referral_stats
         WHERE day >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY path
         ORDER BY views DESC
         LIMIT 15`
      ),
      dbQuery<{ total_views: number }>(
        `SELECT COALESCE(SUM(views), 0)::int AS total_views
         FROM referral_stats
         WHERE day >= CURRENT_DATE - INTERVAL '30 days'`
      ),
    ]);

    return NextResponse.json(
      {
        totalViews30d: totalRes.rows[0]?.total_views ?? 0,
        sources: topSourcesRes.rows.map((r) => ({
          source: r.source_domain,
          views: r.views,
        })),
        pages: topPathsRes.rows.map((r) => ({
          path: r.path,
          views: r.views,
        })),
      },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch {
    return NextResponse.json({ totalViews30d: 0, sources: [], pages: [] });
  }
}
