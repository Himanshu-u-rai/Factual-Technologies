import { NextResponse } from "next/server";
import { ARCHITECTS, InquiryPriority, sanitizeInput, stripCrlf } from "@/lib/admin-types";
import { getServerSettings } from "@/lib/server/auth";
import { getClientIp } from "@/lib/server/crypto";
import { dbQuery, recordAuditLog } from "@/lib/server/db";
import { sendInquiryAlertEmail } from "@/lib/server/mailer";
import { enforceFixedWindowRateLimit } from "@/lib/server/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Public contact form submission endpoint backed by PostgreSQL + rate limit + optional SMTP alerts. */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Unsupported Content-Type." }, { status: 415 });
    }

    const ip = getClientIp(req);
    const limit = await enforceFixedWindowRateLimit(`inquiries:ip:${ip}`, 5, 600);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many inquiry submissions. Try again in ${limit.remainingSeconds} seconds.` },
        { status: 429, headers: { "Retry-After": String(limit.remainingSeconds) } }
      );
    }

    const body = (await req.json().catch(() => null)) as {
      name?: string;
      email?: string;
      company?: string;
      message?: string;
      priority?: string;
      tags?: string[];
      estimatedValue?: string;
    } | null;

    const name = stripCrlf(sanitizeInput(typeof body?.name === "string" ? body.name : ""));
    const email = stripCrlf(sanitizeInput(typeof body?.email === "string" ? body.email : "")).toLowerCase();
    const company = stripCrlf(sanitizeInput(typeof body?.company === "string" ? body.company : "")) || "Direct Inquiry";
    const message = sanitizeInput(typeof body?.message === "string" ? body.message : "").trim();

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Please provide your full name (minimum 2 characters)." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email) || email.length > 160) {
      return NextResponse.json(
        { error: "Please enter a valid work email address." },
        { status: 400 }
      );
    }
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Please share at least 10 characters about your project." },
        { status: 400 }
      );
    }

    const settings = await getServerSettings();
    const id = `INQ-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}-${String(
      Date.now()
    ).slice(-4)}`;
    const priority: InquiryPriority =
      body?.priority === "Critical" || body?.priority === "High" ? body.priority : "Normal";
    const assignedArchitect = settings.autoAssignEnabled
      ? ARCHITECTS[Math.floor(Math.random() * ARCHITECTS.length)].name
      : null;

    const cleanTags = Array.isArray(body?.tags)
      ? body.tags.map((t) => sanitizeInput(String(t)).slice(0, 40)).filter(Boolean)
      : [];

    await dbQuery(
      `INSERT INTO inquiries (id, name, email, company, message, status, priority, assigned_architect, estimated_value, tags, notes, read)
       VALUES ($1, $2, $3, $4, $5, 'New', $6, $7, $8, $9::jsonb, '[]'::jsonb, false)`,
      [
        id,
        name.slice(0, 120),
        email.slice(0, 160),
        company.slice(0, 160),
        message.slice(0, 5000),
        priority,
        assignedArchitect,
        body?.estimatedValue ? sanitizeInput(body.estimatedValue).slice(0, 60) : null,
        JSON.stringify(cleanTags),
      ]
    );

    const ipAddress = getClientIp(req);
    await recordAuditLog({
      actor: "Public Intake",
      category: "Inquiry",
      action: "Inbound Lead Captured",
      ipAddress,
      details: `Received inquiry ${id} from ${name} (${company}).`,
    });

    if (settings.alertEmail && EMAIL_RE.test(settings.alertEmail)) {
      void sendInquiryAlertEmail(settings.alertEmail, {
        id,
        name,
        email,
        company,
        message,
      });
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    console.error("Public inquiry submission failed:", err);
    return NextResponse.json(
      { error: "Unable to record your inquiry right now." },
      { status: 500 }
    );
  }
}
