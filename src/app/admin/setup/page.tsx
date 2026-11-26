'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, KeyRound, Mail } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";

export default function AdminSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [requiresSetupToken, setRequiresSetupToken] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupToken, setSetupToken] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    email: string;
    deliveredVia: string;
    devVerificationUrl?: string;
  } | null>(null);

  useEffect(() => {
    document.title = "One-Time Admin Setup | Factual Technologies";
    let active = true;

    const loadState = async () => {
      try {
        const res = await fetch("/api/auth/setup", { cache: "no-store" });
        if (!active) return;
        if (!res.ok) {
          setError("Unable to reach the PostgreSQL setup service.");
          setChecking(false);
          return;
        }
        const data = (await res.json()) as {
          initialized?: boolean;
          setupLocked?: boolean;
          requiresSetupToken?: boolean;
          smtpConfigured?: boolean;
        };
        if (data.setupLocked || data.initialized) {
          router.replace("/admin/login");
          return;
        }
        setRequiresSetupToken(Boolean(data.requiresSetupToken));
        setSmtpConfigured(Boolean(data.smtpConfigured));
      } catch {
        if (active) setError("Network error while checking setup state.");
      } finally {
        if (active) setChecking(false);
      }
    };

    void loadState();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (!email.trim()) {
      setError("Work email is required.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (requiresSetupToken && !setupToken.trim()) {
      setError("Bootstrap setup token is required on this server.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          setupToken: setupToken.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        deliveredVia?: string;
        devVerificationUrl?: string;
        error?: string;
      };

      if (res.status === 403 && data.error?.includes("already complete")) {
        router.replace("/admin/login");
        return;
      }

      if (!res.ok) {
        setError(data.error || "Unable to complete administrator setup.");
        return;
      }

      setSubmittedResult({
        email: data.email || email.trim(),
        deliveredVia: data.deliveredVia || "smtp",
        devVerificationUrl: data.devVerificationUrl,
      });
    } catch {
      setError("Network error submitting administrator setup.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!submittedResult) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedResult.email }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        deliveredVia?: string;
        devVerificationUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Failed to resend verification email.");
        return;
      }
      setSubmittedResult({
        email: submittedResult.email,
        deliveredVia: data.deliveredVia || submittedResult.deliveredVia,
        devVerificationUrl: data.devVerificationUrl || submittedResult.devVerificationUrl,
      });
    } catch {
      setError("Network error resending verification link.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans admin-scope">
      <header className="w-full border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
          >
            <Logo size="md" variant="light" />
          </Link>

          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-950 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            Back to website
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="hidden lg:block lg:col-span-6 space-y-6">
            <ShowcaseImage
              src="/images/engineering-pair.jpg"
              alt="Engineers setting up production infrastructure"
              ratio="4/3"
            />
            <div className="space-y-2 max-w-md">
              <p className="text-base font-semibold text-slate-950">
                One-time administrator bootstrap
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                This registration screen unlocks only when PostgreSQL has zero verified admins. After email verification, setup closes permanently.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 w-full max-w-md mx-auto lg:mx-0">
            <div className="border-t-2 border-slate-950 pt-8 space-y-6">
              {!submittedResult ? (
                <>
                  <div className="space-y-2">
                    <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                      Create initial admin
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                      Register the first verified administrator account for Factual Technologies.
                    </p>
                  </div>

                  {!smtpConfigured && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      Local preview email mode active (<code className="font-mono">SMTP_HOST</code> unset). A clickable verification link will appear here after registration.
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {requiresSetupToken && (
                      <div className="space-y-1.5">
                        <label
                          htmlFor="setupToken"
                          className="flex items-center gap-1.5 text-sm font-medium text-slate-800"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                          <span>Bootstrap Setup Token</span>
                        </label>
                        <input
                          id="setupToken"
                          type="password"
                          required
                          value={setupToken}
                          onChange={(e) => setSetupToken(e.target.value)}
                          placeholder="Paste SETUP_TOKEN from server .env"
                          className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 transition-colors"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="name" className="block text-sm font-medium text-slate-800">
                        Full Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-sm font-medium text-slate-800">
                        Work Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                        Password <span className="text-xs font-normal text-slate-500">(10+ chars, upper/lower/number/symbol)</span>
                      </label>
                      <input
                        id="password"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose a strong password"
                        className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-800">
                        Confirm Password
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full min-h-[48px] rounded-full bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60 mt-2"
                    >
                      {submitting ? "Creating account..." : "Create administrator & send link"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                      Verify your email
                    </h1>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      We prepared a 30-minute verification link for{" "}
                      <span className="font-semibold text-slate-950">{submittedResult.email}</span>.
                      Opening the link verifies your account and locks this setup route.
                    </p>
                  </div>

                  {submittedResult.devVerificationUrl && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Local Development Verification Link</span>
                      </div>
                      <a
                        href={submittedResult.devVerificationUrl}
                        className="block text-xs font-mono text-blue-700 underline break-all"
                      >
                        {submittedResult.devVerificationUrl}
                      </a>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {error}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={submitting}
                      className="min-h-[44px] px-5 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-800 hover:bg-slate-50 cursor-pointer disabled:opacity-60"
                    >
                      {submitting ? "Resending..." : "Resend email"}
                    </button>
                    <Link
                      href="/admin/login"
                      className="min-h-[44px] inline-flex items-center px-4 text-sm font-medium text-slate-600 hover:text-slate-950 underline underline-offset-4"
                    >
                      Go to sign in
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
