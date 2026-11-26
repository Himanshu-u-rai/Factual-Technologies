"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_SITE_CONTENT,
  mergeSiteContent,
  type AboutPageContent,
  type AboutValueContent,
  type ContactPageContent,
  type ContactTimelineContent,
  type CTABannerContent,
  type FAQContent,
  type FullSiteContent,
  type HeroContent,
  type InboundMessage,
  type NavLinkContent,
  type ProcessStepContent,
  type ProjectContent,
  type ServiceContent,
  type ServiceMetricContent,
  type ServicesPageContent,
  type SiteMetaContent,
  type SiteSnapshot,
  type StatContent,
  type StrategicPillarContent,
  type TechStackContent,
  type TestimonialContent,
  type VisionMissionContent,
  type WaveAnimationConfig,
  type WorkPageContent,
} from "@/lib/site-defaults";

export {
  DEFAULT_SITE_CONTENT,
  mergeSiteContent,
  type AboutPageContent,
  type AboutValueContent,
  type ContactPageContent,
  type ContactTimelineContent,
  type CTABannerContent,
  type FAQContent,
  type FullSiteContent,
  type HeroContent,
  type InboundMessage,
  type NavLinkContent,
  type ProcessStepContent,
  type ProjectContent,
  type ServiceContent,
  type ServiceMetricContent,
  type ServicesPageContent,
  type SiteMetaContent,
  type SiteSnapshot,
  type StatContent,
  type StrategicPillarContent,
  type TechStackContent,
  type TestimonialContent,
  type VisionMissionContent,
  type WaveAnimationConfig,
  type WorkPageContent,
};

const EVENT_NAME = "factual:site_content_updated";
const PUBLIC_AUTH_ROUTES = [
  "/admin/login",
  "/admin/setup",
  "/admin/verify-email",
  "/admin/forgot-password",
  "/admin/reset-password",
];

type SiteStoreStatus = "hydrating" | "ready" | "error";

interface SiteStoreSnapshot {
  status: SiteStoreStatus;
  content: FullSiteContent;
  snapshots: SiteSnapshot[];
}

const SERVER_STORE_SNAPSHOT: SiteStoreSnapshot = {
  status: "hydrating",
  content: DEFAULT_SITE_CONTENT,
  snapshots: [],
};

let storeSnapshot: SiteStoreSnapshot = SERVER_STORE_SNAPSHOT;
const storeSubscribers = new Set<() => void>();
let externalListenersAttached = false;
let bootstrapPromise: Promise<void> | null = null;
let loadedScope: "none" | "public" | "admin" = "none";
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingReason: string | undefined;

function emitStoreChange(): void {
  storeSubscribers.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error("Site store listener error:", err);
    }
  });
}

function getDesiredScope(): "public" | "admin" {
  if (typeof window === "undefined") return "public";
  const path = window.location.pathname;
  const isAdmin =
    path.startsWith("/admin") &&
    !PUBLIC_AUTH_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
  return isAdmin ? "admin" : "public";
}

function subscribeSiteStore(listener: () => void): () => void {
  storeSubscribers.add(listener);
  if (typeof window !== "undefined" && !externalListenersAttached) {
    externalListenersAttached = true;
    window.addEventListener(EVENT_NAME, () => {
      emitStoreChange();
    });
  }
  return () => {
    storeSubscribers.delete(listener);
  };
}

function getClientStoreSnapshot(): SiteStoreSnapshot {
  return storeSnapshot;
}

function getServerStoreSnapshot(): SiteStoreSnapshot {
  return SERVER_STORE_SNAPSHOT;
}

