import test from "node:test";
import assert from "node:assert/strict";
import {
  deepSanitizeStrings,
  escapeHtml,
  getClientIp,
  hashPassword,
  isPrivateOrReservedIp,
  isSafeExternalWebhookUrl,
  resolveAndAssertSafeWebhookUrl,
  safeCompareStrings,
  verifyPassword,
} from "../src/lib/server/crypto";

test("hashPassword & verifyPassword validate scrypt and reject oversized inputs", () => {
  const hash = hashPassword("StrongPass!2026");
  assert.ok(hash.startsWith("scrypt$16384$8$1$"));
  assert.equal(verifyPassword("StrongPass!2026", hash), true);
  assert.equal(verifyPassword("WrongPass!2026", hash), false);
  assert.equal(verifyPassword("", hash), false);
  assert.equal(verifyPassword("a".repeat(129), hash), false);
  assert.throws(() => hashPassword("a".repeat(129)));
});

test("safeCompareStrings performs length-safe equality checks", () => {
  assert.equal(safeCompareStrings("secret-token-123", "secret-token-123"), true);
  assert.equal(safeCompareStrings("secret-token-123", "secret-token-124"), false);
  assert.equal(safeCompareStrings("short", "much-longer"), false);
});

test("escapeHtml encodes dangerous HTML characters", () => {
  const out = escapeHtml(`<script>alert("xss" & 'test')</script>`);
  assert.equal(
    out,
    "&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;"
  );
});

test("deepSanitizeStrings strips prototype pollution keys and script payloads", () => {
  const payload = JSON.parse(
    '{"name":"<script>alert(1)</script>Alice","__proto__":{"polluted":true},"nested":{"constructor":"bad","link":"javascript:alert(1)"}}'
  ) as Record<string, unknown>;

  const cleaned = deepSanitizeStrings(payload);
  assert.equal(cleaned.name, "Alice");
  assert.equal(Object.prototype.hasOwnProperty.call(cleaned, "__proto__"), false);
  const nested = cleaned.nested as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(nested, "constructor"), false);
  assert.equal(String(nested.link).includes("javascript:"), false);
});

test("getClientIp guards against X-Forwarded-For spoofing and respects TRUST_PROXY", () => {
  const prevTrust = process.env.TRUST_PROXY;
  try {
    process.env.TRUST_PROXY = "true";
    const spoofedReq = new Request("https://factualtechnologies.tech/api/inquiries", {
      headers: {
        "x-forwarded-for": "1.2.3.4, 198.51.100.77",
      },
    });
    assert.equal(getClientIp(spoofedReq), "198.51.100.77");

    const realIpReq = new Request("https://factualtechnologies.tech/api/inquiries", {
      headers: {
        "x-real-ip": "203.0.113.42",
        "x-forwarded-for": "1.2.3.4",
      },
    });
    assert.equal(getClientIp(realIpReq), "203.0.113.42");

    process.env.TRUST_PROXY = "false";
    assert.equal(getClientIp(realIpReq), "direct");
  } finally {
    if (prevTrust === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = prevTrust;
  }
});

test("isPrivateOrReservedIp & isSafeExternalWebhookUrl block IPv4, IPv6, internal hostnames, and credentials", async () => {
  // Public targets allowed
  assert.equal(isSafeExternalWebhookUrl("https://hooks.slack.com/services/T00/B00/XYZ"), true);
  assert.equal(isSafeExternalWebhookUrl("https://93.184.216.34/webhook"), true);
  assert.equal(isPrivateOrReservedIp("93.184.216.34"), false);
  assert.equal(isPrivateOrReservedIp("2606:2800:220:1:248:1893:25c8:1946"), false);

  // Blocked SSRF targets
  const blockedUrls = [
    "http://localhost:3000/hook",
    "http://127.0.0.1:8080/hook",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.5/internal",
    "http://172.16.10.2/internal",
    "http://192.168.1.1/admin",
    "http://100.64.0.1/cgnat",
    "http://0.0.0.0:3000/",
    "http://[::1]:3000/",
    "http://[::]/",
    "http://[fd00::1]/hook",
    "http://[fc00::1]/hook",
    "http://[fe80::1]/hook",
    "http://[::ffff:127.0.0.1]/hook",
    "http://[::ffff:169.254.169.254]/latest/meta-data/",
    "http://[2002:7f00:0001::]/hook",
    "http://postgres:5432/",
    "http://redis.internal/hook",
    "http://printer.local/hook",
    "ftp://example.com/file",
    "https://user:pass@example.com/hook",
  ];

  for (const url of blockedUrls) {
    assert.equal(isSafeExternalWebhookUrl(url), false, `Expected SSRF block for: ${url}`);
  }

  assert.equal(await resolveAndAssertSafeWebhookUrl("http://localhost/hook"), false);
  assert.equal(await resolveAndAssertSafeWebhookUrl("http://[fd00::1]/hook"), false);
});
