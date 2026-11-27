import test from "node:test";
import assert from "node:assert/strict";
import * as authModule from "../src/lib/server/auth";
import * as dbModule from "../src/lib/server/db";
import * as rateLimitModule from "../src/lib/server/rate-limit";
import * as auditLogsRoute from "../src/app/api/admin/audit-logs/route";
import * as settingsRoute from "../src/app/api/admin/settings/route";
import * as telemetryRoute from "../src/app/api/telemetry/route";
import * as loginRoute from "../src/app/api/auth/login/route";
import * as setupRoute from "../src/app/api/auth/setup/route";
import * as forgotRoute from "../src/app/api/auth/forgot-password/route";
import * as resetRoute from "../src/app/api/auth/reset-password/route";
import * as verifyRoute from "../src/app/api/auth/verify-email/route";
import JsonLd from "../src/components/seo/JsonLd";

const mockAdmin: authModule.AuthenticatedAdmin = {
  id: "admin-1",
  email: "admin@factualtechnologies.tech",
  name: "Test Admin",
  role: "Super Admin",
  emailVerified: true,
  twoFactorEnabled: true,
  sessionCreatedAt: Date.now(),
  lastActiveAt: Date.now(),
  ttlMinutes: 30,
  tokenHash: "hash-1",
};

test("DELETE /api/admin/audit-logs rejects deletion with 405 Method Not Allowed", async (t) => {
  t.mock.method(authModule, "requireAdmin", async () => ({ admin: mockAdmin }));

  const res = await auditLogsRoute.DELETE();
  assert.equal(res.status, 405);
  assert.equal(res.headers.get("allow"), "GET");
  const json = (await res.json()) as { error?: string };
  assert.match(json.error || "", /immutable/i);
});

test("POST /api/admin/settings blocks setup_totp downgrade when 2FA is already enabled", async (t) => {
  t.mock.method(authModule, "requireAdmin", async () => ({ admin: mockAdmin }));
  t.mock.method(dbModule, "dbQuery", (async () => ({
    rows: [{ two_factor_enabled: true }],
    rowCount: 1,
  })) as unknown as typeof dbModule.dbQuery);

  const req = new Request("https://factualtechnologies.tech/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "setup_totp" }),
  });

  const res = await settingsRoute.POST(req);
  assert.equal(res.status, 403);
});

test("POST /api/admin/settings blocks SSRF IPv6 and internal targets in test_webhook", async (t) => {
  t.mock.method(authModule, "requireAdmin", async () => ({ admin: mockAdmin }));
  t.mock.method(authModule, "getServerSettings", async () => ({
    slaThreshold: 99.99,
    webhookUrl: "",
    apiKey: "",
    alertEmail: "",
    autoAssignEnabled: true,
    twoFactorRequired: false,
    sessionTimeoutMinutes: 30,
    complianceBadges: [],
  }));

  for (const unsafeUrl of [
    "http://[fd00::1]/hook",
    "http://[::ffff:127.0.0.1]/hook",
    "http://postgres:5432/",
  ]) {
    const req = new Request("https://factualtechnologies.tech/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "test_webhook", webhookUrl: unsafeUrl }),
    });
    const res = await settingsRoute.POST(req);
    assert.equal(res.status, 400, `Expected 400 for ${unsafeUrl}`);
  }
});

test("POST /api/telemetry enforces rate limit and rejects /admin paths or invalid JSON", async (t) => {
  t.mock.method(rateLimitModule, "enforceFixedWindowRateLimit", async () => ({
    allowed: false,
    attempts: 61,
    remainingSeconds: 42,
  }));

  const limitedReq = new Request("https://factualtechnologies.tech/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/" }),
  });
  const limitedRes = await telemetryRoute.POST(limitedReq);
  assert.equal(limitedRes.status, 429);
  assert.equal(limitedRes.headers.get("retry-after"), "42");

  t.mock.restoreAll();
  t.mock.method(rateLimitModule, "enforceFixedWindowRateLimit", async () => ({
    allowed: true,
    attempts: 1,
    remainingSeconds: 0,
  }));

  const badPathReq = new Request("https://factualtechnologies.tech/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: "/admin/settings" }),
  });
  const badPathRes = await telemetryRoute.POST(badPathReq);
  assert.equal(badPathRes.status, 400);

  const malformedReq = new Request("https://factualtechnologies.tech/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });
  const malformedRes = await telemetryRoute.POST(malformedReq);
  assert.equal(malformedRes.status, 400);
});

test("Auth endpoints return 400 on malformed JSON and login does not leak remaining attempts", async (t) => {
  t.mock.method(authModule, "getServerRateLimit", async () => ({
    isLocked: false,
    remainingSeconds: 0,
    attempts: 0,
  }));
  t.mock.method(authModule, "recordServerFailedLogin", async () => ({
    isLocked: false,
    remainingSeconds: 0,
    attempts: 2,
  }));
  t.mock.method(dbModule, "dbQuery", (async () => ({
    rows: [],
    rowCount: 0,
  })) as unknown as typeof dbModule.dbQuery);
  t.mock.method(rateLimitModule, "enforceFixedWindowRateLimit", async () => ({
    allowed: true,
    attempts: 1,
    remainingSeconds: 0,
  }));

  // Bad login does not disclose attempts remaining
  const badLoginReq = new Request("https://factualtechnologies.tech/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@factualtechnologies.tech", password: "WrongPassword1!" }),
  });
  const badLoginRes = await loginRoute.POST(badLoginReq);
  assert.equal(badLoginRes.status, 401);
  const badLoginJson = (await badLoginRes.json()) as { error?: string };
  assert.equal(badLoginJson.error, "Invalid email or password.");
  assert.equal(/attempts remaining/i.test(badLoginJson.error || ""), false);

  // Malformed JSON yields 400 across auth routes
  const makeBadJsonReq = (url: string, method = "POST") =>
    new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: "{bad-json",
    });

  assert.equal((await loginRoute.POST(makeBadJsonReq("https://x/api/auth/login"))).status, 400);
  assert.equal((await setupRoute.POST(makeBadJsonReq("https://x/api/auth/setup"))).status, 400);
  assert.equal((await forgotRoute.POST(makeBadJsonReq("https://x/api/auth/forgot-password"))).status, 400);
  assert.equal((await resetRoute.POST(makeBadJsonReq("https://x/api/auth/reset-password"))).status, 400);
  assert.equal((await verifyRoute.POST(makeBadJsonReq("https://x/api/auth/verify-email"))).status, 400);
  assert.equal((await verifyRoute.PUT(makeBadJsonReq("https://x/api/auth/verify-email", "PUT"))).status, 400);
});

test("JsonLd escapes HTML tag boundaries to prevent inline script breakout XSS", () => {
  const element = JsonLd({
    id: "test-ld",
    data: { name: "</script><script>alert(1)</script>&test" },
  }) as { props: { dangerouslySetInnerHTML: { __html: string } } };

  const html = element.props.dangerouslySetInnerHTML.__html;
  assert.equal(html.includes("<"), false);
  assert.equal(html.includes(">"), false);
  assert.equal(html.includes("&"), false);
  assert.ok(html.includes("\\u003c/script\\u003e"));
});
