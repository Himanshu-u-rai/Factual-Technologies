'use client';

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  FolderKanban,
  ShieldCheck,
  Settings as SettingsIcon,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Command,
  Sliders,
  Eye,
  RefreshCcw,
  Compass,
  FileText,
  Key,
  User,
  Building,
  ChevronDown,
  BarChart3,
  Briefcase,
  Layers,
  Globe,
  Mail,
  History,
  Phone,
  BookOpen,
} from "lucide-react";
import {
  isAuthenticated,
  hydrateAdminStore,
  getCurrentUser,
  logout,
  getInquiries,
  getProjects,
  clearRateLimit,
  subscribe,
  touchSession,
  getAdminSession,
  extendSession,
  AdminUserProfile,
} from "@/lib/admin-store";
import { bootstrapSiteStore } from "@/lib/site-store";
import Logo from "@/components/ui/Logo";

interface AdminLayoutProps {
  children: React.ReactNode;
}

type ActiveOverlay =
  | "none"
  | "mobile_drawer"
  | "command_palette"
  | "inactivity_warning"
  | "logout_confirm";

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);

  // Unified mutually-exclusive overlay state
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>("none");
  const mobileMenuOpen = activeOverlay === "mobile_drawer";
  const commandPaletteOpen = activeOverlay === "command_palette";
  const showInactivityWarning = activeOverlay === "inactivity_warning";
  const showLogoutConfirm = activeOverlay === "logout_confirm";

  // Website Controller Dropdown State & Active Tab Sync
  const [websiteControllerOpen, setWebsiteControllerOpen] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>("hero");
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (pathname === "/admin" && !websiteControllerOpen) {
      setWebsiteControllerOpen(true);
    }
    if (activeOverlay === "mobile_drawer") {
      setActiveOverlay("none");
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncCurrentTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) {
        setCurrentTab(tab);
      } else {
        setCurrentTab("hero");
      }
    };

    const handleTabEvent = (e: Event) => {
      const ce = e as CustomEvent<{ tab?: string }>;
      if (ce.detail?.tab) {
        setCurrentTab(ce.detail.tab);
      }
    };

    document.documentElement.classList.add("admin-viewport");
    document.body.classList.add("admin-viewport");
    syncCurrentTab();
    window.addEventListener("popstate", syncCurrentTab);
    window.addEventListener("admin-tab-change", handleTabEvent);

    return () => {
      document.documentElement.classList.remove("admin-viewport");
      document.body.classList.remove("admin-viewport");
      window.removeEventListener("popstate", syncCurrentTab);
      window.removeEventListener("admin-tab-change", handleTabEvent);
    };
  }, [pathname]);

  // Command Palette Query & Input Ref
  const [paletteQuery, setPaletteQuery] = useState("");
  const paletteInputRef = useRef<HTMLInputElement | null>(null);

  // Inactivity Warning Countdown & Guard (SOC2 Session Compliance)
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [currentUser, setCurrentUser] = useState<AdminUserProfile | null>(null);
  const logoutFiredRef = useRef(false);

  const PUBLIC_AUTH_ROUTES = [
    "/admin/login",
    "/admin/setup",
    "/admin/verify-email",
    "/admin/forgot-password",
    "/admin/reset-password",
  ];
  const isLoginPage = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Cmd+K / Ctrl+K & Escape keyboard shortcut listener
  useEffect(() => {
    if (isLoginPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActiveOverlay((prev) => {
          if (prev === "command_palette") return "none";
          setPaletteQuery("");
          return "command_palette";
        });
      } else if (
        e.key === "Escape" &&
        (activeOverlay === "command_palette" ||
          activeOverlay === "logout_confirm" ||
          activeOverlay === "mobile_drawer")
      ) {
        setActiveOverlay("none");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoginPage, activeOverlay]);

  // Focus palette input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      const timer = setTimeout(() => paletteInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [commandPaletteOpen]);

  // Initial authentication, PostgreSQL hydration & inquiry count sync
  useEffect(() => {
    let active = true;

    const updateCounts = () => {
      const inqs = getInquiries();
      const count = inqs.filter((i) => i.status === "New").length;
      setNewInquiriesCount(count);
      const user = getCurrentUser();
      setCurrentUser(user.email ? user : null);
    };

    const init = async () => {
      if (isLoginPage) {
        if (active) setMounted(true);
        return;
      }

      const ok = await hydrateAdminStore();
      if (!active) return;

      if (!ok || !isAuthenticated()) {
        router.replace("/admin/login");
        return;
      }

      void bootstrapSiteStore(true);
      updateCounts();
      setMounted(true);
    };

    void init();
    const unsub = subscribe(updateCounts);
    return () => {
      active = false;
      unsub();
    };
  }, [isLoginPage, router]);

  // Session activity listener & Inactivity monitor
  useEffect(() => {
    if (isLoginPage) return;

    const handleUserActivity = () => {
      touchSession();
      if (showInactivityWarning) {
        logoutFiredRef.current = false;
        setActiveOverlay("none");
        setCountdownSeconds(60);
      }
    };

    window.addEventListener("mousemove", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("click", handleUserActivity, { passive: true });
    window.addEventListener("touchstart", handleUserActivity, { passive: true });

    // Periodic check for session expiration
    const sessionCheckInterval = setInterval(() => {
      const session = getAdminSession();
      if (!session) return;

      const idleMs = Date.now() - session.lastActiveAt;
      const ttlMs = session.ttlMinutes * 60 * 1000;
      const warnBeforeMs = 60 * 1000; // 60 seconds before expiration

      if (idleMs >= ttlMs) {
        if (!logoutFiredRef.current) {
          logoutFiredRef.current = true;
          setActiveOverlay("none");
          void logout().then(() => {
            router.push("/admin/login?reason=timeout");
          });
        }
      } else if (idleMs >= ttlMs - warnBeforeMs && !showInactivityWarning) {
        // Trigger countdown warning (takes priority over drawer/palette)
        setActiveOverlay("inactivity_warning");
        const remaining = Math.max(1, Math.ceil((ttlMs - idleMs) / 1000));
        setCountdownSeconds(remaining);
      }
    }, 5000);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
      clearInterval(sessionCheckInterval);
    };
  }, [isLoginPage, showInactivityWarning, router]);

  // Countdown decrementer for inactivity warning modal (pure state update; no side effects inside updater)
  useEffect(() => {
    if (!showInactivityWarning) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [showInactivityWarning]);

  // Handle countdown reaching zero cleanly outside state updaters
  useEffect(() => {
    if (showInactivityWarning && countdownSeconds <= 0 && !logoutFiredRef.current) {
      logoutFiredRef.current = true;
      setActiveOverlay("none");
      void logout().then(() => {
        router.push("/admin/login?reason=timeout");
      });
    }
  }, [showInactivityWarning, countdownSeconds, router]);

  const handleExtendSession = () => {
    logoutFiredRef.current = false;
    void extendSession();
    setActiveOverlay("none");
    setCountdownSeconds(60);
  };

  const handleRequestLogout = () => {
    setActiveOverlay("logout_confirm");
  };

  const handleConfirmLogout = () => {
    if (logoutFiredRef.current) return;
    logoutFiredRef.current = true;
    setActiveOverlay("none");
    void logout().then(() => {
      router.push("/admin/login");
    });
  };

  const websiteSubpages = [
    {
      tab: "hero",
      label: "Hero & 3D Wave Engine",
      route: "/ (Hero)",
      icon: Sliders,
      badge: null,
    },
    {
      tab: "home_sections",
      label: "Homepage Sections",
      route: "/ (Sections)",
      icon: BarChart3,
      badge: null,
    },
    {
      tab: "services_page",
      label: "Services Page",
      route: "/services",
      icon: Briefcase,
      badge: null,
    },
    {
      tab: "work_page",
      label: "Work & Case Studies",
      route: "/work",
      icon: Layers,
      badge: null,
    },
    {
      tab: "about_page",
      label: "About Page",
      route: "/about",
      icon: Compass,
      badge: null,
    },
    {
      tab: "contact_page",
      label: "Contact Page",
      route: "/contact",
      icon: Phone,
      badge: null,
    },
    {
      tab: "site_meta",
      label: "Global Layout & Banner",
      route: "Site-Wide",
      icon: Globe,
      badge: null,
    },
    {
      tab: "messages",
      label: "Inbound Messages",
      route: "/contact Intake",
      icon: Mail,
      badge: newInquiriesCount > 0 ? `${newInquiriesCount} new` : null,
    },
    {
      tab: "backup_restore",
      label: "Snapshots & Recovery",
      route: "Backups",
      icon: History,
      badge: null,
    },
  ];

  const handleSelectSubpage = (tab: string) => {
    setCurrentTab(tab);
    if (pathname !== "/admin") {
      router.push(`/admin?tab=${tab}`);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("admin-tab-change", { detail: { tab } }));
    }
    if (mobileMenuOpen) {
      setActiveOverlay("none");
    }
  };

  const otherNavItems = [
    {
      label: "Case Studies CMS",
      href: "/admin/projects",
      icon: FolderKanban,
      badge: null,
      exact: false,
    },
    {
      label: "Blog & Articles CMS",
      href: "/admin/blog",
      icon: BookOpen,
      badge: "SEO",
      exact: false,
    },
    {
      label: "Inbound Messages",
      href: "/admin/inquiries",
      icon: Inbox,
      badge: newInquiriesCount > 0 ? `${newInquiriesCount} new` : null,
      exact: false,
    },
    {
      label: "System Settings",
      href: "/admin/settings",
      icon: SettingsIcon,
      badge: null,
      exact: false,
    },
    {
      label: "SOC2 Audit Logs",
      href: "/admin/audit-logs",
      icon: ShieldCheck,
      badge: "SOC2",
      exact: false,
    },
  ];

  // Derive breadcrumb label
  const getBreadcrumbs = () => {
    if (pathname === "/admin") {
      const pageNameMap: Record<string, string> = {
        hero: "Hero & 3D Wave Engine",
        home_sections: "Homepage Sections & Marquee",
        services_page: "Services Page (/services)",
        work_page: "Work & Case Studies (/work)",
        about_page: "About Page (/about)",
        contact_page: "Contact Page (/contact)",
        site_meta: "Global Layout & Banner",
        messages: "Inbound Messages & Leads",
        backup_restore: "Snapshots & Recovery",
      };
      const sub = pageNameMap[currentTab] || "Website Controller";
      return ["Console", "Website Controller", sub];
    }
    if (pathname.startsWith("/admin/inquiries")) return ["Console", "Inbound Messages & Inquiries"];
    if (pathname.startsWith("/admin/projects")) return ["Console", "Case Studies CMS"];
    if (pathname.startsWith("/admin/blog")) return ["Console", "Blog & Editorial CMS"];
    if (pathname.startsWith("/admin/settings")) return ["Console", "System Governance & Settings"];
    if (pathname.startsWith("/admin/audit-logs")) return ["Console", "SOC2 Audit Trail & Logs"];
    return ["Console", "Overview"];
  };

  const breadcrumbs = getBreadcrumbs();

  const allInquiries = mounted ? getInquiries() : [];
  const allProjects = mounted ? getProjects() : [];

  const commandItems = React.useMemo(() => {
    const list: {
      category: string;
      id: string;
      title: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      action: () => void;
    }[] = [
      // Navigation
      {
        category: "Navigation",
        id: "nav-controller",
        title: "Website Controller & CMS",
        description: "Govern homepage hero, 3D wave engine, subpages, snapshots",
        icon: LayoutDashboard,
        action: () => router.push("/admin"),
      },
      {
        category: "Navigation",
        id: "nav-projects",
        title: "Case Studies CMS",
        description: "Create, edit, tag, and publish portfolio case studies",
        icon: FolderKanban,
        action: () => router.push("/admin/projects"),
      },
      {
        category: "Navigation",
        id: "nav-blog",
        title: "Blog & Editorial Articles CMS",
        description: "Write Markdown guides, optimize SEO/AEO FAQs, and ping IndexNow",
        icon: BookOpen,
        action: () => router.push("/admin/blog"),
      },
      {
        category: "Navigation",
        id: "nav-inquiries",
        title: "Inbound Messages & Inquiries",
        description: "Triage client leads, assign architects, manage discovery",
        icon: Inbox,
        action: () => router.push("/admin/inquiries"),
      },
      {
        category: "Navigation",
        id: "nav-settings",
        title: "System Governance & Settings",
        description: "Response targets, webhook endpoints, 2FA, session timeouts",
        icon: SettingsIcon,
        action: () => router.push("/admin/settings"),
      },
      {
        category: "Navigation",
        id: "nav-audit",
        title: "SOC2 Security Audit Logs",
        description: "Immutable ledger tracking admin actions and authentication",
        icon: ShieldCheck,
        action: () => router.push("/admin/audit-logs"),
      },
      {
        category: "Navigation",
        id: "nav-public",
        title: "Public Website (Live)",
        description: "Open live production website in a new window",
        icon: ExternalLink,
        action: () => window.open("/", "_blank"),
      },
      // CMS Tabs
      {
        category: "CMS Controls",
        id: "cms-hero",
        title: "Hero & 3D Wave Engine",
        description: "Tune 12 procedural wave geometries, speeds, and wireframe themes",
        icon: Sliders,
        action: () => router.push("/admin?tab=hero"),
      },
      {
        category: "CMS Controls",
        id: "cms-sections",
        title: "Homepage Sections & Marquee",
        description: "Adjust impact counters, marquee speeds, and partner logos",
        icon: Sliders,
        action: () => router.push("/admin?tab=home_sections"),
      },
      {
        category: "CMS Controls",
        id: "cms-services",
        title: "Services Page CMS",
        description: "Manage core capability pillars, methodologies, and service FAQs",
        icon: FileText,
        action: () => router.push("/admin?tab=services_page"),
      },
      {
        category: "CMS Controls",
        id: "cms-work",
        title: "Case Studies Page CMS",
        description: "Configure work page headline, metrics, and showcase categories",
        icon: FolderKanban,
        action: () => router.push("/admin?tab=work_page"),
      },
      {
        category: "CMS Controls",
        id: "cms-about",
        title: "About Page CMS",
        description: "Update company values, leadership team, and engineering vision",
        icon: Compass,
        action: () => router.push("/admin?tab=about_page"),
      },
      {
        category: "CMS Controls",
        id: "cms-contact",
        title: "Contact Page CMS",
        description: "Edit response times, office location, and consultation FAQs",
        icon: Inbox,
        action: () => router.push("/admin?tab=contact_page"),
      },
      {
        category: "CMS Controls",
        id: "cms-backup",
        title: "Snapshots & Disaster Recovery",
        description: "Create point-in-time snapshots, 1-click rollbacks, and JSON backups",
        icon: RefreshCcw,
        action: () => router.push("/admin?tab=backup_restore"),
      },
      // Quick Actions
      {
        category: "Security Actions",
        id: "act-clear-rates",
        title: "Clear Brute-Force Rate Limits",
        description: "Reset failed login counters and unblock locked IP addresses",
        icon: Key,
        action: () => {
          void clearRateLimit();
          router.push("/admin/settings");
        },
      },
      {
        category: "Security Actions",
        id: "act-logout",
        title: "Sign Out of Admin Console",
        description: "Safely invalidate cryptographic session token and return to login",
        icon: LogOut,
        action: () => handleRequestLogout(),
      },
    ];

    // Add Inquiries
    allInquiries.slice(0, 8).forEach((inq) => {
      list.push({
        category: "Inquiries",
        id: `inq-${inq.id}`,
        title: `${inq.company} (${inq.name})`,
        description: `[${inq.status}] ${inq.id} — ${inq.message.slice(0, 60)}...`,
        icon: Inbox,
        action: () => router.push(`/admin/inquiries?id=${inq.id}`),
      });
    });

    // Add Projects
    allProjects.slice(0, 5).forEach((proj) => {
      list.push({
        category: "Case Studies",
        id: `proj-${proj.id}`,
        title: proj.title,
        description: `${proj.category.toUpperCase()} — ${proj.metrics}`,
        icon: FolderKanban,
        action: () => router.push("/admin/projects"),
      });
    });

    return list;
  }, [allInquiries, allProjects, router]);

  const filteredCommandItems = React.useMemo(() => {
    if (!paletteQuery.trim()) return commandItems;
    const q = paletteQuery.toLowerCase().trim();
    return commandItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [commandItems, paletteQuery]);

  // On login page, render standalone clean layout without enterprise sidebar/header
  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-50 font-sans antialiased">{children}</div>;
  }

  // Prevent flash of protected UI while hydrating auth state while keeping route segment mounted for Next.js instant checks
  if (!mounted) {
    return (
      <>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 uppercase tracking-widest">
              Loading Enterprise Console...
            </span>
          </div>
        </div>
        <div hidden aria-hidden="true">
          {children}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-900 flex antialiased admin-scope">
      {/* 1. Desktop Enterprise Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200/80 z-30 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
        {/* Brand Header */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-slate-100">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xl p-1 -ml-1 transition-colors"
          >
            <Logo size="sm" variant="light" showText={false} />
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-950 font-display tracking-tight text-base group-hover:text-blue-600 transition-colors">
                Factual
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                Console
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Navigation
          </div>

          {/* Website Controller Dropdown Group */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                if (pathname !== "/admin") {
                  router.push("/admin");
                  setWebsiteControllerOpen(true);
                } else {
                  setWebsiteControllerOpen(!websiteControllerOpen);
                }
              }}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer ${
                pathname === "/admin"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/admin" ? "text-blue-400" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                <span className="font-medium">Website Controller</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md tabular-nums font-semibold transition-colors ${
                    pathname === "/admin"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  9 Pages
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    websiteControllerOpen ? "rotate-180" : ""
                  } ${pathname === "/admin" ? "text-slate-300" : "text-slate-400"}`}
                />
              </div>
            </button>

            {/* Subpages Collapsible Tree */}
            {websiteControllerOpen && (
              <div className="pl-6 pr-1 py-1 space-y-1 my-1">
                {websiteSubpages.map((subpage) => {
                  const isSubActive = pathname === "/admin" && currentTab === subpage.tab;
                  const SubIcon = subpage.icon;

                  return (
                    <button
                      key={subpage.tab}
                      type="button"
                      onClick={() => handleSelectSubpage(subpage.tab)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer ${
                        isSubActive
                          ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSubActive ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{subpage.label}</span>
                      </div>

                      {subpage.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                            isSubActive
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200/70"
                          }`}
                        >
                          {subpage.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other Navigation Items */}
          {otherNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-700"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md tabular-nums font-semibold transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-6 px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Live Site
          </div>

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Public Website</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Live</span>
          </Link>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-slate-200/70 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                {currentUser?.avatar || "AD"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-950 truncate">
                  {currentUser?.name || "Administrator"}
                </p>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="text-[11px] text-slate-500 font-medium truncate">
                    {currentUser?.role || "Super Admin"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRequestLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/50 z-40 transition-opacity"
          onClick={() => setActiveOverlay("none")}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200/80 z-50 flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Logo size="sm" variant="light" showText={false} />
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-950 font-display tracking-tight text-base">
                Factual
              </span>
              <span className="font-mono text-[10px] font-bold uppercase text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                Console
              </span>
            </div>
          </Link>
          <button
            onClick={() => setActiveOverlay("none")}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {/* Website Controller Dropdown Group */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                if (pathname !== "/admin") {
                  router.push("/admin");
                  setWebsiteControllerOpen(true);
                } else {
                  setWebsiteControllerOpen(!websiteControllerOpen);
                }
              }}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                pathname === "/admin"
                  ? "bg-slate-950 text-white"
                  : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard
                  className={`w-4 h-4 ${pathname === "/admin" ? "text-blue-400" : "text-slate-400"}`}
                />
                <span className="font-medium">Website Controller</span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    pathname === "/admin"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  9 Pages
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    websiteControllerOpen ? "rotate-180" : ""
                  } ${pathname === "/admin" ? "text-slate-300" : "text-slate-400"}`}
                />
              </div>
            </button>

            {/* Subpages Collapsible Tree */}
            {websiteControllerOpen && (
              <div className="pl-6 pr-1 py-1 space-y-1 my-1">
                {websiteSubpages.map((subpage) => {
                  const isSubActive = pathname === "/admin" && currentTab === subpage.tab;
                  const SubIcon = subpage.icon;

                  return (
                    <button
                      key={subpage.tab}
                      type="button"
                      onClick={() => handleSelectSubpage(subpage.tab)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all cursor-pointer ${
                        isSubActive
                          ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SubIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSubActive ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{subpage.label}</span>
                      </div>

                      {subpage.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                            isSubActive
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600 border border-slate-200/70"
                          }`}
                        >
                          {subpage.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other Navigation Items */}
          {otherNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-4 pb-2 px-3 text-[11px] font-mono font-semibold uppercase text-slate-400">
            External
          </div>
          <Link
            href="/"
            className="min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Public Site</span>
            </div>
          </Link>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleRequestLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-18 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile trigger & Breadcrumbs */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setActiveOverlay("mobile_drawer")}
              className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
              <span className="hidden sm:inline text-slate-400 font-mono">Factual</span>
              <ChevronRight className="hidden sm:inline w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="hidden md:inline text-slate-500">{breadcrumbs[0]}</span>
              <ChevronRight className="hidden md:inline w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-slate-900 font-semibold truncate">{breadcrumbs[1]}</span>
            </nav>
          </div>

          {/* Right: Quick Search, Health Status, Role Badge, Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Find (⌘K) Search Trigger (44px tap target) */}
            <button
              type="button"
              onClick={() => setActiveOverlay("command_palette")}
              className="flex items-center gap-2 min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-slate-100/80 text-slate-600 hover:text-slate-900 text-xs transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title="Open Command Palette (Cmd+K / Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="hidden md:inline font-semibold">Quick Find...</span>
              <kbd className="hidden sm:inline-flex items-center font-mono text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 shadow-2xs">
                ⌘K
              </kbd>
            </button>



            {/* Authenticated Admin Indicator */}
            <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-900">
              <span className="w-5 h-5 rounded-md bg-slate-950 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                {currentUser?.avatar || "AD"}
              </span>
              <span>{currentUser?.name || "Administrator"}</span>
            </div>

            {/* Sign out button */}
            <button
              onClick={handleRequestLogout}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 sm:px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Inactivity Session Expiry Modal (SOC2 Type II Defense) */}
      {showInactivityWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-950 text-base">
                  Session Inactivity Warning
                </h3>
                <p className="text-xs text-slate-500">
                  Compliance Security Policy (SOC2 Section 4.2)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Your administrative session has been idle. To protect system governance and customer data, your session will automatically terminate in{" "}
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                {countdownSeconds}s
              </span>
              .
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                Log Out Now
              </button>
              <button
                type="button"
                onClick={handleExtendSession}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                Extend Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-950 text-base">
                  Sign Out of Admin Console
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to end your administrative session? You will need to sign in again to access the control panel.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveOverlay("none")}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Global Command Palette Modal (Cmd+K / Ctrl+K) */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-100"
          onClick={() => setActiveOverlay("none")}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Admin Command Palette"
          >
            {/* Search Input Bar */}
            <div className="relative border-b border-slate-100 flex items-center px-4 sm:px-5">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={paletteInputRef}
                type="text"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search console pages, CMS tabs, client leads, or quick actions..."
                className="w-full min-h-[56px] px-3.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setActiveOverlay("none")}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close Command Palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 custom-scrollbar">
              {filteredCommandItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <p className="font-medium text-slate-600 text-sm">No results found for &ldquo;{paletteQuery}&rdquo;</p>
                  <p className="mt-1">Try searching for &ldquo;wave&rdquo;, &ldquo;services&rdquo;, &ldquo;Elena&rdquo;, or &ldquo;settings&rdquo;.</p>
                </div>
              ) : (
                filteredCommandItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveOverlay("none");
                        item.action();
                      }}
                      className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 focus:bg-slate-100 text-left transition-colors flex items-center justify-between gap-3 group cursor-pointer focus:outline-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                          {item.category}
                        </span>
                        
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer with key hints */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span>Navigate: Click or Tab</span>
                <span>Select: Enter</span>
              </div>
              <div>
                <span>Close: Esc</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
