// Runtime-agnostic Web Crypto HMAC helper shared cleanly between proxy.ts and Node route handlers.

export const SESSION_COOKIE_NAME = "ft_admin_session";

declare global {
  var __factualDevHmacSecret: string | undefined;
}

/** Resolves a strong cryptographic HMAC secret, failing closed in production if missing or short. */
export function getSessionSecret(): string {
  const configured = (process.env.SESSION_SECRET || "").trim();
  if (configured.length >= 32) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable (minimum 32 characters) must be set in production.");
  }

  if (!globalThis.__factualDevHmacSecret) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    globalThis.__factualDevHmacSecret = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.warn(
      "[security] SESSION_SECRET missing or <32 chars; generated an ephemeral in-memory development secret."
    );
  }
  return globalThis.__factualDevHmacSecret;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeHmacHex(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToHex(sig);
}

/** Wraps an opaque session token as "<token>.<hmacHex>". */
export async function signSessionCookieValue(rawToken: string): Promise<string> {
  const sig = await computeHmacHex(rawToken);
  return `${rawToken}.${sig}`;
}

/** Verifies HMAC signature on "<token>.<hmacHex>" and returns the raw token if valid. */
export async function verifySessionCookieValue(cookieValue: string | undefined): Promise<string | null> {
  if (!cookieValue) return null;
  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx <= 0) return null;

  const rawToken = cookieValue.slice(0, dotIdx);
  const sigHex = cookieValue.slice(dotIdx + 1);
  if (!/^[a-f0-9]{32,128}$/i.test(rawToken) || !/^[a-f0-9]{64}$/i.test(sigHex)) {
    return null;
  }

  const expected = await computeHmacHex(rawToken);
  if (!constantTimeEqualHex(sigHex.toLowerCase(), expected.toLowerCase())) {
    return null;
  }
  return rawToken;
}
