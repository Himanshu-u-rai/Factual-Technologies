'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  BarChart3,
  Briefcase,
  Layers,
  Repeat,
  Globe,
  Mail,
  ExternalLink,
  Save,
  RotateCcw,
  CheckCircle2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  TrendingUp,
  Cpu,
  Info,
  Sliders,
  Palette,
  FileText,
  Building,
  HelpCircle,
  Clock,
  Phone,
  Compass,
  Download,
  Upload,
  History,
  Monitor,
  Tablet,
  Smartphone,
  Search,
  X,
  AlertTriangle,
  Copy,
  ChevronDown,
} from "lucide-react";
import {
  useSiteContent,
  StatContent,
  ServiceContent,
  ProjectContent,
  FAQContent,
  ProcessStepContent,
  AboutValueContent,
  WaveAnimationConfig,
  SiteSnapshot,
} from "@/lib/site-store";
import MorphingWaveAnimation, { SHAPES } from "@/components/animations/MorphingWaveAnimation";

type ActiveTab =
  | "hero"
  | "home_sections"
  | "services_page"
  | "work_page"
  | "about_page"
  | "contact_page"
  | "site_meta"
  | "messages"
  | "backup_restore";

let clientItemSeq = 0;

function createClientItemId(prefix: string): string {
  clientItemSeq += 1;
  return `${prefix}-${Date.now()}-${clientItemSeq}`;
}

