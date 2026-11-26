'use client';

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import Logo from "@/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    message: string;
    devResetUrl?: string;
  } | null>(null);

  useEffect(() => {
    document.title = "Forgot Password | Factual Technologies";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your administrator email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        devResetUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Unable to request password reset.");
        return;
      }
      setResult({
        message:
          data.message ||
          "If an account matches that email address, a password reset link has been sent.",
        devResetUrl: data.devResetUrl,
      });
    } catch {
      setError("Network error requesting password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans admin-scope">
      <header className="w-full border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 py-4 sm:py-5 flex items-center justify-between gap-4">
          <Link href="/" className="p-1 rounded-lg">
            <Logo size="md" variant="light" />
          </Link>
          <Link
            href="/admin/login"
            className="min-h-[44px] inline-flex items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-950 underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full max-w-md border-t-2 border-slate-950 pt-8 space-y-6">
          {!result ? (
            <>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
                  Reset password
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Enter your verified administrator email address to receive a single-use 15-minute reset link.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-800">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="min-h-[46px] rounded-xl bg-white border border-slate-300 px-4 py-2.5 w-full text-base text-slate-950 focus:border-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[48px] rounded-full bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Sending reset link..." : "Send password reset link"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950">
                  Check your inbox
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">{result.message}</p>
              </div>

              {result.devResetUrl && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Local Development Reset Link</span>
                  </div>
                  <a
                    href={result.devResetUrl}
                    className="block text-xs font-mono text-blue-700 underline break-all"
                  >
                    {result.devResetUrl}
                  </a>
                </div>
              )}

              <Link
                href="/admin/login"
                className="min-h-[44px] inline-flex items-center text-sm font-medium text-slate-700 hover:text-slate-950 underline underline-offset-4"
              >
                Return to sign in
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
