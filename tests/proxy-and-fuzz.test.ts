import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { sanitizeInput, sanitizeSafeUrl } from "../src/lib/admin-types";
import { deepSanitizeStrings, isSafeExternalWebhookUrl } from "../src/lib/server/crypto";
import { SESSION_COOKIE_NAME, signSessionCookieValue, verifySessionCookieValue } from "../src/lib/session-hmac";
import { proxy } from "../src/proxy";

test("proxy enforces CORS preflight rejection, same-origin mutations, and admin auth", async () => {
  const prevSecret = process.env.SESSION_SECRET;
  const prevOrigin = process.env.APP_ORIGIN;
  const prevTrust = process.env.TRUST_PROXY;

  try {
    process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.APP_ORIGIN = "https://factualtechnologies.tech";
    process.env.TRUST_PROXY = "false";

    // 1. OPTIONS preflight blocked
    const optionsReq = new NextRequest("https://factualtechnologies.tech/api/inquiries", {
      method: "OPTIONS",
      headers: { host: "factualtechnologies.tech" },
    });
    const optionsRes = await proxy(optionsReq);
    assert.equal(optionsRes.status, 403);
    assert.equal(optionsRes.headers.get("cache-control"), "no-store, private");

    // 2. Cross-origin POST blocked
    const crossOriginReq = new NextRequest("https://factualtechnologies.tech/api/inquiries", {
      method: "POST",
      headers: {
        host: "factualtechnologies.tech",
        origin: "https://attacker.example",
      },
    });
    const crossOriginRes = await proxy(crossOriginReq);
    assert.equal(crossOriginRes.status, 403);

    // 3. Sec-Fetch-Site: cross-site blocked
    const secFetchReq = new NextRequest("https://factualtechnologies.tech/api/inquiries", {
      method: "POST",
      headers: {
        host: "factualtechnologies.tech",
        "sec-fetch-site": "cross-site",
      },
    });
    const secFetchRes = await proxy(secFetchReq);
    assert.equal(secFetchRes.status, 403);

    // 4. Spoofed X-Forwarded-Host rejected when TRUST_PROXY=false
    const spoofedHostReq = new NextRequest("https://factualtechnologies.tech/api/inquiries", {
      method: "POST",
      headers: {
        host: "factualtechnologies.tech",
        "x-forwarded-host": "attacker.example",
        origin: "https://attacker.example",
      },
    });
    const spoofedHostRes = await proxy(spoofedHostReq);
    assert.equal(spoofedHostRes.status, 403);

    // 5. Same-origin POST permitted
    const sameOriginReq = new NextRequest("https://factualtechnologies.tech/api/inquiries", {
      method: "POST",
      headers: {
        host: "factualtechnologies.tech",
        origin: "https://factualtechnologies.tech",
      },
    });
    const sameOriginRes = await proxy(sameOriginReq);
    assert.equal(sameOriginRes.status, 200);

    // 6. Unauthenticated /api/admin/* returns 401
    const unauthApiReq = new NextRequest("https://factualtechnologies.tech/api/admin/settings", {
      method: "GET",
      headers: { host: "factualtechnologies.tech" },
    });
    const unauthApiRes = await proxy(unauthApiReq);
    assert.equal(unauthApiRes.status, 401);

    // 7. Tampered cookie on /api/admin/* returns 401
    const badCookieReq = new NextRequest("https://factualtechnologies.tech/api/admin/settings", {
      method: "GET",
      headers: {
        host: "factualtechnologies.tech",
        cookie: `${SESSION_COOKIE_NAME}=deadbeef.${"0".repeat(64)}`,
      },
    });
    const badCookieRes = await proxy(badCookieReq);
    assert.equal(badCookieRes.status, 401);

    // 8. Valid HMAC cookie passes proxy check
    const signed = await signSessionCookieValue("f".repeat(64));
    const authApiReq = new NextRequest("https://factualtechnologies.tech/api/admin/settings", {
      method: "GET",
      headers: {
        host: "factualtechnologies.tech",
        cookie: `${SESSION_COOKIE_NAME}=${signed}`,
      },
    });
    const authApiRes = await proxy(authApiReq);
    assert.equal(authApiRes.status, 200);

    // 9. Unauthenticated /admin/settings redirects to /admin/login
    const unauthAdminReq = new NextRequest("https://factualtechnologies.tech/admin/settings", {
      method: "GET",
      headers: { host: "factualtechnologies.tech" },
    });
    const unauthAdminRes = await proxy(unauthAdminReq);
    assert.equal(unauthAdminRes.status, 307);
    assert.ok(
      unauthAdminRes.headers.get("location")?.includes("/admin/login?reason=unauthenticated")
    );
  } finally {
    if (prevSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prevSecret;
    if (prevOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = prevOrigin;
    if (prevTrust === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = prevTrust;
  }
});

test("Fuzzing malformed and adversarial inputs does not crash or bypass sanitizers", async () => {
  const fuzzVectors: string[] = [
    "",
    "\u0000\u0007\u001b[31mred",
    "<script>alert(1)</script>",
    "<ScRiPt src=https://evil.test/x.js></ScRiPt>",
    "<svg onload=alert(1)>",
    "<iframe src='javascript:alert(1)'></iframe>",
    "javajavascript:script:alert(1)",
    "java\tscript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "//evil.com/redirect",
    "/\\evil.com/redirect",
    "http://127.1/",
    "http://0177.0.0.1/",
    "http://2130706433/",
    "http://[::ffff:7f00:1]/",
    "http://[fd12:3456:789a::1]/",
    "http://[fe80::1%25eth0]/",
    "https://[::1]/",
    "not a url %%%% \n\r\t",
    "x".repeat(25_000),
  ];

  // Add pseudo-random byte/char combinations deterministically
  for (let i = 0; i < 150; i++) {
    const code = (i * 137) % 256;
    fuzzVectors.push(`fuzz-${i}-${String.fromCharCode(code)}-<script>-javascript:${i}`);
  }

  for (const input of fuzzVectors) {
    const cleanText = sanitizeInput(input);
    assert.equal(cleanText.includes("\u0000"), false);
    assert.equal(/<script/i.test(cleanText), false);

    const safeUrl = sanitizeSafeUrl(input, "");
    if (safeUrl !== "") {
      assert.ok(
        safeUrl.startsWith("/") ||
          safeUrl.startsWith("http://") ||
          safeUrl.startsWith("https://"),
        `Unexpected sanitized URL: ${safeUrl}`
      );
      assert.equal(safeUrl.startsWith("//"), false);
      assert.equal(safeUrl.startsWith("/\\"), false);
    }

    assert.doesNotThrow(() => isSafeExternalWebhookUrl(input));
    assert.doesNotThrow(() => deepSanitizeStrings({ payload: input }));
    assert.equal(await verifySessionCookieValue(input), null);
  }
});
