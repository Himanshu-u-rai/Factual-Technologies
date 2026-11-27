import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  AnalyticsProvider,
  INITIAL_AUDIT_LOGS,
  INITIAL_INQUIRIES,
  INITIAL_SETTINGS,
  SystemSettings,
  sanitizeInput,
} from "@/lib/admin-types";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-defaults";
import {
  clearServerRateLimits,
  getServerSettings,
  requireAdmin,
  sanitizeSettingsForClient,
} from "@/lib/server/auth";
import {
  escapeHtml,
  getClientIp,
  isSafeExternalWebhookUrl,
  resolveAndAssertSafeWebhookUrl,
  sha256Hex,
  verifyPassword,
} from "@/lib/server/crypto";
import { dbQuery, recordAuditLog, withTransaction } from "@/lib/server/db";
import { getSmtpStatus, sendEmail } from "@/lib/server/mailer";
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from "@/lib/server/totp";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns system configuration (without secret keys/hashes), SMTP readiness, and admin 2FA state. */
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const settings = await getServerSettings();
  const smtp = getSmtpStatus();
  return NextResponse.json({
    settings: sanitizeSettingsForClient(settings),
    smtpStatus: {
      ...smtp,
      host: process.env.NODE_ENV === "production" ? (smtp.configured ? "[configured]" : "") : smtp.host,
    },
    twoFactorEnabled: auth.admin.twoFactorEnabled,
    adminEmail: auth.admin.email,
  });
}

/** Updates system settings in PostgreSQL cleanly. */
export async function PUT(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const body = (await req.json().catch(() => null)) as Partial<SystemSettings> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid settings payload." }, { status: 400 });
  }

  const current = await getServerSettings();
  const nextWebhook =
    body.webhookUrl !== undefined ? sanitizeInput(body.webhookUrl.trim()) : current.webhookUrl;

  if (nextWebhook && !isSafeExternalWebhookUrl(nextWebhook)) {
    return NextResponse.json(
      { error: "Webhook URL must be a public HTTP(S) address (localhost and private IPs are blocked)." },
      { status: 400 }
    );
  }

  const nextAlertEmail =
    body.alertEmail !== undefined ? sanitizeInput(body.alertEmail.trim().toLowerCase()) : current.alertEmail;
  if (nextAlertEmail && !EMAIL_RE.test(nextAlertEmail)) {
    return NextResponse.json({ error: "Alert email address is invalid." }, { status: 400 });
  }

  if (body.twoFactorRequired === true && !auth.admin.twoFactorEnabled) {
    return NextResponse.json(
      { error: "Enroll and verify an authenticator app before requiring 2FA." },
      { status: 400 }
    );
  }

  const merged: SystemSettings = {
    ...current,
    apiKey: "",
    apiKeyHash: current.apiKeyHash,
    apiKeyPreview: current.apiKeyPreview,
    slaThreshold:
      typeof body.slaThreshold === "number"
        ? Math.min(100, Math.max(90, body.slaThreshold))
        : current.slaThreshold,
    webhookUrl: nextWebhook,
    alertEmail: nextAlertEmail,
    autoAssignEnabled:
      body.autoAssignEnabled !== undefined
        ? Boolean(body.autoAssignEnabled)
        : current.autoAssignEnabled,
    twoFactorRequired:
      body.twoFactorRequired !== undefined
        ? Boolean(body.twoFactorRequired)
        : current.twoFactorRequired,
    sessionTimeoutMinutes:
      typeof body.sessionTimeoutMinutes === "number"
        ? Math.min(1440, Math.max(5, Math.round(body.sessionTimeoutMinutes)))
        : current.sessionTimeoutMinutes,
    indexNowKey: current.indexNowKey,
    analyticsProvider: (["none", "ga4", "plausible", "umami"].includes(
      String(body.analyticsProvider || "")
    )
      ? body.analyticsProvider
      : current.analyticsProvider || "none") as AnalyticsProvider,
    analyticsId:
      body.analyticsId !== undefined
        ? sanitizeInput(String(body.analyticsId).trim()).slice(0, 120)
        : current.analyticsId || "",
    complianceBadges: Array.isArray(body.complianceBadges)
      ? body.complianceBadges
      : current.complianceBadges,
  };

  await dbQuery(
    `INSERT INTO system_settings (id, data, updated_at)
     VALUES ('default', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data,
           updated_at = NOW()`,
    [JSON.stringify(merged)]
  );

  await recordAuditLog({
    actor: auth.admin.email,
    category: "Security",
    action: "System Settings Updated",
    ipAddress: getClientIp(req),
    details: `Saved SLA, alert routing, and session timeout (${merged.sessionTimeoutMinutes}m) preferences.`,
  });

  return NextResponse.json({ ok: true, settings: sanitizeSettingsForClient(merged) });
}

