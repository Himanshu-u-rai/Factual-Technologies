"use client";

import {
  ARCHITECTS,
  INITIAL_SETTINGS,
  sanitizeInput,
  type AdminSession,
  type AdminUserProfile,
  type AuditLog,
  type CaseStudy,
  type Inquiry,
  type InquiryNote,
  type InquiryPriority,
  type InquiryStatus,
  type ProjectCategory,
  type RateLimitState,
  type SystemSettings,
} from "@/lib/admin-types";
import { invalidateSiteStore } from "@/lib/site-store";

export {
  ARCHITECTS,
  sanitizeInput,
  type AdminSession,
  type AdminUserProfile,
  type AuditLog,
  type CaseStudy,
  type Inquiry,
  type InquiryNote,
  type InquiryPriority,
  type InquiryStatus,
  type ProjectCategory,
  type RateLimitState,
  type SystemSettings,
};

export interface SmtpStatusInfo {
  configured: boolean;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  hasAuth: boolean;
}

const listeners = new Set<() => void>();
let memoryInquiries: Inquiry[] = [];
let memoryProjects: CaseStudy[] = [];
let memoryAuditLogs: AuditLog[] = [];
let memorySettings: SystemSettings = { ...INITIAL_SETTINGS };
let memorySession: AdminSession | null = null;
let memoryUser: AdminUserProfile | null = null;
let memoryRateLimit: RateLimitState = { attempts: 0, lockedUntil: null };
let memorySmtpStatus: SmtpStatusInfo = {
  configured: false,
  host: "",
  port: 587,
  secure: false,
  from: "",
  hasAuth: false,
};
let memoryHydrated = false;
let hydrateInFlight: Promise<boolean> | null = null;
let lastTouchSentAt = 0;

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("Admin store listener error:", err);
    }
  });
}

/** Subscribes a React view to admin store updates. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isAdminHydrated(): boolean {
  return memoryHydrated;
}

export function getSmtpStatusClient(): SmtpStatusInfo {
  return memorySmtpStatus;
}

/** Hydrates authenticated session, inquiries, projects, audit logs, and settings from PostgreSQL. */
export async function hydrateAdminStore(force = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!force && hydrateInFlight) return hydrateInFlight;

  hydrateInFlight = (async () => {
    try {
      const sessionRes = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!sessionRes.ok) {
        memorySession = null;
        memoryUser = null;
        memoryHydrated = true;
        notify();
        return false;
      }

      const sessionData = (await sessionRes.json()) as {
        authenticated: boolean;
        user?: AdminUserProfile;
        admin?: AdminUserProfile;
        session: { createdAt: number; lastActiveAt: number; ttlMinutes: number };
      };

      const resolvedUser = sessionData.user || sessionData.admin;
      if (!sessionData.authenticated || !resolvedUser) {
        memorySession = null;
        memoryUser = null;
        memoryHydrated = true;
        notify();
        return false;
      }

      memoryUser = resolvedUser;
      memorySession = {
        token: "http-only-session",
        email: resolvedUser.email,
        name: resolvedUser.name,
        role: resolvedUser.role,
        createdAt: sessionData.session.createdAt,
        lastActiveAt: sessionData.session.lastActiveAt,
        ttlMinutes: sessionData.session.ttlMinutes,
      };

      const [inqRes, projRes, logRes, setRes] = await Promise.all([
        fetch("/api/admin/inquiries", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/admin/projects", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/admin/audit-logs", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/admin/settings", { cache: "no-store", credentials: "same-origin" }),
      ]);

      if (inqRes.ok) {
        const d = (await inqRes.json()) as { inquiries?: Inquiry[] };
        if (Array.isArray(d.inquiries)) memoryInquiries = d.inquiries;
      }
      if (projRes.ok) {
        const d = (await projRes.json()) as { projects?: CaseStudy[] };
        if (Array.isArray(d.projects)) memoryProjects = d.projects;
      }
      if (logRes.ok) {
        const d = (await logRes.json()) as { logs?: AuditLog[] };
        if (Array.isArray(d.logs)) memoryAuditLogs = d.logs;
      }
      if (setRes.ok) {
        const d = (await setRes.json()) as {
          settings?: SystemSettings;
          smtpStatus?: SmtpStatusInfo;
          twoFactorEnabled?: boolean;
        };
        if (d.settings) memorySettings = { ...INITIAL_SETTINGS, ...d.settings };
        if (d.smtpStatus) memorySmtpStatus = d.smtpStatus;
        if (memoryUser && typeof d.twoFactorEnabled === "boolean") {
          memoryUser = { ...memoryUser, twoFactorEnabled: d.twoFactorEnabled };
        }
      }

      memoryHydrated = true;
      notify();
      return true;
    } catch (err) {
      console.error("Failed to hydrate admin store:", err);
      memoryHydrated = true;
      notify();
      return false;
    } finally {
      hydrateInFlight = null;
    }
  })();

  return hydrateInFlight;
}

