import "server-only";

import crypto from "crypto";
import { sanitizeInput } from "@/lib/admin-types";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;
const MAX_PASSWORD_LENGTH = 128;

/** Hashes a password using OWASP-aligned Node scrypt parameters with a 16-byte CSPRNG salt. */
export function hashPassword(password: string): string {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("Password exceeds maximum allowed length.");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .scryptSync(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    })
    .toString("hex");
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`;
}

/** Pre-computed hash for timing-equalization when a login email does not match any row. */
export const DUMMY_PASSWORD_HASH = hashPassword("TimingEqualization!2026#Dummy");

/** Verifies a candidate password against structured scrypt or legacy "salt:hash" strings in constant time. */
export function verifyPassword(password: string, stored: string): boolean {
  if (!password || password.length > MAX_PASSWORD_LENGTH || !stored) {
    return false;
  }

  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 6) return false;
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const expectedHex = parts[5];
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || !salt || !expectedHex) {
      return false;
    }
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (expectedBuf.length === 0) return false;
    const actualBuf = crypto.scryptSync(password, salt, expectedBuf.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }

  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const actualBuf = crypto.scryptSync(password, salt, 64);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

/** Generates a random opaque hex token and its SHA-256 lookup hash. */
export function generateOpaqueToken(byteLength = 32): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = crypto.randomBytes(byteLength).toString("hex");
  return { rawToken, tokenHash: sha256Hex(rawToken) };
}

/** Computes a SHA-256 hex digest for storing tokens/secrets non-reversibly. */
export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Timing-safe UTF-8 string comparison for fixed secrets like SETUP_TOKEN. */
export function safeCompareStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/** Encodes HTML entities for safe interpolation into HTML emails and templates. */
export function escapeHtml(input: string): string {
  return (input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Recursively sanitizes string values inside arbitrary JSON payloads (with depth guard). */
export function deepSanitizeStrings<T>(value: T, depth = 0): T {
  if (depth > 12 || value === null || value === undefined) return value;
  if (typeof value === "string") {
    return sanitizeInput(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepSanitizeStrings(item, depth + 1)) as unknown as T;
  }
  if (typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      clean[k] = deepSanitizeStrings(v, depth + 1);
    }
    return clean as T;
  }
  return value;
}

/** Extracts the best client IP string from request headers for rate-limiting and audit logs. */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return sanitizeInput(realIp).slice(0, 64);

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return sanitizeInput(first).slice(0, 64);
  }
  return "127.0.0.1";
}

/** Rejects non-HTTP(S) schemes and loopback/private/link-local targets to mitigate SSRF. */
export function isSafeExternalWebhookUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "::1" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octets = ipv4Match.slice(1).map(Number);
      if (octets.some((o) => o < 0 || o > 255)) return false;
      const [a, b] = octets;
      if (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127)
      ) {
        return false;
      }
    }
    if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
