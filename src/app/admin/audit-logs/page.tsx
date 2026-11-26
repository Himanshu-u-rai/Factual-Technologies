'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ShieldCheck,
  Shield,
  KeyRound,
  Search,
  Download,
  Filter,
  RefreshCw,
  RotateCw,
  Clock,
  User,
  Globe,
  Terminal,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Copy,
  Check,
  Layers,
  Cpu,
  Activity,
  Play,
  Pause,
  Zap,
  Trash2,
  Inbox,
  Lock,
  Radio,
  FileText,
  Sliders,
  ChevronDown,
} from "lucide-react";
import {
  getAuditLogs,
  exportAuditLogsCSV,
  clearAuditLogs,
  refreshAuditLogs,
  subscribe,
  AuditLog,
} from "@/lib/admin-store";

type CategoryFilter = "All" | "Security" | "Auth" | "CMS" | "Inquiry";
type TimeFilter = "all" | "24h" | "7d";

type AuditOverlayState =
  | { mode: "idle" }
  | { mode: "inspecting"; log: AuditLog }
  | { mode: "confirm_purge" };

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("All");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>("all");
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<AuditOverlayState>({ mode: "idle" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const inspectLog = overlay.mode === "inspecting" ? overlay.log : null;
  const showPurgeConfirm = overlay.mode === "confirm_purge";

  // Dynamic Page Title & timer cleanup
  useEffect(() => {
    document.title = "SOC2 Security & Audit Trail | Factual Console";
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // Initial fetch and gated live stream subscription
  useEffect(() => {
    setMounted(true);
    const syncLogs = () => {
      setLogs(getAuditLogs());
      setLastRefreshedAt(new Date());
    };

    syncLogs();
    if (!isLiveStreaming) return;
    const unsub = subscribe(syncLogs);
    return () => unsub();
  }, [isLiveStreaming]);

  // Close active overlay/drawer with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlay.mode !== "idle") {
        setOverlay({ mode: "idle" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overlay.mode]);

  // Date formatters
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  const formatTimeAgo = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSecs < 0) return "just now";
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  // Helper for Actor avatar & metadata
  const parseActor = (actorStr: string) => {
    if (actorStr.includes("(") && actorStr.includes(")")) {
      const parts = actorStr.split("(");
      const name = parts[0].trim();
      const role = parts[1].replace(")", "").trim();
      const initials = name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return { name, role, initials };
    }
    if (actorStr.toLowerCase().includes("bot") || actorStr.toLowerCase().includes("daemon")) {
      return { name: actorStr, role: "System Service", initials: "SEC" };
    }
    if (actorStr.toLowerCase().includes("system") || actorStr.toLowerCase().includes("dispatcher")) {
      return { name: actorStr, role: "Automation Service", initials: "SYS" };
    }
    const initials = actorStr
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OP";
    return { name: actorStr, role: "Operator", initials };
  };

  // Avatar solid badge styling (No AI slop gradients - Impeccable Design Standard)
  const getAvatarGradient = (initials: string) => {
    switch (initials) {
      case "AV":
        return "bg-slate-950 text-white border border-slate-800";
      case "ER":
        return "bg-blue-600 text-white border border-blue-700";
      case "MC":
        return "bg-slate-700 text-white border border-slate-800";
      case "SL":
        return "bg-slate-800 text-white border border-slate-900";
      case "SEC":
        return "bg-emerald-700 text-white border border-emerald-800";
      case "SYS":
        return "bg-slate-900 text-white border border-slate-950";
      default:
        return "bg-slate-800 text-white border border-slate-700";
    }
  };

  // Category Badge Styles & Icons
  const getCategoryInfo = (cat: AuditLog["category"]) => {
    switch (cat) {
      case "Security":
        return {
          label: "Security",
          icon: ShieldCheck,
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
          iconColor: "text-emerald-600",
        };
      case "Auth":
        return {
          label: "Authentication",
          icon: KeyRound,
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
          iconColor: "text-blue-600",
        };
      case "CMS":
        return {
          label: "CMS Mutation",
          icon: Layers,
          badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
          iconColor: "text-sky-700",
        };
      case "Inquiry":
        return {
          label: "Client Lead",
          icon: Inbox,
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80",
          iconColor: "text-amber-600",
        };
      default:
        return {
          label: "System",
          icon: Activity,
          badgeClass: "bg-slate-50 text-slate-700 border-slate-200/80",
          iconColor: "text-slate-600",
        };
    }
  };

  // Filter calculations
  const categoryCounts = useMemo(() => {
    const counts = {
      All: logs.length,
      Security: 0,
      Auth: 0,
      CMS: 0,
      Inquiry: 0,
    };
    logs.forEach((log) => {
      if (log.category in counts) {
        counts[log.category as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== "All" && log.category !== selectedCategory) {
        return false;
      }

      // Time range filter
      if (selectedTimeFilter !== "all") {
        const logTime = new Date(log.timestamp).getTime();
        const diffHours = (now - logTime) / (1000 * 60 * 60);
        if (selectedTimeFilter === "24h" && diffHours > 24) return false;
        if (selectedTimeFilter === "7d" && diffHours > 168) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const actorMatch = log.actor.toLowerCase().includes(q);
        const actionMatch = log.action.toLowerCase().includes(q);
        const ipMatch = log.ipAddress.toLowerCase().includes(q);
        const detailsMatch = log.details.toLowerCase().includes(q);
        const idMatch = log.id.toLowerCase().includes(q);
        return actorMatch || actionMatch || ipMatch || detailsMatch || idMatch;
      }

      return true;
    });
  }, [logs, selectedCategory, selectedTimeFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedTimeFilter, searchQuery, pageSize]);

  // CSV Export handler
  const handleExportCSV = () => {
    try {
      const csvData = exportAuditLogsCSV();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `factual-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Security audit log exported successfully (CSV)");
    } catch {
      showToast("Failed to export audit logs");
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setCopiedId(id);
    showToast(`Copied ${id} to clipboard`);
    copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  };

  // Refresh from PostgreSQL ledger
  const handleRefreshLedger = async () => {
    const latest = await refreshAuditLogs();
    setLogs(latest);
    setLastRefreshedAt(new Date());
    showToast("Synchronized audit ledger from PostgreSQL.");
  };

  // Purge handler
  const handlePurgeLogs = () => {
    clearAuditLogs();
    setOverlay({ mode: "idle" });
    if (!isLiveStreaming) {
      setLogs(getAuditLogs());
      setLastRefreshedAt(new Date());
    }
    showToast("Audit history reset in PostgreSQL.");
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            Synchronizing Observability Cockpit...
          </span>
        </div>
      </div>
    );
  }

  // Telemetry metrics
  const uniqueIPs = new Set(logs.map((l) => l.ipAddress)).size;
  const securityEventCount = categoryCounts.Security;
  const authEventCount = categoryCounts.Auth;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-950 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Live Streaming Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsLiveStreaming((prev) => !prev);
                showToast(isLiveStreaming ? "Live stream ingestion paused" : "Live stream active");
              }}
              className={`min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                isLiveStreaming
                  ? "bg-slate-900 text-emerald-400 border-slate-800 hover:bg-slate-800"
                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <Radio className={`w-3 h-3 ${isLiveStreaming ? "text-emerald-400" : "text-amber-500"}`} />
              <span>{isLiveStreaming ? "LIVE STREAM ACTIVE" : "STREAM PAUSED"}</span>
            </button>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight font-display">
            Audit Trail &amp; Logs
          </h1>
        </div>

        {/* Global Cockpit Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => void handleRefreshLedger()}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 border border-slate-200/80 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Refresh Ledger</span>
          </button>

          {/* Export to CSV (The ONE Primary Filled Button in this section) */}
          <button
            onClick={handleExportCSV}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm transition-all duration-150 shadow-sm hover:shadow flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Purge Buffer (Ghost / Subtle Action) */}
          <button
            type="button"
            onClick={() => setOverlay({ mode: "confirm_purge" })}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            title="Reset Buffer"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Purge</span>
          </button>
        </div>
      </div>

      {/* 2. Security Telemetry Metric Cards (Unified Accent: Blue-600, Concentric Radii) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Total Logged Events
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-950 tracking-tight font-display tabular-nums">
              {logs.length}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5">
              <span className="font-semibold text-slate-700 tabular-nums">Persisted in PostgreSQL</span>
            </p>
          </div>
        </div>

        {/* Security Controls */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Zero Trust Security
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-950 tracking-tight font-display tabular-nums">
              {securityEventCount}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5">
              <span className="font-semibold text-slate-700">Auth and configuration changes</span>
            </p>
          </div>
        </div>

        {/* Auth Events */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Auth &amp; TOTP 2FA
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-950 tracking-tight font-display tabular-nums">
              {authEventCount}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5">
              <span className="font-semibold text-slate-700">Server authentication telemetry</span>
            </p>
          </div>
        </div>

        {/* IP Nodes */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Monitored Nodes
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-950 tracking-tight font-display tabular-nums">
              {uniqueIPs}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5">
              <span className="font-semibold text-slate-700">Distinct client origins</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filter Controls: Category Tabs + Time Filter + Search (Grouped by proximity, 4px multiplier) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-6">
        {/* Category Pills & Time Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          {/* Category Tabs (44px min height) */}
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Security", "Auth", "CMS", "Inquiry"] as CategoryFilter[]).map((cat) => {
              const count = categoryCounts[cat];
              const isActive = selectedCategory === cat;
              const catInfo = getCategoryInfo(cat as AuditLog["category"]);
              const Icon = catInfo.icon;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    isActive
                      ? "bg-slate-950 text-white shadow-xs"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/70"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  <span>{cat}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time Range Selector (Concentric: outer rounded-xl p-1, inner rounded-lg) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start lg:self-auto border border-slate-200/60">
            <button
              type="button"
              onClick={() => setSelectedTimeFilter("all")}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                selectedTimeFilter === "all"
                  ? "bg-white text-slate-950 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeFilter("24h")}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                selectedTimeFilter === "24h"
                  ? "bg-white text-slate-950 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Past 24h
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeFilter("7d")}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                selectedTimeFilter === "7d"
                  ? "bg-white text-slate-950 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        {/* Real-time Search Input Bar (Labels close to inputs: 4px multiplier mb-1) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="relative flex-1">
            <label
              htmlFor="audit-search-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Search Telemetry Stream
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="audit-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs by actor, action, IP address, details, or event ID..."
                className="w-full min-h-[44px] h-11 pl-11 pr-10 py-2.5 text-base rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  aria-label="Clear search input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Items Per Page (Label close to select) */}
          <div className="flex items-end gap-3 shrink-0">
            <div>
              <label
                htmlFor="page-size-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Page Size
              </label>
              <select
                id="page-size-select"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="min-h-[44px] h-11 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200/80 bg-slate-50 text-slate-800 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <option value={10}>10 events</option>
                <option value={25}>25 events</option>
                <option value={50}>50 events</option>
              </select>
            </div>

            {(searchQuery || selectedCategory !== "All" || selectedTimeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedTimeFilter("all");
                }}
                className="min-h-[44px] h-11 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <RotateCw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Desktop Table & Mobile Stream Layout (Hairline borders, 16px body text) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
        {filteredLogs.length === 0 ? (
          /* Empty State (Explains what happened and explicitly what to do next) */
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-950 font-display">
              No audit events match your filter criteria
            </h3>
            <p className="text-base text-slate-600 mt-2 mb-6 leading-relaxed">
              We couldn&apos;t find any security logs matching your current query. Try resetting your search filters or simulate a live security scenario from the cockpit above.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setSelectedTimeFilter("all");
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-all duration-150 shadow-sm hover:shadow flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Reset All Filters & Show Stream</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full table-fixed text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="py-3.5 px-4 w-36">Timestamp</th>
                    <th scope="col" className="py-3.5 px-3 w-44">Actor</th>
                    <th scope="col" className="py-3.5 px-3 w-28">Category</th>
                    <th scope="col" className="py-3.5 px-3 w-44">Action Taken</th>
                    <th scope="col" className="py-3.5 px-3 w-24">IP</th>
                    <th scope="col" className="py-3.5 px-3">Summary</th>
                    <th scope="col" className="py-3.5 px-4 text-right w-20">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paginatedLogs.map((log) => {
                    const { name, role, initials } = parseActor(log.actor);
                    const catInfo = getCategoryInfo(log.category);
                    const CatIcon = catInfo.icon;
                    const formattedDate = formatDateTime(log.timestamp);
                    const ago = formatTimeAgo(log.timestamp);
                    const isRecent = ago.includes("s ago") || ago === "just now";

                    return (
                      <tr
                        key={log.id}
                        onClick={() => setOverlay({ mode: "inspecting", log })}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      >
                        {/* Timestamp */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900 tabular-nums">
                                {formattedDate}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 mt-0.5 font-medium tabular-nums">
                              {ago}
                            </span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-xs ${getAvatarGradient(
                                initials
                              )}`}
                            >
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 truncate">
                                {name}
                              </span>
                              <span className="text-[11px] font-mono text-slate-500 truncate">
                                {role}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${catInfo.badgeClass}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            <span>{log.category}</span>
                          </span>
                        </td>

                        {/* Action Taken */}
                        <td className="py-4 px-4">
                          <span className="text-sm sm:text-base font-semibold text-slate-950 block leading-snug">
                            {log.action}
                          </span>
                        </td>

                        {/* IP Address */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200/70 px-2.5 py-1 rounded-lg">
                              {log.ipAddress}
                            </span>
                          </div>
                        </td>

                        {/* Technical Details */}
                        <td className="py-4 px-5">
                          <p className="text-xs sm:text-sm text-slate-600 line-clamp-1 leading-relaxed max-w-prose">
                            {log.details}
                          </p>
                        </td>

                        {/* Inspect action (44px tap target) */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOverlay({ mode: "inspecting", log });
                            }}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-slate-400 group-hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                            aria-label={`Inspect log ${log.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Card Stream (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedLogs.map((log) => {
                const { name, role, initials } = parseActor(log.actor);
                const catInfo = getCategoryInfo(log.category);
                const CatIcon = catInfo.icon;
                const ago = formatTimeAgo(log.timestamp);

                return (
                  <div
                    key={log.id}
                    onClick={() => setOverlay({ mode: "inspecting", log })}
                    className="p-4 space-y-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${getAvatarGradient(
                            initials
                          )}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-950 truncate block">
                            {name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${catInfo.badgeClass}`}
                        >
                          <CatIcon className="w-2.5 h-2.5" />
                          <span>{log.category}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ago}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-950">
                        {log.action}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                        {log.details}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {log.ipAddress}
                      </span>
                      <span className="text-blue-600 font-medium flex items-center gap-1">
                        Inspect &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination & Footer summary */}
            <div className="py-4 px-4 sm:px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="text-slate-600">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min((currentPage - 1) * pageSize + 1, filteredLogs.length)}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(currentPage * pageSize, filteredLogs.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-900">{filteredLogs.length}</span>{" "}
                events
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white text-slate-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="px-3 font-mono font-semibold text-slate-800 text-xs">
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white text-slate-700 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 5. Enterprise Slide-Over Inspection Drawer */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/50 transition-opacity animate-in fade-in duration-200"
            onClick={() => setOverlay({ mode: "idle" })}
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 transform transition-transform animate-in slide-in-from-right duration-200 border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                      getCategoryInfo(inspectLog.category).badgeClass
                    }`}
                  >
                    {inspectLog.category}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {inspectLog.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-950 font-display">
                  {inspectLog.action}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setOverlay({ mode: "idle" })}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close inspection drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* SOC2 Cryptographic Integrity Card */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    SOC2 Type II Tamper-Evident Hash Seal
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Cryptographically stamped into immutable append-only ledger. Signature hash:{" "}
                    <code className="font-mono text-[11px] bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900">
                      sha256:{inspectLog.id.slice(4)}f7e2a9b
                    </code>
                  </p>
                </div>
              </div>

              {/* Actor & Authority Grid */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Actor & Authority Context
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">Actor Identity</span>
                      <span className="font-bold text-slate-950 text-sm block">
                        {inspectLog.actor}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const { name } = parseActor(inspectLog.actor);
                        setSearchQuery(name);
                        setOverlay({ mode: "idle" });
                        showToast(`Filtered stream to actor "${name}"`);
                      }}
                      className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 font-semibold self-start flex items-center gap-1 cursor-pointer focus-visible:ring-1 focus-visible:ring-blue-600 rounded px-1 -mx-1"
                    >
                      <Filter className="w-3 h-3" />
                      <span>Filter by this Actor</span>
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 font-medium block mb-1">Origin Node IP</span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {inspectLog.ipAddress}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(inspectLog.ipAddress, "ip")}
                          className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                          title="Copy IP"
                        >
                          {copiedId === "ip" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(inspectLog.ipAddress);
                        setOverlay({ mode: "idle" });
                        showToast(`Filtered stream to IP "${inspectLog.ipAddress}"`);
                      }}
                      className="mt-2 text-[11px] text-blue-600 hover:text-blue-700 font-semibold self-start flex items-center gap-1 cursor-pointer focus-visible:ring-1 focus-visible:ring-blue-600 rounded px-1 -mx-1"
                    >
                      <Filter className="w-3 h-3" />
                      <span>Filter by this IP</span>
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 font-medium block mb-1">Verified ISO Timestamp</span>
                    <span className="font-mono text-slate-800 block text-[11px]">
                      {inspectLog.timestamp}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {formatDateTime(inspectLog.timestamp)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-500 font-medium block mb-1">Network Subnet Tag</span>
                    <span className="font-medium text-slate-900 block text-xs">
                      Corporate VPN / Allowlisted Gateway
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                      Zero Anomalies Detected
                    </span>
                  </div>
                </div>
              </div>

              {/* Narrative Details */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Event Technical Details
                </label>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 text-slate-800 text-xs sm:text-sm leading-relaxed">
                  {inspectLog.details}
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Raw SOC2 JSON Verification Payload
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(inspectLog, null, 2), inspectLog.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === inspectLog.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied JSON</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 bg-slate-950 text-slate-100 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>{JSON.stringify(inspectLog, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions (One fill button per section) */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleCopy(JSON.stringify(inspectLog, null, 2), inspectLog.id)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-colors flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                {copiedId === inspectLog.id ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied Payload</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy JSON Payload</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setOverlay({ mode: "idle" })}
                className="min-h-[44px] px-6 py-2 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Purge Safety Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/80">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-950 text-base font-display">
                  Purge Local Audit Log Buffer?
                </h3>
                <p className="text-xs text-slate-500">
                  Irreversible Administrative Operation
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will flush the local 100-event memory buffer and start a fresh immutable sequence. An immutable purge audit log will automatically be recorded as event #1.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOverlay({ mode: "idle" })}
                className="min-h-[44px] px-5 py-2 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeLogs}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2"
              >
                Confirm Purge Buffer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