// ---------------- AUTHENTICATION & SESSIONS ----------------

export function getRateLimitStatus(): {
  isLocked: boolean;
  remainingSeconds: number;
  attempts: number;
} {
  if (!memoryRateLimit.lockedUntil) {
    return { isLocked: false, remainingSeconds: 0, attempts: memoryRateLimit.attempts };
  }
  const diffMs = memoryRateLimit.lockedUntil - Date.now();
  if (diffMs <= 0) {
    memoryRateLimit = { attempts: 0, lockedUntil: null };
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
  return {
    isLocked: true,
    remainingSeconds: Math.ceil(diffMs / 1000),
    attempts: memoryRateLimit.attempts,
  };
}

export async function clearRateLimit(): Promise<void> {
  memoryRateLimit = { attempts: 0, lockedUntil: null };
  await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ action: "clear_rate_limits" }),
  });
  notify();
}

export function isAuthenticated(): boolean {
  return Boolean(memorySession && memoryUser);
}

export function getAdminSession(): AdminSession | null {
  return memorySession;
}

export function getCurrentUser(): AdminUserProfile {
  if (memoryUser) return memoryUser;
  return {
    id: "",
    name: "Administrator",
    email: "",
    role: "Super Admin",
    avatar: "AD",
    emailVerified: false,
    twoFactorEnabled: false,
  };
}

/** Touches session activity with client-side 60-second throttling so mouse movement does not flood APIs. */
export function touchSession(): void {
  if (!memorySession) return;
  const now = Date.now();
  memorySession = { ...memorySession, lastActiveAt: now };

  if (now - lastTouchSentAt < 60_000) return;
  lastTouchSentAt = now;

  void fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
  }).then((res) => {
    if (res.status === 401) {
      memorySession = null;
      memoryUser = null;
      notify();
    }
  }).catch(() => {});
}

export async function extendSession(): Promise<void> {
  lastTouchSentAt = Date.now();
  if (memorySession) {
    memorySession = { ...memorySession, lastActiveAt: Date.now() };
  }
  const res = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "same-origin",
  });
  if (res.ok) {
    const data = (await res.json()) as {
      session?: { createdAt: number; lastActiveAt: number; ttlMinutes: number };
    };
    if (memorySession && data.session) {
      memorySession = {
        ...memorySession,
        lastActiveAt: data.session.lastActiveAt,
        ttlMinutes: data.session.ttlMinutes,
      };
    }
  }
  notify();
}

export async function logout(): Promise<void> {
  memorySession = null;
  memoryUser = null;
  memoryHydrated = false;
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } catch (err) {
    console.error("Logout request failed:", err);
  }
  notify();
}

// ---------------- INQUIRIES ----------------

export function getInquiries(): Inquiry[] {
  return memoryInquiries;
}

export function getInquiryById(id: string): Inquiry | undefined {
  return memoryInquiries.find((item) => item.id === id);
}

export async function addInquiry(
  inquiry: Partial<Inquiry> & { name: string; email: string; message: string; company?: string }
): Promise<Inquiry | null> {
  const endpoint = isAuthenticated() ? "/api/admin/inquiries" : "/api/inquiries";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(inquiry),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errBody?.error || "Failed to record inquiry.");
  }

  const data = (await res.json()) as { inquiry?: Inquiry; id?: string };
  if (data.inquiry) {
    memoryInquiries = [data.inquiry, ...memoryInquiries];
    notify();
    return data.inquiry;
  }
  if (isAuthenticated()) {
    void hydrateAdminStore(true);
  }
  return null;
}