export default function AdminWebsiteControllerPage() {
  const {
    content,
    isLoaded,
    snapshots,
    updateHero,
    updateStats,
    addStat,
    deleteStat,
    updateServices,
    addService,
    deleteService,
    updateServicesPage,
    addStrategicPillar,
    updateStrategicPillar,
    deleteStrategicPillar,
    addProcessStep,
    deleteProcessStep,
    updateServiceMetrics,
    addServiceMetric,
    deleteServiceMetric,
    updateProjects,
    updateWorkPage,
    updateAboutPage,
    addAboutParagraph,
    updateAboutParagraph,
    deleteAboutParagraph,
    updateVisionMission,
    addAboutValue,
    deleteAboutValue,
    updateContactPage,
    addContactTimeline,
    updateContactTimeline,
    deleteContactTimeline,
    addContactFaq,
    deleteContactFaq,
    updateTestimonials,
    addTestimonial,
    deleteTestimonial,
    updateCtaBanner,
    updateTechStack,
    updateClients,
    updateMeta,
    addNavLink,
    updateNavLink,
    deleteNavLink,
    addFooterCapabilityLink,
    updateFooterCapabilityLink,
    deleteFooterCapabilityLink,
    deleteMessage,
    markMessageRead,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    exportBackupJSON,
    importBackupJSON,
    resetDefaults,
  } = useSiteContent();

  const [activeTab, setActiveTab] = useState<ActiveTab>("hero");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Global Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Discriminated Union (enforces mutual exclusion and scoped state)
  type CmsModalState =
    | { kind: "closed" }
    | { kind: "preview" }
    | { kind: "import"; jsonText: string; error: string | null }
    | { kind: "add_testimonial" }
    | { kind: "confirm_delete"; title: string; description: string; onConfirm: () => void };

  const [modalState, setModalState] = useState<CmsModalState>({ kind: "closed" });

  // Testimonial Form State
  const [newTestimonialData, setNewTestimonialData] = useState({
    quote: "",
    author: "",
    role: "",
    company: "",
    avatar: "",
  });

  // Device Preview Emulator Mode
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Snapshot Creation & File Upload Ref
  const [newSnapshotName, setNewSnapshotName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileReadTokenRef = useRef(0);

  const showPreviewModal = modalState.kind === "preview";
  const showImportModal = modalState.kind === "import";
  const showAddTestimonialModal = modalState.kind === "add_testimonial";
  const deleteConfirm =
    modalState.kind === "confirm_delete"
      ? {
          isOpen: true,
          title: modalState.title,
          description: modalState.description,
          onConfirm: modalState.onConfirm,
        }
      : null;

  const closeAllModals = useCallback(() => {
    fileReadTokenRef.current += 1;
    setModalState({ kind: "closed" });
  }, []);

  const requestDelete = (title: string, description: string, onConfirm: () => void) => {
    fileReadTokenRef.current += 1;
    setModalState({
      kind: "confirm_delete",
      title,
      description,
      onConfirm: () => {
        onConfirm();
        setModalState({ kind: "closed" });
      },
    });
  };

  // Tab Sync with URL search params
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = "Website Controller & CMS | Factual Console";

    const checkTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as ActiveTab | null;
      if (
        tab &&
        [
          "hero",
          "home_sections",
          "services_page",
          "work_page",
          "about_page",
          "contact_page",
          "site_meta",
          "messages",
          "backup_restore",
        ].includes(tab)
      ) {
        setActiveTab(tab);
      }
    };

    const handleTabEvent = (e: Event) => {
      const ce = e as CustomEvent<{ tab?: ActiveTab }>;
      if (ce.detail?.tab) {
        setActiveTab(ce.detail.tab);
      }
    };

    checkTab();
    window.addEventListener("popstate", checkTab);
    window.addEventListener("admin-tab-change", handleTabEvent);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllModals();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", checkTab);
      window.removeEventListener("admin-tab-change", handleTabEvent);
      window.removeEventListener("keydown", handleKeyDown);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      fileReadTokenRef.current += 1;
    };
  }, [closeAllModals]);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("admin-tab-change", { detail: { tab } }));
    }
  };

  // Fallbacks for data structures
  const hero = content.hero;
  const testimonials = content.testimonials || [];
  const ctaBanner = content.ctaBanner || {
    badge: "Enterprise Engagement",
    title: "Ready to Engineer Your Next Competitive Advantage?",
    subtitle:
      "Partner with Factual Technologies to build resilient software, operationalize enterprise AI, and modernize distributed systems designed for the next decade.",
    buttonText: "Schedule a Consultation",
    buttonHref: "/contact",
    secondaryCtaText: "Explore Our Work",
    secondaryCtaHref: "/work",
  };
  const waveConfig = hero.waveConfig || {
    enabled: true,
    activeShape: "sphere",
    autoMorph: true,
    ringCount: 22,
    baseRadius: 215,
    focalLength: 680,
    waveSpeed: 1.1,
    waveAmplitude: 1.0,
    autoRotateSpeed: 0.0045,
    wireframeTheme: "graphite" as const,
    strokeWidth: 1.55,
  };

  const stats = content.stats || [];
  const services = content.services || [];
  const sp = content.servicesPage?.[0] || {
    heroBadge: "Engineering Capabilities",
    heroTitle: "End-to-end capabilities engineered for durability and scale",
    heroSubtitle: "We partner with high-growth startups and established enterprises...",
    slaMetric: "Bi-weekly",
    slaLabel: "SLA Reliability",
    faqs: [],
    processSteps: [],
  };

  const projects = content.projects || [];
  const workPage = content.workPage || {
    heroBadge: "Case Studies & Portfolio",
    heroTitle: "Engineering engagements with verifiable business impact",
    heroSubtitle: "Production web software, multi-cloud migrations, and AI systems built for your engineering team.",
  };

  const aboutPage = content.aboutPage || {
    heroBadge: "About Factual Technologies",
    heroTitle: "Engineering discipline for mission-critical systems",
    heroSubtitle: "",
    foundingConvictionTitle: "Engineered for durability over hype",
    foundingConvictionText: "",
    values: [],
  };

  const contactPage = content.contactPage || {
    heroBadge: "Direct Engineering Intake",
    heroTitle: "Let's architect your next critical system",
    heroSubtitle: "",
    officeAddress: "",
    phone: "",
    email: "",
    businessHours: "",
    responseTime: "",
    faqs: [],
  };

  const techStack = content.techStack || { marqueeSpeed: 45, reverseSpeed: 45 };
  const clients = content.clients || [];
  const meta = content.meta;
  const messages = content.messages || [];

  // Controllers catalog for page selector dropdown
  interface PageControllerOption {
    id: ActiveTab;
    title: string;
    category: "Homepage Sections" | "Core Subpages" | "Site Systems & Ingestion";
    route: string;
    liveUrl: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | null;
  }

  const pageControllers: PageControllerOption[] = useMemo(() => [
    {
      id: "hero",
      title: "Hero & 3D Wave Engine",
      category: "Homepage Sections",
      route: "/ (Top Fold)",
      liveUrl: "/",
      description: "Headline, typewriter looping phrases, CTAs, and 12-geometry 3D wave engine",
      icon: Sliders,
      badge: null,
    },
    {
      id: "home_sections",
      title: "Homepage Sections & Marquee",
      category: "Homepage Sections",
      route: "/ (Body)",
      liveUrl: "/",
      description: "Impact metrics, capability pillars, client logo marquee speed, and testimonials",
      icon: BarChart3,
      badge: `${stats.length} Stats`,
    },
    {
      id: "services_page",
      title: "Services & Capabilities (/services)",
      category: "Core Subpages",
      route: "/services",
      liveUrl: "/services",
      description: "Engineering pillars, SLA reliability benchmarks, architecture steps, and FAQs",
      icon: Briefcase,
      badge: null,
    },
    {
      id: "work_page",
      title: "Work & Case Studies (/work)",
      category: "Core Subpages",
      route: "/work",
      liveUrl: "/work",
      description: "Portfolio hero headline, domain categorization, and featured case studies showcase",
      icon: Layers,
      badge: `${projects.length} Studies`,
    },
    {
      id: "about_page",
      title: "About & Engineering Vision (/about)",
      category: "Core Subpages",
      route: "/about",
      liveUrl: "/about",
      description: "Founding conviction manifesto, institutional principles, and core value cards",
      icon: Compass,
      badge: null,
    },
    {
      id: "contact_page",
      title: "Contact & Intake (/contact)",
      category: "Core Subpages",
      route: "/contact",
      liveUrl: "/contact",
      description: "Office locations, direct engineering emails, phone, response time SLAs, and FAQs",
      icon: Phone,
      badge: null,
    },
    {
      id: "site_meta",
      title: "Global Layout & Banner",
      category: "Site Systems & Ingestion",
      route: "Site-Wide",
      liveUrl: "/",
      description: "Bottom enterprise engagement CTA banner, headline, and site metadata",
      icon: Globe,
      badge: null,
    },
    {
      id: "messages",
      title: "Inbound Messages & Leads",
      category: "Site Systems & Ingestion",
      route: "/contact (Intake)",
      liveUrl: "/contact",
      description: "Real-time client proposals, unread badge alerts, and direct contact triage",
      icon: Mail,
      badge: messages.filter((m) => !m.read).length > 0
        ? `${messages.filter((m) => !m.read).length} unread`
        : `${messages.length} total`,
    },
    {
      id: "backup_restore",
      title: "Snapshots & Disaster Recovery",
      category: "Site Systems & Ingestion",
      route: "System Store",
      liveUrl: "/",
      description: "Point-in-time state snapshots, 1-click instant rollbacks, and JSON backups",
      icon: History,
      badge: `${snapshots.length} saved`,
    },
  ], [stats.length, projects.length, messages, snapshots.length]);

  const activeController = pageControllers.find((c) => c.id === activeTab) || pageControllers[0];
  const ActiveControllerIcon = activeController.icon;

  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const handleReset = () => {
    requestDelete(
      "Reset Website Baseline",
      "Reset all website content back to default values? An automatic safety backup snapshot will be created before resetting.",
      () => {
        resetDefaults();
        showToast("All website pages restored to default baseline. Safety backup created.");
      }
    );
  };

  // Helper for updating wave config
  const handleUpdateWave = (updates: Partial<WaveAnimationConfig>) => {
    const nextConfig: WaveAnimationConfig = {
      ...waveConfig,
      ...updates,
    };
    updateHero({ waveConfig: nextConfig });
    showToast("3D Wave parameter updated.");
  };

  // Rotating phrases helpers
  const handleAddPhrase = () => {
    const newPhrases = [...hero.rotatingPhrases, "autonomous workflows"];
    updateHero({ rotatingPhrases: newPhrases });
    showToast("Rotating phrase added.");
  };

  const handleUpdatePhrase = (index: number, val: string) => {
    const newPhrases = [...hero.rotatingPhrases];
    newPhrases[index] = val;
    updateHero({ rotatingPhrases: newPhrases });
  };

  const handleRemovePhrase = (index: number) => {
    const newPhrases = hero.rotatingPhrases.filter((_, i) => i !== index);
    updateHero({ rotatingPhrases: newPhrases });
    showToast("Rotating phrase removed.");
  };

  // Stats helpers
  const handleUpdateStat = (id: string, field: "value" | "label", val: string) => {
    const updated = stats.map((s) => (s.id === id ? { ...s, [field]: val } : s));
    updateStats(updated);
  };

  // Services helpers
  const handleUpdateService = (id: string, updates: Partial<ServiceContent>) => {
    const updated = services.map((s) => (s.id === id ? { ...s, ...updates } : s));
    updateServices(updated);
  };

  const handleUpdateServiceCap = (serviceId: string, capIndex: number, val: string) => {
    const updated = services.map((s) => {
      if (s.id === serviceId) {
        const newCaps = [...s.capabilities];
        newCaps[capIndex] = val;
        return { ...s, capabilities: newCaps };
      }
      return s;
    });
    updateServices(updated);
  };

  const handleCreateServicePillar = () => {
    addService({
      title: "New Engineering Capability",
      description: "Enterprise system design, architecture review, and hardened delivery pipeline.",
      icon: "Code",
      capabilities: ["Architectural Specification", "Production CI/CD", "Automated Testing"],
      enabled: true,
    });
    showToast("New service capability pillar added.");
  };

  // Process Steps helpers
  const handleUpdateProcessStep = (id: string, updates: Partial<ProcessStepContent>) => {
    const updatedSteps = (sp.processSteps || []).map((step) =>
      step.id === id ? { ...step, ...updates } : step
    );
    updateServicesPage({ processSteps: updatedSteps });
  };

  const handleAddProcessStep = () => {
    const nextIdx = (sp.processSteps || []).length + 1;
    addProcessStep({
      step: nextIdx < 10 ? `0${nextIdx}` : `${nextIdx}`,
      title: "New Delivery Milestone",
      description: "Milestone deliverable specification and automated verification checkpoints.",
    });
    showToast("New delivery milestone added.");
  };

  const handleDeleteProcessStep = (id: string) => {
    deleteProcessStep(id);
    showToast("Delivery milestone removed.");
  };

  // Strategic Pillars helpers
  const handleAddStrategicPillar = () => {
    addStrategicPillar({
      title: "New Strategic Capability",
      description: "Engineered outcome driving measurable enterprise velocity and technical leverage.",
      icon: "Rocket",
      bullet: "Deterministic verification and automated guardrails",
    });
    showToast("New strategic pillar added.");
  };

  const handleDeleteStrategicPillar = (id: string) => {
    deleteStrategicPillar(id);
    showToast("Strategic pillar removed.");
  };

  // Services Metrics helpers
  const handleUpdateServiceMetric = (id: string, field: "value" | "label", val: string) => {
    const current = sp.metrics && sp.metrics.length > 0 ? sp.metrics : [
      { id: "sm-1", value: sp.slaMetric || "Bi-weekly", label: sp.slaLabel || "Release cadence" },
      { id: "sm-2", value: "Direct", label: "Senior engineering" },
      { id: "sm-3", value: "Full IP", label: "Source ownership" },
      { id: "sm-4", value: "Weekly", label: "Architecture review" },
    ];
    const updated = current.map((m) => (m.id === id ? { ...m, [field]: val } : m));
    updateServiceMetrics(updated);
  };

  const handleAddServiceMetric = () => {
    addServiceMetric({
      value: "2 Weeks",
      label: "Sprint cadence",
    });
    showToast("New services metric added.");
  };

  const handleDeleteServiceMetric = (id: string) => {
    deleteServiceMetric(id);
    showToast("Services metric removed.");
  };

  // About Narrative & Vision/Mission helpers
  const handleAddAboutParagraph = () => {
    addAboutParagraph("New narrative section detailing our founding technical conviction and engineering methodology.");
    showToast("New manifesto paragraph added.");
  };

  const handleDeleteAboutParagraph = (index: number) => {
    deleteAboutParagraph(index);
    showToast("Manifesto paragraph removed.");
  };

  // Contact Timeline helpers
  const handleAddContactTimeline = () => {
    const nextNum = (contactPage.timeline || []).length + 1;
    addContactTimeline({
      phase: `Step ${nextNum}`,
      timeframe: "Days 5–7",
      title: "Architecture Sign-off",
      description: "Written scope, technical specification, and delivery schedule.",
      icon: "CheckCircle",
    });
    showToast("New timeline phase added.");
  };

  const handleDeleteContactTimeline = (id: string) => {
    deleteContactTimeline(id);
    showToast("Timeline phase removed.");
  };

  // Navigation Links helpers
  const handleAddNavLink = () => {
    const label = prompt("Enter navigation link label (e.g. Careers, Blog):");
    if (label && label.trim()) {
      const href = prompt("Enter link URL (e.g. /careers, /blog):") || `/${label.toLowerCase()}`;
      addNavLink({ label: label.trim(), href: href.trim() });
      showToast(`Added navigation link '${label.trim()}'.`);
    }
  };

  const handleDeleteNavLink = (id: string) => {
    deleteNavLink(id);
    showToast("Navigation link removed.");
  };

  // Services FAQ helpers
  const handleAddServiceFaq = () => {
    const newFaq: FAQContent = {
      id: createClientItemId("faq"),
      q: "New Technical Specification Question",
      a: "Detailed architectural breakdown and compliance guarantee provided by our senior engineering leads.",
    };
    updateServicesPage({ faqs: [...(sp.faqs || []), newFaq] });
    showToast("Procurement FAQ added.");
  };

  const handleUpdateServiceFaq = (id: string, field: "q" | "a", val: string) => {
    const updatedFaqs = (sp.faqs || []).map((faq) =>
      faq.id === id ? { ...faq, [field]: val } : faq
    );
    updateServicesPage({ faqs: updatedFaqs });
  };

  const handleRemoveServiceFaq = (id: string) => {
    const updatedFaqs = (sp.faqs || []).filter((faq) => faq.id !== id);
    updateServicesPage({ faqs: updatedFaqs });
    showToast("Procurement FAQ removed.");
  };

  // Projects helpers
  const handleToggleProject = (id: string) => {
    const updated = projects.map((p) =>
      p.id === id ? { ...p, featuredOnHome: !p.featuredOnHome } : p
    );
    updateProjects(updated);
    showToast("Project visibility updated on homepage.");
  };

  const handleUpdateProject = (id: string, updates: Partial<ProjectContent>) => {
    const updated = projects.map((p) => (p.id === id ? { ...p, ...updates } : p));
    updateProjects(updated);
  };

  const handleAddProject = () => {
    const newProject: ProjectContent = {
      id: createClientItemId("proj"),
      title: "New Client Engagement",
      category: "ai",
      metrics: "In production",
      description: "Software engagement focused on reliability, clean architecture, and maintainable delivery.",
      tags: ["TypeScript", "Next.js", "PostgreSQL"],
      image: "/projects/regulatory-search.jpg",
      featuredOnHome: false,
    };
    updateProjects([newProject, ...projects]);
    showToast("New case study created.");
  };

  const handleDeleteProject = (id: string, title?: string) => {
    requestDelete(
      "Delete Case Study",
      `Are you sure you want to remove "${title || "this case study"}" from portfolio? This action cannot be undone.`,
      () => {
        updateProjects(projects.filter((p) => p.id !== id));
        showToast("Case study removed.");
      }
    );
  };

  // About Values helpers
  const handleUpdateAboutValue = (id: string, field: "title" | "description", val: string) => {
    const updatedValues = (aboutPage.values || []).map((v) =>
      v.id === id ? { ...v, [field]: val } : v
    );
    updateAboutPage({ values: updatedValues });
  };

  const handleAddAboutValue = () => {
    addAboutValue({
      title: "New Core Principle",
      description: "Engineered discipline with verifiable performance metrics and institutional code standards.",
    });
    showToast("New value card added.");
  };

  // Contact FAQ helpers
  const handleAddContactFaq = () => {
    addContactFaq({
      q: "What is your typical discovery timeline?",
      a: "Our principal architects schedule discovery sessions within 24 to 48 hours of initial intake.",
    });
    showToast("Contact FAQ added.");
  };

  // Clients helpers
  const handleAddClient = () => {
    const next = prompt("Enter client company name:");
    if (next && next.trim()) {
      updateClients([...clients, next.trim()]);
      showToast(`Added '${next.trim()}' to client marquee.`);
    }
  };

  const handleRemoveClient = (idx: number) => {
    const updated = clients.filter((_, i) => i !== idx);
    updateClients(updated);
    showToast("Removed client company.");
  };

  // Snapshot & Backup Handlers
  const handleCreateSnapshot = () => {
    const name = newSnapshotName.trim() || `Manual snapshot (${new Date().toLocaleTimeString()})`;
    createSnapshot(name);
    setNewSnapshotName("");
    showToast(`Snapshot '${name}' saved.`);
  };

  const handleRestoreSnapshot = (id: string, name?: string) => {
    requestDelete(
      "Rollback to Backup Snapshot",
      `Are you sure you want to roll back to snapshot "${name || "selected snapshot"}"? Any uncommitted changes will be replaced.`,
      () => {
        const ok = restoreSnapshot(id);
        if (ok) {
          showToast("Site content rolled back successfully.");
        } else {
          showToast("Failed to restore snapshot.");
        }
      }
    );
  };

  const handleExportJSON = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factual-site-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Full site backup JSON downloaded.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const readToken = ++fileReadTokenRef.current;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (fileReadTokenRef.current !== readToken) return;
      const text = (event.target?.result as string) || "";
      setModalState({ kind: "import", jsonText: text, error: null });
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (modalState.kind !== "import" || !modalState.jsonText.trim()) return;
    const res = importBackupJSON(modalState.jsonText);
    if (res.success) {
      setModalState({ kind: "closed" });
      showToast("Site backup imported and activated successfully.");
    } else {
      setModalState({
        kind: "import",
        jsonText: modalState.jsonText,
        error: res.error || "Invalid backup JSON format.",
      });
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadMessagesCount = messages.filter((m) => !m.read).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight font-display">
            {activeController.title}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Target Live Route Link */}
          <Link
            href={activeController.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title={`Open live route ${activeController.liveUrl} in new tab`}
          >
            <span>Live Route</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          {/* Live Device Emulator Modal Trigger */}
          <button
            type="button"
            onClick={() => setModalState({ kind: "preview" })}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Preview live site on desktop, tablet, or mobile"
          >
            <Monitor className="w-3.5 h-3.5 text-slate-500" />
            <span>Device Preview</span>
          </button>

          {/* Export Backup JSON */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Download full JSON configuration backup"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          {/* Reset Baseline */}
          <button
            onClick={handleReset}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium text-xs sm:text-sm transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
            title="Reset to initial default website content"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* TAB 1: HERO & 3D WAVE CONTROLLER */}
      {activeTab === "hero" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Hero Content Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Hero Copy &amp; CTAs</h2>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Main Headline Fixed Prefix
              </label>
              <input
                type="text"
                value={hero.headlinePrefix}
                onChange={(e) => updateHero({ headlinePrefix: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                placeholder="We build"
              />
            </div>

            {/* Rotating Phrases in Loop */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Rotating Phrases
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleAddPhrase}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phrase</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hero.rotatingPhrases.map((phrase, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 w-5">#{idx + 1}</span>
                    <input
                      type="text"
                      value={phrase}
                      onChange={(e) => handleUpdatePhrase(idx, e.target.value)}
                      className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    />
                    {hero.rotatingPhrases.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          requestDelete(
                            "Delete Rotating Phrase",
                            `Are you sure you want to remove phrase "${phrase}"?`,
                            () => handleRemovePhrase(idx)
                          )
                        }
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete phrase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Subtitle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Description Paragraph
              </label>
              <textarea
                rows={3}
                value={hero.subtitle}
                onChange={(e) => updateHero({ subtitle: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              />
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs font-bold text-slate-900 uppercase">Primary CTA Button</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={hero.primaryCtaText}
                    onChange={(e) => updateHero({ primaryCtaText: e.target.value })}
                    placeholder="Button Label"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                  <input
                    type="text"
                    value={hero.primaryCtaLink}
                    onChange={(e) => updateHero({ primaryCtaLink: e.target.value })}
                    placeholder="Target Link (e.g. /contact)"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-xs font-bold text-slate-900 uppercase">Secondary CTA Button</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={hero.secondaryCtaText}
                    onChange={(e) => updateHero({ secondaryCtaText: e.target.value })}
                    placeholder="Button Label"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                  <input
                    type="text"
                    value={hero.secondaryCtaLink}
                    onChange={(e) => updateHero({ secondaryCtaLink: e.target.value })}
                    placeholder="Target Link (e.g. /work)"
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3D WAVE ENGINE */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  3D Wave Animation
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const next = !hero.showWaveAnimation;
                    updateHero({ showWaveAnimation: next });
                    showToast(`Wave visibility ${next ? "enabled" : "hidden"}`);
                  }}
                  className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    hero.showWaveAnimation
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {hero.showWaveAnimation ? "Hero Wave Active" : "Wave Hidden"}
                </button>
              </div>
            </div>

            {/* Split Grid: Left = Sliders & Controls, Right = Live Interactive Wave Stage */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Shape Selector & Sliders */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. All 12 Procedural Shapes Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Active Shape Target (12 Procedural Geometries)
                    </label>
                    <span className="text-xs text-blue-700 font-semibold uppercase">
                      Current: {waveConfig.activeShape}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SHAPES.map((sh) => {
                      const isSelected = waveConfig.activeShape === sh.id;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => handleUpdateWave({ activeShape: sh.id })}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          <span className="truncate">{sh.shortName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Theme Selector & Auto-Morph Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Wireframe Color Theme
                    </label>
                    <select
                      value={waveConfig.wireframeTheme || "graphite"}
                      onChange={(e) =>
                        handleUpdateWave({
                          wireframeTheme: e.target.value as "graphite" | "silver" | "blue" | "dark",
                        })
                      }
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                    >
                      <option value="graphite">Slate Graphite (Technical)</option>
                      <option value="silver">Architectural Silver (Mist)</option>
                      <option value="blue">Electric Blue (Cyber High-Tech)</option>
                      <option value="dark">Obsidian Dark (Deep Contrast)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide block">
                        Harmonic Auto-Morph
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Seamlessly morphs to next shape at each wave cycle.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateWave({ autoMorph: !waveConfig.autoMorph })}
                      className={`min-h-[40px] w-full px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        waveConfig.autoMorph
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {waveConfig.autoMorph ? "Auto-Morph Cycle ON" : "Hold Static Shape"}
                    </button>
                  </div>
                </div>

                {/* 3. Range Sliders for Physics & Geometry */}
                <div className="space-y-5 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Harmonic Animation Parameters
                  </h3>

                  {/* Wave Speed */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Wave Speed (Cycle Frequency)</span>
                      <span className="tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {waveConfig.waveSpeed.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={waveConfig.waveSpeed}
                      onChange={(e) => handleUpdateWave({ waveSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0.2x (Subtle slow)</span>
                      <span>1.1x (Baseline)</span>
                      <span>2.5x (Fast ripple)</span>
                    </div>
                  </div>

                  {/* Wave Amplitude */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Wave Pulse Amplitude</span>
                      <span className="tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {waveConfig.waveAmplitude.toFixed(2)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.05"
                      value={waveConfig.waveAmplitude}
                      onChange={(e) => handleUpdateWave({ waveAmplitude: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0.2x (Calm)</span>
                      <span>1.0x (Standard)</span>
                      <span>2.5x (Deep swell)</span>
                    </div>
                  </div>

                  {/* Ring Count */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Ring Count (Geometric Density)</span>
                      <span className="tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {waveConfig.ringCount} Rings
                      </span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="32"
                      step="1"
                      value={waveConfig.ringCount}
                      onChange={(e) => handleUpdateWave({ ringCount: parseInt(e.target.value, 10) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>14 (Airy)</span>
                      <span>22 (Standard)</span>
                      <span>32 (Dense wireframe)</span>
                    </div>
                  </div>

                  {/* Base Radius */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Base Radius (Scale in Stage)</span>
                      <span className="tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {waveConfig.baseRadius}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="160"
                      max="260"
                      step="5"
                      value={waveConfig.baseRadius}
                      onChange={(e) => handleUpdateWave({ baseRadius: parseInt(e.target.value, 10) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>160px (Compact)</span>
                      <span>215px (Default)</span>
                      <span>260px (Max Stage)</span>
                    </div>
                  </div>

                  {/* Auto-Rotate Speed */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Auto-Rotate Speed (Idle Gyroscope)</span>
                      <span className="tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {(waveConfig.autoRotateSpeed * 1000).toFixed(1)} mrad/s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.012"
                      step="0.0005"
                      value={waveConfig.autoRotateSpeed}
                      onChange={(e) => handleUpdateWave({ autoRotateSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0.0 (Locked)</span>
                      <span>0.0045 (Serene)</span>
                      <span>0.012 (Rapid)</span>
                    </div>
                  </div>

                  {/* Wireframe Stroke Width */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Wireframe Hairline Stroke Width</span>
                      <span className="tabular-nums font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {waveConfig.strokeWidth.toFixed(2)}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2.8"
                      step="0.1"
                      value={waveConfig.strokeWidth}
                      onChange={(e) => handleUpdateWave({ strokeWidth: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.8px (Ultra-thin)</span>
                      <span>1.55px (Balanced)</span>
                      <span>2.8px (Bold ink)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview Stage */}
              <div className="lg:col-span-5 sticky top-24">
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Wave Stage Preview
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Drag to orbit 3D
                    </span>
                  </div>

                  <div className="w-full h-[380px] sm:h-[440px] bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden relative">
                    <MorphingWaveAnimation
                      config={waveConfig}
                      forceShape={waveConfig.activeShape}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-900">
                      Interactive Preview
                    </p>
                    <p>
                      Click and drag in the preview above to spin and inspect vertices in 3D space. Any change to shapes or sliders immediately takes effect on the live homepage hero.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOMEPAGE SECTIONS */}
      {activeTab === "home_sections" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Impact Numbers */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Homepage Impact Metrics ({stats.length} Cards)</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Displays the authoritative counter statistics directly below the hero.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  addStat({ value: "100%", label: "New Metric" });
                  showToast("New impact metric added.");
                }}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3 relative group">
                  {stats.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete Impact Metric",
                          `Are you sure you want to remove metric "${s.label}"?`,
                          () => {
                            deleteStat(s.id);
                            showToast("Impact metric deleted.");
                          }
                        )
                      }
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-md hover:bg-slate-200/50"
                      title="Delete Metric"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Metric Value</label>
                    <input
                      type="text"
                      value={s.value}
                      onChange={(e) => handleUpdateStat(s.id, "value", e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-base font-bold text-slate-900 bg-white"
                      placeholder="e.g. Bi-weekly"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Metric Label</label>
                    <input
                      type="text"
                      value={s.label}
                      onChange={(e) => handleUpdateStat(s.id, "label", e.target.value)}
                      className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                      placeholder="Uptime SLA Guarantee"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Marquee & Tech Stack Controls */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Marquee Speeds &amp; Client Logos</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Row 1 Marquee Speed (Tech Stack)</span>
                  <span className="tabular-nums font-semibold text-slate-700">{techStack.marqueeSpeed}s</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={techStack.marqueeSpeed}
                  onChange={(e) => updateTechStack({ marqueeSpeed: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Fast (15s)</span>
                  <span>Normal (45s)</span>
                  <span>Slow (90s)</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Row 2 Reverse Marquee Speed</span>
                  <span className="tabular-nums font-semibold text-slate-700">{techStack.reverseSpeed}s</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={techStack.reverseSpeed}
                  onChange={(e) => updateTechStack({ reverseSpeed: parseInt(e.target.value, 10) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Fast (15s)</span>
                  <span>Normal (45s)</span>
                  <span>Slow (90s)</span>
                </div>
              </div>
            </div>

            {/* Client Ticker Logos */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Client Ticker Logos ({clients.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trusted partner names rendered in the client logo ticker.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddClient}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Company</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {clients.map((c, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Remove Client Partner",
                          `Are you sure you want to remove "${c}" from the ticker logos?`,
                          () => handleRemoveClient(idx)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Client Testimonials CMS */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Client Testimonials ({testimonials.length})
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Direct engineering feedback and quotes displayed on the public homepage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalState({ kind: "add_testimonial" })}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Testimonial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-semibold">
                        {t.author || "Client Quote"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          requestDelete(
                            "Delete Testimonial",
                            `Are you sure you want to remove the testimonial from "${t.author}"?`,
                            () => {
                              deleteTestimonial(t.id);
                              showToast("Testimonial removed");
                            }
                          )
                        }
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                        title="Delete Testimonial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Quote</label>
                      <textarea
                        rows={3}
                        value={t.quote}
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[idx] = { ...t, quote: e.target.value };
                          updateTestimonials(updated);
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white leading-relaxed resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Author</label>
                        <input
                          type="text"
                          value={t.author}
                          onChange={(e) => {
                            const updated = [...testimonials];
                            updated[idx] = { ...t, author: e.target.value };
                            updateTestimonials(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Company</label>
                        <input
                          type="text"
                          value={t.company}
                          onChange={(e) => {
                            const updated = [...testimonials];
                            updated[idx] = { ...t, company: e.target.value };
                            updateTestimonials(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Role / Title</label>
                      <input
                        type="text"
                        value={t.role}
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[idx] = { ...t, role: e.target.value };
                          updateTestimonials(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Portrait URL</label>
                      <input
                        type="text"
                        value={t.avatar || ""}
                        placeholder="/avatars/hannah-morales.jpg"
                        onChange={(e) => {
                          const updated = [...testimonials];
                          updated[idx] = { ...t, avatar: e.target.value };
                          updateTestimonials(updated);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global CTA Conversion Banner CMS */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Global CTA Banner</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Headline Title</label>
                <input
                  type="text"
                  value={ctaBanner.title}
                  onChange={(e) => updateCtaBanner({ title: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  placeholder="Discuss your upcoming software roadmap"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Description Subtitle</label>
                <textarea
                  rows={2}
                  value={ctaBanner.subtitle}
                  onChange={(e) => updateCtaBanner({ subtitle: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed resize-none"
                  placeholder="Partner with Factual Technologies to build resilient software..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-xs font-bold text-slate-900 block">Primary Action Button</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Text</label>
                      <input
                        type="text"
                        value={ctaBanner.buttonText}
                        onChange={(e) => updateCtaBanner({ buttonText: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Link URL</label>
                      <input
                        type="text"
                        value={ctaBanner.buttonHref}
                        onChange={(e) => updateCtaBanner({ buttonHref: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="text-xs font-bold text-slate-900 block">Secondary Action Button</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Text</label>
                      <input
                        type="text"
                        value={ctaBanner.secondaryCtaText}
                        onChange={(e) => updateCtaBanner({ secondaryCtaText: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Link URL</label>
                      <input
                        type="text"
                        value={ctaBanner.secondaryCtaHref}
                        onChange={(e) => updateCtaBanner({ secondaryCtaHref: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES PAGE CONTROLLER (/services) */}
      {activeTab === "services_page" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Services Hero & SLA Header */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">Services Page Hero & Metrics</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Controls the hero copy and practice facts shown on /services.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Headline
              </label>
              <input
                type="text"
                value={sp.heroTitle}
                onChange={(e) => updateServicesPage({ heroTitle: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                placeholder="Software, cloud infrastructure, and AI systems built for your team"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Subtitle Description
              </label>
              <textarea
                rows={3}
                value={sp.heroSubtitle}
                onChange={(e) => updateServicesPage({ heroSubtitle: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 leading-relaxed"
              />
            </div>

            {/* Performance & SLA Metrics Strip CRUD */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Services Metrics Strip ({(sp.metrics || []).length} Metrics)
                  </h3>
                  <p className="text-xs text-slate-500">
                    The counter metrics displayed directly beneath the Services Hero.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddServiceMetric}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Metric</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(sp.metrics && sp.metrics.length > 0
                  ? sp.metrics
                  : [
                      { id: "sm-1", value: sp.slaMetric || "Bi-weekly", label: sp.slaLabel || "Release cadence" },
                      { id: "sm-2", value: "Direct", label: "Senior engineering" },
                      { id: "sm-3", value: "Full IP", label: "Source ownership" },
                      { id: "sm-4", value: "Weekly", label: "Architecture review" },
                    ]
                ).map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 relative group">
                    {(sp.metrics || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          requestDelete(
                            "Delete Performance Metric",
                            `Are you sure you want to remove "${m.label}"?`,
                            () => handleDeleteServiceMetric(m.id)
                          )
                        }
                        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-md"
                        title="Delete Metric"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Value</label>
                      <input
                        type="text"
                        value={m.value}
                        onChange={(e) => handleUpdateServiceMetric(m.id, "value", e.target.value)}
                        className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Label</label>
                      <input
                        type="text"
                        value={m.label}
                        onChange={(e) => handleUpdateServiceMetric(m.id, "label", e.target.value)}
                        className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Core Capability Cards CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Technical Capabilities ({services.length})</h2>
              </div>
              <button
                type="button"
                onClick={handleCreateServicePillar}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Capability Pillar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 uppercase">Pillar</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">{service.id}</span>
                        {services.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              requestDelete(
                                "Delete Capability Pillar",
                                `Are you sure you want to remove "${service.title}"? This will remove its card from /services.`,
                                () => deleteService(service.id)
                              )
                            }
                            className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete pillar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Title</label>
                      <input
                        type="text"
                        value={service.title}
                        onChange={(e) => handleUpdateService(service.id, { title: e.target.value })}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Description</label>
                      <textarea
                        rows={3}
                        value={service.description}
                        onChange={(e) => handleUpdateService(service.id, { description: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                      />
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase block">
                        Deliverable Bullets
                      </label>
                      {service.capabilities.map((cap, capIdx) => (
                        <input
                          key={capIdx}
                          type="text"
                          value={cap}
                          onChange={(e) => handleUpdateServiceCap(service.id, capIdx, e.target.value)}
                          className="w-full min-h-[36px] px-2.5 py-1 rounded-md border border-slate-200 text-xs text-slate-800 bg-white"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Process Framework CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Delivery Process ({(sp.processSteps || []).length} Milestones)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddProcessStep}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(sp.processSteps || []).map((step) => (
                <div key={step.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5 relative group">
                  {(sp.processSteps || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete Milestone",
                          `Are you sure you want to remove milestone "${step.title}"?`,
                          () => handleDeleteProcessStep(step.id)
                        )
                      }
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-md"
                      title="Delete Milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md inline-block tabular-nums">
                    Phase {step.step}
                  </span>
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => handleUpdateProcessStep(step.id, { title: e.target.value })}
                    className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                  />
                  <textarea
                    rows={3}
                    value={step.description}
                    onChange={(e) => handleUpdateProcessStep(step.id, { description: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-600 bg-white leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Value & Outcomes Pillars CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Strategic Outcomes ({(sp.strategicPillars || []).length} Pillars)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddStrategicPillar}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Strategic Pillar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(sp.strategicPillars || []).map((pillar) => (
                <div key={pillar.id} className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700 uppercase">Outcome Pillar</span>
                      {(sp.strategicPillars || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            requestDelete(
                              "Delete Strategic Pillar",
                              `Are you sure you want to remove pillar "${pillar.title}"?`,
                              () => handleDeleteStrategicPillar(pillar.id)
                            )
                          }
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-md"
                          title="Delete Pillar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Pillar Title</label>
                      <input
                        type="text"
                        value={pillar.title}
                        onChange={(e) => updateStrategicPillar(pillar.id, { title: e.target.value })}
                        className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Description</label>
                      <textarea
                        rows={3}
                        value={pillar.description}
                        onChange={(e) => updateStrategicPillar(pillar.id, { description: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 uppercase">Icon</label>
                        <select
                          value={pillar.icon}
                          onChange={(e) => updateStrategicPillar(pillar.id, { icon: e.target.value })}
                          className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white cursor-pointer"
                        >
                          <option value="Rocket">Rocket (Velocity)</option>
                          <option value="Brain">Brain (Intelligence)</option>
                          <option value="Database">Database (Data Infra)</option>
                          <option value="Code">Code (Engineering)</option>
                          <option value="Cloud">Cloud (Resilience)</option>
                          <option value="Zap">Zap (Performance)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 uppercase">Bullet Guarantee</label>
                        <input
                          type="text"
                          value={pillar.bullet}
                          onChange={(e) => updateStrategicPillar(pillar.id, { bullet: e.target.value })}
                          className="w-full min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                          placeholder="Sub-millisecond data..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Procurement FAQs Accordion */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Technical Procurement & Architecture FAQs</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Questions and answers displayed in the interactive accordion at the bottom of /services.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddServiceFaq}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add FAQ Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {(sp.faqs || []).map((faq, idx) => (
                <div key={faq.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-slate-400 font-bold">Q#{idx + 1}</span>
                    <input
                      type="text"
                      value={faq.q}
                      onChange={(e) => handleUpdateServiceFaq(faq.id, "q", e.target.value)}
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                      placeholder="Question"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete Service FAQ",
                          `Are you sure you want to remove FAQ #${idx + 1}?`,
                          () => handleRemoveServiceFaq(faq.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 p-2 transition-colors cursor-pointer"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.a}
                    onChange={(e) => handleUpdateServiceFaq(faq.id, "a", e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white leading-relaxed"
                    placeholder="Answer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WORK & PORTFOLIO (/work) */}
      {activeTab === "work_page" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Work Hero Header */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">Work Page Hero Configuration</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Controls the main headline and introduction of the /work portfolio page.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Headline
              </label>
              <input
                type="text"
                value={workPage.heroTitle}
                onChange={(e) => updateWorkPage({ heroTitle: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                placeholder="Selected engineering engagements"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Subtitle Description
              </label>
              <textarea
                rows={2}
                value={workPage.heroSubtitle}
                onChange={(e) => updateWorkPage({ heroSubtitle: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 leading-relaxed"
              />
            </div>
          </div>

          {/* Case Studies Portfolio CMS */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Enterprise Case Studies ({projects.length})</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Manage individual portfolio cards, tags, impact metrics, and home visibility.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddProject}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Case Study</span>
              </button>
            </div>

            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {project.category}
                      </span>
                      <span className="text-sm font-bold text-slate-950">{project.title}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleProject(project.id)}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                          project.featuredOnHome
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        {project.featuredOnHome ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Featured on Home</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            <span>Hidden from Home</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project.id, project.title)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors cursor-pointer"
                        title="Delete case study"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Case Title</label>
                      <input
                        type="text"
                        value={project.title}
                        onChange={(e) => handleUpdateProject(project.id, { title: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-medium bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Category</label>
                      <select
                        value={project.category}
                        onChange={(e) =>
                          handleUpdateProject(project.id, {
                            category: e.target.value as "ai" | "web" | "cloud" | "mobile",
                          })
                        }
                        className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm bg-white cursor-pointer"
                      >
                        <option value="ai">AI</option>
                        <option value="web">Web</option>
                        <option value="cloud">Cloud</option>
                        <option value="mobile">Mobile</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Metric Highlight</label>
                      <input
                        type="text"
                        value={project.metrics}
                        onChange={(e) => handleUpdateProject(project.id, { metrics: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-blue-700 bg-white"
                        placeholder="e.g. Regulatory archive search with citations"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={project.tags.join(", ")}
                        onChange={(e) =>
                          handleUpdateProject(project.id, {
                            tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                          })
                        }
                        className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-xs font-mono bg-white"
                        placeholder="e.g. Next.js, Python, Kubernetes"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 uppercase">Preview Image Path / URL</label>
                <input
                  type="text"
                  value={project.image || ""}
                  onChange={(e) => handleUpdateProject(project.id, { image: e.target.value })}
                  className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-xs font-mono bg-white"
                  placeholder="/projects/regulatory-search.jpg"
                />
              </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">Case Summary</label>
                    <textarea
                      rows={2}
                      value={project.description}
                      onChange={(e) => handleUpdateProject(project.id, { description: e.target.value })}
                      className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ABOUT PAGE (/about) */}
      {activeTab === "about_page" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* About Hero Header */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">About Page Hero & Philosophy</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Controls the main headline, subtitle, and founding conviction statement of /about.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Headline
              </label>
              <input
                type="text"
                value={aboutPage.heroTitle}
                onChange={(e) => updateAboutPage({ heroTitle: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                placeholder="Senior software engineering without agency handoffs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Subtitle Description
              </label>
              <textarea
                rows={3}
                value={aboutPage.heroSubtitle}
                onChange={(e) => updateAboutPage({ heroSubtitle: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 leading-relaxed"
              />
            </div>

            {/* Founding Conviction Callout */}
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase">Founding Conviction Headline</span>
                <input
                  type="text"
                  value={aboutPage.foundingConvictionTitle}
                  onChange={(e) => updateAboutPage({ foundingConvictionTitle: e.target.value })}
                  placeholder="Blockquote Title"
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold bg-white mt-1.5"
                />
              </div>

              {/* Manifesto Paragraphs CRUD */}
              <div className="pt-3 border-t border-slate-200/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Manifesto Narrative Paragraphs ({(aboutPage.narrativeParagraphs || []).length})
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Editorial narrative paragraphs detailing our company philosophy on /about.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAboutParagraph}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Paragraph</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {(aboutPage.narrativeParagraphs || []).map((para, pIdx) => (
                    <div key={pIdx} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          Paragraph #{pIdx + 1}
                        </span>
                        {(aboutPage.narrativeParagraphs || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              requestDelete(
                                "Delete Editorial Paragraph",
                                `Are you sure you want to remove paragraph #${pIdx + 1}?`,
                                () => handleDeleteAboutParagraph(pIdx)
                              )
                            }
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded cursor-pointer"
                            title="Delete Paragraph"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={para}
                        onChange={(e) => updateAboutParagraph(pIdx, e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 bg-slate-50/50 leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Vision & Mission CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-950">Vision &amp; Mission Statements</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vision Card */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Our Vision</span>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase">Vision Title</label>
                  <input
                    type="text"
                    value={aboutPage.visionMission?.visionTitle || "Our Vision"}
                    onChange={(e) => updateVisionMission({ visionTitle: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase">Vision Body</label>
                  <textarea
                    rows={4}
                    value={aboutPage.visionMission?.visionText || ""}
                    onChange={(e) => updateVisionMission({ visionText: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">Checkmark Bullets</label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = aboutPage.visionMission?.visionBullets || [];
                        updateVisionMission({ visionBullets: [...current, "New vision guarantee bullet"] });
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                  {(aboutPage.visionMission?.visionBullets || []).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => {
                          const updated = [...(aboutPage.visionMission?.visionBullets || [])];
                          updated[bIdx] = e.target.value;
                          updateVisionMission({ visionBullets: updated });
                        }}
                        className="flex-1 min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (aboutPage.visionMission?.visionBullets || []).filter((_, i) => i !== bIdx);
                          updateVisionMission({ visionBullets: updated });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Delete bullet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mission Card */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Our Mission</span>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase">Mission Title</label>
                  <input
                    type="text"
                    value={aboutPage.visionMission?.missionTitle || "Our Mission"}
                    onChange={(e) => updateVisionMission({ missionTitle: e.target.value })}
                    className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase">Mission Body</label>
                  <textarea
                    rows={4}
                    value={aboutPage.visionMission?.missionText || ""}
                    onChange={(e) => updateVisionMission({ missionText: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase">Checkmark Bullets</label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = aboutPage.visionMission?.missionBullets || [];
                        updateVisionMission({ missionBullets: [...current, "New mission guarantee bullet"] });
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                  {(aboutPage.visionMission?.missionBullets || []).map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => {
                          const updated = [...(aboutPage.visionMission?.missionBullets || [])];
                          updated[bIdx] = e.target.value;
                          updateVisionMission({ missionBullets: updated });
                        }}
                        className="flex-1 min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (aboutPage.visionMission?.missionBullets || []).filter((_, i) => i !== bIdx);
                          updateVisionMission({ missionBullets: updated });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Delete bullet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core Value Cards CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Core Engineering Values ({aboutPage.values?.length || 0})</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Architectural Rigor, Production Focus, Domain Expertise, and Direct Senior Ownership.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAboutValue}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Value Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(aboutPage.values || []).map((val) => (
                <div key={val.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={val.title}
                      onChange={(e) => handleUpdateAboutValue(val.id, "title", e.target.value)}
                      className="flex-1 min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete Core Value",
                          `Are you sure you want to remove value pillar "${val.title}"?`,
                          () => deleteAboutValue(val.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 p-2 transition-colors cursor-pointer"
                      title="Delete value card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={val.description}
                    onChange={(e) => handleUpdateAboutValue(val.id, "description", e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 5 Engineering Leadership Profiles (E-E-A-T) */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Engineering Leadership ({aboutPage.teamMembers?.length || 0})
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Powers visible leadership bios on /about and Person Schema.org E-E-A-T entities.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = aboutPage.teamMembers || [];
                  updateAboutPage({
                    teamMembers: [
                      ...current,
                      {
                        id: `team-${Date.now()}`,
                        name: "Principal Engineer",
                        role: "Systems Architect",
                        bio: "Designs and delivers distributed cloud, web, and AI pipelines alongside client teams.",
                        specialties: ["System Architecture", "Production Operations"],
                      },
                    ],
                  });
                }}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Leader</span>
              </button>
            </div>

            <div className="space-y-4">
              {(aboutPage.teamMembers || []).map((member, mIdx) => (
                <div key={member.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => {
                        const updated = [...(aboutPage.teamMembers || [])];
                        updated[mIdx] = { ...updated[mIdx], name: e.target.value };
                        updateAboutPage({ teamMembers: updated });
                      }}
                      placeholder="Full Name"
                      className="sm:col-span-5 min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                    />
                    <input
                      type="text"
                      value={member.role}
                      onChange={(e) => {
                        const updated = [...(aboutPage.teamMembers || [])];
                        updated[mIdx] = { ...updated[mIdx], role: e.target.value };
                        updateAboutPage({ teamMembers: updated });
                      }}
                      placeholder="Role / Title"
                      className="sm:col-span-6 min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (aboutPage.teamMembers || []).filter((_, i) => i !== mIdx);
                        updateAboutPage({ teamMembers: updated });
                      }}
                      className="sm:col-span-1 text-slate-400 hover:text-rose-600 p-2 cursor-pointer"
                      title="Delete leader profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={member.bio}
                    onChange={(e) => {
                      const updated = [...(aboutPage.teamMembers || [])];
                      updated[mIdx] = { ...updated[mIdx], bio: e.target.value };
                      updateAboutPage({ teamMembers: updated });
                    }}
                    placeholder="Concise technical biography..."
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="url"
                      value={member.linkedIn || ""}
                      onChange={(e) => {
                        const updated = [...(aboutPage.teamMembers || [])];
                        updated[mIdx] = { ...updated[mIdx], linkedIn: e.target.value };
                        updateAboutPage({ teamMembers: updated });
                      }}
                      placeholder="LinkedIn URL (https://linkedin.com/in/...)"
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 text-xs bg-white font-mono"
                    />
                    <input
                      type="text"
                      value={(member.specialties || []).join(", ")}
                      onChange={(e) => {
                        const updated = [...(aboutPage.teamMembers || [])];
                        updated[mIdx] = {
                          ...updated[mIdx],
                          specialties: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        };
                        updateAboutPage({ teamMembers: updated });
                      }}
                      placeholder="Specialties (comma-separated)"
                      className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CONTACT PAGE (/contact) */}
      {activeTab === "contact_page" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">Contact Page & Office Details</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Controls the intake hero, office headquarters address, telephone, email, and response time copy.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Headline
              </label>
              <input
                type="text"
                value={contactPage.heroTitle}
                onChange={(e) => updateContactPage({ heroTitle: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900"
                placeholder="Tell us what you are building"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Hero Subtitle Description
              </label>
              <textarea
                rows={2}
                value={contactPage.heroSubtitle}
                onChange={(e) => updateContactPage({ heroSubtitle: e.target.value })}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">Headquarters Address</label>
                <input
                  type="text"
                  value={contactPage.officeAddress}
                  onChange={(e) => updateContactPage({ officeAddress: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">Direct Email</label>
                <input
                  type="text"
                  value={contactPage.email}
                  onChange={(e) => updateContactPage({ email: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">Direct Phone</label>
                <input
                  type="text"
                  value={contactPage.phone}
                  onChange={(e) => updateContactPage({ phone: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">Typical Response Time</label>
                <input
                  type="text"
                  value={contactPage.responseTime}
                  onChange={(e) => updateContactPage({ responseTime: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                  placeholder="Under 4 business hours"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Business Operating Hours</label>
                <input
                  type="text"
                  value={contactPage.businessHours}
                  onChange={(e) => updateContactPage({ businessHours: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                  placeholder="Monday – Friday, 8:00 AM – 6:00 PM PST"
                />
              </div>
            </div>
          </div>

          {/* Engagement Timeline Flow CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Engagement Process Timeline ({(contactPage.timeline || []).length} Phases)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddContactTimeline}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Timeline Step</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(contactPage.timeline || []).map((step) => (
                <div key={step.id} className="p-5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700 uppercase">
                        {step.phase} ({step.timeframe})
                      </span>
                      {(contactPage.timeline || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            requestDelete(
                              "Delete Timeline Step",
                              `Are you sure you want to remove step "${step.title}"?`,
                              () => handleDeleteContactTimeline(step.id)
                            )
                          }
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                          title="Delete step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600 uppercase">Phase Tag</label>
                        <input
                          type="text"
                          value={step.phase}
                          onChange={(e) => updateContactTimeline(step.id, { phase: e.target.value })}
                          className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-600 uppercase">Timeframe</label>
                        <input
                          type="text"
                          value={step.timeframe}
                          onChange={(e) => updateContactTimeline(step.id, { timeframe: e.target.value })}
                          className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Step Title</label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => updateContactTimeline(step.id, { title: e.target.value })}
                        className="w-full min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 uppercase">Description</label>
                      <textarea
                        rows={3}
                        value={step.description}
                        onChange={(e) => updateContactTimeline(step.id, { description: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact FAQs CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Contact & Intake FAQs ({(contactPage.faqs || []).length})
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Frequently asked questions displayed on the /contact intake portal.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddContactFaq}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact FAQ</span>
              </button>
            </div>

            <div className="space-y-4">
              {(contactPage.faqs || []).map((faq) => (
                <div key={faq.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={faq.q}
                      onChange={(e) => {
                        const updated = (contactPage.faqs || []).map((f) =>
                          f.id === faq.id ? { ...f, q: e.target.value } : f
                        );
                        updateContactPage({ faqs: updated });
                      }}
                      className="flex-1 min-h-[38px] px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                      placeholder="Question"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete FAQ",
                          "Are you sure you want to remove this FAQ item?",
                          () => deleteContactFaq(faq.id)
                        )
                      }
                      className="text-slate-400 hover:text-rose-600 transition-colors p-2 cursor-pointer"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.a}
                    onChange={(e) => {
                      const updated = (contactPage.faqs || []).map((f) =>
                        f.id === faq.id ? { ...f, a: e.target.value } : f
                      );
                      updateContactPage({ faqs: updated });
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 bg-white leading-relaxed"
                    placeholder="Answer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: GLOBAL LAYOUT & BANNER */}
      {activeTab === "site_meta" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Main Navigation Menu Links CRUD */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Navbar Routes ({(meta.navLinks || []).length} Links)
                </h2>
              </div>
              <button
                type="button"
                onClick={handleAddNavLink}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Nav Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(meta.navLinks || []).map((link) => (
                <div key={link.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 relative group">
                  {(meta.navLinks || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete Navigation Link",
                          `Are you sure you want to remove "${link.label}" from navigation?`,
                          () => handleDeleteNavLink(link.id)
                        )
                      }
                      className="absolute top-2.5 right-2.5 text-slate-400 hover:text-rose-600 transition-colors p-1 rounded cursor-pointer"
                      title="Delete link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Label</label>
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateNavLink(link.id, { label: e.target.value })}
                      className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Target URL</label>
                    <input
                      type="text"
                      value={link.href}
                      onChange={(e) => updateNavLink(link.id, { href: e.target.value })}
                      className="w-full min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Announcement Bar */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Top Announcement Banner</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !meta.announcementEnabled;
                  updateMeta({ announcementEnabled: nextState });
                  showToast(`Announcement bar ${nextState ? "enabled" : "hidden"}`);
                }}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  meta.announcementEnabled
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {meta.announcementEnabled ? "Banner Active" : "Banner Hidden"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Banner Text</label>
                <input
                  type="text"
                  value={meta.announcementText}
                  onChange={(e) => updateMeta({ announcementText: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                  placeholder="🚀 Now live: Next-Gen Autonomous AI Architecture Services"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Target Link URL</label>
                <input
                  type="text"
                  value={meta.announcementLink}
                  onChange={(e) => updateMeta({ announcementLink: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                  placeholder="/services"
                />
              </div>
            </div>
          </div>

          {/* Footer Metadata & Socials */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">Footer Notice & Social Media Profiles</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Controls copyright line, brand description, and social media profile destinations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Copyright Notice</label>
                <input
                  type="text"
                  value={meta.copyright}
                  onChange={(e) => updateMeta({ copyright: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase">Footer Description</label>
                <textarea
                  rows={2}
                  value={meta.description}
                  onChange={(e) => updateMeta({ description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">LinkedIn URL</label>
                <input
                  type="text"
                  value={meta.socialLinkedIn}
                  onChange={(e) => updateMeta({ socialLinkedIn: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">Twitter / X URL</label>
                <input
                  type="text"
                  value={meta.socialTwitter}
                  onChange={(e) => updateMeta({ socialTwitter: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">GitHub Organization</label>
                <input
                  type="text"
                  value={meta.socialGitHub}
                  onChange={(e) => updateMeta({ socialGitHub: e.target.value })}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: INBOUND INQUIRIES INBOX */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-5">
            <h2 className="text-lg font-bold text-slate-950">Inbound Contact Submissions ({messages.length})</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live prospective inquiries submitted through the /contact intake form.
            </p>
          </div>

          {messages.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm space-y-2">
              <Mail className="w-8 h-8 mx-auto text-slate-300" />
              <p>No inbound contact submissions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    msg.read
                      ? "bg-slate-50/60 border-slate-200/80"
                      : "bg-blue-50/30 border-blue-200/80 shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {!msg.read && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          Unread
                        </span>
                      )}
                      <span className="font-bold text-slate-950 text-base">{msg.name}</span>
                      {msg.company && (
                        <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                          {msg.company}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-blue-600 mb-3 font-medium">
                    <a href={`mailto:${msg.email}`} className="hover:underline">
                      {msg.email}
                    </a>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/70">
                    {msg.message}
                  </p>

                  <div className="mt-4 flex items-center justify-end gap-3">
                    {!msg.read && (
                      <button
                        type="button"
                        onClick={() => {
                          markMessageRead(msg.id);
                          showToast("Marked message as read.");
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(
                          "Delete Inbound Message",
                          `Are you sure you want to delete the message from "${msg.name}"?`,
                          () => {
                            deleteMessage(msg.id);
                            showToast("Message removed from inbox.");
                          }
                        )
                      }
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 9: SNAPSHOTS & DISASTER RECOVERY */}
      {activeTab === "backup_restore" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Create Manual Snapshot Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">Site Version History & Snapshots</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Create point-in-time state snapshots or rollback to any previous version across all website sections.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder="e.g. Pre-Q3 Campaign Launch or Wave Speed Tune"
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white"
              />
              <button
                type="button"
                onClick={handleCreateSnapshot}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Save New Snapshot</span>
              </button>
            </div>

            {/* Snapshots Timeline List */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Saved Revisions ({snapshots.length})
              </span>

              {snapshots.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No snapshots recorded yet. Create one above to preserve your current website state.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-950">{snap.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          Saved by {snap.author} on {new Date(snap.timestamp).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap.id, snap.name)}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Rollback To This</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            requestDelete(
                              "Delete Backup Snapshot",
                              `Are you sure you want to permanently delete snapshot "${snap.name}"?`,
                              () => deleteSnapshot(snap.id)
                            )
                          }
                          className="text-slate-400 hover:text-rose-600 p-2 transition-colors cursor-pointer"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Backup & Restore Tools Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.02)] space-y-6">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-bold text-slate-950">JSON Backup & Restore Utilities</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Download your entire website content as a validated JSON file, or restore from an existing backup archive.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-950 font-bold text-sm">
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Download Backup JSON</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Exports complete site state including hero parameters, wave settings, services, projects, FAQs, and layout metadata.
                </p>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON Archive</span>
                </button>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2.5 text-slate-950 font-bold text-sm">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Restore from JSON File</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload an existing backup archive. Pre-import automatic safety backup will be created before applying.
                </p>
                <input
                  type="file"
                  accept=".json,application/json"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Backup JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEVICE PREVIEW EMULATOR MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex flex-col p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl flex-1 flex flex-col overflow-hidden">
            {/* Modal Top Bar */}
            <div className="h-14 px-6 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Viewport Emulator
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                  (http://localhost:3000)
                </span>
              </div>

              {/* Device Mode Switcher */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-slate-900 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice("tablet")}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === "tablet"
                      ? "bg-slate-900 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    previewDevice === "mobile"
                      ? "bg-slate-900 text-white font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeAllModals}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Iframe Stage */}
            <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 overflow-auto">
              <div
                className={`bg-white rounded-xl shadow-xl border border-slate-300 transition-all duration-300 overflow-hidden ${
                  previewDevice === "desktop"
                    ? "w-full h-full max-w-6xl"
                    : previewDevice === "tablet"
                    ? "w-[768px] h-[920px] max-h-full"
                    : "w-[375px] h-[780px] max-h-full"
                }`}
              >
                <iframe
                  src="http://localhost:3000"
                  title="Factual Technologies Live Website Preview"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT CONFIRMATION MODAL */}
      {modalState.kind === "import" && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-950 font-bold text-base">
                <Upload className="w-5 h-5 text-blue-600" />
                <span>Confirm Backup Import</span>
              </div>
              <button
                type="button"
                onClick={closeAllModals}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Review the backup content below. An automatic safety snapshot will be created before applying this configuration.
            </p>

            {modalState.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalState.error}</span>
              </div>
            )}

            <textarea
              rows={8}
              value={modalState.jsonText}
              onChange={(e) =>
                setModalState({ kind: "import", jsonText: e.target.value, error: null })
              }
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeAllModals}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Apply Backup to Live Site
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Testimonial Modal */}
      {showAddTestimonialModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-950 text-base">
                Add Client Testimonial
              </h3>
              <button
                type="button"
                onClick={closeAllModals}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTestimonialData.author.trim() || !newTestimonialData.quote.trim()) {
                  showToast("Please provide both author and quote.");
                  return;
                }
                addTestimonial({
                  author: newTestimonialData.author.trim(),
                  quote: newTestimonialData.quote.trim(),
                  role: newTestimonialData.role.trim() || "Technology Executive",
                  company: newTestimonialData.company.trim() || "Enterprise Client",
                  avatar: newTestimonialData.avatar.trim() || undefined,
                });
                setNewTestimonialData({ quote: "", author: "", role: "", company: "", avatar: "" });
                closeAllModals();
                showToast("Testimonial recorded and published to homepage");
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Client Quote</label>
                <textarea
                  rows={3}
                  required
                  value={newTestimonialData.quote}
                  onChange={(e) => setNewTestimonialData({ ...newTestimonialData, quote: e.target.value })}
                  placeholder="&ldquo;Factual transformed our core infrastructure with exceptional engineering discipline...&rdquo;"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Author Name</label>
                  <input
                    type="text"
                    required
                    value={newTestimonialData.author}
                    onChange={(e) => setNewTestimonialData({ ...newTestimonialData, author: e.target.value })}
                    placeholder="Sarah Lindqvist"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Company</label>
                  <input
                    type="text"
                    value={newTestimonialData.company}
                    onChange={(e) => setNewTestimonialData({ ...newTestimonialData, company: e.target.value })}
                    placeholder="FinScale Technologies"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Role / Title</label>
                <input
                  type="text"
                  value={newTestimonialData.role}
                  onChange={(e) => setNewTestimonialData({ ...newTestimonialData, role: e.target.value })}
                  placeholder="Chief Technology Officer"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Portrait URL (optional)</label>
                <input
                  type="text"
                  value={newTestimonialData.avatar}
                  onChange={(e) => setNewTestimonialData({ ...newTestimonialData, avatar: e.target.value })}
                  placeholder="/avatars/hannah-morales.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeAllModals}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Save & Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Delete Confirmation Modal */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-950 text-base">{deleteConfirm.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{deleteConfirm.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={closeAllModals}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteConfirm.onConfirm}
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
