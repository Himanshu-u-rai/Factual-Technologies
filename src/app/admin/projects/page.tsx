'use client';

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  CheckCircle2,
  ExternalLink,
  Layers,
  Eye,
  EyeOff,
  Clock,
  Tag,
  TrendingUp,
  X,
  AlertCircle,
  Image as ImageIcon,
  Check,
  Copy,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  Globe,
} from "lucide-react";
import {
  getProjects,
  addProject,
  updateProject,
  toggleProjectPublish,
  deleteProject,
  subscribe,
  CaseStudy,
  ProjectCategory,
} from "@/lib/admin-store";

interface CategoryOption {
  label: string;
  value: ProjectCategory | "all";
}

const CATEGORY_TABS: CategoryOption[] = [
  { label: "All Categories", value: "all" },
  { label: "AI & ML", value: "ai" },
  { label: "Web Systems", value: "web" },
  { label: "Cloud Infra", value: "cloud" },
  { label: "Mobile Systems", value: "mobile" },
];

const CATEGORY_MAP: Record<ProjectCategory, { label: string; badgeClasses: string }> = {
  ai: {
    label: "AI & ML",
    badgeClasses: "bg-blue-50 text-blue-700 border-blue-200/80",
  },
  web: {
    label: "Web Systems",
    badgeClasses: "bg-slate-100 text-slate-800 border-slate-300/80",
  },
  cloud: {
    label: "Cloud Infra",
    badgeClasses: "bg-sky-50 text-sky-700 border-sky-200/80",
  },
  mobile: {
    label: "Mobile Systems",
    badgeClasses: "bg-teal-50 text-teal-700 border-teal-200/80",
  },
};

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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateString;
  }
}

interface FormDataShape {
  title: string;
  category: ProjectCategory;
  metrics: string;
  description: string;
  tagsInput: string;
  image: string;
  published: boolean;
}

const DEFAULT_FORM_DATA: FormDataShape = {
  title: "",
  category: "ai",
  metrics: "",
  description: "",
  tagsInput: "",
  image: "",
  published: true,
};

type ModalState =
  | { mode: "closed" }
  | { mode: "creating"; formData: FormDataShape; error: string | null }
  | { mode: "editing"; project: CaseStudy; formData: FormDataShape; error: string | null }
  | { mode: "confirming_delete"; projectId: string };

