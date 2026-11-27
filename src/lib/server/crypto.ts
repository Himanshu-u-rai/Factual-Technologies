import "server-only";

import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
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

function normalizeIpCandidate(value: string): string | null {
  const trimmed = sanitizeInput(value.trim()).replace(/^\[|\]$/g, "").split("%")[0];
  return net.isIP(trimmed) ? trimmed : null;
}

/** Extracts the best client IP string from request headers for rate-limiting and audit logs. */
export function getClientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "false") {
    return "direct";
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    const valid = normalizeIpCandidate(realIp);
    if (valid) return valid.slice(0, 64);
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // Prefer the rightmost proxy-appended entry rather than the client-spoofable leftmost value
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const valid = normalizeIpCandidate(parts[i]);
      if (valid) return valid.slice(0, 64);
    }
  }
  return "127.0.0.1";
}

function wordsToIpv4(hi: number, lo: number): string {
  return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
}

function parseIpv6Words(ip: string): number[] | null {
  const clean = ip.toLowerCase().split("%")[0];
  let work = clean;

  // Convert trailing IPv4 notation (e.g., ::ffff:127.0.0.1) into two 16-bit hextets
  const lastColon = work.lastIndexOf(":");
  const tail = lastColon >= 0 ? work.slice(lastColon + 1) : "";
  if (tail.includes(".")) {
    if (!net.isIPv4(tail)) return null;
    const octets = tail.split(".").map(Number);
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    work = `${work.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const sides = work.split("::");
  if (sides.length > 2) return null;

  const left = sides[0] ? sides[0].split(":").filter(Boolean) : [];
  const right = sides.length === 2 && sides[1] ? sides[1].split(":").filter(Boolean) : [];

  const totalParts = left.length + right.length;
  if (sides.length === 1 && totalParts !== 8) return null;
  if (sides.length === 2 && totalParts >= 8) return null;

  const missingZeros = sides.length === 2 ? 8 - totalParts : 0;
  const hextets = [...left, ...Array<string>(missingZeros).fill("0"), ...right];
  if (hextets.length !== 8) return null;

  const words: number[] = [];
  for (const h of hextets) {
    if (!/^[0-9a-f]{1,4}$/i.test(h)) return null;
    words.push(parseInt(h, 16));
  }
  return words;
}

/** Returns true when an IPv4 or IPv6 literal falls in loopback, private, link-local, or reserved space. */
export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, "").split("%")[0];
  const ipVersion = net.isIP(clean);
  if (ipVersion === 4) {
    const octets = clean.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) {
      return true;
    }
    const [a, b, c] = octets;
    return (
      a === 0 ||
      a === 10 ||
      (a === 100 && b >= 64 && b <= 127) ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (ipVersion === 6) {
    const words = parseIpv6Words(clean);
    if (!words) return true;

    const allZero = words.every((w) => w === 0);
    const isLoopback = words.slice(0, 7).every((w) => w === 0) && words[7] === 1;
    if (allZero || isLoopback) return true;

    // fc00::/7 unique local, fe80::/10 link-local, ff00::/8 multicast
    if ((words[0] & 0xfe00) === 0xfc00) return true;
    if ((words[0] & 0xffc0) === 0xfe80) return true;
    if ((words[0] & 0xff00) === 0xff00) return true;

    // 2001:db8::/32 documentation, 100::/64 discard
    if (words[0] === 0x2001 && words[1] === 0x0db8) return true;
    if (words[0] === 0x0100 && words[1] === 0 && words[2] === 0 && words[3] === 0) return true;

    // ::ffff:0:0/96 IPv4-mapped & ::/96 IPv4-compatible
    if (
      words[0] === 0 &&
      words[1] === 0 &&
      words[2] === 0 &&
      words[3] === 0 &&
      words[4] === 0 &&
      (words[5] === 0xffff || words[5] === 0)
    ) {
      return isPrivateOrReservedIp(wordsToIpv4(words[6], words[7]));
    }

    // 64:ff9b::/96 NAT64 & 2002::/16 6to4
    if (
      words[0] === 0x0064 &&
      words[1] === 0xff9b &&
      words[2] === 0 &&
      words[3] === 0 &&
      words[4] === 0 &&
      words[5] === 0
    ) {
      return isPrivateOrReservedIp(wordsToIpv4(words[6], words[7]));
    }
    if (words[0] === 0x2002) {
      return isPrivateOrReservedIp(wordsToIpv4(words[1], words[2]));
    }

    return false;
  }

  return true;
}

/** Rejects non-HTTP(S) schemes, credentials, internal names, and loopback/private/link-local targets to mitigate SSRF. */
export function isSafeExternalWebhookUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const rawHost = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const host = rawHost.startsWith("[") && rawHost.endsWith("]") ? rawHost.slice(1, -1) : rawHost;
    if (!host) return false;

    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".localdomain") ||
      host.endsWith(".internal")
    ) {
      return false;
    }

    if (net.isIP(host)) {
      return !isPrivateOrReservedIp(host);
    }

    // Block single-label internal service hostnames such as "postgres" or "redis"
    if (!host.includes(".")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/** Validates webhook URL syntax and resolves DNS records to ensure no target IP is private or loopback. */
export async function resolveAndAssertSafeWebhookUrl(urlString: string): Promise<boolean> {
  if (!isSafeExternalWebhookUrl(urlString)) {
    return false;
  }

  const parsed = new URL(urlString);
  const rawHost = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const host = rawHost.startsWith("[") && rawHost.endsWith("]") ? rawHost.slice(1, -1) : rawHost;

  if (net.isIP(host)) {
    return !isPrivateOrReservedIp(host);
  }

  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (!records || records.length === 0) return false;
    return records.every((rec) => !isPrivateOrReservedIp(rec.address));
  } catch {
    return false;
  }
}
