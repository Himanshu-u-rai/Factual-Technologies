import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery } from "@/lib/server/db";
import { enforceFixedWindowRateLimit } from "@/lib/server/rate-limit";

const SAFE_PATH_RE = /^\/[a-zA-Z0-9/_-]{0,160}$/;
const SAFE_SLUG_RE = /^[a-z0-9-]{1,120}$/;

function extractSafeSourceDomain(referrer: string, utmSource: string): string {
  const cleanUtm = (utmSource || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (cleanUtm) return cleanUtm.slice(0, 64);

  const raw = (referrer || "").trim();
  if (!raw) return "direct";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host || host === "factualtechnologies.tech") return "internal";
    return host.slice(0, 100);
  } catch {
    return "direct";
  }
}

/**
 * Privacy-first first-party route & referrer analytics (no cookies, no IP addresses, no PII).
 * Rate-limited per IP to prevent automated view inflation or table flooding.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await enforceFixedWindowRateLimit(`telemetry:ip:${ip}`, 60, 60);
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": String(limit.remainingSeconds) } }
      );
    }

    const body = (await req.json().catch(() => null)) as {
      path?: string;
      referrer?: string;
      utmSource?: string;
    } | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const rawPath = (typeof body.path === "string" ? body.path : "/").split("?")[0].trim() || "/";
    if (!SAFE_PATH_RE.test(rawPath) || rawPath.startsWith("/admin") || rawPath.startsWith("/api")) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const sourceDomain = extractSafeSourceDomain(
      typeof body.referrer === "string" ? body.referrer : "",
      typeof body.utmSource === "string" ? body.utmSource : ""
    );

    await dbQuery(
      `INSERT INTO referral_stats (day, path, source_domain, views)
       VALUES (CURRENT_DATE, $1, $2, 1)
       ON CONFLICT (day, path, source_domain) DO UPDATE
         SET views = referral_stats.views + 1`,
      [rawPath, sourceDomain]
    );

    if (rawPath.startsWith("/blog/") && rawPath.length > "/blog/".length) {
      const slug = rawPath.slice("/blog/".length).split("/")[0];
      if (SAFE_SLUG_RE.test(slug)) {
        await dbQuery(
          `UPDATE articles
           SET view_count = view_count + 1
           WHERE slug = $1 AND status = 'published'`,
          [slug]
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