export default function ProjectsCMSPage() {
  const [projects, setProjects] = useState<CaseStudy[]>([]);
  const [mounted, setMounted] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<ProjectCategory | "all">("all");
  const [publishFilter, setPublishFilter] = useState<"all" | "published" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Discriminated union modal state (prevents overlapping modals & stale form data)
  const [modalState, setModalState] = useState<ModalState>({ mode: "closed" });

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  const updateFormFields = (patch: Partial<FormDataShape>) => {
    setModalState((prev) =>
      prev.mode === "creating" || prev.mode === "editing"
        ? { ...prev, formData: { ...prev.formData, ...patch } }
        : prev
    );
  };

  const setFormError = (msg: string | null) => {
    setModalState((prev) =>
      prev.mode === "creating" || prev.mode === "editing"
        ? { ...prev, error: msg }
        : prev
    );
  };

  // Sync with store
  useEffect(() => {
    setMounted(true);
    document.title = "Case Studies & Portfolio CMS | Factual Console";
    const syncProjects = () => {
      setProjects(getProjects());
    };

    syncProjects();
    const unsub = subscribe(syncProjects);
    return () => unsub();
  }, []);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    CATEGORY_TABS.forEach((cat) => {
      if (cat.value !== "all") {
        counts[cat.value] = projects.filter((p) => p.category === cat.value).length;
      }
    });
    return counts;
  }, [projects]);

  // Overall metrics
  const totalCount = projects.length;
  const publishedCount = projects.filter((p) => p.published).length;
  const draftCount = totalCount - publishedCount;

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((item) => {
      // Category filter
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      // Publish status filter
      if (publishFilter === "published" && !item.published) {
        return false;
      }
      if (publishFilter === "draft" && item.published) {
        return false;
      }
      // Search query (title, metrics, description, tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMetrics = item.metrics.toLowerCase().includes(query);
        const matchesDescription = item.description.toLowerCase().includes(query);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(query));
        const matchesId = item.id.toLowerCase().includes(query);

        if (!matchesTitle && !matchesMetrics && !matchesDescription && !matchesTags && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [projects, categoryFilter, publishFilter, searchQuery]);

  // Open "New" Modal
  const handleOpenNewModal = () => {
    setModalState({
      mode: "creating",
      formData: {
        ...DEFAULT_FORM_DATA,
        tagsInput: "Enterprise AI, Python, Distributed Systems",
        image: "",
      },
      error: null,
    });
  };

  // Open "Edit" Modal
  const handleOpenEditModal = (project: CaseStudy) => {
    setModalState({
      mode: "editing",
      project,
      formData: {
        title: project.title,
        category: project.category,
        metrics: project.metrics,
        description: project.description,
        tagsInput: project.tags.join(", "),
        image: project.image || "",
        published: project.published,
      },
      error: null,
    });
  };

  // Close modals
  const handleCloseModals = () => {
    setModalState({ mode: "closed" });
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalState.mode !== "closed") {
        handleCloseModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalState.mode]);

  const SUGGESTED_TAGS = [
    "PyTorch",
    "Kafka",
    "Next.js 16",
    "Distributed Systems",
    "AWS Cloud",
    "PostgreSQL",
    "Docker",
    "Kubernetes",
    "GraphQL",
    "Rust",
    "TypeScript",
    "FastAPI",
  ];

  const handleAddSuggestedTag = (tag: string) => {
    if (modalState.mode !== "creating" && modalState.mode !== "editing") return;
    const currentTags = modalState.formData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (!currentTags.includes(tag)) {
      const updated = [...currentTags, tag].join(", ");
      updateFormFields({ tagsInput: updated });
    }
  };

  const handleDuplicateProject = (project: CaseStudy) => {
    addProject({
      title: `${project.title} (Draft Copy)`,
      category: project.category,
      metrics: project.metrics,
      description: project.description,
      tags: [...project.tags],
      image: project.image || "",
      published: false,
    });
    showToast(`Duplicated "${project.title}" as draft`);
  };

  // Save New Project
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalState.mode !== "creating") return;
    const { formData } = modalState;

    if (!formData.title.trim()) {
      setFormError("Project Title is required.");
      return;
    }
    if (!formData.metrics.trim()) {
      setFormError("Key Impact Metric is required (e.g., 'Multi-region AWS and GCP streaming').");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Project Description is required.");
      return;
    }

    const tagsArray = formData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    addProject({
      title: formData.title.trim(),
      category: formData.category,
      metrics: formData.metrics.trim(),
      description: formData.description.trim(),
      tags: tagsArray.length > 0 ? tagsArray : ["Enterprise"],
      image: formData.image.trim(),
      published: formData.published,
    });

    showToast(`Case study "${formData.title}" created successfully`);
    handleCloseModals();
  };

  // Save Edit Project
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalState.mode !== "editing") return;
    const { project: editingProject, formData } = modalState;

    if (!formData.title.trim()) {
      setFormError("Project Title is required.");
      return;
    }
    if (!formData.metrics.trim()) {
      setFormError("Key Impact Metric is required.");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Project Description is required.");
      return;
    }

    const tagsArray = formData.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updateProject(editingProject.id, {
      title: formData.title.trim(),
      category: formData.category,
      metrics: formData.metrics.trim(),
      description: formData.description.trim(),
      tags: tagsArray.length > 0 ? tagsArray : ["Enterprise"],
      image: formData.image.trim(),
      published: formData.published,
    });

    showToast(`Updated "${formData.title}"`);
    handleCloseModals();
  };

  // Toggle publish
  const handleTogglePublish = (project: CaseStudy) => {
    toggleProjectPublish(project.id);
    showToast(
      `"${project.title}" set to ${!project.published ? "Published" : "Draft"}`
    );
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    const proj = projects.find((p) => p.id === id);
    deleteProject(id);
    setModalState({ mode: "closed" });
    showToast(`Deleted "${proj?.title || id}" from CMS`);
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
            Case Studies &amp; Portfolio
          </h1>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleOpenNewModal}
            className="min-h-[40px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Case Study</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar (Concentric, hairline border, soft shadow) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Total Case Studies</span>
            <span className="text-2xl font-bold text-slate-950 font-display tabular-nums">{totalCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200/60">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-1">
              Published
            </span>
            <span className="text-2xl font-bold text-slate-900 font-display tabular-nums">{publishedCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200/60">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/70 bg-amber-50/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-700 block mb-1">
              Unpublished Drafts
            </span>
            <span className="text-2xl font-bold text-amber-700 font-display tabular-nums">{draftCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200/60">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200/70 bg-blue-50/20 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-700 block mb-1">Primary Domain</span>
            <span className="text-sm font-bold text-blue-900 mt-1 block">
              AI & Web Infra
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200/60">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main CMS Container */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Category Tabs */}
        <div className="border-b border-slate-200/70 px-4 sm:px-6 pt-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max">
            {CATEGORY_TABS.map((tab) => {
              const count = categoryCounts[tab.value] ?? 0;
              const isActive = categoryFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setCategoryFilter(tab.value)}
                  className={`min-h-[44px] px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 border-b-2 -mb-px focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-blue-50/40"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums transition-colors ${
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

        {/* Toolbar & Filters */}
        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search case studies by title, metric, tags, or description..."
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

          {/* Right: Published Filter & View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Published Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="publish-status-select" className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Status:
              </label>
              <select
                id="publish-status-select"
                value={publishFilter}
                onChange={(e) =>
                  setPublishFilter(e.target.value as "all" | "published" | "draft")
                }
                className="min-h-[44px] px-3 py-2 bg-white text-xs sm:text-sm font-medium text-slate-700 border border-slate-200/80 rounded-xl shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published Only</option>
                <option value="draft">Drafts Only</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white border border-slate-200/80 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode("cards")}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                  viewMode === "cards"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-label="Card Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                aria-label="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* Reset Filter Button */}
            {(searchQuery || categoryFilter !== "all" || publishFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setPublishFilter("all");
                }}
                className="min-h-[44px] px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Content Section: Cards or Table */}
        {filteredProjects.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 stroke-1.5" />
              </div>
              <p className="text-lg font-bold text-slate-950 font-display">No Case Studies Found</p>
              <p className="text-base text-slate-600 leading-relaxed">
                {searchQuery || categoryFilter !== "all" || publishFilter !== "all"
                  ? "No case studies match your active filter criteria. Try resetting your search filters or switching category."
                  : "No projects in this category. Click 'New Case Study' below to publish one to the live showcase."}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {(searchQuery || categoryFilter !== "all" || publishFilter !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                      setPublishFilter("all");
                    }}
                    className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenNewModal}
                  className="min-h-[44px] px-5 py-2.5 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer"
                >
                  Create Case Study
                </button>
              </div>
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* Cards Grid View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const catInfo = CATEGORY_MAP[project.category];
              return (
                <div
                  key={project.id}
                  className="group bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-xs hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden"
                >
                  {/* Card Image Banner */}
                  <div className="relative h-44 bg-slate-950 overflow-hidden flex items-center justify-center">
                    {/* Visual subtle geometric technical grid */}
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

                    {/* Image */}
                    {project.image && !/^\/projects\/(project-\d+|fleet|fintech)\.jpg$/.test(project.image) && (
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                        onError={(e) => {
                          // Hide broken image and fallback to placeholder
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    )}

                    {/* Top Badges Overlay */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                      {/* Category Badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs bg-white border ${catInfo?.badgeClasses || "bg-slate-100 text-slate-800 border-slate-200"}`}
                      >
                        {catInfo?.label || project.category}
                      </span>

                      {/* Instant Publish Toggle Switch */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublish(project);
                        }}
                        className={`min-h-[36px] px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                          project.published
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700"
                        }`}
                        title="Click to toggle publish status"
                      >
                        <span>{project.published ? "Published" : "Draft"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Project Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {project.title}
                      </h3>

                      {/* Highlight Impact Metric */}
                      <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3 flex items-center gap-2.5 text-blue-900">
                        <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold leading-tight">
                          {project.metrics}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {project.description}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60"
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 4 && (
                            <span className="text-[10px] text-slate-400 font-mono self-center">
                              +{project.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Footer: Timestamp & Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(project.updatedAt)}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateProject(project)}
                            className="min-h-[44px] px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none inline-flex items-center gap-1 cursor-pointer"
                            title="Duplicate as draft copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clone</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(project)}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalState({ mode: "confirming_delete", projectId: project.id })}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none inline-flex items-center gap-1 cursor-pointer"
                            title="Delete case study"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table List View */
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/80 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-6 pr-3">Case Study Title</th>
                  <th className="py-3.5 px-3">Domain</th>
                  <th className="py-3.5 px-3">Impact Metric</th>
                  <th className="py-3.5 px-3">Publish State</th>
                  <th className="py-3.5 px-3">Last Updated</th>
                  <th className="py-3.5 pr-6 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProjects.map((project) => {
                  const catInfo = CATEGORY_MAP[project.category];
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Title & snippet */}
                      <td className="py-4 pl-6 pr-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {project.title}
                          </span>
                          <span className="text-xs text-slate-500 line-clamp-1 max-w-md mt-0.5">
                            {project.description}
                          </span>
                          {/* Tags snippet */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {project.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${catInfo?.badgeClasses || "bg-slate-100 text-slate-800 border-slate-200"}`}
                        >
                          {catInfo?.label || project.category}
                        </span>
                      </td>

                      {/* Impact Metric */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {project.metrics}
                        </span>
                      </td>

                      {/* Publish Toggle */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(project)}
                          className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all border focus-visible:ring-2 focus-visible:ring-blue-600 ${
                            project.published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          <span>{project.published ? "Published" : "Draft"}</span>
                        </button>
                      </td>

                      {/* Last Updated */}
                      <td className="py-4 px-3 whitespace-nowrap text-xs text-slate-500 tabular-nums">
                        {formatTimeAgo(project.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pr-6 pl-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicateProject(project)}
                            className="min-h-[44px] px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer inline-flex items-center gap-1"
                            title="Duplicate as draft copy"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clone</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(project)}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalState({ mode: "confirming_delete", projectId: project.id })}
                            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CMS Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Displaying <strong className="text-slate-700 tabular-nums">{filteredProjects.length}</strong> of{" "}
            <strong className="text-slate-700 tabular-nums">{projects.length}</strong> case studies
          </span>
          <span className="text-xs text-slate-500">
            Saved locally in browser storage
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT CASE STUDY */}
      {/* ========================================================================= */}
      {(modalState.mode === "creating" || modalState.mode === "editing") && (() => {
        const isCreating = modalState.mode === "creating";
        const { formData, error: formError } = modalState;
        const idPrefix = isCreating ? "new" : "edit";

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-slate-950/50 transition-opacity animate-in fade-in duration-150"
              onClick={handleCloseModals}
            />

            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    {modalState.mode === "editing" && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded">
                          {modalState.project.id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            modalState.project.published
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {modalState.project.published ? "Live / Published" : "Draft"}
                        </span>
                      </div>
                    )}
                    <h2 className="text-xl font-bold text-slate-950 tracking-tight [text-wrap:balance]">
                      {isCreating ? "Add Enterprise Case Study" : "Edit Case Study"}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 [text-wrap:pretty]">
                      {isCreating
                        ? "Quantify architectural metrics, outcomes, and distributed stack components."
                        : "Update metrics, technical descriptions, or category alignment."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModals}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Error Banner */}
                {formError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={isCreating ? handleCreateSubmit : handleUpdateSubmit} className="space-y-4">
                  {/* Title */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={`${idPrefix}-title`} className="block text-xs font-semibold text-slate-700">
                        Case Study Title *
                      </label>
                      {formError && !formData.title.trim() && (
                        <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Title is required (minimum 5 chars)
                        </span>
                      )}
                    </div>
                    <input
                      id={`${idPrefix}-title`}
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => updateFormFields({ title: e.target.value })}
                      placeholder={isCreating ? "e.g. Regulatory Archive Knowledge Search" : undefined}
                      className="w-full min-h-[44px] px-3.5 py-2 text-base bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    />
                  </div>

                  {/* Grid: Category & Impact Metric */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <label htmlFor={`${idPrefix}-category`} className="block text-xs font-semibold text-slate-700 mb-1">
                        Domain Category *
                      </label>
                      <select
                        id={`${idPrefix}-category`}
                        value={formData.category}
                        onChange={(e) =>
                          updateFormFields({ category: e.target.value as ProjectCategory })
                        }
                        className="w-full min-h-[44px] px-3.5 py-2 text-base bg-white border border-slate-200/80 rounded-xl text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none cursor-pointer"
                      >
                        <option value="ai">AI &amp; ML (ai)</option>
                        <option value="web">Web Systems (web)</option>
                        <option value="cloud">Cloud Infra (cloud)</option>
                        <option value="mobile">Mobile Systems (mobile)</option>
                      </select>
                    </div>

                    {/* Impact Metric */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor={`${idPrefix}-metrics`} className="block text-xs font-semibold text-slate-700">
                          Key Impact Metric *
                        </label>
                        {formError && !formData.metrics.trim() && (
                          <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Metric required
                          </span>
                        )}
                      </div>
                      <input
                        id={`${idPrefix}-metrics`}
                        type="text"
                        required
                        value={formData.metrics}
                        onChange={(e) => updateFormFields({ metrics: e.target.value })}
                        placeholder="e.g. Multi-region AWS and GCP streaming"
                        className="w-full min-h-[44px] px-3.5 py-2 text-base bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={`${idPrefix}-desc`} className="block text-xs font-semibold text-slate-700">
                        Engineering Description &amp; Architecture Overview *
                      </label>
                      {formError && formData.description.trim().length < 20 && (
                        <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Must be at least 20 chars
                        </span>
                      )}
                    </div>
                    <textarea
                      id={`${idPrefix}-desc`}
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => updateFormFields({ description: e.target.value })}
                      placeholder={
                        isCreating
                          ? "Engineered a high-concurrency multi-agent RAG pipeline indexing internal technical documents with sub-50ms retrieval..."
                          : undefined
                      }
                      className="w-full p-3 text-base bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label htmlFor={`${idPrefix}-tags`} className="block text-xs font-semibold text-slate-700 mb-1">
                      Technology Tags (Comma-Separated)
                    </label>
                    <input
                      id={`${idPrefix}-tags`}
                      type="text"
                      value={formData.tagsInput}
                      onChange={(e) => updateFormFields({ tagsInput: e.target.value })}
                      placeholder={isCreating ? "Next.js, TypeScript, Kafka, Docker, Kubernetes" : undefined}
                      className="w-full min-h-[44px] px-3.5 py-2 text-base bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    />
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[11px] font-mono text-slate-500 font-semibold mr-0.5">
                        Quick Tags:
                      </span>
                      {SUGGESTED_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAddSuggestedTag(tag)}
                          className="min-h-[36px] text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/70 transition-colors cursor-pointer"
                        >
                          +{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image URL & Preview */}
                  <div>
                    <label htmlFor={`${idPrefix}-image`} className="block text-xs font-semibold text-slate-700 mb-1">
                      Showcase Cover Image URL
                    </label>
                    <input
                      id={`${idPrefix}-image`}
                      type="text"
                      value={formData.image}
                      onChange={(e) => updateFormFields({ image: e.target.value })}
                      placeholder={isCreating ? "https://..." : undefined}
                      className="w-full min-h-[44px] px-3.5 py-2 text-base bg-white border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    />
                  </div>

                  {/* Live Card Showcase Preview */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Live Showcase Card Preview</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formData.published ? "Live on public feed" : "Draft preview"}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-md">
                          {CATEGORY_MAP[formData.category]?.label || formData.category}
                        </span>
                        <span className="text-xs font-bold font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {formData.metrics || "Metric preview"}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-950 truncate">
                        {formData.title || "Project Title Preview"}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {formData.description || "Project technical overview preview..."}
                      </p>
                    </div>
                  </div>

                  {/* Published Checkbox Toggle */}
                  <div className="pt-2 flex items-center justify-between bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                    <div>
                      <label
                        htmlFor={isCreating ? "publish-toggle" : "edit-publish-toggle"}
                        className="text-xs font-semibold text-slate-800 block cursor-pointer"
                      >
                        {isCreating ? "Publish to Production Showcase" : "Published Status"}
                      </label>
                      <span className="text-[11px] text-slate-400 block">
                        {isCreating
                          ? "When checked, this study will immediately be visible on public case studies feeds."
                          : "Toggle to make visible on public enterprise portfolio."}
                      </span>
                    </div>
                    <input
                      id={isCreating ? "publish-toggle" : "edit-publish-toggle"}
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => updateFormFields({ published: e.target.checked })}
                      className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Footer Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModals}
                      className="min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="min-h-[44px] px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    >
                      {isCreating ? "Create Case Study" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      {modalState.mode === "confirming_delete" && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 transition-opacity"
            onClick={handleCloseModals}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-6 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Case Study?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to remove this case study? This will delete the entry from the CMS store and record an administrative audit event.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(modalState.projectId)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
