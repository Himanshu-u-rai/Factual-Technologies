import "server-only";

import nodemailer from "nodemailer";
import { stripCrlf } from "@/lib/admin-types";
import { escapeHtml } from "@/lib/server/crypto";

export interface SmtpStatus {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  hasAuth: boolean;
}

export interface EmailSendResult {
  sent: boolean;
  deliveredVia: "smtp" | "dev_preview" | "error";
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

/** Resolves SMTP status from environment variables without ever returning passwords. */
export function getSmtpStatus(): SmtpStatus {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || "587") || 587;
  const secure = process.env.SMTP_SECURE === "true";
  const from = stripCrlf(
    process.env.SMTP_FROM || "Factual Technologies <noreply@factualtechnologies.example>"
  );
  const hasAuth = Boolean((process.env.SMTP_USER || "").trim() && (process.env.SMTP_PASS || "").trim());

  return {
    configured: host.length > 0,
    host,
    port,
    secure,
    from,
    hasAuth,
  };
}

/** Resolves the public origin used inside verification and password reset links. */
export function getAppOrigin(req?: Request): string {
  const configured = (process.env.APP_ORIGIN || "").trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (req) {
    const proto = (req.headers.get("x-forwarded-proto") || "http").replace(/[^a-z]/gi, "");
    const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const host = rawHost.replace(/[^a-zA-Z0-9.:-]/g, "");
    if (host) return `${proto || "http"}://${host}`;
  }
  return "http://localhost:3000";
}

/** Sends email via configured SMTP or logs a non-production dev preview when SMTP is unset. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  previewUrl?: string;
}): Promise<EmailSendResult> {
  const status = getSmtpStatus();
  const safeTo = stripCrlf(opts.to);
  const safeSubject = stripCrlf(opts.subject);

  if (!status.configured) {
    if (process.env.NODE_ENV === "production") {
      return {
        sent: false,
        deliveredVia: "error",
        error: "SMTP email transport is not configured on the server.",
      };
    }

    console.info(`[DEV EMAIL PREVIEW] To: ${safeTo} | Subject: ${safeSubject}`);
    return {
      sent: true,
      deliveredVia: "dev_preview",
      previewUrl: opts.previewUrl,
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: status.host,
      port: status.port,
      secure: status.secure,
      auth: status.hasAuth
        ? {
            user: process.env.SMTP_USER!.trim(),
            pass: process.env.SMTP_PASS!.trim(),
          }
        : undefined,
    });

    const info = await transporter.sendMail({
      from: status.from,
      to: safeTo,
      subject: safeSubject,
      text: opts.text,
      html: opts.html,
    });

    return {
      sent: true,
      deliveredVia: "smtp",
      messageId: info.messageId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to deliver email via SMTP.";
    console.error("SMTP send failed:", message);
    return {
      sent: false,
      deliveredVia: "error",
      error: process.env.NODE_ENV === "production" ? "SMTP relay delivery failed." : message,
    };
  }
}

export async function sendAdminVerificationEmail(
  to: string,
  name: string,
  verifyUrl: string
): Promise<EmailSendResult> {
  const safeName = escapeHtml(stripCrlf(name));
  const safeUrl = escapeHtml(verifyUrl);
  return sendEmail({
    to,
    subject: "Verify your Factual Technologies admin email",
    text: `Hi ${stripCrlf(name)},\n\nOpen this link within 30 minutes to verify your administrator email and unlock the console:\n${verifyUrl}\n`,
    html: `<p>Hi ${safeName},</p><p>Open this link within 30 minutes to verify your administrator email and finish console setup:</p><p><a href="${safeUrl}">${safeUrl}</a></p>`,
    previewUrl: verifyUrl,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<EmailSendResult> {
  const safeName = escapeHtml(stripCrlf(name));
  const safeUrl = escapeHtml(resetUrl);
  return sendEmail({
    to,
    subject: "Reset your Factual Technologies admin password",
    text: `Hi ${stripCrlf(name)},\n\nUse this single-use link within 15 minutes to set a new admin password:\n${resetUrl}\n\nIf you did not request this reset, you can ignore this email.\n`,
    html: `<p>Hi ${safeName},</p><p>Use this single-use link within 15 minutes to set a new admin password:</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>If you did not request this reset, you can ignore this email.</p>`,
    previewUrl: resetUrl,
  });
}

export async function sendInquiryAlertEmail(
  to: string,
  inquiry: {
    id: string;
    name: string;
    email: string;
    company: string;
    message: string;
  }
): Promise<EmailSendResult> {
  const status = getSmtpStatus();
  if (!status.configured) {
    return { sent: false, deliveredVia: "dev_preview" };
  }

  return sendEmail({
    to,
    subject: `New inquiry from ${stripCrlf(inquiry.name)} (${stripCrlf(inquiry.company)})`,
    text: `Inquiry ${inquiry.id}\nFrom: ${inquiry.name} <${inquiry.email}>\nCompany: ${inquiry.company}\n\n${inquiry.message}\n`,
    html: `<p><strong>Inquiry ${escapeHtml(inquiry.id)}</strong></p><p><strong>From:</strong> ${escapeHtml(
      inquiry.name
    )} (${escapeHtml(inquiry.email)})<br/><strong>Company:</strong> ${escapeHtml(
      inquiry.company
    )}</p><p>${escapeHtml(inquiry.message).replace(/\n/g, "<br/>")}</p>`,
  });
}
