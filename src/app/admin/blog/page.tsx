'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode2,
  Globe,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link2,
  List,
  Lock,
  Plus,
  Quote,
  RefreshCw,
  Rss,
  Search,
  Send,
  Sparkles,
  Star,
  Table as TableIcon,
  Tag,
  Trash2,
  Unlock,
  UserCheck,
  X,
} from "lucide-react";

import MarkdownArticle from "@/components/blog/MarkdownArticle";
import { ARCHITECTS } from "@/lib/admin-types";
import {
  ARTICLE_CATEGORIES,
  ArticleCategory,
  ArticleFaqItem,
  ArticleStatus,
  BlogArticle,
  calculateReadingMetrics,
  evaluateArticleSeo,
  extractMarkdownHeadings,
  slugifyText,
} from "@/lib/articles-shared";
import { SITE_URL } from "@/lib/seo";

const COVER_PRESETS = [
  { label: "MCP Skills Rail", url: "/blog/mcp-skills-protocol.jpg" },
  { label: "PostgreSQL 19 Repack", url: "/blog/pg19-repack-architecture.jpg" },
  { label: "K8s Agent Substrate", url: "/blog/k8s-agent-substrate.jpg" },
  { label: "Next.js 16 Cache Fins", url: "/blog/react-nextjs-cache-components.jpg" },
  { label: "Spec-Led Datum Cube", url: "/blog/spec-led-engineering-future.jpg" },
  { label: "Enterprise RAG 2027", url: "/blog/enterprise-rag-2027.jpg" },
  { label: "AI Agent State Gates", url: "/blog/ai-agents-2027.jpg" },
  { label: "Multi-Cloud Bridge", url: "/blog/multi-cloud-2027.jpg" },
  { label: "FinOps Balance", url: "/blog/finops-2027.jpg" },
  { label: "Next.js & PostgreSQL", url: "/blog/nextjs-stack-2027.jpg" },
  { label: "Strangler-Fig Lattice", url: "/blog/modernization-2027.jpg" },
  { label: "Field Edge Sync", url: "/blog/offline-sync-2027.jpg" },
  { label: "Zero-Retention Vault", url: "/blog/ai-security-2027.jpg" },
  { label: "GEO Citation Prism", url: "/blog/geo-search-2027.jpg" },
  { label: "Embedded Pod Dovetail", url: "/blog/embedded-pods-2027.jpg" },
  { label: "ACL Permission Louvers", url: "/blog/permission-rag-acl.jpg" },
  { label: "Dual-Write Manifold", url: "/blog/kafka-migration.jpg" },
  { label: "Conflict Merge Plates", url: "/blog/conflict-sync.jpg" },
  { label: "Terraform Policy Gates", url: "/blog/terraform-ci.jpg" },
];

const MARKDOWN_TOOLBAR_BUTTONS = [
  { label: "H2", icon: Heading2, before: "\n## ", after: "\n", placeholder: "Section Heading" },
  { label: "H3", icon: Heading3, before: "\n### ", after: "\n", placeholder: "Sub-section" },
  { label: "Bold", icon: Sparkles, before: "**", after: "**", placeholder: "important concept" },
  { label: "Code", icon: FileCode2, before: "\n```ts\n", after: "\n```\n", placeholder: "// TypeScript snippet" },
  { label: "List", icon: List, before: "\n- ", after: "", placeholder: "Bullet point" },
  { label: "Quote", icon: Quote, before: "\n> ", after: "\n", placeholder: "Key architectural takeaway" },
  { label: "Link", icon: Link2, before: "[", after: "](/services/ai-systems-automation)", placeholder: "anchor text" },
] as const;