async function patchInquiry(
  id: string,
  payload: Record<string, unknown>,
  optimisticUpdate: (item: Inquiry) => Inquiry
): Promise<void> {
  memoryInquiries = memoryInquiries.map((item) =>
    item.id === id ? optimisticUpdate(item) : item
  );
  notify();

  const res = await fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = (await res.json()) as { inquiry?: Inquiry };
    if (data.inquiry) {
      memoryInquiries = memoryInquiries.map((item) =>
        item.id === id ? data.inquiry! : item
      );
      notify();
    }
    void refreshAuditLogs();
  }
}

export function updateInquiryStatus(id: string, status: InquiryStatus): void {
  void patchInquiry(id, { status }, (item) => ({ ...item, status }));
}

export function updateInquiryArchitect(id: string, architect: string): void {
  void patchInquiry(
    id,
    { assignedArchitect: architect || null },
    (item) => ({ ...item, assignedArchitect: architect || undefined })
  );
}

export const assignInquiryArchitect = updateInquiryArchitect;

export function updateInquiryPriority(id: string, priority: InquiryPriority): void {
  void patchInquiry(id, { priority }, (item) => ({ ...item, priority }));
}

export function addInquiryNote(id: string, text: string, author?: string): void {
  const cleanText = sanitizeInput(text.trim());
  if (!cleanText) return;

  const optimisticNote: InquiryNote = {
    id: `note-${Date.now()}`,
    author: author || getCurrentUser().name,
    text: cleanText,
    createdAt: new Date().toISOString(),
  };

  memoryInquiries = memoryInquiries.map((item) =>
    item.id === id ? { ...item, notes: [...item.notes, optimisticNote] } : item
  );
  notify();

  void (async () => {
    const res = await fetch(`/api/admin/inquiries/${encodeURIComponent(id)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ text: cleanText }),
    });
    if (res.ok) {
      const data = (await res.json()) as { inquiry?: Inquiry };
      if (data.inquiry) {
        memoryInquiries = memoryInquiries.map((item) =>
          item.id === id ? data.inquiry! : item
        );
        notify();
      }
      void refreshAuditLogs();
    }
  })();
}

export function deleteInquiry(id: string): void {
  memoryInquiries = memoryInquiries.filter((item) => item.id !== id);
  notify();

  void fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  }).then(() => {
    void refreshAuditLogs();
  });
}

// ---------------- CASE STUDIES ----------------

export function getProjects(): CaseStudy[] {
  return memoryProjects;
}

export function getProjectById(id: string): CaseStudy | undefined {
  return memoryProjects.find((item) => item.id === id);
}

export function addProject(project: Omit<CaseStudy, "id" | "updatedAt">): CaseStudy {
  const optimistic: CaseStudy = {
    ...project,
    id: `cs-${Date.now()}`,
    title: sanitizeInput(project.title),
    metrics: sanitizeInput(project.metrics),
    description: sanitizeInput(project.description),
    tags: project.tags.map((t) => sanitizeInput(t)),
    updatedAt: new Date().toISOString(),
  };

  memoryProjects = [optimistic, ...memoryProjects];
  notify();

  void (async () => {
    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(project),
    });
    if (res.ok) {
      const data = (await res.json()) as { project?: CaseStudy };
      if (data.project) {
        memoryProjects = memoryProjects.map((p) =>
          p.id === optimistic.id ? data.project! : p
        );
        notify();
      }
      invalidateSiteStore();
      void refreshAuditLogs();
    }
  })();

  return optimistic;
}

export function updateProject(id: string, updates: Partial<CaseStudy>): void {
  memoryProjects = memoryProjects.map((item) =>
    item.id === id
      ? { ...item, ...updates, updatedAt: new Date().toISOString() }
      : item
  );
  notify();

  void (async () => {
    const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = (await res.json()) as { project?: CaseStudy };
      if (data.project) {
        memoryProjects = memoryProjects.map((p) => (p.id === id ? data.project! : p));
        notify();
      }
      invalidateSiteStore();
      void refreshAuditLogs();
    }
  })();
}

export function toggleProjectPublish(id: string): void {
  const target = memoryProjects.find((item) => item.id === id);
  if (!target) return;
  updateProject(id, { published: !target.published });
}

export function deleteProject(id: string): void {
  memoryProjects = memoryProjects.filter((item) => item.id !== id);
  notify();

  void fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  }).then(() => {
    invalidateSiteStore();
    void refreshAuditLogs();
  });
}

// ---------------- AUDIT LOGS ----------------

export function getAuditLogs(): AuditLog[] {
  return memoryAuditLogs;
}

export async function refreshAuditLogs(): Promise<AuditLog[]> {
  try {
    const res = await fetch("/api/admin/audit-logs", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (res.ok) {
      const data = (await res.json()) as { logs?: AuditLog[] };
      if (Array.isArray(data.logs)) {
        memoryAuditLogs = data.logs;
        notify();
      }
    }
  } catch (err) {
    console.error("Failed to refresh audit logs:", err);
  }
  return memoryAuditLogs;
}

export function clearAuditLogs(): void {
  memoryAuditLogs = [];
  notify();

  void (async () => {
    const res = await fetch("/api/admin/audit-logs", {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) {
      const data = (await res.json()) as { logs?: AuditLog[] };
      if (Array.isArray(data.logs)) {
        memoryAuditLogs = data.logs;
        notify();
      }
    }
  })();
}

// ---------------- SETTINGS ----------------

export function getSettings(): SystemSettings {
  return memorySettings;
}

export async function updateSettings(
  settings: Partial<SystemSettings>
): Promise<{ ok: boolean; error?: string; settings?: SystemSettings }> {
  const res = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(settings),
  });

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    settings?: SystemSettings;
  } | null;

  if (!res.ok) {
    return { ok: false, error: data?.error || "Failed to save settings." };
  }

  if (data?.settings) {
    memorySettings = data.settings;
    notify();
    void refreshAuditLogs();
    return { ok: true, settings: data.settings };
  }

  return { ok: true, settings: memorySettings };
}

export async function runSettingsAction<T = Record<string, unknown>>(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; error?: string } & T> {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    settings?: SystemSettings;
    twoFactorEnabled?: boolean;
  } & T;

  if (data.settings) {
    memorySettings = data.settings;
  }
  if (memoryUser && typeof data.twoFactorEnabled === "boolean") {
    memoryUser = { ...memoryUser, twoFactorEnabled: data.twoFactorEnabled };
  }
  notify();
  void refreshAuditLogs();

  return {
    ...data,
    ok: res.ok && data.ok !== false,
  };
}

export async function resetDemoData(): Promise<void> {
  await runSettingsAction({ action: "reset_demo_data" });
  await hydrateAdminStore(true);
  invalidateSiteStore();
}

// ---------------- EXPORT UTILITIES ----------------

export function exportInquiriesCSV(): string {
  const headers = [
    "ID",
    "Name",
    "Email",
    "Company",
    "Status",
    "Priority",
    "Assigned Architect",
    "Estimated Value",
    "Created At",
    "Message",
  ];
  const rows = memoryInquiries.map((item) => [
    item.id,
    `"${item.name.replace(/"/g, '""')}"`,
    `"${item.email.replace(/"/g, '""')}"`,
    `"${item.company.replace(/"/g, '""')}"`,
    item.status,
    item.priority,
    item.assignedArchitect || "Unassigned",
    item.estimatedValue || "N/A",
    item.createdAt,
    `"${item.message.replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportAuditLogsCSV(): string {
  const headers = ["ID", "Timestamp", "Actor", "Category", "Action", "IP Address", "Details"];
  const rows = memoryAuditLogs.map((log) => [
    log.id,
    log.timestamp,
    `"${log.actor.replace(/"/g, '""')}"`,
    log.category,
    `"${log.action.replace(/"/g, '""')}"`,
    log.ipAddress,
    `"${log.details.replace(/"/g, '""')}"`,
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
