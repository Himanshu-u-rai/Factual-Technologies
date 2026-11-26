import "server-only";

import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generates a 160-bit Base32 TOTP secret compatible with standard authenticator apps. */
export function generateTotpSecret(): string {
  return encodeBase32(crypto.randomBytes(20));
}

/** Builds a standard otpauth:// provisioning URI for authenticator enrollment. */
export function buildOtpAuthUri(email: string, secret: string, issuer = "Factual Technologies"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/** Computes a 6-digit RFC 6238 HOTP value for the given secret and time step counter. */
export function computeTotpAtStep(secret: string, stepCounter: number): string {
  const key = decodeBase32(secret);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(stepCounter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

/** Verifies a 6-digit TOTP code allowing +-1 thirty-second step for clock skew. */
export function verifyTotpCode(secret: string, candidateCode: string): boolean {
  const normalized = candidateCode.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized) || !secret) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let delta = -1; delta <= 1; delta++) {
    const expected = computeTotpAtStep(secret, currentStep + delta);
    if (
      crypto.timingSafeEqual(
        Buffer.from(normalized, "utf8"),
        Buffer.from(expected, "utf8")
      )
    ) {
      return true;
    }
  }
  return false;
}
