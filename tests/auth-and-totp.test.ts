import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeSafeUrl, validatePasswordStrength } from "../src/lib/admin-types";
import {
  getSessionSecret,
  signSessionCookieValue,
  verifySessionCookieValue,
} from "../src/lib/session-hmac";
import { buildOtpAuthUri, computeTotpAtStep, generateTotpSecret, verifyTotpCode } from "../src/lib/server/totp";

test("session-hmac signs, verifies, rejects tampering, and fails closed in production", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.SESSION_SECRET;
  const mutableEnv = process.env as Record<string, string | undefined>;

  try {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.SESSION_SECRET = "short";
    assert.throws(() => getSessionSecret());

    mutableEnv.SESSION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
    const rawToken = "a".repeat(64);
    const signed = await signSessionCookieValue(rawToken);
    assert.equal(await verifySessionCookieValue(signed), rawToken);

    // Tampered token or signature must fail verification
    const tamperedSig = `${rawToken}.${"f".repeat(64)}`;
    const tamperedToken = `${"b".repeat(64)}.${signed.split(".")[1]}`;
    assert.equal(await verifySessionCookieValue(tamperedSig), null);
    assert.equal(await verifySessionCookieValue(tamperedToken), null);
    assert.equal(await verifySessionCookieValue("not-a-valid-cookie"), null);
    assert.equal(await verifySessionCookieValue(undefined), null);
  } finally {
    if (prevEnv === undefined) delete mutableEnv.NODE_ENV;
    else mutableEnv.NODE_ENV = prevEnv;
    if (prevSecret === undefined) delete mutableEnv.SESSION_SECRET;
    else mutableEnv.SESSION_SECRET = prevSecret;
  }
});

test("TOTP generation and verification enforce 6-digit RFC 6238 codes", () => {
  const secret = generateTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);

  const uri = buildOtpAuthUri("admin@factualtechnologies.tech", secret);
  assert.ok(uri.startsWith("otpauth://totp/"));
  assert.ok(uri.includes(secret));

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const validCode = computeTotpAtStep(secret, currentStep);
  assert.equal(verifyTotpCode(secret, validCode), true);
  assert.equal(verifyTotpCode(secret, "00000"), false);
  assert.equal(verifyTotpCode(secret, "abcdef"), false);
  assert.equal(verifyTotpCode("", validCode), false);
});

test("validatePasswordStrength and sanitizeSafeUrl enforce security constraints", () => {
  assert.ok(validatePasswordStrength("Short1!"));
  assert.ok(validatePasswordStrength("alllowercaseletters"));
  assert.ok(validatePasswordStrength("a".repeat(129)));
  assert.equal(validatePasswordStrength("StrongPass#2026"), null);

  assert.equal(sanitizeSafeUrl("https://factualtechnologies.tech/blog"), "https://factualtechnologies.tech/blog");
  assert.equal(sanitizeSafeUrl("/work/case-study"), "/work/case-study");
  assert.equal(sanitizeSafeUrl("javascript:alert(1)", ""), "");
  assert.equal(sanitizeSafeUrl("javajavascript:script:alert(1)", ""), "");
  assert.equal(sanitizeSafeUrl("data:text/html,<script>alert(1)</script>", ""), "");
  assert.equal(sanitizeSafeUrl("//evil.example/phish", ""), "");
  assert.equal(sanitizeSafeUrl("/\\evil.example", ""), "");
});
