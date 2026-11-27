'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from "react";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Key,
  Webhook,
  Mail,
  RotateCw,
  Save,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Sliders,
  Server,
  Activity,
  Lock,
  ExternalLink,
  Info,
  Clock,
  Download,
  AlertCircle,
  X,
  FileCheck2,
  Smartphone,
  Fingerprint,
  Timer,
  Unlock,
} from "lucide-react";
import {
  getSettings,
  updateSettings,
  resetDemoData,
  subscribe,
  SystemSettings,
  getRateLimitStatus,
  clearRateLimit,
  runSettingsAction,
  getSmtpStatusClient,
  getCurrentUser,
  SmtpStatusInfo,
} from "@/lib/admin-store";

type SettingsTab = "all" | "security" | "sla" | "webhooks" | "credentials" | "compliance" | "data";

type WebhookProbeState =
  | { status: "idle" }
  | { status: "probing"; url: string }
  | { status: "result"; url: string; result: { status: number; latency: number; message: string } };

type KeyActionState = "idle" | "saving" | "rotating";

const emptySubscribe = () => () => {};

export default function AdminSettingsPage() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State initialized from store
  const [slaThreshold, setSlaThreshold] = useState<number>(() => getSettings().slaThreshold);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => getSettings().webhookUrl);
  const [apiKeyPreview, setApiKeyPreview] = useState<string>(
    () => getSettings().apiKeyPreview || getSettings().apiKey || ""
  );
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [alertEmail, setAlertEmail] = useState<string>(() => getSettings().alertEmail);
  const [autoAssignEnabled, setAutoAssignEnabled] = useState<boolean>(
    () => getSettings().autoAssignEnabled
  );
  const [twoFactorRequired, setTwoFactorRequired] = useState<boolean>(
    () => getSettings().twoFactorRequired || false
  );
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(
    () => getSettings().sessionTimeoutMinutes || 30
  );
  const [complianceBadges, setComplianceBadges] = useState<SystemSettings["complianceBadges"]>(
    () => getSettings().complianceBadges
  );
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    isLocked: boolean;
    remainingSeconds: number;
    attempts: number;
  }>(() => getRateLimitStatus());

  // Baseline stored values to track unsaved dirty changes
  const [baselineSettings, setBaselineSettings] = useState<SystemSettings | null>(
    () => getSettings()
  );

  // UI Interactive States
  const [apiKeyCopied, setApiKeyCopied] = useState<boolean>(false);
  const [actionState, setActionState] = useState<KeyActionState>("idle");
  const [webhookProbe, setWebhookProbe] = useState<WebhookProbeState>({ status: "idle" });

  // Factory Reset Modal State
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmInput, setResetConfirmInput] = useState<string>("");

  // Real TOTP 2FA & SMTP Diagnostic States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(() =>
    Boolean(getCurrentUser().twoFactorEnabled)
  );
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [totpCodeInput, setTotpCodeInput] = useState<string>("");
  const [totpBusy, setTotpBusy] = useState<boolean>(false);

  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusInfo>(() => getSmtpStatusClient());
  const [smtpTestEmail, setSmtpTestEmail] = useState<string>(
    () => getCurrentUser().email || getSettings().alertEmail || ""
  );
  const [smtpTesting, setSmtpTesting] = useState<boolean>(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Track baseline without overwriting dirty user inputs on unrelated store notifications
  const hasUnsavedChangesRef = useRef(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rotateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const webhookTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSaving = actionState === "saving";
  const isRotatingKey = actionState === "rotating";
  const testingWebhook = webhookProbe.status === "probing";
  const webhookTestResult =
    webhookProbe.status === "result" && webhookProbe.url === webhookUrl
      ? webhookProbe.result
      : null;

  const clearPendingTimers = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    if (webhookTimerRef.current) clearTimeout(webhookTimerRef.current);
  }, []);

  useEffect(() => {
    document.title = "System Governance & Security Settings | Factual Console";
    const applyBaseline = (s: SystemSettings) => {
      setBaselineSettings(s);
      setSlaThreshold(s.slaThreshold);
      setWebhookUrl(s.webhookUrl);
      setApiKeyPreview(s.apiKeyPreview || s.apiKey || "");
      setAlertEmail(s.alertEmail);
      setAutoAssignEnabled(s.autoAssignEnabled);
      setTwoFactorRequired(s.twoFactorRequired || false);
      setSessionTimeoutMinutes(s.sessionTimeoutMinutes || 30);
      setComplianceBadges(s.complianceBadges);
    };

    const sync = () => {
      const s = getSettings();
      const user = getCurrentUser();
      setRateLimitStatus(getRateLimitStatus());
      setSmtpStatus(getSmtpStatusClient());
      setTwoFactorEnabled(Boolean(user.twoFactorEnabled));
      setSmtpTestEmail((prev) => prev || user.email || s.alertEmail || "");
      if (!hasUnsavedChangesRef.current) {
        applyBaseline(s);
      } else {
        setBaselineSettings(s);
      }
    };

    const unsub = subscribe(sync);
    return () => {
      unsub();
      clearPendingTimers();
    };
  }, [clearPendingTimers]);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Determine if there are unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    if (!baselineSettings) return false;
    return (
      slaThreshold !== baselineSettings.slaThreshold ||
      webhookUrl !== baselineSettings.webhookUrl ||
      alertEmail !== baselineSettings.alertEmail ||
      autoAssignEnabled !== baselineSettings.autoAssignEnabled ||
      twoFactorRequired !== baselineSettings.twoFactorRequired ||
      sessionTimeoutMinutes !== baselineSettings.sessionTimeoutMinutes
    );
  }, [
    baselineSettings,
    slaThreshold,
    webhookUrl,
    alertEmail,
    autoAssignEnabled,
    twoFactorRequired,
    sessionTimeoutMinutes,
  ]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // SLA Downtime calculation (at given threshold)
  const downtimeStats = useMemo(() => {
    const errorBudgetPercent = Math.max(0, 100 - slaThreshold);
    // Minutes per 30-day month = 30 * 24 * 60 = 43200 min
    const monthlyAllowedMin = (errorBudgetPercent / 100) * 43200;
    // Minutes per 365-day year = 365 * 24 * 60 = 525600 min
    const yearlyAllowedMin = (errorBudgetPercent / 100) * 525600;

    const formatMins = (mins: number) => {
      if (mins < 1) return `${Math.round(mins * 60)} seconds`;
      if (mins < 60) return `${mins.toFixed(1)} minutes`;
      const hours = (mins / 60).toFixed(1);
      return `${hours} hours`;
    };

    return {
      monthly: formatMins(monthlyAllowedMin),
      yearly: formatMins(yearlyAllowedMin),
    };
  }, [slaThreshold]);

  // Revert / Discard Unsaved Changes
  const handleDiscardChanges = () => {
    if (!baselineSettings) return;
    setSlaThreshold(baselineSettings.slaThreshold);
    setWebhookUrl(baselineSettings.webhookUrl);
    setAlertEmail(baselineSettings.alertEmail);
    setAutoAssignEnabled(baselineSettings.autoAssignEnabled);
    setTwoFactorRequired(baselineSettings.twoFactorRequired || false);
    setSessionTimeoutMinutes(baselineSettings.sessionTimeoutMinutes || 30);
    showToast("Reverted modifications to active baseline settings");
  };

  // Close reset modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showResetModal) {
        setShowResetModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResetModal]);

  // Save Settings handler
  const handleSaveSettings = async () => {
    if (actionState !== "idle") return;
    setActionState("saving");
    try {
      const res = await updateSettings({
        slaThreshold: Number(slaThreshold),
        webhookUrl,
        alertEmail,
        autoAssignEnabled,
        twoFactorRequired,
        sessionTimeoutMinutes: Number(sessionTimeoutMinutes),
      });
      if (!res.ok) {
        showToast(res.error || "Failed to save settings.");
        return;
      }
      hasUnsavedChangesRef.current = false;
      const saved = res.settings || getSettings();
      setBaselineSettings(saved);
      showToast("Settings saved to PostgreSQL.");
    } catch {
      showToast("Failed to save settings. Please try again.");
    } finally {
      setActionState("idle");
    }
  };

  // Clear Rate Limits handler
  const handleClearRateLimits = async () => {
    await clearRateLimit();
    setRateLimitStatus(getRateLimitStatus());
    showToast("Brute-force lockout counters cleared in PostgreSQL.");
  };

  // Copy Newly Generated API Key handler (available once at rotation time)
  const handleCopyKey = () => {
    if (!newlyGeneratedKey) return;
    navigator.clipboard.writeText(newlyGeneratedKey);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setApiKeyCopied(true);
    showToast("New API key copied to clipboard (it will not be shown again once dismissed).");
    copyTimerRef.current = setTimeout(() => setApiKeyCopied(false), 2500);
  };

  // Rotate API Key handler (server stores only SHA-256 hash; plaintext returned once)
  const handleRotateKey = async () => {
    if (actionState !== "idle") return;
    setActionState("rotating");
    try {
      const res = await runSettingsAction<{ newlyGeneratedKey?: string; settings?: SystemSettings }>({
        action: "generate_api_key",
      });
      if (!res.ok || !res.newlyGeneratedKey) {
        showToast(res.error || "Unable to rotate API key.");
        return;
      }
      setNewlyGeneratedKey(res.newlyGeneratedKey);
      const preview = res.settings?.apiKeyPreview || `${res.newlyGeneratedKey.slice(0, 12)}••••••••${res.newlyGeneratedKey.slice(-4)}`;
      setApiKeyPreview(preview);
      setBaselineSettings((prev) => (prev ? { ...prev, apiKey: "", apiKeyPreview: preview } : prev));
      showToast("New hashed API key generated. Copy it now before dismissing.");
    } finally {
      setActionState("idle");
    }
  };

  // Test Ping Webhook handler (real SSRF-checked server probe)
  const handleTestWebhook = async () => {
    if (webhookProbe.status === "probing") return;
    const targetUrl = webhookUrl.trim();
    setWebhookProbe({ status: "probing", url: targetUrl });

    const res = await runSettingsAction<{
      statusCode?: number;
      latencyMs?: number;
      error?: string;
    }>({
      action: "test_webhook",
      webhookUrl: targetUrl,
    });

    if (res.ok) {
      setWebhookProbe({
        status: "result",
        url: targetUrl,
        result: {
          status: res.statusCode || 200,
          latency: res.latencyMs || 0,
          message: `HTTP ${res.statusCode || 200} OK — Webhook endpoint acknowledged test event`,
        },
      });
      showToast(`Webhook responded (${res.latencyMs || 0}ms)`);
    } else {
      setWebhookProbe({
        status: "result",
        url: targetUrl,
        result: {
          status: res.statusCode || 400,
          latency: res.latencyMs || 0,
          message: res.error || "Webhook delivery failed.",
        },
      });
      showToast(res.error || "Webhook test failed");
    }
  };

  // Real TOTP 2FA Handlers
  const handleStartTotpSetup = async () => {
    setTotpBusy(true);
    try {
      const res = await runSettingsAction<{ secret?: string; otpAuthUri?: string }>({
        action: "setup_totp",
      });
      if (!res.ok || !res.secret || !res.otpAuthUri) {
        showToast(res.error || "Failed to initialize TOTP setup.");
        return;
      }
      setTotpSetup({ secret: res.secret, otpAuthUri: res.otpAuthUri });
      setTotpCodeInput("");
    } finally {
      setTotpBusy(false);
    }
  };

  const handleEnableTotp = async () => {
    if (!totpCodeInput.trim()) return;
    setTotpBusy(true);
    try {
      const res = await runSettingsAction<{ twoFactorEnabled?: boolean }>({
        action: "enable_totp",
        code: totpCodeInput.trim(),
      });
      if (!res.ok) {
        showToast(res.error || "Verification code did not match.");
        return;
      }
      setTwoFactorEnabled(true);
      setTwoFactorRequired(true);
      setTotpSetup(null);
      setTotpCodeInput("");
      const saved = getSettings();
      setBaselineSettings(saved);
      showToast("Authenticator TOTP 2FA enabled and enforced.");
    } finally {
      setTotpBusy(false);
    }
  };

  const handleDisableTotp = async () => {
    if (!totpCodeInput.trim()) {
      showToast("Enter a valid 6-digit authenticator code to disable 2FA.");
      return;
    }
    setTotpBusy(true);
    try {
      const res = await runSettingsAction({
        action: "disable_totp",
        code: totpCodeInput.trim(),
      });
      if (!res.ok) {
        showToast(res.error || "Invalid authenticator code.");
        return;
      }
      setTwoFactorEnabled(false);
      setTwoFactorRequired(false);
      setTotpSetup(null);
      setTotpCodeInput("");
      const saved = getSettings();
      setBaselineSettings(saved);
      showToast("TOTP 2FA disabled.");
    } finally {
      setTotpBusy(false);
    }
  };

  // SMTP Diagnostic Test Email Handler
  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    try {
      const res = await runSettingsAction<{
        result?: { deliveredVia: string; messageId?: string; previewUrl?: string };
        error?: string;
      }>({
        action: "test_smtp",
        targetEmail: smtpTestEmail.trim(),
      });

      if (!res.ok) {
        setSmtpTestResult({ ok: false, message: res.error || "SMTP delivery failed." });
        showToast(res.error || "SMTP test failed.");
        return;
      }

      const mode = res.result?.deliveredVia === "smtp" ? "real SMTP relay" : "local dev console preview";
      setSmtpTestResult({
        ok: true,
        message: `Test message processed via ${mode}${res.result?.messageId ? ` (${res.result.messageId})` : ""}.`,
      });
      showToast("SMTP diagnostic completed.");
    } finally {
      setSmtpTesting(false);
    }
  };

  // Factory Reset Handler
  const handleConfirmReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== "RESET") {
      return;
    }
    setActionState("idle");
    setWebhookProbe({ status: "idle" });
    hasUnsavedChangesRef.current = false;
    await resetDemoData();
    const s = getSettings();
    setBaselineSettings(s);
    setSlaThreshold(s.slaThreshold);
    setWebhookUrl(s.webhookUrl);
    setApiKeyPreview(s.apiKeyPreview || "");
    setNewlyGeneratedKey(null);
    setAlertEmail(s.alertEmail);
    setAutoAssignEnabled(s.autoAssignEnabled);
    setTwoFactorRequired(s.twoFactorRequired || false);
    setSessionTimeoutMinutes(s.sessionTimeoutMinutes || 30);
    setComplianceBadges(s.complianceBadges);
    setShowResetModal(false);
    setResetConfirmInput("");
    showToast("Baseline studio CMS, inquiries, and projects restored.");
  };

  if (!mounted || !baselineSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Loading System Configuration...
          </span>
        </div>
      </div>
    );
  }

  // Masked preview representation (server never returns plaintext secret keys after creation)
  const maskedDisplay = apiKeyPreview || "No active API key configured";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
        <div>
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Unsaved Changes
              </span>
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight font-display">
            Platform Settings
          </h1>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSaveSettings}
            disabled={!hasUnsavedChanges || isSaving}
            className={`min-h-[40px] px-5 py-2 rounded-xl font-semibold text-sm transition-all duration-150 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              hasUnsavedChanges
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs cursor-pointer"
                : "bg-slate-100 text-slate-400 border border-slate-200/70 cursor-not-allowed"
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-wrap gap-1.5">
        {[
          { id: "all", label: "All Settings", icon: SettingsIcon },
          { id: "security", label: "Session & 2FA Security", icon: Lock },
          { id: "sla", label: "SLA & Performance", icon: Sliders },
          { id: "webhooks", label: "Integrations & Webhooks", icon: Webhook },
          { id: "credentials", label: "API Credentials", icon: Key },
          { id: "compliance", label: "Compliance Standards", icon: ShieldCheck },
          { id: "data", label: "Environment & Data", icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Settings Cards Grid */}
      <div className="space-y-6">
        {/* CARD: Session Security, Two-Factor Authentication & Rate Limiting (SOC2) */}
        {(activeTab === "all" || activeTab === "security" || activeTab === "compliance") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Authentication, 2FA & Session Hardening
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Enforce two-factor hardware authentication, configure SOC2 inactivity logout timers, and govern brute-force defenses.
                  </p>
                </div>
              </div>

              {twoFactorRequired && twoFactorEnabled ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>TOTP 2FA Enforced</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                  <Smartphone className="w-4 h-4 text-slate-500" />
                  <span>{twoFactorEnabled ? "2FA Enrolled (Optional)" : "2FA Not Enrolled"}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Real TOTP 2FA & Inactivity Controls */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-slate-900">
                          Authenticator App 2FA (RFC 6238 TOTP)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {twoFactorEnabled
                          ? "TOTP two-factor verification is active for your administrator sign-in."
                          : "Enroll Google Authenticator, 1Password, or Bitwarden with a cryptographic shared secret before requiring 2FA."}
                      </p>
                    </div>

                    {!twoFactorEnabled && !totpSetup && (
                      <button
                        type="button"
                        disabled={totpBusy}
                        onClick={() => void handleStartTotpSetup()}
                        className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-60"
                      >
                        {totpBusy ? "Preparing..." : "Set up Authenticator"}
                      </button>
                    )}
                  </div>

                  {totpSetup && !twoFactorEnabled && (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                      <p className="font-semibold text-slate-900">
                        Step 1: Add this secret or otpauth URI to your authenticator app
                      </p>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] break-all select-all text-slate-900">
                        Secret: {totpSetup.secret}
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] break-all select-all text-slate-600">
                        {totpSetup.otpAuthUri}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="text"
                          maxLength={6}
                          inputMode="numeric"
                          value={totpCodeInput}
                          onChange={(e) => setTotpCodeInput(e.target.value)}
                          placeholder="Enter 6-digit code"
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-mono text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={totpBusy}
                          onClick={() => void handleEnableTotp()}
                          className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer disabled:opacity-60"
                        >
                          {totpBusy ? "Verifying..." : "Verify & Enable 2FA"}
                        </button>
                      </div>
                    </div>
                  )}

                  {twoFactorEnabled && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200/70">
                      <input
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                        value={totpCodeInput}
                        onChange={(e) => setTotpCodeInput(e.target.value)}
                        placeholder="6-digit TOTP code"
                        className="min-h-[40px] w-48 px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-950"
                      />
                      <button
                        type="button"
                        disabled={totpBusy}
                        onClick={() => void handleDisableTotp()}
                        className="min-h-[40px] px-4 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer disabled:opacity-60"
                      >
                        Disable 2FA
                      </button>
                    </div>
                  )}
                </div>

                {/* Session Idle Timeout */}
                <div className="space-y-3 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-blue-600" />
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Inactivity Auto-Logout Timeout
                      </label>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 tabular-nums">
                      {sessionTimeoutMinutes} Minutes
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    SOC2 Section 4.2 requires administrative sessions to automatically expire after idle periods. A 60-second warning modal triggers before automatic sign-out.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      { minutes: 15, label: "15 min (Strict SOC2)" },
                      { minutes: 30, label: "30 min (Standard)" },
                      { minutes: 60, label: "60 min (Extended)" },
                      { minutes: 120, label: "120 min (Max)" },
                    ].map((opt) => (
                      <button
                        key={opt.minutes}
                        type="button"
                        onClick={() => setSessionTimeoutMinutes(opt.minutes)}
                        className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                          sessionTimeoutMinutes === opt.minutes
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Brute-Force Rate Limiter & Token Info */}
              <div className="lg:col-span-5 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Brute-Force Guard Telemetry</span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">5-attempt threshold</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Failed Attempts</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {rateLimitStatus.attempts} / 5
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          rateLimitStatus.attempts >= 4
                            ? "bg-rose-500"
                            : rateLimitStatus.attempts >= 2
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, (rateLimitStatus.attempts / 5) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block">Lockout State</span>
                      {rateLimitStatus.isLocked ? (
                        <span className="font-mono text-xs font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Locked ({rateLimitStatus.remainingSeconds}s remaining)</span>
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Clear & Operational</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleClearRateLimits}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      title="Reset failed login count and clear any IP locks"
                    >
                      <Unlock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset Locks</span>
                    </button>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                    <span className="text-slate-500 block">Session Cryptography</span>
                    <span className="font-mono text-[11px] text-slate-700 block truncate">
                      HMAC-SHA256 HttpOnly Cookie + PostgreSQL Session Store
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* CARD A: SLA & Performance Governance */}
        {(activeTab === "all" || activeTab === "sla") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-950">
                    SLA &amp; Performance
                  </h2>
                </div>
              </div>

              {/* Real-time SLA Status Pill */}
              <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold">
                <span className="tabular-nums">Target SLA: {slaThreshold.toFixed(2)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Slider and Input */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="sla-slider"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                    >
                      Availability SLA Baseline Target
                    </label>
                    <span className="tabular-nums text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200/70">
                      {Number(slaThreshold).toFixed(2)}%
                    </span>
                  </div>

                  {/* Range Slider */}
                  <input
                    id="sla-slider"
                    type="range"
                    min="99.00"
                    max="99.99"
                    step="0.01"
                    value={slaThreshold}
                    onChange={(e) => setSlaThreshold(parseFloat(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  />

                  <div className="flex justify-between text-xs text-slate-500 tabular-nums pt-1">
                    <span>99.00% (Three Nines)</span>
                    <span>99.90%</span>
                    <span>99.99% Target</span>
                  </div>
                </div>

                {/* Direct Number Input */}
                <div className="space-y-1">
                  <label
                    htmlFor="sla-number-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Exact SLA Threshold Percentage
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      id="sla-number-input"
                      type="number"
                      min="90"
                      max="100"
                      step="0.01"
                      value={slaThreshold}
                      onChange={(e) => setSlaThreshold(parseFloat(e.target.value) || 99.0)}
                      className="w-full min-h-[44px] pl-3.5 pr-8 py-2 text-base rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-900 font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Error Budget & Downtime Metric Card */}
              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/70 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Calculated Allowable Downtime Budget</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                    <span className="text-slate-500 block mb-1">Monthly Budget</span>
                    <span className="text-base font-bold text-slate-950 tabular-nums block">
                      {downtimeStats.monthly}
                    </span>
                    <span className="text-[10px] text-slate-500">per 30 rolling days</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs">
                    <span className="text-slate-500 block mb-1">Yearly Budget</span>
                    <span className="text-base font-bold text-slate-950 tabular-nums block">
                      {downtimeStats.yearly}
                    </span>
                    <span className="text-[10px] text-slate-500">per 365 days</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Breaching this threshold automatically triggers high-priority PagerDuty alerts and initiates an automated multi-region failover routine.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CARD B: Integrations & Webhooks */}
        {(activeTab === "all" || activeTab === "webhooks") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Webhooks &amp; Integrations
                </h2>
              </div>
            </div>

            <div className="space-y-5">
              {/* CRM Webhook URL */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="webhook-url-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Enterprise CRM Webhook Ingestion Endpoint
                  </label>
                  <span className="text-xs text-slate-500 font-mono">POST JSON payload</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="webhook-url-input"
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://api.factualtechnologies.com/webhooks/crm-sync"
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-base font-mono rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !webhookUrl}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  >
                    <RotateCw className={`w-4 h-4 ${testingWebhook ? "animate-spin text-blue-600" : ""}`} />
                    <span>{testingWebhook ? "Pinging..." : "Test Ping Webhook"}</span>
                  </button>
                </div>

                {/* Webhook test feedback */}
                {webhookTestResult && (
                  <div
                    className={`mt-2 p-3 border rounded-xl text-xs flex items-start gap-2.5 ${
                      webhookTestResult.status >= 200 && webhookTestResult.status < 400
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {webhookTestResult.status >= 200 && webhookTestResult.status < 400 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <span className="font-semibold">{webhookTestResult.message}</span>
                      <span className="block font-mono text-[11px] opacity-80">
                        Response time: {webhookTestResult.latency}ms
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Auto-assign leads toggle */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-0.5 max-w-xl">
                  <label
                    htmlFor="auto-assign-toggle"
                    className="text-sm font-semibold text-slate-900 block"
                  >
                    Automatic Architect Lead Assignment
                  </label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Automatically route incoming prospect inquiries to engineering leads upon intake.
                  </p>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  id="auto-assign-toggle"
                  type="button"
                  role="switch"
                  aria-checked={autoAssignEnabled}
                  onClick={() => setAutoAssignEnabled(!autoAssignEnabled)}
                  className={`relative inline-flex min-h-[44px] w-14 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer shrink-0 ${
                    autoAssignEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                      autoAssignEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Operational Alert Email */}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label
                  htmlFor="alert-email-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Inbound Inquiry &amp; Operational Alert Email
                </label>
                <div className="relative max-w-lg">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="alert-email-input"
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="ops-leadership@factualtechnologies.com"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-base rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  When configured with SMTP, new /contact form submissions email this address immediately.
                </p>
              </div>

              {/* Real SMTP Status & Diagnostic Test Send */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    SMTP Mailer Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      smtpStatus.configured
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {smtpStatus.configured
                      ? `Connected: ${smtpStatus.host}:${smtpStatus.port}`
                      : "SMTP_HOST unset (Local Dev Preview)"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="email"
                    value={smtpTestEmail}
                    onChange={(e) => setSmtpTestEmail(e.target.value)}
                    placeholder="Recipient address for test email"
                    className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    disabled={smtpTesting || !smtpTestEmail.trim()}
                    onClick={() => void handleTestSmtp()}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>{smtpTesting ? "Sending..." : "Send Test Email"}</span>
                  </button>
                </div>

                {smtpTestResult && (
                  <p
                    className={`text-xs font-medium ${
                      smtpTestResult.ok ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {smtpTestResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CARD C: Enterprise API Credentials */}
        {(activeTab === "all" || activeTab === "credentials") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  API Credentials
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Production Secret Key (Hashed at Rest)
                  </label>
                  <span className="text-xs text-emerald-700 font-semibold">
                    {apiKeyPreview ? "Status: Active (SHA-256 Stored)" : "Status: Not Generated"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <div className="min-h-[44px] px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200/70 bg-slate-50 text-slate-700 flex items-center justify-between">
                      <span>{maskedDisplay}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Write-only</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRotateKey}
                      disabled={isRotatingKey}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRotatingKey ? "animate-spin" : ""}`} />
                      <span>{isRotatingKey ? "Rotating..." : apiKeyPreview ? "Rotate Key" : "Generate Key"}</span>
                    </button>
                  </div>
                </div>

                {newlyGeneratedKey && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-950">
                        Copy Your New API Key Now — Displayed Once Only
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewlyGeneratedKey(null)}
                        className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-emerald-200 font-mono text-xs text-slate-900 break-all select-all">
                        {newlyGeneratedKey}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="min-h-[40px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {apiKeyCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Secret</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Secret keys are stored strictly as SHA-256 digests in PostgreSQL and cannot be retrieved after generation. Rotating immediately invalidates any prior key.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARD D: Compliance & Security Standards */}
        {(activeTab === "all" || activeTab === "compliance") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Compliance & Security Standards
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Continuous regulatory verification, external auditor attestations, and compliance certifications.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Audited & Certified (100% Pass)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {complianceBadges.map((badge) => (
                <div
                  key={badge.code}
                  className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/70 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                        {badge.code}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                        {badge.name}
                      </h3>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100/70 text-emerald-800">
                      {badge.status}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Audit: {badge.auditDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>External Trust Report & SOC2 Type II Security Package available for enterprise review.</span>
              </div>
              <button
                onClick={() => showToast("Requesting auditor sign-off dossier download...")}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        )}

        {/* CARD E: Environment & Data Controls */}
        {(activeTab === "all" || activeTab === "data") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Environment & Data Controls
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Sandbox management, mock data synchronization, and factory state resets.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <h3 className="text-sm font-bold text-rose-950">
                  Restore Factory Demo Baseline
                </h3>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Permanently resets all modified inbound CRM inquiries, case studies, security audit events, and settings back to default factory enterprise mock data.
                </p>
              </div>

              <button
                onClick={() => {
                  setResetConfirmInput("");
                  setShowResetModal(true);
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-100/80 text-rose-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                <RefreshCcw className="w-4 h-4 text-rose-600" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Factory Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                aria-label="Close reset confirmation modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-950">
                Confirm Factory Data Reset
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will wipe any changes made to inquiries, case studies, and configuration in browser storage and restore the baseline enterprise demo data.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="reset-confirm-input"
                className="block text-xs font-medium text-slate-700"
              >
                Type <span className="font-mono font-bold text-rose-600">RESET</span> to proceed:
              </label>
              <input
                id="reset-confirm-input"
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="RESET"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200/70 bg-slate-50 text-slate-900 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowResetModal(false)}
                className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={resetConfirmInput.trim().toUpperCase() !== "RESET"}
                className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:outline-none"
              >
                Confirm Factory Reset
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. Floating Unsaved Changes Notification Dock (Solid high-contrast surface) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 inset-x-4 sm:inset-x-auto sm:right-6 sm:left-auto z-40 flex items-center justify-between sm:justify-start gap-4 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 max-w-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold truncate text-slate-200">
              Unsaved governance modifications
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving..." : "Save Now"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
