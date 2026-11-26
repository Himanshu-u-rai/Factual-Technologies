'use client';

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Set New Password | Factual Technologies";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Reset token is missing from this link.");
      return;
    }
    if (password.length < 10) {
      setError("New password must be at least 10 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Unable to update password.");
        return;
      }
      router.push("/admin/login?reset=1");
    } catch {
      setError("Network error while resetting password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
          Set new password
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Choose a strong password for your administrator account. All prior active sessions will be signed out.
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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-slate-800">
            New Password <span className="text-xs font-normal text-slate-500">(10+ chars, upper/lower/number/symbol)</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="min-h-[46px] rounded-xl bg-white border border-slate-300 px-4 py-2.5 w-full text-base text-slate-950 focus:border-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-800">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="min-h-[46px] rounded-xl bg-white border border-slate-300 px-4 py-2.5 w-full text-base text-slate-950 focus:border-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[48px] rounded-full bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm cursor-pointer disabled:opacity-60"
        >
          {submitting ? "Updating password..." : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <div className="w-full max-w-md border-t-2 border-slate-950 pt-8">
          <Suspense
            fallback={
              <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
