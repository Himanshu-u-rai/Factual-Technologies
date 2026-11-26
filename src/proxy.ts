import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "@/lib/session-hmac";

const PUBLIC_ADMIN_PATHS = [
  "/admin/login",
  "/admin/setup",
  "/admin/verify-email",
  "/admin/forgot-password",
  "/admin/reset-password",
];

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`)
  );
}

function isSameOriginMutation(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const originHeader = req.headers.get("origin");
  if (!originHeader) {
    // Non-browser API clients omit Origin; verify Referer only if supplied
    const referer = req.headers.get("referer");
    if (!referer) return true;
    try {
      const refHost = new URL(referer).host.toLowerCase();
      const expectedHost = (
        req.headers.get("x-forwarded-host") ||
        req.headers.get("host") ||
        ""
      ).toLowerCase();
      return !expectedHost || refHost === expectedHost;
    } catch {
      return false;
    }
  }

  try {
    const originHost = new URL(originHeader).host.toLowerCase();
    const requestHost = (
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      ""
    ).toLowerCase();
    const appOrigin = (process.env.APP_ORIGIN || "").trim();
    const configuredHost = appOrigin ? new URL(appOrigin).host.toLowerCase() : "";
    return originHost === requestHost || (Boolean(configuredHost) && originHost === configuredHost);
  } catch {
    return false;
  }
}

function applySensitiveResponseHeaders(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, private");
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return res;
}

/**
 * Next.js 16 Proxy boundary:
 * - Blocks cross-origin preflights / CSRF mutations across /api/*
 * - Enforces HMAC-signed HttpOnly session cookies across /admin/* and /api/admin/*
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      return applySensitiveResponseHeaders(
        NextResponse.json({ error: "Cross-origin requests are not permitted." }, { status: 403 })
      );
    }

    if (MUTATING_METHODS.has(req.method) && !isSameOriginMutation(req)) {
      return applySensitiveResponseHeaders(
        NextResponse.json({ error: "Forbidden: cross-origin mutation rejected." }, { status: 403 })
      );
    }

    if (pathname.startsWith("/api/admin/")) {
      const signedCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const rawToken = await verifySessionCookieValue(signedCookie);
      if (!rawToken) {
        return applySensitiveResponseHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }
    }

    return applySensitiveResponseHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/admin")) {
    if (isPublicAdminPath(pathname)) {
      return applySensitiveResponseHeaders(NextResponse.next());
    }

    const signedCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const rawToken = await verifySessionCookieValue(signedCookie);

    if (!rawToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("reason", "unauthenticated");
      return applySensitiveResponseHeaders(NextResponse.redirect(url));
    }

    return applySensitiveResponseHeaders(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