const STATUS_BADGE: Record<ArticleStatus, string> = {
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

interface ArticleFormState {
  id?: string;
  slug: string;
  slugLocked: boolean;
  title: string;
  subtitle: string;
  excerpt: string;
  contentMarkdown: string;
  category: ArticleCategory;
  tags: string[];
  tagDraft: string;
  coverImage: string;
  coverImageAlt: string;
  authorName: string;
  authorRole: string;
  authorBio: string;
  authorLinkedIn: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  focusKeyword: string;
  faqs: ArticleFaqItem[];
  status: ArticleStatus;
  featured: boolean;
  publishedAt: string;
}

type EditorTab = "write" | "seo" | "meta";
type WritePaneMode = "write" | "split" | "preview";

interface TelemetrySnapshot {
  totalViews30d: number;
  sources: Array<{ source: string; views: number }>;
  pages: Array<{ path: string; views: number }>;
}

function emptyArticleForm(): ArticleFormState {
  return {
    slug: "",
    slugLocked: false,
    title: "",
    subtitle: "",
    excerpt: "",
    contentMarkdown: `## Context & Problem Statement

Describe the production architecture bottleneck, scale requirement, or security constraint.

## Engineering Architecture

Outline concrete data models, service contracts, and failure handling.

- Key architectural decision 1
- Key architectural decision 2

## Verification & Rollout

Explain staging parity validation, CI/CD checks, and rollback safety.`,
    category: "AI Systems",
    tags: ["Architecture", "Production"],
    tagDraft: "",
    coverImage: "/blog/enterprise-rag-2027.jpg",
    coverImageAlt: "",
    authorName: ARCHITECTS[0].name,
    authorRole: ARCHITECTS[0].role,
    authorBio:
      "Leads distributed systems and production AI architecture engagements across regulated enterprise teams.",
    authorLinkedIn: "",
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    focusKeyword: "",
    faqs: [
      { q: "", a: "" },
    ],
    status: "draft",
    featured: false,
    publishedAt: new Date().toISOString().slice(0, 16),
  };
}

function articleToForm(article: BlogArticle): ArticleFormState {
  return {
    id: article.id,
    slug: article.slug,
    slugLocked: true,
    title: article.title,
    subtitle: article.subtitle,
    excerpt: article.excerpt,
    contentMarkdown: article.contentMarkdown,
    category: article.category,
    tags: [...article.tags],
    tagDraft: "",
    coverImage: article.coverImage || "/blog/enterprise-rag-2027.jpg",
    coverImageAlt: article.coverImageAlt || article.title,
    authorName: article.authorName,
    authorRole: article.authorRole,
    authorBio: article.authorBio,
    authorLinkedIn: article.authorLinkedIn || "",
    metaTitle: article.metaTitle || article.title,
    metaDescription: article.metaDescription || article.excerpt,
    canonicalUrl: article.canonicalUrl || "",
    focusKeyword: article.focusKeyword || "",
    faqs: article.faqs.length > 0 ? article.faqs.map((f) => ({ ...f })) : [],
    status: article.status,
    featured: article.featured,
    publishedAt: (article.publishedAt || article.createdAt || new Date().toISOString()).slice(0, 16),
  };
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "Unpublished";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminBlogPage() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    totalViews30d: 0,
    sources: [],
    pages: [],
  });

  // Filters & view state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ArticleStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ArticleCategory>("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showTelemetryDrawer, setShowTelemetryDrawer] = useState(false);

  // Toast & async action feedback
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [indexNowPending, setIndexNowPending] = useState(false);

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>("write");
  const [writePaneMode, setWritePaneMode] = useState<WritePaneMode>("split");
  const [form, setForm] = useState<ArticleFormState>(() => emptyArticleForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogArticle | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const notify = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    setToast({ text, kind });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchArticlesAndTelemetry = useCallback(async () => {
    setLoading(true);
    try {
      const [artRes, telRes] = await Promise.all([
        fetch("/api/admin/articles", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/admin/telemetry", { cache: "no-store", credentials: "same-origin" }),
      ]);

      if (artRes.ok) {
        const data = (await artRes.json()) as { articles?: BlogArticle[] };
        setArticles(data.articles || []);
      }
      if (telRes.ok) {
        const tel = (await telRes.json()) as TelemetrySnapshot;
        setTelemetry(tel);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Blog & Editorial CMS | Factual Console";
    let active = true;
    Promise.all([
      fetch("/api/admin/articles", { cache: "no-store", credentials: "same-origin" }),
      fetch("/api/admin/telemetry", { cache: "no-store", credentials: "same-origin" }),
    ])
      .then(async ([artRes, telRes]) => {
        if (!active) return;
        if (artRes.ok) {
          const data = (await artRes.json()) as { articles?: BlogArticle[] };
          if (active) setArticles(data.articles || []);
        }
        if (telRes.ok) {
          const tel = (await telRes.json()) as TelemetrySnapshot;
          if (active) setTelemetry(tel);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const published = articles.filter((a) => a.status === "published").length;
    const drafts = articles.filter((a) => a.status !== "published").length;
    const totalWords = articles.reduce((acc, a) => acc + (a.wordCount || 0), 0);
    return { total: articles.length, published, drafts, totalWords };
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return articles.filter((art) => {
      if (statusFilter !== "all" && art.status !== statusFilter) return false;
      if (categoryFilter !== "all" && art.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        art.title.toLowerCase().includes(q) ||
        art.slug.toLowerCase().includes(q) ||
        art.focusKeyword.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q) ||
        art.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [articles, searchQuery, statusFilter, categoryFilter]);

  const liveReading = useMemo(
    () => calculateReadingMetrics(form.contentMarkdown),
    [form.contentMarkdown]
  );
  const liveHeadings = useMemo(
    () => extractMarkdownHeadings(form.contentMarkdown),
    [form.contentMarkdown]
  );
  const liveSeoAudit = useMemo(
    () =>
      evaluateArticleSeo({
        title: form.title,
        slug: form.slug,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        focusKeyword: form.focusKeyword,
        excerpt: form.excerpt,
        contentMarkdown: form.contentMarkdown,
        coverImageAlt: form.coverImageAlt,
        faqs: form.faqs,
      }),
    [form]
  );

  const openCreateModal = () => {
    setForm(emptyArticleForm());
    setEditorTab("write");
    setWritePaneMode("split");
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditModal = (article: BlogArticle) => {
    setForm(articleToForm(article));
    setEditorTab("write");
    setWritePaneMode("split");
    setFormError(null);
    setEditorOpen(true);
  };

  const insertMarkdownToken = useCallback((before: string, after = "", placeholder = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? form.contentMarkdown.length;
    const end = el.selectionEnd ?? form.contentMarkdown.length;
    const selected = form.contentMarkdown.slice(start, end) || placeholder;
    const nextText =
      form.contentMarkdown.slice(0, start) +
      before +
      selected +
      after +
      form.contentMarkdown.slice(end);
    setForm((prev) => ({ ...prev, contentMarkdown: nextText }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length;
      el.setSelectionRange(cursor, cursor);
    });
  }, [form.contentMarkdown]);

  const addTagFromDraft = () => {
    const clean = form.tagDraft.trim().replace(/,/g, "");
    if (!clean) return;
    if (!form.tags.includes(clean)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, clean].slice(0, 10), tagDraft: "" }));
    } else {
      setForm((prev) => ({ ...prev, tagDraft: "" }));
    }
  };

  const handleSaveArticle = async (overrideStatus?: ArticleStatus) => {
    setFormError(null);
    if (!form.title.trim()) {
      setFormError("Article headline is required.");
      setEditorTab("write");
      return;
    }
    if (!form.contentMarkdown.trim()) {
      setFormError("Article body content is required.");
      setEditorTab("write");
      return;
    }

    setSaving(true);
    const nextStatus = overrideStatus || form.status;
    const payload = {
      title: form.title.trim(),
      slug: (form.slug || slugifyText(form.title)).trim(),
      subtitle: form.subtitle.trim(),
      excerpt: form.excerpt.trim(),
      contentMarkdown: form.contentMarkdown,
      category: form.category,
      tags: form.tags,
      coverImage: form.coverImage.trim() || "/blog/enterprise-rag-2027.jpg",
      coverImageAlt: (form.coverImageAlt || form.title).trim(),
      authorName: form.authorName.trim() || "Priyanshu Rai",
      authorRole: form.authorRole.trim(),
      authorBio: form.authorBio.trim(),
      authorLinkedIn: form.authorLinkedIn.trim(),
      metaTitle: (form.metaTitle || form.title).trim(),
      metaDescription: (form.metaDescription || form.excerpt).trim(),
      canonicalUrl: form.canonicalUrl.trim(),
      focusKeyword: form.focusKeyword.trim(),
      faqs: form.faqs.filter((f) => f.q.trim() && f.a.trim()),
      status: nextStatus,
      featured: form.featured,
      publishedAt:
        nextStatus === "published" && !form.publishedAt
          ? new Date().toISOString()
          : form.publishedAt
          ? new Date(form.publishedAt).toISOString()
          : null,
    };

    try {
      const endpoint = form.id
        ? `/api/admin/articles/${encodeURIComponent(form.id)}`
        : "/api/admin/articles";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; article?: BlogArticle };
      if (!res.ok || !data.article) {
        setFormError(data.error || "Unable to save article.");
        return;
      }

      setEditorOpen(false);
      await fetchArticlesAndTelemetry();
      notify(
        form.id
          ? `Saved "${data.article.title}" (${data.article.status}).`
          : `Created "${data.article.title}" (${data.article.status}).`
      );
    } catch {
      setFormError("Network error while saving article.");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPatch = async (
    article: BlogArticle,
    patch: Partial<BlogArticle>,
    successMsg: string
  ) => {
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(article.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        notify("Failed to update article.", "err");
        return;
      }
      await fetchArticlesAndTelemetry();
      notify(successMsg);
    } catch {
      notify("Network error updating article.", "err");
    }
  };

  const handleDuplicate = async (article: BlogArticle) => {
    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: `${article.title} (Copy)`,
          slug: `${article.slug}-copy`,
          subtitle: article.subtitle,
          excerpt: article.excerpt,
          contentMarkdown: article.contentMarkdown,
          category: article.category,
          tags: article.tags,
          coverImage: article.coverImage,
          coverImageAlt: article.coverImageAlt,
          authorName: article.authorName,
          authorRole: article.authorRole,
          authorBio: article.authorBio,
          authorLinkedIn: article.authorLinkedIn,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          focusKeyword: article.focusKeyword,
          faqs: article.faqs,
          status: "draft",
          featured: false,
        }),
      });
      if (!res.ok) {
        notify("Could not duplicate article.", "err");
        return;
      }
      await fetchArticlesAndTelemetry();
      notify(`Cloned "${article.title}" into a new draft.`);
    } catch {
      notify("Network error duplicating article.", "err");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        notify("Delete failed.", "err");
        return;
      }
      const deletedTitle = deleteTarget.title;
      setDeleteTarget(null);
      await fetchArticlesAndTelemetry();
      notify(`Deleted article "${deletedTitle}".`);
    } catch {
      notify("Network error deleting article.", "err");
    }
  };

  const handlePingIndexNow = async (urls?: string[]) => {
    setIndexNowPending(true);
    try {
      const res = await fetch("/api/admin/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(urls ? { urls } : {}),
      });
      const data = (await res.json()) as { message?: string; submitted?: boolean };
      notify(data.message || "IndexNow ping completed.", data.submitted ? "ok" : "err");
    } catch {
      notify("Network error contacting IndexNow endpoint.", "err");
    } finally {
      setIndexNowPending(false);
    }
  };

  const copyArticleUrl = async (slug: string) => {
    const url = `${SITE_URL}/blog/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      notify(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 ${
            toast.kind === "ok"
              ? "bg-slate-950 text-white border-slate-800"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <span>Blog &amp; Editorial Articles CMS</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Author Markdown guides with automated Table of Contents, AEO FAQ schema, live SERP optimizer, and IndexNow pings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowTelemetryDrawer((v) => !v)}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Referrals ({telemetry.totalViews30d})</span>
          </button>

          <button
            type="button"
            onClick={() => handlePingIndexNow()}
            disabled={indexNowPending}
            className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className={`w-4 h-4 text-emerald-600 ${indexNowPending ? "animate-pulse" : ""}`} />
            <span>{indexNowPending ? "Pinging..." : "Ping IndexNow"}</span>
          </button>

          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Rss className="w-4 h-4 text-amber-600" />
            <span>RSS</span>
          </a>

          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Articles", value: String(metrics.total), icon: BookOpen },
          { label: "Published Live", value: String(metrics.published), icon: Globe },
          { label: "Drafts / Archived", value: String(metrics.drafts), icon: Clock },
          {
            label: "Total Indexed Words",
            value: metrics.totalWords.toLocaleString(),
            icon: Layers,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl p-5 border border-slate-200/70 flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-500">{kpi.label}</div>
                <div className="text-2xl font-bold text-slate-950 mt-1">{kpi.value}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional Referral & Top Pages Panel */}
      {showTelemetryDrawer && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/70 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider mb-3">
              30-Day Search &amp; AI Referrer Domains
            </h2>
            {telemetry.sources.length === 0 ? (
              <p className="text-xs text-slate-500">
                No public visits recorded yet. Visits from Google, ChatGPT Search, Perplexity, Claude, Bing, and Direct traffic appear here automatically without cookies.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border rounded-xl border-slate-200">
                {telemetry.sources.map((src) => (
                  <div
                    key={src.source}
                    className="px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono font-semibold text-slate-800">{src.source}</span>
                    <span className="text-slate-600">{src.views} hits</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider mb-3">
              Top Visited Pages &amp; Guides
            </h2>
            {telemetry.pages.length === 0 ? (
              <p className="text-xs text-slate-500">
                Page counters increment automatically as visitors browse routes.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border rounded-xl border-slate-200">
                {telemetry.pages.map((p) => (
                  <div
                    key={p.path}
                    className="px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-slate-800 truncate pr-4">{p.path}</span>
                    <span className="text-slate-600 shrink-0">{p.views} views</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "published", "draft", "archived"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize cursor-pointer ${
                statusFilter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | ArticleCategory)}
            aria-label="Filter by category"
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="all">All Categories</option>
            {ARTICLE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, slug, tag..."
              className="w-full min-h-[38px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-label="Card view"
              className={`p-2 rounded-lg cursor-pointer ${
                viewMode === "cards" ? "bg-white shadow-xs text-slate-950" : "text-slate-500"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              className={`p-2 rounded-lg cursor-pointer ${
                viewMode === "table" ? "bg-white shadow-xs text-slate-950" : "text-slate-500"
              }`}
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Article Listing */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/70 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading blog database...</span>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/70 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">No articles found matching these criteria.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
          >
            Create your first engineering article
          </button>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredArticles.map((art) => {
            const seo = evaluateArticleSeo(art);
            return (
              <article
                key={art.id}
                className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden flex flex-col justify-between shadow-xs"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={art.coverImage || "/blog/enterprise-rag-2027.jpg"}
                      alt={art.coverImageAlt || art.title}
                      className="w-24 h-16 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border capitalize ${STATUS_BADGE[art.status]}`}
                        >
                          {art.status}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {art.category}
                        </span>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                            seo.score >= 85
                              ? "bg-emerald-50 text-emerald-700"
                              : seo.score >= 60
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          SEO {seo.score}%
                        </span>
                        {art.featured && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-blue-600" /> Featured
                          </span>
                        )}
                      </div>

                      <h2 className="font-bold text-slate-950 text-base leading-snug line-clamp-2">
                        {art.title}
                      </h2>

                      <div className="text-xs font-mono text-slate-500 truncate">
                        /blog/{art.slug}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {art.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span>{art.authorName}</span>
                    <span>·</span>
                    <span>{art.wordCount} words</span>
                    <span>·</span>
                    <span>{art.readingTimeMinutes} min read</span>
                    <span>·</span>
                    <span>{art.faqs.length} FAQs</span>
                    <span>·</span>
                    <span>{art.viewCount} views</span>
                    <span>·</span>
                    <span>{formatShortDate(art.publishedAt)}</span>
                  </div>
                </div>

                <div className="px-6 py-3 bg-slate-50/70 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(art)}
                      className="min-h-[34px] px-3 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPatch(
                          art,
                          {
                            status: art.status === "published" ? "draft" : "published",
                            publishedAt:
                              art.status === "published"
                                ? art.publishedAt
                                : art.publishedAt || new Date().toISOString(),
                          },
                          art.status === "published"
                            ? `Moved "${art.title}" back to draft.`
                            : `Published "${art.title}" live and queued IndexNow ping.`
                        )
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                      title={art.status === "published" ? "Unpublish to draft" : "Publish live"}
                    >
                      {art.status === "published" ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" /> Publish
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleQuickPatch(
                          art,
                          { featured: !art.featured },
                          art.featured ? "Removed featured highlight." : "Set as featured article."
                        )
                      }
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 cursor-pointer"
                      title="Toggle featured status"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          art.featured ? "text-amber-500 fill-amber-400" : "text-slate-400"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(art)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 cursor-pointer"
                      title="Duplicate as draft"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyArticleUrl(art.slug)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                      title="Copy canonical permalink"
                    >
                      {copiedSlug === art.slug ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {art.status === "published" && (
                      <a
                        href={`/blog/${art.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1 font-semibold"
                      >
                        Live <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(art)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/70 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Article</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">SEO</th>
                <th className="py-3.5 px-4">Words</th>
                <th className="py-3.5 px-4">Views</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredArticles.map((art) => {
                const seo = evaluateArticleSeo(art);
                return (
                  <tr key={art.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-950">{art.title}</div>
                      <div className="font-mono text-[11px] text-slate-500">/blog/{art.slug}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">{art.category}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded border font-semibold capitalize ${STATUS_BADGE[art.status]}`}
                      >
                        {art.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{seo.score}%</td>
                    <td className="py-3.5 px-4 font-mono">{art.wordCount}</td>
                    <td className="py-3.5 px-4 font-mono">{art.viewCount}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(art)}
                        className="text-blue-700 font-semibold hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(art)}
                        className="text-rose-600 font-semibold hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Editorial Create / Edit Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={form.id ? "Edit Blog Article" : "Create Blog Article"}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-slate-950 text-lg">
                  {form.id ? "Edit Engineering Article" : "Write New Engineering Article"}
                </h2>
                <span
                  className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-semibold ${
                    liveSeoAudit.score >= 85
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  SEO/AEO Score: {liveSeoAudit.score}%
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {liveReading.wordCount} words · {liveReading.readingTimeMinutes} min read
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(["write", "seo", "meta"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEditorTab(tab)}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      editorTab === tab
                        ? "bg-slate-900 text-white"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {tab === "write"
                      ? "1. Write & Preview"
                      : tab === "seo"
                      ? "2. SEO, AEO & FAQs"
                      : "3. Media & Author"}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  aria-label="Close editor"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {editorTab === "write" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase">
                        Article Headline (H1)
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => {
                          const title = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            title,
                            slug: prev.slugLocked ? prev.slug : slugifyText(title),
                          }));
                        }}
                        placeholder="e.g., Permission-Scoped RAG Architecture for Enterprise Search"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="lg:col-span-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 uppercase">
                          URL Slug (/blog/...)
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, slugLocked: !prev.slugLocked }))
                          }
                          className="text-[11px] font-medium text-blue-600 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {form.slugLocked ? (
                            <>
                              <Lock className="w-3 h-3" /> Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" /> Auto-sync
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            slug: slugifyText(e.target.value),
                            slugLocked: true,
                          }))
                        }
                        placeholder="permission-scoped-rag"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={form.subtitle}
                        onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                        placeholder="Technical summary displayed directly below the title..."
                        className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase">
                        Card Excerpt
                      </label>
                      <input
                        type="text"
                        value={form.excerpt}
                        onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                        placeholder="Concise 1-2 sentence hook for /blog cards and RSS feeds..."
                        className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Markdown Toolbar & Split Switcher */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {MARKDOWN_TOOLBAR_BUTTONS.map((btn) => {
                          const Icon = btn.icon;
                          return (
                            <button
                              key={btn.label}
                              type="button"
                              onClick={() => insertMarkdownToken(btn.before, btn.after, btn.placeholder)}
                              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{btn.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
                        {(["write", "split", "preview"] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setWritePaneMode(m)}
                            className={`px-2.5 py-1 rounded capitalize cursor-pointer ${
                              writePaneMode === m ? "bg-slate-900 text-white" : "text-slate-600"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`grid ${
                        writePaneMode === "split" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                      } divide-y lg:divide-y-0 lg:divide-x divide-slate-200`}
                    >
                      {writePaneMode !== "preview" && (
                        <textarea
                          ref={textareaRef}
                          rows={16}
                          value={form.contentMarkdown}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, contentMarkdown: e.target.value }))
                          }
                          placeholder="Write Markdown content using ## H2 and ### H3 headings..."
                          className="w-full p-4 font-mono text-xs sm:text-sm text-slate-900 focus:outline-none resize-y min-h-[360px]"
                        />
                      )}

                      {writePaneMode !== "write" && (
                        <div className="p-5 sm:p-6 bg-white overflow-y-auto max-h-[460px]">
                          <div className="text-[11px] font-mono text-slate-400 uppercase mb-3">
                            Live Reader Preview · {liveHeadings.length} TOC Headings
                          </div>
                          <MarkdownArticle markdown={form.contentMarkdown} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {editorTab === "seo" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-5">
                    {/* Google SERP Preview */}
                    <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/50 space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                        Live Google SERP Preview
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        {SITE_URL}/blog/{form.slug || "article-slug"}
                      </div>
                      <div className="text-lg font-medium text-blue-700 leading-snug">
                        {form.metaTitle || form.title || "Article Title"} | Factual Technologies
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {form.metaDescription ||
                          form.excerpt ||
                          "Write a concise meta description (120–160 characters) summarizing the architecture takeaways."}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase">
                          Focus Keyword
                        </label>
                        <input
                          type="text"
                          value={form.focusKeyword}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, focusKeyword: e.target.value }))
                          }
                          placeholder="e.g., permission-scoped RAG"
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase">
                          Canonical Override (Optional)
                        </label>
                        <input
                          type="url"
                          value={form.canonicalUrl}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, canonicalUrl: e.target.value }))
                          }
                          placeholder={`${SITE_URL}/blog/${form.slug || "..."}`}
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="font-semibold text-slate-700 uppercase">
                          SEO Meta Title
                        </label>
                        <span className="font-mono text-slate-500">
                          {(form.metaTitle || form.title).length}/65
                        </span>
                      </div>
                      <input
                        type="text"
                        value={form.metaTitle}
                        onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
                        placeholder={form.title || "Concise SEO headline"}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <label className="font-semibold text-slate-700 uppercase">
                          SEO Meta Description
                        </label>
                        <span className="font-mono text-slate-500">
                          {(form.metaDescription || form.excerpt).length}/165
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={form.metaDescription}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, metaDescription: e.target.value }))
                        }
                        placeholder="Summarize technical outcomes cleanly for Google and AI Overviews..."
                        className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed"
                      />
                    </div>

                    {/* AEO FAQ Q&A Builder */}
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase text-slate-800">
                            AEO FAQPage Q&amp;A Pairs ({form.faqs.length})
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Automatically emits FAQPage JSON-LD and visible answers for Perplexity, ChatGPT &amp; AI Overviews.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((p) => ({ ...p, faqs: [...p.faqs, { q: "", a: "" }] }))
                          }
                          className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add FAQ
                        </button>
                      </div>

                      {form.faqs.map((faq, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={faq.q}
                              onChange={(e) => {
                                const next = [...form.faqs];
                                next[idx] = { ...next[idx], q: e.target.value };
                                setForm((p) => ({ ...p, faqs: next }));
                              }}
                              placeholder="Question (e.g., How should teams test prompt regressions?)"
                              className="flex-1 min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  faqs: p.faqs.filter((_, i) => i !== idx),
                                }))
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Remove FAQ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={faq.a}
                            onChange={(e) => {
                              const next = [...form.faqs];
                              next[idx] = { ...next[idx], a: e.target.value };
                              setForm((p) => ({ ...p, faqs: next }));
                            }}
                            placeholder="Direct factual answer (40–70 words ideal for Featured Snippets)..."
                            className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live SEO/AEO/GEO Checklist Sidebar */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-white">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-950">
                          SEO / AEO / GEO Checklist
                        </h3>
                        <span className="font-mono text-sm font-bold text-blue-700">
                          {liveSeoAudit.score}%
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            liveSeoAudit.score >= 85
                              ? "bg-emerald-600"
                              : liveSeoAudit.score >= 60
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                          style={{ width: `${liveSeoAudit.score}%` }}
                        />
                      </div>

                      <div className="divide-y divide-slate-100">
                        {liveSeoAudit.checks.map((chk) => (
                          <div key={chk.id} className="py-3 flex items-start gap-2.5">
                            {chk.passed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="text-xs font-semibold text-slate-900">
                                {chk.label}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{chk.hint}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editorTab === "meta" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase">
                          Category
                        </label>
                        <select
                          value={form.category}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              category: e.target.value as ArticleCategory,
                            }))
                          }
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        >
                          {ARTICLE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase">
                          Publication Status
                        </label>
                        <select
                          value={form.status}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, status: e.target.value as ArticleStatus }))
                          }
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published (Live)</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 uppercase">
                          Publish Timestamp
                        </label>
                        <input
                          type="datetime-local"
                          value={form.publishedAt}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, publishedAt: e.target.value }))
                          }
                          className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                        />
                      </div>

                      <label className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-2.5 cursor-pointer bg-slate-50">
                        <input
                          type="checkbox"
                          checked={form.featured}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, featured: e.target.checked }))
                          }
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-xs font-semibold text-slate-800">
                          Feature at top of /blog
                        </span>
                      </label>
                    </div>

                    {/* Tag Chips */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-800"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  tags: p.tags.filter((t) => t !== tag),
                                }))
                              }
                              className="text-slate-400 hover:text-slate-900 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={form.tagDraft}
                          onChange={(e) => setForm((p) => ({ ...p, tagDraft: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              addTagFromDraft();
                            }
                          }}
                          placeholder="Add tag and press Enter (e.g., Next.js, Kubernetes)..."
                          className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                        />
                        <button
                          type="button"
                          onClick={addTagFromDraft}
                          className="px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-200">
                      <label className="text-xs font-semibold text-slate-700 uppercase flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Cover Image &amp; Alt Text
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {COVER_PRESETS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                coverImage: preset.url,
                                coverImageAlt: p.coverImageAlt || preset.label,
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer ${
                              form.coverImage === preset.url
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={form.coverImage}
                        onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                        placeholder="/projects/regulatory-search.jpg or https://..."
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={form.coverImageAlt}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, coverImageAlt: e.target.value }))
                        }
                        placeholder="Descriptive alt text for Google Images..."
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Author E-E-A-T Attribution */}
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 p-5 space-y-4 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-blue-600" /> Author E-E-A-T Identity
                        </h3>
                        <div className="flex gap-1.5">
                          {ARCHITECTS.map((arch) => (
                            <button
                              key={arch.name}
                              type="button"
                              onClick={() =>
                                setForm((p) => ({
                                  ...p,
                                  authorName: arch.name,
                                  authorRole: arch.role,
                                }))
                              }
                              className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium hover:bg-slate-100 cursor-pointer"
                            >
                              {arch.initials}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={form.authorName}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, authorName: e.target.value }))
                          }
                          placeholder="Author Name"
                          className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                        />
                        <input
                          type="text"
                          value={form.authorRole}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, authorRole: e.target.value }))
                          }
                          placeholder="Role / Title"
                          className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                        />
                      </div>

                      <textarea
                        rows={3}
                        value={form.authorBio}
                        onChange={(e) => setForm((p) => ({ ...p, authorBio: e.target.value }))}
                        placeholder="Short technical bio shown on article footer & TechArticle schema..."
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white text-xs"
                      />

                      <input
                        type="url"
                        value={form.authorLinkedIn}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, authorLinkedIn: e.target.value }))
                        }
                        placeholder="Author LinkedIn / GitHub profile URL (https://...)"
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                      />
                    </div>

                    {form.coverImage && (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        <img
                          src={form.coverImage}
                          alt={form.coverImageAlt || "Cover preview"}
                          className="w-full aspect-[16/9] object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveArticle("draft")}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSaveArticle("published")}
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : form.id && form.status === "published" ? "Save & Update Live" : "Publish Live"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-950">Delete Article?</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Permanently remove <strong>{deleteTarget.title}</strong> (/blog/{deleteTarget.slug}) from PostgreSQL, sitemap, and RSS? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