/** Handles authenticated operational actions: API keys, SMTP test, webhook probe, TOTP 2FA, reset. */
export async function POST(req: Request) {
  const auth = await requireAdmin({ touch: true });
  if ("response" in auth) return auth.response;

  const ipAddress = getClientIp(req);
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    webhookUrl?: string;
    targetEmail?: string;
    code?: string;
    password?: string;
  } | null;

  const action = body?.action || "";

  if (action === "generate_api_key") {
    const current = await getServerSettings();
    const rawKey = `ft_live_${crypto.randomBytes(24).toString("hex")}`;
    const apiKeyHash = sha256Hex(rawKey);
    const apiKeyPreview = `${rawKey.slice(0, 12)}••••••••${rawKey.slice(-4)}`;
    const updated: SystemSettings = {
      ...current,
      apiKey: "",
      apiKeyHash,
      apiKeyPreview,
    };
    await dbQuery(
      "UPDATE system_settings SET data = $1::jsonb, updated_at = NOW() WHERE id = 'default'",
      [JSON.stringify(updated)]
    );
    await recordAuditLog({
      actor: auth.admin.email,
      category: "Security",
      action: "Enterprise API Key Rotated",
      ipAddress,
      details: `Generated hashed API key (${apiKeyPreview}); plaintext shown once to admin.`,
    });
    return NextResponse.json({
      ok: true,
      newlyGeneratedKey: rawKey,
      settings: sanitizeSettingsForClient(updated),
    });
  }

  if (action === "test_webhook") {
    const current = await getServerSettings();
    const targetUrl = sanitizeInput((body?.webhookUrl || current.webhookUrl || "").trim());
    if (!targetUrl || !(await resolveAndAssertSafeWebhookUrl(targetUrl))) {
      return NextResponse.json(
        { ok: false, error: "Provide a valid public HTTP(S) webhook endpoint (private, local, and non-routable targets are blocked)." },
        { status: 400 }
      );
    }

    const started = Date.now();
    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "factual.webhook.test",
          timestamp: new Date().toISOString(),
          triggeredBy: auth.admin.email,
        }),
        redirect: "error",
        signal: AbortSignal.timeout(4000),
      });
      const latencyMs = Date.now() - started;

      await recordAuditLog({
        actor: auth.admin.email,
        category: "System",
        action: "Webhook Probe Executed",
        ipAddress,
        details: `Delivered test payload to ${targetUrl} -> HTTP ${response.status} (${latencyMs}ms).`,
      });

      return NextResponse.json({
        ok: response.ok,
        statusCode: response.status,
        latencyMs,
        error: response.ok ? undefined : `Endpoint returned HTTP ${response.status}`,
      });
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          latencyMs: Date.now() - started,
          error:
            process.env.NODE_ENV === "production"
              ? "Webhook endpoint unreachable or returned an error."
              : err instanceof Error
              ? err.message
              : "Webhook delivery failed.",
        },
        { status: 502 }
      );
    }
  }

  if (action === "test_smtp") {
    const target = sanitizeInput((body?.targetEmail || auth.admin.email).trim().toLowerCase());
    if (!EMAIL_RE.test(target)) {
      return NextResponse.json({ error: "Invalid destination email address." }, { status: 400 });
    }

    const result = await sendEmail({
      to: target,
      subject: "Factual Technologies — SMTP Diagnostic Test",
      text: `SMTP delivery test triggered by ${auth.admin.email} at ${new Date().toISOString()}.`,
      html: `<p><strong>SMTP Diagnostic Test</strong></p><p>Triggered by ${escapeHtml(auth.admin.email)} at ${new Date().toISOString()}.</p>`,
    });

    await recordAuditLog({
      actor: auth.admin.email,
      category: "System",
      action: result.sent ? "SMTP Test Email Sent" : "SMTP Test Email Failed",
      ipAddress,
      details: result.sent
        ? `Delivered via ${result.deliveredVia} to ${target}.`
        : result.error || "Unknown SMTP error.",
    });

    return NextResponse.json({
      ok: result.sent,
      result,
      error: result.sent ? undefined : result.error,
    }, { status: result.sent ? 200 : 502 });
  }

  if (action === "setup_totp") {
    const existingRes = await dbQuery<{ two_factor_enabled: boolean }>(
      "SELECT two_factor_enabled FROM admin_users WHERE id = $1",
      [auth.admin.id]
    );
    if (existingRes.rows[0]?.two_factor_enabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is already enabled. Verify and disable existing 2FA before re-enrolling." },
        { status: 403 }
      );
    }

    const secret = generateTotpSecret();
    await dbQuery(
      `UPDATE admin_users SET two_factor_secret = $2, two_factor_enabled = false, updated_at = NOW() WHERE id = $1`,
      [auth.admin.id, secret]
    );
    const otpAuthUri = buildOtpAuthUri(auth.admin.email, secret);
    await recordAuditLog({
      actor: auth.admin.email,
      category: "Security",
      action: "TOTP Setup Initiated",
      ipAddress,
      details: "Generated new pending TOTP enrollment secret.",
    });
    return NextResponse.json({ ok: true, secret, otpAuthUri });
  }

  if (action === "enable_totp") {
    const code = (body?.code || "").trim();
    const userRes = await dbQuery<{ two_factor_secret: string | null }>(
      "SELECT two_factor_secret FROM admin_users WHERE id = $1",
      [auth.admin.id]
    );
    const secret = userRes.rows[0]?.two_factor_secret || "";
    if (!secret || !verifyTotpCode(secret, code)) {
      return NextResponse.json(
        { error: "Invalid 6-digit authenticator verification code." },
        { status: 400 }
      );
    }

    await dbQuery(
      "UPDATE admin_users SET two_factor_enabled = true, updated_at = NOW() WHERE id = $1",
      [auth.admin.id]
    );
    const current = await getServerSettings();
    const updatedSettings = { ...current, twoFactorRequired: true };
    await dbQuery(
      "UPDATE system_settings SET data = $1::jsonb, updated_at = NOW() WHERE id = 'default'",
      [JSON.stringify(updatedSettings)]
    );

    await recordAuditLog({
      actor: auth.admin.email,
      category: "Security",
      action: "TOTP 2FA Enabled",
      ipAddress,
      details: "Enrolled authenticator app and enforced TOTP 2FA on admin sign-in.",
    });

    return NextResponse.json({
      ok: true,
      twoFactorEnabled: true,
      settings: sanitizeSettingsForClient(updatedSettings),
    });
  }

  if (action === "disable_totp") {
    const userRes = await dbQuery<{ password_hash: string; two_factor_secret: string | null }>(
      "SELECT password_hash, two_factor_secret FROM admin_users WHERE id = $1",
      [auth.admin.id]
    );
    const user = userRes.rows[0];
    const codeOk =
      Boolean(body?.code && user?.two_factor_secret && verifyTotpCode(user.two_factor_secret, body.code));
    const passwordOk = Boolean(body?.password && user?.password_hash && verifyPassword(body.password, user.password_hash));

    if (!codeOk && !passwordOk) {
      return NextResponse.json(
        { error: "Enter your current password or 6-digit authenticator code to disable 2FA." },
        { status: 400 }
      );
    }

    await dbQuery(
      "UPDATE admin_users SET two_factor_enabled = false, two_factor_secret = NULL, updated_at = NOW() WHERE id = $1",
      [auth.admin.id]
    );
    const current = await getServerSettings();
    const updatedSettings = { ...current, twoFactorRequired: false };
    await dbQuery(
      "UPDATE system_settings SET data = $1::jsonb, updated_at = NOW() WHERE id = 'default'",
      [JSON.stringify(updatedSettings)]
    );

    await recordAuditLog({
      actor: auth.admin.email,
      category: "Security",
      action: "TOTP 2FA Disabled",
      ipAddress,
      details: "Removed TOTP authenticator secret and disabled 2FA challenge.",
    });

    return NextResponse.json({
      ok: true,
      twoFactorEnabled: false,
      settings: sanitizeSettingsForClient(updatedSettings),
    });
  }

  if (action === "clear_rate_limits") {
    await clearServerRateLimits();
    await recordAuditLog({
      actor: auth.admin.email,
      category: "Security",
      action: "Rate Limits Cleared",
      ipAddress,
      details: "Cleared active login lockout counters in PostgreSQL.",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset_demo_data") {
    // Restores baseline CMS copy, projects, inquiries, and settings without touching admin accounts or sessions
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO site_content (id, data, updated_at)
         VALUES ('live', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify({ ...DEFAULT_SITE_CONTENT, messages: [] })]
      );

      await client.query("DELETE FROM projects");
      for (let i = 0; i < DEFAULT_SITE_CONTENT.projects.length; i++) {
        const p = DEFAULT_SITE_CONTENT.projects[i];
        await client.query(
          `INSERT INTO projects (id, title, category, metrics, description, tags, image, published, featured_on_home, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, true, $8, $9)`,
          [
            p.id,
            p.title,
            p.category,
            p.metrics,
            p.description,
            JSON.stringify(p.tags),
            p.image,
            p.featuredOnHome,
            i,
          ]
        );
      }

      await client.query("DELETE FROM inquiries");
      for (const inq of INITIAL_INQUIRIES) {
        await client.query(
          `INSERT INTO inquiries (id, name, email, company, message, status, priority, assigned_architect, estimated_value, tags, notes, read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13::timestamptz)`,
          [
            inq.id,
            inq.name,
            inq.email,
            inq.company,
            inq.message,
            inq.status,
            inq.priority,
            inq.assignedArchitect ?? null,
            inq.estimatedValue ?? null,
            JSON.stringify(inq.tags ?? []),
            JSON.stringify(inq.notes ?? []),
            Boolean(inq.read),
            inq.createdAt,
          ]
        );
      }

      await client.query("DELETE FROM site_snapshots");
      await client.query(
        `INSERT INTO system_settings (id, data, updated_at)
         VALUES ('default', $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(INITIAL_SETTINGS)]
      );
    });

    await recordAuditLog({
      actor: auth.admin.email,
      category: "System",
      action: "Baseline Studio Data Restored",
      ipAddress,
      details: `Restored baseline CMS, project, inquiry, and settings tables (${INITIAL_AUDIT_LOGS.length} reference log kept intact).`,
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported settings action." }, { status: 400 });
}
