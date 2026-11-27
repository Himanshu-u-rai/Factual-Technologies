'use client';

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Mail,
  Smartphone,
  X,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { ShowcaseImage } from "@/components/ui/EditorialMedia";
import { hydrateAdminStore } from "@/lib/admin-store";
import { invalidateSiteStore } from "@/lib/site-store";

type AuthStep =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "credentials_error"; message: string; needsVerification?: boolean }
  | { step: "locked_out"; remainingSeconds: number }
  | { step: "awaiting_2fa"; challengeToken: string; code: string }
  | { step: "2fa_error"; challengeToken: string; code: string; message: string };

function LoginStatusBanner() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";
  const reset = searchParams.get("reset") === "1";
  const reason = searchParams.get("reason");

  if (verified) {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
        <span>Email verified and one-time admin setup locked. Sign in to access your console.</span>
      </div>
    );
  }
  if (reset) {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
        <span>Password updated successfully. Sign in with your new password.</span>
      </div>
    );
  }
  if (reason === "timeout") {
    return (
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <span>Your previous session expired due to inactivity. Please sign in again.</span>
      </div>
    );
  }
  return null;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [auth, setAuth] = useState<AuthStep>({ step: "idle" });
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [hasPendingAdmin, setHasPendingAdmin] = useState(false);
  const [resendState, setResendState] = useState<{
    loading: boolean;
    message?: string;
    devUrl?: string;
  }>({ loading: false });
  const mountedRef = useRef(true);

  useEffect(() => {
    document.title = "Admin Sign In | Factual Technologies";
    mountedRef.current = true;

    const bootstrapAuthState = async () => {
      try {
        const [setupRes, rateRes] = await Promise.all([
          fetch("/api/auth/setup", { cache: "no-store" }),
          fetch("/api/auth/login", { cache: "no-store" }),
        ]);

        if (!mountedRef.current) return;

        if (setupRes.ok) {
          const setupData = (await setupRes.json()) as {
            initialized?: boolean;
            hasPendingAdmin?: boolean;
          };
          if (!setupData.initialized && !setupData.hasPendingAdmin) {
            router.replace("/admin/setup");
            return;
          }
          setHasPendingAdmin(Boolean(setupData.hasPendingAdmin));
        }

        if (rateRes.ok) {
          const rateData = (await rateRes.json()) as {
            isLocked?: boolean;
            remainingSeconds?: number;
          };
          if (rateData.isLocked && (rateData.remainingSeconds ?? 0) > 0) {
            setAuth({
              step: "locked_out",
              remainingSeconds: rateData.remainingSeconds!,
            });
          }
        }
      } catch (err) {
        console.error("Failed to check setup state:", err);
      } finally {
        if (mountedRef.current) setCheckingSetup(false);
      }
    };

    void bootstrapAuthState();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAuth((prev) =>
          prev.step === "awaiting_2fa" || prev.step === "2fa_error"
            ? { step: "idle" }
            : prev
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  // Countdown lockout seconds client-side while server enforces PostgreSQL timer
  useEffect(() => {
    if (auth.step !== "locked_out") return;
    const delayMs = auth.remainingSeconds <= 0 ? 0 : 1000;
    const timer = setTimeout(() => {
      setAuth((prev) =>
        prev.step === "locked_out"
          ? prev.remainingSeconds <= 1
            ? { step: "idle" }
            : { step: "locked_out", remainingSeconds: prev.remainingSeconds - 1 }
          : prev
      );
    }, delayMs);
    return () => clearTimeout(timer);
  }, [auth]);

  const handleResendVerification = async () => {
    if (resendState.loading) return;
    setResendState({ loading: true });
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        error?: string;
        devVerificationUrl?: string;
      };
      if (!res.ok) {
        setResendState({ loading: false, message: data.error || "Unable to resend verification link." });
        return;
      }
      setResendState({
        loading: false,
        message: `Verification link dispatched to ${data.email || "pending administrator"}.`,
        devUrl: data.devVerificationUrl,
      });
    } catch {
      setResendState({ loading: false, message: "Network error while resending verification." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.step === "locked_out") return;

    if (!email.trim() || !password.trim()) {
      setAuth({
        step: "credentials_error",
        message: "Please enter both your email and password.",
      });
      return;
    }

    setAuth({ step: "loading" });

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password,
          remember,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        remainingSeconds?: number;
        needsVerification?: boolean;
        requires2FA?: boolean;
        challengeToken?: string;
      };

      if (!mountedRef.current) return;

      if (res.status === 429 && (data.remainingSeconds ?? 0) > 0) {
        setAuth({
          step: "locked_out",
          remainingSeconds: data.remainingSeconds!,
        });
        return;
      }

      if (data.requires2FA && data.challengeToken) {
        setAuth({
          step: "awaiting_2fa",
          challengeToken: data.challengeToken,
          code: "",
        });
        return;
      }

      if (!res.ok) {
        setAuth({
          step: "credentials_error",
          message: data.error || "Invalid email or password.",
          needsVerification: Boolean(data.needsVerification),
        });
        return;
      }

      await hydrateAdminStore(true);
      invalidateSiteStore();
      router.push("/admin");
    } catch {
      if (mountedRef.current) {
        setAuth({
          step: "credentials_error",
          message: "Unable to complete sign in right now. Please try again.",
        });
      }
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auth.step !== "awaiting_2fa" && auth.step !== "2fa_error") return;

    const { challengeToken, code } = auth;
    if (!code.trim()) {
      setAuth({
        step: "2fa_error",
        challengeToken,
        code,
        message: "Please enter your 6-digit verification code.",
      });
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          challengeToken,
          totpCode: code.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        remainingSeconds?: number;
      };

      if (res.status === 429 && (data.remainingSeconds ?? 0) > 0) {
        setAuth({
          step: "locked_out",
          remainingSeconds: data.remainingSeconds!,
        });
        return;
      }

      if (!res.ok) {
        setAuth({
          step: "2fa_error",
          challengeToken,
          code,
          message: data.error || "Invalid verification code.",
        });
        return;
      }

      await hydrateAdminStore(true);
      invalidateSiteStore();
      router.push("/admin");
    } catch {
      setAuth({
        step: "2fa_error",
        challengeToken,
        code,
        message: "Network error verifying 2FA code.",
      });
    }
  };

  const is2FAOpen = auth.step === "awaiting_2fa" || auth.step === "2fa_error";
  const twoFactorCode = is2FAOpen ? auth.code : "";

  if (checkingSetup) {
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
              alt="Engineers collaborating at the studio desk"
              ratio="4/3"
            />
            <div className="space-y-2 max-w-md">
              <p className="text-base font-semibold text-slate-950">
                Factual Technologies Workspace
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Manage homepage content, engineering case studies, client inquiries, and site revision history from one PostgreSQL-backed console.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 lg:col-start-8 w-full max-w-md mx-auto lg:mx-0">
            <div className="border-t-2 border-slate-950 pt-8 space-y-6">
              <div className="space-y-2">
                <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                  Admin sign in
                </h1>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  Enter your administrator email and password to continue.
                </p>
              </div>

              <Suspense fallback={null}>
                <LoginStatusBanner />
              </Suspense>

              {hasPendingAdmin && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Administrator email verification pending</p>
                      <p className="text-amber-800 leading-relaxed">
                        Verify the initial administrator email address before signing in. Need a fresh link or want to register with a different email?
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendState.loading}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-full bg-amber-900 text-white font-medium hover:bg-amber-800 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {resendState.loading ? "Sending..." : "Resend verification"}
                    </button>
                    <Link
                      href="/admin/setup"
                      className="min-h-[36px] inline-flex items-center px-2 font-medium underline underline-offset-4 text-amber-900 hover:text-amber-950"
                    >
                      Restart setup
                    </Link>
                  </div>
                  {resendState.message && (
                    <p className="text-[11px] font-medium text-amber-950 pt-1">
                      {resendState.message}
                    </p>
                  )}
                  {resendState.devUrl && (
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200 space-y-1">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        Local Dev Verification Link
                      </span>
                      <a
                        href={resendState.devUrl}
                        className="text-xs font-medium text-blue-700 underline break-all"
                      >
                        {resendState.devUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {auth.step === "locked_out" && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Sign-in temporarily paused</p>
                    <p className="mt-0.5">
                      Too many failed attempts. Try again in{" "}
                      <span className="font-semibold tabular-nums">{auth.remainingSeconds}s</span>.
                    </p>
                  </div>
                </div>
              )}

              {auth.step === "credentials_error" && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{auth.message}</span>
                  </div>
                  {auth.needsVerification && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="text-xs font-semibold underline text-rose-800 cursor-pointer"
                    >
                      Resend verification email
                    </button>
                  )}
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
                    disabled={auth.step === "locked_out"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-1 transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                      Password
                    </label>
                    <Link
                      href="/admin/forgot-password"
                      className="text-xs font-medium text-slate-600 hover:text-slate-950 underline underline-offset-4"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    disabled={auth.step === "locked_out"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="min-h-[46px] rounded-xl bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-950 px-4 py-2.5 w-full text-base text-slate-950 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-1 transition-colors disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center pt-1">
                  <label className="min-h-[44px] flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-950 border-slate-300 focus:ring-slate-950 cursor-pointer"
                    />
                    <span className="text-sm text-slate-600">
                      Keep me signed in on this browser
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={auth.step === "loading" || auth.step === "locked_out"}
                  className="w-full min-h-[48px] rounded-full bg-slate-950 hover:bg-slate-800 active:bg-slate-900 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 cursor-pointer disabled:opacity-60"
                >
                  {auth.step === "loading" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </form>

              <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-200">
                Authenticator 2FA, session timeouts, and SMTP alerts can be managed from Platform Settings inside the console.
              </p>
            </div>
          </div>
        </div>
      </main>

      {is2FAOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-950 font-bold text-base">
                <Smartphone className="w-5 h-5 text-slate-900" />
                <span>Two-factor verification</span>
              </div>
              <button
                type="button"
                onClick={() => setAuth({ step: "idle" })}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer rounded-lg"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Enter the 6-digit code from your enrolled authenticator app.
            </p>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(e) =>
                    setAuth((prev) =>
                      prev.step === "awaiting_2fa" || prev.step === "2fa_error"
                        ? { ...prev, code: e.target.value }
                        : prev
                    )
                  }
                  placeholder="000000"
                  className="w-full min-h-[48px] text-center text-2xl font-mono tracking-widest rounded-xl border border-slate-300 bg-slate-50 text-slate-950 focus:border-slate-950 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                />
              </div>

              {auth.step === "2fa_error" && (
                <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{auth.message}</span>
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAuth({ step: "idle" })}
                  className="flex-1 min-h-[44px] rounded-full border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-full bg-slate-950 hover:bg-slate-800 text-white text-sm font-medium cursor-pointer"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
