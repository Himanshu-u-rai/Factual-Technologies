'use client';

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import Logo from "@/components/ui/Logo";

type VerifyState =
  | { status: "verifying" }
  | { status: "verified"; email: string; name: string }
  | { status: "error"; message: string };

const verificationCache = new Map<string, Promise<VerifyState>>();

function verifyTokenOnce(token: string): Promise<VerifyState> {
  const cached = verificationCache.get(token);
  if (cached) return cached;

  const promise = (async (): Promise<VerifyState> => {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        name?: string;
        error?: string;
      };
      if (!res.ok) {
        return {
          status: "error",
          message: data.error || "Verification link is invalid or has expired.",
        };
      }
      return {
        status: "verified",
        email: data.email || "",
        name: data.name || "Administrator",
      };
    } catch {
      return {
        status: "error",
        message: "Network error while verifying email.",
      };
    }
  })();

  verificationCache.set(token, promise);
  return promise;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<VerifyState>({ status: "verifying" });

  const [resendEmail, setResendEmail] = useState("");
  const [resendInfo, setResendInfo] = useState<{
    loading: boolean;
    message?: string;
    devUrl?: string;
  }>({ loading: false });

  useEffect(() => {
    document.title = "Verify Admin Email | Factual Technologies";
    let active = true;

    const runVerification = async () => {
      if (!token) {
        if (active) {
          setState({
            status: "error",
            message: "No verification token was provided in this link.",
          });
        }
        return;
      }

      const outcome = await verifyTokenOnce(token);
      if (active) {
        setState(outcome);
      }
    };

    void runVerification();
    return () => {
      active = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendInfo({ loading: true });
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() || undefined }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        error?: string;
        devVerificationUrl?: string;
      };
      if (!res.ok) {
        setResendInfo({
          loading: false,
          message: data.error || "Unable to send a new verification link.",
        });
        return;
      }
      setResendInfo({
        loading: false,
        message: `New verification link issued for ${data.email || "pending account"}.`,
        devUrl: data.devVerificationUrl,
      });
    } catch {
      setResendInfo({ loading: false, message: "Network error sending verification link." });
    }
  };

  if (state.status === "verifying") {
    return (
      <div className="space-y-4">
        <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <h1 className="font-display text-2xl font-bold text-slate-950">Verifying email...</h1>
        <p className="text-sm text-slate-600">
          Confirming your single-use administrator token with PostgreSQL.
        </p>
      </div>
    );
  }

  if (state.status === "verified") {
    return (
      <div className="space-y-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
            Email verified
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Welcome, <span className="font-semibold text-slate-950">{state.name}</span>. Your account{" "}
            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{state.email}</span> is active, and initial server setup is now permanently locked.
          </p>
        </div>

        <Link
          href="/admin/login?verified=1"
          className="w-full min-h-[48px] rounded-full bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm inline-flex items-center justify-center transition-colors"
        >
          Continue to Admin Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-950">
          Verification link failed
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">{state.message}</p>
      </div>

      <form onSubmit={handleResend} className="space-y-4 pt-2 border-t border-slate-200">
        <div className="space-y-1.5">
          <label htmlFor="resend-email" className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span>Request a fresh verification email</span>
          </label>
          <input
            id="resend-email"
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="name@company.com"
            className="min-h-[46px] rounded-xl bg-white border border-slate-300 px-4 py-2.5 w-full text-base text-slate-950 focus:border-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          />
        </div>

        <button
          type="submit"
          disabled={resendInfo.loading}
          className="w-full min-h-[46px] rounded-full bg-slate-950 hover:bg-slate-800 text-white font-medium text-sm cursor-pointer disabled:opacity-60"
        >
          {resendInfo.loading ? "Sending..." : "Send new verification link"}
        </button>

        {resendInfo.message && (
          <p className="text-xs font-medium text-slate-700">{resendInfo.message}</p>
        )}
        {resendInfo.devUrl && (
          <a href={resendInfo.devUrl} className="block text-xs font-mono text-blue-700 underline break-all">
            {resendInfo.devUrl}
          </a>
        )}
      </form>
    </div>
  );
}

export default function VerifyEmailPage() {
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
            Admin Sign In
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
            <VerifyEmailContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
