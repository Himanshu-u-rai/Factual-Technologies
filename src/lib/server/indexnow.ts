import "server-only";

import crypto from "crypto";
import { SITE_URL, normalizeSiteUrl } from "@/lib/seo";
import { getServerSettings } from "@/lib/server/auth";
import { dbQuery, recordAuditLog } from "@/lib/server/db";

export interface IndexNowResult {
  submitted: boolean;
  statusCode: number;
  urls: string[];
  message: string;
}

/** Ensures a stable 32-char IndexNow verification key exists in PostgreSQL system_settings. */
export async function getOrCreateIndexNowKey(): Promise<string> {
  const settings = await getServerSettings();
  const existing = (settings.indexNowKey || "").trim();
  if (/^[a-zA-Z0-9-]{8,128}$/.test(existing)) {
    return existing;
  }

  const nextKey = crypto.randomBytes(16).toString("hex");
  await dbQuery(
    `INSERT INTO system_settings (id, data, updated_at)
     VALUES ('default', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE
       SET data = jsonb_set(system_settings.data, '{indexNowKey}', to_jsonb($2::text), true),
           updated_at = NOW()`,
    [JSON.stringify({ ...settings, indexNowKey: nextKey }), nextKey]
  );
  return nextKey;
}

/**
 * Submits newly published or updated canonical URLs cleanly to api.indexnow.org
 * (feeding Bing, ChatGPT Search, Copilot, Yandex, and participating search engines).
 */
export async function submitUrlsToIndexNow(
  pathsOrUrls: string[],
  options?: { actor?: string; ipAddress?: string; quiet?: boolean }
): Promise<IndexNowResult> {
  const uniqueUrls = Array.from(
    new Set(
      pathsOrUrls
        .map((p) => (p.startsWith("https://") ? p : normalizeSiteUrl(p)))
        .filter((u) => u.startsWith(SITE_URL))
    )
  ).slice(0, 50);

  if (uniqueUrls.length === 0) {
    return {
      submitted: false,
      statusCode: 400,
      urls: [],
      message: "No valid production URLs supplied.",
    };
  }

  const key = await getOrCreateIndexNowKey();
  const host = new URL(SITE_URL).host;
  const keyLocation = normalizeSiteUrl("/indexnow-key.txt");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: uniqueUrls,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const ok = response.status === 200 || response.status === 202;
    const message = ok
      ? `Accepted ${uniqueUrls.length} URL(s) by IndexNow (HTTP ${response.status}).`
      : `IndexNow returned HTTP ${response.status}.`;

    if (options?.actor) {
      await recordAuditLog({
        actor: options.actor,
        category: "CMS",
        action: "IndexNow Ping",
        ipAddress: options.ipAddress || "127.0.0.1",
        details: `${message} URLs: ${uniqueUrls.join(", ")}`,
      }).catch(() => {});
    }

    return {
      submitted: ok,
      statusCode: response.status,
      urls: uniqueUrls,
      message,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error reaching api.indexnow.org";
    if (!options?.quiet && options?.actor) {
      await recordAuditLog({
        actor: options.actor,
        category: "CMS",
        action: "IndexNow Ping Failed",
        ipAddress: options.ipAddress || "127.0.0.1",
        details: msg,
      }).catch(() => {});
    }
    return {
      submitted: false,
      statusCode: 502,
      urls: uniqueUrls,
      message: msg,
    };
  }
}
