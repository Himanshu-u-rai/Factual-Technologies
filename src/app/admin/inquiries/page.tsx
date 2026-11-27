'use client';

import React, { useEffect, useState, useMemo, Suspense, useCallback, useRef, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  Inbox,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Building2,
  Mail,
  User,
  Tag,
  X,
  AlertCircle,
  DollarSign,
  Send,
  Calendar,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  MessageSquare,
  FileSpreadsheet,
  Copy,
  Eye,
  Zap,
} from "lucide-react";
import {
  getInquiries,
  updateInquiryStatus,
  updateInquiryArchitect,
  updateInquiryPriority,
  addInquiryNote,
  deleteInquiry,
  exportInquiriesCSV,
  ARCHITECTS,
  subscribe,
  Inquiry,
  InquiryStatus,
  InquiryPriority,
} from "@/lib/admin-store";

const STATUS_TABS: { label: string; value: InquiryStatus | "All" }[] = [
  { label: "All Inquiries", value: "All" },
  { label: "New", value: "New" },
  { label: "In Review", value: "In Review" },
  { label: "Discovery Scheduled", value: "Discovery Scheduled" },
  { label: "NDA Sent", value: "NDA Sent" },
  { label: "Converted", value: "Converted" },
  { label: "Archived", value: "Archived" },
];

const ALL_STATUSES: InquiryStatus[] = [
  "New",
  "In Review",
  "Discovery Scheduled",
  "NDA Sent",
  "Converted",
  "Archived",
];

const ALL_PRIORITIES: InquiryPriority[] = ["Critical", "High", "Normal"];

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

function formatFullDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

const emptySubscribe = () => () => {};