/** Reloads site content from PostgreSQL via /api/site-content or /api/admin/site-content. */
export async function bootstrapSiteStore(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const desiredScope = getDesiredScope();

  if (!force && bootstrapPromise && loadedScope === desiredScope) {
    return bootstrapPromise;
  }

  if (!force && storeSnapshot.status === "ready" && loadedScope === desiredScope) {
    return;
  }

  loadedScope = desiredScope;
  bootstrapPromise = (async () => {
    try {
      const endpoint =
        desiredScope === "admin" ? "/api/admin/site-content" : "/api/site-content";
      const res = await fetch(endpoint, {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!res.ok) {
        if (desiredScope === "admin" && res.status === 401) {
          // Public auth guard handles redirect; keep safe baseline without error toast
          storeSnapshot = {
            status: "ready",
            content: storeSnapshot.content,
            snapshots: [],
          };
          emitStoreChange();
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        content?: Partial<FullSiteContent>;
        snapshots?: SiteSnapshot[];
      };

      const nextContent = mergeSiteContent(data.content);
      storeSnapshot = {
        status: "ready",
        content: nextContent,
        snapshots: Array.isArray(data.snapshots) ? data.snapshots : storeSnapshot.snapshots,
      };
      emitStoreChange();
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: nextContent }));
    } catch (err) {
      console.error("Failed to fetch site content from PostgreSQL:", err);
      storeSnapshot = {
        status: storeSnapshot.status === "ready" ? "ready" : "error",
        content: storeSnapshot.content,
        snapshots: storeSnapshot.snapshots,
      };
      emitStoreChange();
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

/** Forces next hook mount or caller to re-read from Postgres cleanly. */
export function invalidateSiteStore(): void {
  loadedScope = "none";
  void bootstrapSiteStore(true);
}

async function persistSiteContentToServer(content: FullSiteContent, reason?: string): Promise<void> {
  try {
    const res = await fetch("/api/admin/site-content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ content, reason }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    console.error("Failed to persist site content to PostgreSQL:", err);
  }
}

function saveContent(
  content: FullSiteContent,
  options?: { immediate?: boolean; reason?: string }
): void {
  storeSnapshot = {
    ...storeSnapshot,
    status: "ready",
    content,
  };
  emitStoreChange();

  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: content }));

  pendingReason = options?.reason || pendingReason;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  if (options?.immediate) {
    const reasonToSend = pendingReason;
    pendingReason = undefined;
    void persistSiteContentToServer(content, reasonToSend);
    return;
  }

  saveTimer = setTimeout(() => {
    const latestContent = storeSnapshot.content;
    const reasonToSend = pendingReason;
    pendingReason = undefined;
    saveTimer = null;
    void persistSiteContentToServer(latestContent, reasonToSend);
  }, 250);
}

function mutateContent(
  updater: (current: FullSiteContent) => FullSiteContent,
  options?: { immediate?: boolean; reason?: string }
): void {
  const next = updater(storeSnapshot.content);
  saveContent(next, options);
}

export function getSiteContentSnapshot(): FullSiteContent {
  return storeSnapshot.content;
}

export function useSiteContent() {
  const snapshot = useSyncExternalStore(
    subscribeSiteStore,
    getClientStoreSnapshot,
    getServerStoreSnapshot
  );

  useEffect(() => {
    void bootstrapSiteStore(false);
  }, []);

  const content = snapshot.content;
  const isLoaded = snapshot.status !== "hydrating";
  const snapshots = snapshot.snapshots;

  const updateHero = (updates: Partial<HeroContent>) => {
    mutateContent((current) => ({ ...current, hero: { ...current.hero, ...updates } }));
  };

  const updateStats = (stats: StatContent[]) => {
    mutateContent((current) => ({ ...current, stats }));
  };

  const addStat = (stat: Omit<StatContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      stats: [...current.stats, { ...stat, id: `stat-${Date.now()}` }],
    }));
  };

  const deleteStat = (id: string) => {
    mutateContent((current) => ({
      ...current,
      stats: current.stats.filter((s) => s.id !== id),
    }));
  };

  const updateServices = (services: ServiceContent[]) => {
    mutateContent((current) => ({ ...current, services }));
  };

  const addService = (service: Omit<ServiceContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      services: [...current.services, { ...service, id: `service-${Date.now()}` }],
    }));
  };

  const deleteService = (id: string) => {
    mutateContent((current) => ({
      ...current,
      services: current.services.filter((s) => s.id !== id),
    }));
  };

  const updateServicesPage = (updates: Partial<ServicesPageContent>) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      return { ...current, servicesPage: [{ ...existing, ...updates }] };
    });
  };

  const addStrategicPillar = (pillar: Omit<StrategicPillarContent, "id">) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      const newPillar: StrategicPillarContent = { ...pillar, id: `spill-${Date.now()}` };
      return {
        ...current,
        servicesPage: [
          { ...existing, strategicPillars: [...(existing.strategicPillars || []), newPillar] },
        ],
      };
    });
  };

  const updateStrategicPillar = (id: string, updates: Partial<StrategicPillarContent>) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      const updatedPillars = (existing.strategicPillars || []).map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      return {
        ...current,
        servicesPage: [{ ...existing, strategicPillars: updatedPillars }],
      };
    });
  };

  const deleteStrategicPillar = (id: string) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      return {
        ...current,
        servicesPage: [
          {
            ...existing,
            strategicPillars: (existing.strategicPillars || []).filter((p) => p.id !== id),
          },
        ],
      };
    });
  };

  const addProcessStep = (step: Omit<ProcessStepContent, "id">) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      const newStep: ProcessStepContent = { ...step, id: `ps-${Date.now()}` };
      return {
        ...current,
        servicesPage: [
          { ...existing, processSteps: [...(existing.processSteps || []), newStep] },
        ],
      };
    });
  };

  const deleteProcessStep = (id: string) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      return {
        ...current,
        servicesPage: [
          {
            ...existing,
            processSteps: (existing.processSteps || []).filter((s) => s.id !== id),
          },
        ],
      };
    });
  };

  const updateServiceMetrics = (metrics: ServiceMetricContent[]) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      return { ...current, servicesPage: [{ ...existing, metrics }] };
    });
  };

  const addServiceMetric = (metric: Omit<ServiceMetricContent, "id">) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      const newMetric: ServiceMetricContent = { ...metric, id: `sm-${Date.now()}` };
      return {
        ...current,
        servicesPage: [{ ...existing, metrics: [...(existing.metrics || []), newMetric] }],
      };
    });
  };

  const deleteServiceMetric = (id: string) => {
    mutateContent((current) => {
      const existing = current.servicesPage[0] || DEFAULT_SITE_CONTENT.servicesPage[0];
      return {
        ...current,
        servicesPage: [
          { ...existing, metrics: (existing.metrics || []).filter((m) => m.id !== id) },
        ],
      };
    });
  };

  const updateProjects = (projects: ProjectContent[]) => {
    mutateContent((current) => ({ ...current, projects }), { immediate: true });
  };

  const updateWorkPage = (updates: Partial<WorkPageContent>) => {
    mutateContent((current) => ({ ...current, workPage: { ...current.workPage, ...updates } }));
  };

  const updateAboutPage = (updates: Partial<AboutPageContent>) => {
    mutateContent((current) => ({ ...current, aboutPage: { ...current.aboutPage, ...updates } }));
  };

  const addAboutParagraph = (text: string) => {
    mutateContent((current) => ({
      ...current,
      aboutPage: {
        ...current.aboutPage,
        narrativeParagraphs: [...(current.aboutPage.narrativeParagraphs || []), text],
      },
    }));
  };

  const updateAboutParagraph = (index: number, text: string) => {
    mutateContent((current) => {
      const paragraphs = [...(current.aboutPage.narrativeParagraphs || [])];
      paragraphs[index] = text;
      return {
        ...current,
        aboutPage: { ...current.aboutPage, narrativeParagraphs: paragraphs },
      };
    });
  };

  const deleteAboutParagraph = (index: number) => {
    mutateContent((current) => ({
      ...current,
      aboutPage: {
        ...current.aboutPage,
        narrativeParagraphs: (current.aboutPage.narrativeParagraphs || []).filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const updateVisionMission = (updates: Partial<VisionMissionContent>) => {
    mutateContent((current) => ({
      ...current,
      aboutPage: {
        ...current.aboutPage,
        visionMission: { ...current.aboutPage.visionMission, ...updates },
      },
    }));
  };

  const addAboutValue = (val: Omit<AboutValueContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      aboutPage: {
        ...current.aboutPage,
        values: [...(current.aboutPage.values || []), { ...val, id: `val-${Date.now()}` }],
      },
    }));
  };

  const deleteAboutValue = (id: string) => {
    mutateContent((current) => ({
      ...current,
      aboutPage: {
        ...current.aboutPage,
        values: (current.aboutPage.values || []).filter((v) => v.id !== id),
      },
    }));
  };

  const updateContactPage = (updates: Partial<ContactPageContent>) => {
    mutateContent((current) => ({
      ...current,
      contactPage: { ...current.contactPage, ...updates },
    }));
  };

  const addContactFaq = (faq: Omit<FAQContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      contactPage: {
        ...current.contactPage,
        faqs: [...(current.contactPage.faqs || []), { ...faq, id: `faq-c-${Date.now()}` }],
      },
    }));
  };

  const deleteContactFaq = (id: string) => {
    mutateContent((current) => ({
      ...current,
      contactPage: {
        ...current.contactPage,
        faqs: (current.contactPage.faqs || []).filter((f) => f.id !== id),
      },
    }));
  };

  const addContactTimeline = (step: Omit<ContactTimelineContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      contactPage: {
        ...current.contactPage,
        timeline: [...(current.contactPage.timeline || []), { ...step, id: `tl-${Date.now()}` }],
      },
    }));
  };

  const updateContactTimeline = (id: string, updates: Partial<ContactTimelineContent>) => {
    mutateContent((current) => ({
      ...current,
      contactPage: {
        ...current.contactPage,
        timeline: (current.contactPage.timeline || []).map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      },
    }));
  };

  const deleteContactTimeline = (id: string) => {
    mutateContent((current) => ({
      ...current,
      contactPage: {
        ...current.contactPage,
        timeline: (current.contactPage.timeline || []).filter((t) => t.id !== id),
      },
    }));
  };

  const updateTestimonials = (testimonials: TestimonialContent[]) => {
    mutateContent((current) => ({ ...current, testimonials }));
  };

  const addTestimonial = (testimonial: Omit<TestimonialContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      testimonials: [
        ...(current.testimonials || []),
        { ...testimonial, id: `test-${Date.now()}` },
      ],
    }));
  };

  const deleteTestimonial = (id: string) => {
    mutateContent((current) => ({
      ...current,
      testimonials: (current.testimonials || []).filter((t) => t.id !== id),
    }));
  };

  const updateCtaBanner = (updates: Partial<CTABannerContent>) => {
    mutateContent((current) => {
      const existing = current.ctaBanner || DEFAULT_SITE_CONTENT.ctaBanner!;
      return { ...current, ctaBanner: { ...existing, ...updates } };
    });
  };

  const updateTechStack = (techUpdates: Partial<TechStackContent>) => {
    mutateContent((current) => ({
      ...current,
      techStack: { ...current.techStack, ...techUpdates },
    }));
  };

  const updateClients = (clients: string[]) => {
    mutateContent((current) => ({ ...current, clients }));
  };

  const updateMeta = (metaUpdates: Partial<SiteMetaContent>) => {
    mutateContent((current) => ({
      ...current,
      meta: { ...current.meta, ...metaUpdates },
    }));
  };

  const addNavLink = (link: Omit<NavLinkContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      meta: {
        ...current.meta,
        navLinks: [...(current.meta.navLinks || []), { ...link, id: `nav-${Date.now()}` }],
      },
    }));
  };

  const updateNavLink = (id: string, updates: Partial<NavLinkContent>) => {
    mutateContent((current) => ({
      ...current,
      meta: {
        ...current.meta,
        navLinks: (current.meta.navLinks || []).map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      },
    }));
  };

  const deleteNavLink = (id: string) => {
    mutateContent((current) => ({
      ...current,
      meta: {
        ...current.meta,
        navLinks: (current.meta.navLinks || []).filter((l) => l.id !== id),
      },
    }));
  };

  const addFooterCapabilityLink = (link: Omit<NavLinkContent, "id">) => {
    mutateContent((current) => ({
      ...current,
      meta: {
        ...current.meta,
        footerCapabilityLinks: [
          ...(current.meta.footerCapabilityLinks || []),
          { ...link, id: `fcap-${Date.now()}` },
        ],
      },
    }));
  };

  const updateFooterCapabilityLink = (id: string, updates: Partial<NavLinkContent>) => {
    mutateContent((current) => ({
      ...current,
      meta: {
        ...current.meta,
        footerCapabilityLinks: (current.meta.footerCapabilityLinks || []).map((l) =>
          l.id === id ? { ...l, ...updates } : l
        ),
      },
    }));
  };

  const deleteFooterCapabilityLink = (id: string) => {
    mutateContent((current) => ({
      ...current,
      meta: {
        ...current.meta,
        footerCapabilityLinks: (current.meta.footerCapabilityLinks || []).filter(
          (l) => l.id !== id
        ),
      },
    }));
  };

  const addMessage = async (msg: Omit<InboundMessage, "id" | "createdAt" | "read">) => {
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    if (!res.ok) {
      throw new Error("Failed to submit inquiry");
    }
  };

  const deleteMessage = (id: string) => {
    storeSnapshot = {
      ...storeSnapshot,
      content: {
        ...storeSnapshot.content,
        messages: storeSnapshot.content.messages.filter((m) => m.id !== id),
      },
    };
    emitStoreChange();
    void fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
  };

  const markMessageRead = (id: string) => {
    storeSnapshot = {
      ...storeSnapshot,
      content: {
        ...storeSnapshot.content,
        messages: storeSnapshot.content.messages.map((m) =>
          m.id === id ? { ...m, read: true } : m
        ),
      },
    };
    emitStoreChange();
    void fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ read: true }),
    });
  };

  const createSnapshot = (name?: string): SiteSnapshot => {
    const label = name || `Revision at ${new Date().toLocaleTimeString()}`;
    const optimistic: SiteSnapshot = {
      id: `snap-${Date.now()}`,
      name: label,
      timestamp: new Date().toISOString(),
      author: "Administrator",
      content: storeSnapshot.content,
    };
    storeSnapshot = {
      ...storeSnapshot,
      snapshots: [optimistic, ...storeSnapshot.snapshots],
    };
    emitStoreChange();

    void (async () => {
      try {
        const res = await fetch("/api/admin/snapshots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ name: label }),
        });
        if (res.ok) {
          const data = (await res.json()) as { snapshots?: SiteSnapshot[] };
          if (Array.isArray(data.snapshots)) {
            storeSnapshot = { ...storeSnapshot, snapshots: data.snapshots };
            emitStoreChange();
          }
        }
      } catch (err) {
        console.error("Failed to create snapshot:", err);
      }
    })();

    return optimistic;
  };

  const restoreSnapshot = (id: string): boolean => {
    const target = storeSnapshot.snapshots.find((s) => s.id === id);
    if (!target) return false;
    storeSnapshot = {
      ...storeSnapshot,
      content: mergeSiteContent(target.content),
    };
    emitStoreChange();

    void (async () => {
      try {
        const res = await fetch(`/api/admin/snapshots/${encodeURIComponent(id)}`, {
          method: "POST",
          credentials: "same-origin",
        });
        if (res.ok) {
          void bootstrapSiteStore(true);
        }
      } catch (err) {
        console.error("Failed to restore snapshot:", err);
      }
    })();
    return true;
  };

  const deleteSnapshot = (id: string) => {
    storeSnapshot = {
      ...storeSnapshot,
      snapshots: storeSnapshot.snapshots.filter((s) => s.id !== id),
    };
    emitStoreChange();

    void fetch(`/api/admin/snapshots/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
  };

  const exportBackupJSON = (): string => {
    return JSON.stringify(
      {
        version: "4.0.0",
        exportedAt: new Date().toISOString(),
        site: "Factual Technologies",
        content: storeSnapshot.content,
      },
      null,
      2
    );
  };

  const importBackupJSON = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.content || !parsed.content.hero) {
        return { success: false, error: "Invalid backup format: missing required content schema." };
      }
      createSnapshot("Pre-import automatic safety backup");
      saveContent(mergeSiteContent(parsed.content), {
        immediate: true,
        reason: `Imported full site JSON backup (version ${parsed.version || "unknown"})`,
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid JSON syntax";
      return { success: false, error: `JSON Parse Failure: ${msg}` };
    }
  };

  const resetDefaults = () => {
    createSnapshot("Pre-reset automatic backup");
    saveContent(DEFAULT_SITE_CONTENT, {
      immediate: true,
      reason: "Restored all website pages and sections to baseline defaults",
    });
  };

  return {
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
    addMessage,
    deleteMessage,
    markMessageRead,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    exportBackupJSON,
    importBackupJSON,
    resetDefaults,
  };
}
