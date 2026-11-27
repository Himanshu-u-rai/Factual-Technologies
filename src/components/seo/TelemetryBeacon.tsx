"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party privacy-safe route & referrer beacon (zero cookies, zero IPs, zero third-party requests).
 * Feeds the Admin SEO & AI Referral breakdown across Google, ChatGPT, Perplexity, Claude, and Bing.
 */
export default function TelemetryBeacon() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastTrackedRef.current === pathname) return;
    lastTrackedRef.current = pathname;

    const searchParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const utmSource = searchParams?.get("utm_source") || "";
    const referrer = typeof document !== "undefined" ? document.referrer || "" : "";

    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer,
        utmSource,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