function InquiriesContent() {
  const searchParams = useSearchParams();

  // Primary data state
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => getInquiries());
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<InquiryStatus | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [architectFilter, setArchitectFilter] = useState<string>("All");
  const [quickFilter, setQuickFilter] = useState<"all" | "unassigned" | "high_value" | "critical">("all");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Unified overlay discriminated union (drawer + inline delete + bulk delete are mutually exclusive)
  type InquiryOverlayState =
    | { mode: "idle" }
    | { mode: "drawer"; inquiryId: string; confirmingDelete: boolean }
    | { mode: "bulk_delete_modal" };

  const [overlay, setOverlay] = useState<InquiryOverlayState>({ mode: "idle" });
  const [copiedEmail, setCopiedEmail] = useState(false);
  const copiedEmailTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New Note in drawer
  const [noteText, setNoteText] = useState("");
  const [noteAuthor, setNoteAuthor] = useState("Alex Vance");

  const activeInquiryId = overlay.mode === "drawer" ? overlay.inquiryId : null;
  const confirmDeleteId =
    overlay.mode === "drawer" && overlay.confirmingDelete ? overlay.inquiryId : null;
  const showBulkDeleteConfirm = overlay.mode === "bulk_delete_modal";

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (copiedEmailTimerRef.current) clearTimeout(copiedEmailTimerRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const initialId = searchParams.get("id");
  const [prevDeepLinkKey, setPrevDeepLinkKey] = useState<string>("");

  const deepLinkKey = mounted && initialId ? `${initialId}:${inquiries.length}` : "";
  if (deepLinkKey && prevDeepLinkKey !== deepLinkKey) {
    setPrevDeepLinkKey(deepLinkKey);
    const match = inquiries.find((i) => i.id === initialId);
    if (match) {
      setOverlay({ mode: "drawer", inquiryId: match.id, confirmingDelete: false });
    }
  }

  // Close drawer & update URL
  const handleCloseDrawer = useCallback(() => {
    setOverlay({ mode: "idle" });
    setCopiedEmail(false);
    if (copiedEmailTimerRef.current) {
      clearTimeout(copiedEmailTimerRef.current);
      copiedEmailTimerRef.current = null;
    }
    setNoteText("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Sync with store
  useEffect(() => {
    document.title = "Inbound Messages & Architect CRM | Factual Console";
    const syncData = () => {
      setInquiries(getInquiries());
    };

    const unsub = subscribe(syncData);
    return () => unsub();
  }, []);

  // Close drawer or modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && overlay.mode !== "idle") {
        handleCloseDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overlay.mode, handleCloseDrawer]);

  // Open drawer & update URL
  const handleOpenDrawer = (inquiry: Inquiry) => {
    setCopiedEmail(false);
    setOverlay({ mode: "drawer", inquiryId: inquiry.id, confirmingDelete: false });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("id", inquiry.id);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Get currently active inquiry from store (auto-close if deleted externally)
  const activeInquiry = useMemo(() => {
    if (overlay.mode !== "drawer") return null;
    return inquiries.find((i) => i.id === overlay.inquiryId) || null;
  }, [inquiries, overlay]);

  if (overlay.mode === "drawer" && mounted && !activeInquiry) {
    setOverlay({ mode: "idle" });
    setCopiedEmail(false);
    setNoteText("");
  }

  useEffect(() => {
    if (overlay.mode !== "drawer" && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("id")) {
        url.searchParams.delete("id");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [overlay.mode]);

  // Status counts for badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: inquiries.length };
    ALL_STATUSES.forEach((s) => {
      counts[s] = inquiries.filter((i) => i.status === s).length;
    });
    return counts;
  }, [inquiries]);

  // Filtered inquiries list
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      // Tab filter
      if (activeTab !== "All" && item.status !== activeTab) {
        return false;
      }
      // Quick Filter preset
      if (quickFilter === "unassigned" && item.assignedArchitect) {
        return false;
      }
      if (quickFilter === "high_value") {
        const num = parseInt((item.estimatedValue || "").replace(/[^0-9]/g, ""), 10);
        if (isNaN(num) || num < 100000) return false;
      }
      if (quickFilter === "critical" && item.priority !== "Critical") {
        return false;
      }
      // Priority filter
      if (priorityFilter !== "All" && item.priority !== priorityFilter) {
        return false;
      }
      // Architect filter
      if (architectFilter !== "All") {
        if (architectFilter === "Unassigned" && item.assignedArchitect) {
          return false;
        }
        if (architectFilter !== "Unassigned" && item.assignedArchitect !== architectFilter) {
          return false;
        }
      }
      // Search query (name, company, email, message, tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCompany = item.company.toLowerCase().includes(query);
        const matchesEmail = item.email.toLowerCase().includes(query);
        const matchesMessage = item.message.toLowerCase().includes(query);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(query)) || false;
        const matchesId = item.id.toLowerCase().includes(query);

        if (!matchesName && !matchesCompany && !matchesEmail && !matchesMessage && !matchesTags && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [inquiries, activeTab, quickFilter, priorityFilter, architectFilter, searchQuery]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredInquiries.map((i) => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleBulkStatusChange = (status: InquiryStatus) => {
    selectedIds.forEach((id) => {
      updateInquiryStatus(id, status);
    });
    showToast(`Updated ${selectedIds.length} inquiries to "${status}"`);
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    handleCloseDrawer();
    setOverlay({ mode: "bulk_delete_modal" });
  };

  const handleConfirmBulkDelete = () => {
    const count = selectedIds.length;
    selectedIds.forEach((id) => {
      deleteInquiry(id);
    });
    showToast(`Deleted ${count} inquiries`);
    setSelectedIds([]);
    setOverlay({ mode: "idle" });
  };

  // CSV Export
  const handleExportCSV = () => {
    const csvData = exportInquiriesCSV();
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `factual-inquiries-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("Exported all inquiries to CSV successfully");
  };

  // Add note handler
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiry || !noteText.trim()) return;

    addInquiryNote(activeInquiry.id, noteText.trim(), noteAuthor);
    setNoteText("");
    showToast("Technical note recorded in audit log");
  };

  // Delete individual inquiry
  const handleDeleteActiveInquiry = () => {
    if (!activeInquiry) return;
    const deletedId = activeInquiry.id;
    deleteInquiry(deletedId);
    setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
    showToast(`Inquiry ${deletedId} deleted`);
    handleCloseDrawer();
  };

  // Priority badge styling
  const getPriorityBadgeClasses = (priority: InquiryPriority) => {
    switch (priority) {
      case "Critical":
        return "bg-rose-50 text-rose-700 border-rose-200/80 ring-rose-500/10";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/10";
      case "Normal":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200/80 ring-slate-500/10";
    }
  };

  // Status badge styling
  const getStatusBadgeClasses = (status: InquiryStatus) => {
    switch (status) {
      case "New":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "In Review":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "Discovery Scheduled":
        return "bg-sky-50 text-sky-800 border-sky-200/80";
      case "NDA Sent":
        return "bg-slate-100 text-slate-800 border-slate-300/80";
      case "Converted":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "Archived":
        return "bg-slate-100 text-slate-600 border-slate-200/90";
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight font-display">
            Client Inquiries
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
            title="Download CSV export of all inquiries"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Quick KPI Overview (Concentric radii, soft shadow, hairline borders) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-medium text-slate-500 block mb-1">Total Pipeline</span>
          <span className="text-2xl font-bold text-slate-950 font-display tabular-nums">{inquiries.length}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200/70 bg-blue-50/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-semibold text-blue-700 block mb-1">New Inbound</span>
          <span className="text-2xl font-bold text-blue-700 font-display tabular-nums">{statusCounts["New"] || 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/70 bg-amber-50/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-semibold text-amber-700 block mb-1">In Review</span>
          <span className="text-2xl font-bold text-amber-700 font-display tabular-nums">{statusCounts["In Review"] || 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-semibold text-blue-700 block mb-1">Discovery Sched.</span>
          <span className="text-2xl font-bold text-slate-900 font-display tabular-nums">{statusCounts["Discovery Scheduled"] || 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-semibold text-slate-600 block mb-1">NDA Sent</span>
          <span className="text-2xl font-bold text-slate-900 font-display tabular-nums">{statusCounts["NDA Sent"] || 0}</span>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <span className="text-xs font-semibold text-emerald-700 block mb-1">Converted</span>
          <span className="text-2xl font-bold text-emerald-700 font-display tabular-nums">{statusCounts["Converted"] || 0}</span>
        </div>
      </div>

      {/* Main CRM Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Status Filter Tabs */}
        <div className="border-b border-slate-200/70 px-4 sm:px-6 pt-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.value] ?? 0;
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 border-b-2 -mb-px focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-blue-50/40"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prospect, company, email, tag, or inquiry ID..."
              className="w-full min-h-[44px] pl-10 pr-9 py-2 bg-white text-sm text-slate-900 placeholder-slate-400 border border-slate-200/80 rounded-xl shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="priority-select" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Priority:
              </label>
              <select
                id="priority-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-white text-xs sm:text-sm font-medium text-slate-700 border border-slate-200/80 rounded-xl shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-all cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High Only</option>
                <option value="Normal">Normal Only</option>
              </select>
            </div>

            {/* Architect Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="architect-select" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Architect:
              </label>
              <select
                id="architect-select"
                value={architectFilter}
                onChange={(e) => setArchitectFilter(e.target.value)}
                className="min-h-[44px] px-3 py-2 bg-white text-xs sm:text-sm font-medium text-slate-700 border border-slate-200/80 rounded-xl shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-all cursor-pointer"
              >
                <option value="All">All Assigned</option>
                {ARCHITECTS.map((arch) => (
                  <option key={arch.name} value={arch.name}>
                    {arch.name}
                  </option>
                ))}
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>

            {/* Clear Filters button when any filter active */}
            {(searchQuery || priorityFilter !== "All" || architectFilter !== "All" || activeTab !== "All" || quickFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPriorityFilter("All");
                  setArchitectFilter("All");
                  setActiveTab("All");
                  setQuickFilter("all");
                }}
                className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Quick Filter Presets Row (44px tap targets) */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/60 w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 mr-1">
              Quick Views:
            </span>
            <button
              type="button"
              onClick={() => setQuickFilter("all")}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                quickFilter === "all"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              All Inquiries
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("unassigned")}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                quickFilter === "unassigned"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <User className="w-4 h-4 text-amber-500" />
              <span>Unassigned Leads</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("high_value")}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                quickFilter === "high_value"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>High Value (&gt;$100k)</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter("critical")}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                quickFilter === "critical"
                  ? "bg-slate-950 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              }`}
            >
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Critical Priority</span>
            </button>
          </div>
        </div>

        {/* Bulk Selection Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-blue-900">
                {selectedIds.length} {selectedIds.length === 1 ? "inquiry" : "inquiries"} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-blue-800 hidden sm:inline">Set Status:</span>
              <button
                onClick={() => handleBulkStatusChange("In Review")}
                className="min-h-[36px] px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                In Review
              </button>
              <button
                onClick={() => handleBulkStatusChange("Discovery Scheduled")}
                className="min-h-[36px] px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Discovery
              </button>
              <button
                onClick={() => handleBulkStatusChange("Converted")}
                className="min-h-[36px] px-2.5 py-1 text-xs font-semibold bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Converted
              </button>

              <button
                onClick={handleBulkDelete}
                className="min-h-[36px] px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 ml-1 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* 1. Inquiries Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 pl-6 pr-3 w-12">
                  <input
                    type="checkbox"
                    checked={
                      filteredInquiries.length > 0 &&
                      selectedIds.length === filteredInquiries.length
                    }
                    onChange={handleSelectAll}
                    aria-label="Select all inquiries"
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3">Prospect & Enterprise</th>
                <th className="py-3.5 px-3">Est. Value</th>
                <th className="py-3.5 px-3">Priority</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Assigned Architect</th>
                <th className="py-3.5 pr-6 pl-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto text-center px-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <p className="text-lg font-bold text-slate-950 font-display">No Inquiries Found</p>
                      <p className="text-base text-slate-600 leading-relaxed">
                        {searchQuery || priorityFilter !== "All" || architectFilter !== "All" || quickFilter !== "all"
                          ? "No candidate inquiries match your active filter criteria. Try clearing search or resetting filters."
                          : "There are currently no inbound enterprise inquiries in this category."}
                      </p>
                      {(searchQuery || priorityFilter !== "All" || architectFilter !== "All" || quickFilter !== "all" || activeTab !== "All") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setPriorityFilter("All");
                            setArchitectFilter("All");
                            setActiveTab("All");
                            setQuickFilter("all");
                          }}
                          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer mt-2 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                        >
                          Reset All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isDrawerActive = activeInquiryId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDrawer(item)}
                      className={`group cursor-pointer transition-colors ${
                        isDrawerActive
                          ? "bg-blue-50/60"
                          : isSelected
                          ? "bg-slate-50/80"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-4 pl-6 pr-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select inquiry from ${item.company}`}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Candidate / Company info */}
                      <td className="py-4 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.company}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span>{item.name}</span>
                            <span className="truncate max-w-[180px]">{item.email}</span>
                            <span className="text-slate-400">{formatTimeAgo(item.createdAt)}</span>
                          </div>
                          {/* Tags snippet */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {item.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
                                >
                                  {t}
                                </span>
                              ))}
                              {item.tags.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  +{item.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Estimated Value */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="font-mono text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                          {item.estimatedValue || "TBD"}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ring-1 ${getPriorityBadgeClasses(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      </td>

                      {/* Quick Status Dropdown / Badge */}
                      <td
                        className="py-4 px-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={item.status}
                          onChange={(e) => {
                            updateInquiryStatus(item.id, e.target.value as InquiryStatus);
                            showToast(`Updated ${item.id} status to ${e.target.value}`);
                          }}
                          className={`min-h-[44px] text-xs font-semibold px-3 py-2 rounded-xl border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer ${getStatusBadgeClasses(
                            item.status
                          )}`}
                        >
                          {ALL_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Assigned Architect */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {item.assignedArchitect ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                              {ARCHITECTS.find((a) => a.name === item.assignedArchitect)?.initials ||
                                item.assignedArchitect.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800">
                              {item.assignedArchitect}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-medium">Unassigned</span>
                        )}
                      </td>

                      {/* Action (44px tap target) */}
                      <td className="py-4 pr-6 pl-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDrawer(item);
                          }}
                          className="min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer shadow-2xs"
                        >
                          Review & Notes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 2. Mobile Responsive Inquiries Stream (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredInquiries.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-400">
                <Inbox className="w-10 h-10 stroke-1" />
                <p className="text-base font-semibold text-slate-700">No Inquiries Found</p>
                <p className="text-xs text-slate-400">
                  {searchQuery || priorityFilter !== "All" || architectFilter !== "All" || quickFilter !== "all"
                    ? "No items match your active filter criteria."
                    : "There are currently no inquiries in this category."}
                </p>
              </div>
            </div>
          ) : (
            filteredInquiries.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isDrawerActive = activeInquiryId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDrawer(item)}
                  className={`p-4 transition-colors cursor-pointer space-y-3 ${
                    isDrawerActive ? "bg-blue-50/50" : isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select inquiry from ${item.company}`}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {item.company}
                          </h4>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.name}, {formatTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getPriorityBadgeClasses(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded tabular-nums">
                        {item.estimatedValue || "TBD"}
                      </span>
                      
                      <span className="text-slate-600">
                        {item.assignedArchitect ? (
                          <span className="font-medium text-blue-700">
                            Arch: {item.assignedArchitect}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">Unassigned</span>
                        )}
                      </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.status}
                        onChange={(e) => {
                          updateInquiryStatus(item.id, e.target.value as InquiryStatus);
                          showToast(`Updated ${item.id} status to ${e.target.value}`);
                        }}
                        className={`min-h-[38px] text-xs font-semibold px-2 py-1 rounded-lg border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer ${getStatusBadgeClasses(
                          item.status
                        )}`}
                      >
                        {ALL_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDrawer(item);
                    }}
                    className="w-full min-h-[44px] py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl border border-blue-200/70 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Review Opportunity & Notes</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Showing <strong className="text-slate-700">{filteredInquiries.length}</strong> of{" "}
            <strong className="text-slate-700">{inquiries.length}</strong> inquiries
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Saved locally in browser storage
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLIDE-OVER DETAIL DRAWER */}
      {/* ========================================================================= */}
      {activeInquiry && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-slate-950/50 transition-opacity animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200/80 flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200/80 flex items-start justify-between bg-slate-50/60 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">
                      {activeInquiry.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(
                        activeInquiry.status
                      )}`}
                    >
                      {activeInquiry.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {activeInquiry.company}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Received {formatFullDateTime(activeInquiry.createdAt)}</span>
                  </p>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* 1. Quick Transition Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                  {/* Status Change */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Workflow Status
                    </label>
                    <select
                      value={activeInquiry.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as InquiryStatus;
                        updateInquiryStatus(activeInquiry.id, newStatus);
                        showToast(`Status shifted to "${newStatus}"`);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 bg-white text-xs sm:text-sm font-semibold text-slate-800 border border-slate-200/80 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
                    >
                      {ALL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Change */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Priority Level
                    </label>
                    <select
                      value={activeInquiry.priority}
                      onChange={(e) => {
                        const newPriority = e.target.value as InquiryPriority;
                        updateInquiryPriority(activeInquiry.id, newPriority);
                        showToast(`Priority adjusted to "${newPriority}"`);
                      }}
                      className="w-full min-h-[44px] px-3 py-2 bg-white text-xs sm:text-sm font-semibold text-slate-800 border border-slate-200/80 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
                    >
                      {ALL_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Architect Assignment */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Assigned Lead Architect
                    </label>
                    <select
                      value={activeInquiry.assignedArchitect || ""}
                      onChange={(e) => {
                        updateInquiryArchitect(activeInquiry.id, e.target.value);
                        showToast(
                          e.target.value
                            ? `Assigned to ${e.target.value}`
                            : "Architect unassigned"
                        );
                      }}
                      className="w-full min-h-[44px] px-3 py-2 bg-white text-xs sm:text-sm font-semibold text-slate-800 border border-slate-200/80 rounded-xl focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {ARCHITECTS.map((arch) => (
                        <option key={arch.name} value={arch.name}>
                          {arch.name} ({arch.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Prospect & Metadata Card */}
                <div className="bg-white rounded-xl border border-slate-200/70 p-4 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Prospect Contact &amp; Valuation
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Primary Contact</span>
                        <span className="text-sm font-semibold text-slate-900">
                          {activeInquiry.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-slate-500 block">Email Address</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${activeInquiry.email}`}
                            className="text-sm font-semibold text-blue-600 hover:underline truncate block"
                          >
                            {activeInquiry.email}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(activeInquiry.email);
                              if (copiedEmailTimerRef.current) clearTimeout(copiedEmailTimerRef.current);
                              setCopiedEmail(true);
                              copiedEmailTimerRef.current = setTimeout(() => setCopiedEmail(false), 2000);
                              showToast("Email address copied to clipboard");
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                            title="Copy email address"
                            aria-label="Copy email address"
                          >
                            {copiedEmail ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Estimated Deal Size</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {activeInquiry.estimatedValue || "Under Assessment"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Enterprise Org</span>
                        <span className="text-sm font-semibold text-slate-900 truncate block">
                          {activeInquiry.company}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {activeInquiry.tags && activeInquiry.tags.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500 block mb-1.5">Architecture Domains &amp; Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeInquiry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/70"
                          >
                            <Tag className="w-3 h-3 text-slate-400" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Proposal / Message Content (16px body, 1.5x line height, 60-70 chars per line) */}
                <div className="bg-slate-50/70 rounded-2xl border border-slate-200/70 p-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    Engineering Scope &amp; Requirement Text
                  </h3>
                  <div className="p-4 bg-white rounded-xl border border-slate-200/80 text-base text-slate-800 leading-relaxed font-sans whitespace-pre-wrap max-w-prose">
                    {activeInquiry.message}
                  </div>
                </div>

                {/* 4. Internal Engineering Notes Thread */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                      <span>Internal Architecture Notes</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 tabular-nums">
                        {activeInquiry.notes?.length || 0}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-500">Internal notes only (not shown to clients)</span>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3">
                    {(!activeInquiry.notes || activeInquiry.notes.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        No technical notes logged yet. Use the form below to record architecture decisions or scoping memos.
                      </div>
                    ) : (
                      activeInquiry.notes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200/70 shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center">
                                {note.author.slice(0, 2).toUpperCase()}
                              </span>
                              {note.author}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {formatTimeAgo(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 pl-6 leading-relaxed">
                            {note.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="note-text" className="text-xs font-semibold text-slate-700">
                        Add Technical Note / Status Memo
                      </label>
                      <select
                        value={noteAuthor}
                        onChange={(e) => setNoteAuthor(e.target.value)}
                        className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200/70 rounded-lg px-2 py-1 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      >
                        <option value="Alex Vance">Alex Vance (Super Admin)</option>
                        <option value="Elena Rostova">Elena Rostova (CTO)</option>
                        <option value="Marcus Chen">Marcus Chen (VP Eng)</option>
                        <option value="Sarah Lindqvist">Sarah Lindqvist (Head of Innovation)</option>
                      </select>
                    </div>

                    <textarea
                      id="note-text"
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="e.g. Scoped infrastructure requirements: Multi-region AWS deployment with sub-50ms latency target..."
                      className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    />

                    {/* Quick Response Scoping Templates (Tap target ergonomics) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 mr-0.5">
                        Quick Templates:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteText(
                            `Hi ${activeInquiry.name},\n\nThank you for reaching out from ${activeInquiry.company}. We have reviewed your project requirements and would love to schedule a 30-minute architecture discovery session with our lead engineering team.`
                          );
                        }}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200/60"
                      >
                        Discovery Call
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteText(
                            `Technical Scoping Query for ${activeInquiry.company}:\n- Target peak QPS and concurrency\n- Latency SLA requirements\n- Cloud deployment preferences (AWS/GCP/Hybrid)\n- Authentication & compliance standards`
                          );
                        }}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200/60"
                      >
                        Architecture Spec
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoteText(
                            `Mutual Enterprise NDA dispatched to ${activeInquiry.email} for review. Awaiting legal sign-off prior to detailed system topology review.`
                          );
                        }}
                        className="min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-200/60"
                      >
                        Enterprise NDA
                      </button>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={!noteText.trim()}
                        className={`min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none inline-flex items-center gap-2 ${
                          noteText.trim()
                            ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                            : "bg-slate-200 text-slate-600 cursor-not-allowed"
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        <span>Log Note to Audit Trail</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 5. Danger Zone */}
                <div className="pt-6 border-t border-slate-200/70">
                  {confirmDeleteId === activeInquiry.id ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-900">
                            Confirm Permanent Removal
                          </h4>
                          <p className="text-xs text-rose-700 mt-0.5">
                            This will permanently purge {activeInquiry.id} from local storage and record an administrative audit entry.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setOverlay({
                              mode: "drawer",
                              inquiryId: activeInquiry.id,
                              confirmingDelete: false,
                            })
                          }
                          className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteActiveInquiry}
                          className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-rose-500 shadow-xs cursor-pointer"
                        >
                          Confirm Purge
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">
                          Inquiry Deletion
                        </span>
                        <span className="text-xs text-slate-500">
                          Remove this record if duplicate or spam
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setOverlay({
                            mode: "drawer",
                            inquiryId: activeInquiry.id,
                            confirmingDelete: true,
                          })
                        }
                        className="min-h-[44px] px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Record</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer (One fill button rule) */}
              <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-mono">
                  Press Esc or click backdrop to dismiss
                </span>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="min-h-[44px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
                >
                  Done Reviewing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-950 text-base">Permanently Delete Inquiries</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete {selectedIds.length} selected {selectedIds.length === 1 ? "inquiry" : "inquiries"}? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverlay({ mode: "idle" })}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InquiriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InquiriesContent />
    </Suspense>
  );
}
