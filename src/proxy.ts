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

function resolveExpectedHosts(req: NextRequest): { requestHost: string; configuredHost: string } {
  const hostHeader = (req.headers.get("host") || "").toLowerCase();
  const trustProxy = process.env.TRUST_PROXY !== "false";
  const forwardedHost = trustProxy ? (req.headers.get("x-forwarded-host") || "").toLowerCase() : "";

  let configuredHost = "";
  const appOrigin = (process.env.APP_ORIGIN || "").trim();
  if (appOrigin) {
    try {
      configuredHost = new URL(appOrigin).host.toLowerCase();
    } catch {
      configuredHost = "";
    }
  }

  return {
    requestHost: forwardedHost || hostHeader,
    configuredHost,
  };
}

function isSameOriginMutation(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const { requestHost, configuredHost } = resolveExpectedHosts(req);
  const originHeader = req.headers.get("origin");
  if (!originHeader) {
    // Non-browser API clients omit Origin; verify Referer if supplied
    const referer = req.headers.get("referer");
    if (!referer) return true;
    try {
      const refHost = new URL(referer).host.toLowerCase();
      if (!requestHost && !configuredHost) return false;
      return (
        (Boolean(requestHost) && refHost === requestHost) ||
        (Boolean(configuredHost) && refHost === configuredHost)
      );
    } catch {
      return false;
    }
  }

  try {
    const originHost = new URL(originHeader).host.toLowerCase();
    return (
      (Boolean(requestHost) && originHost === requestHost) ||
      (Boolean(configuredHost) && originHost === configuredHost)
    );
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
