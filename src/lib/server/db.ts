import "server-only";

import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import {
  AuditLog,
  INITIAL_AUDIT_LOGS,
  INITIAL_INQUIRIES,
  INITIAL_SETTINGS,
  sanitizeInput,
} from "@/lib/admin-types";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-defaults";

declare global {
  var __factualPgPool: Pool | undefined;
  var __factualSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!globalThis.__factualPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set.");
    }
    const useSsl =
      process.env.DATABASE_SSL === "true" || /sslmode=(require|verify-ca|verify-full)/i.test(connectionString);
    globalThis.__factualPgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 10_000,
      query_timeout: 10_000,
      ...(useSsl
        ? {
            ssl: {
              rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
            },
          }
        : {}),
    });
  }
  return globalThis.__factualPgPool;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Super Admin',
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
    two_factor_secret TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    remember_me BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS admin_tokens (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_admin_tokens_admin_purpose ON admin_tokens(admin_id, purpose);

  CREATE TABLE IF NOT EXISTS login_rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS site_content (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS site_snapshots (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    metrics TEXT NOT NULL,
    description TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    image TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT true,
    featured_on_home BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT 'Direct Inquiry',
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    priority TEXT NOT NULL DEFAULT 'Normal',
    assigned_architect TEXT,
    estimated_value TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor TEXT NOT NULL,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    details TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

async function initializeDatabase(client: PoolClient): Promise<void> {
  await client.query("BEGIN");
  try {
    // Advisory lock ensures concurrent SSR/API cold-start workers do not race schema init
    await client.query("SELECT pg_advisory_xact_lock(918273645)");
    await client.query(SCHEMA_SQL);

    // Seed baseline studio site_content (never seeds any admin user)
    const contentCheck = await client.query("SELECT 1 FROM site_content WHERE id = 'live'");
    if (contentCheck.rowCount === 0) {
      await client.query(
        "INSERT INTO site_content (id, data) VALUES ('live', $1::jsonb)",
        [JSON.stringify({ ...DEFAULT_SITE_CONTENT, messages: [] })]
      );
    }

    // Seed baseline case studies matching DEFAULT_SITE_CONTENT.projects
    const projectsCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM projects");
    if ((projectsCheck.rows[0]?.cnt ?? 0) === 0) {
      for (let i = 0; i < DEFAULT_SITE_CONTENT.projects.length; i++) {
        const p = DEFAULT_SITE_CONTENT.projects[i];
        await client.query(
          `INSERT INTO projects (id, title, category, metrics, description, tags, image, published, featured_on_home, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, true, $8, $9)`,
          [
            p.id,
            p.title,
            p.category,
            p.metrics,
            p.description,
            JSON.stringify(p.tags),
            p.image,
            p.featuredOnHome,
            i,
          ]
        );
      }
    }

    // Seed baseline sample inquiries only on empty database
    const inqCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM inquiries");
    if ((inqCheck.rows[0]?.cnt ?? 0) === 0) {
      for (const inq of INITIAL_INQUIRIES) {
        await client.query(
          `INSERT INTO inquiries (id, name, email, company, message, status, priority, assigned_architect, estimated_value, tags, notes, read, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13::timestamptz)`,
          [
            inq.id,
            inq.name,
            inq.email,
            inq.company,
            inq.message,
            inq.status,
            inq.priority,
            inq.assignedArchitect || null,
            inq.estimatedValue || null,
            JSON.stringify(inq.tags || []),
            JSON.stringify(inq.notes || []),
            inq.read ?? false,
            inq.createdAt,
          ]
        );
      }
    }

    // Seed baseline settings
    const settingsCheck = await client.query("SELECT 1 FROM system_settings WHERE id = 'default'");
    if (settingsCheck.rowCount === 0) {
      await client.query(
        "INSERT INTO system_settings (id, data) VALUES ('default', $1::jsonb)",
        [JSON.stringify(INITIAL_SETTINGS)]
      );
    }

    // Seed initial audit record
    const logsCheck = await client.query("SELECT COUNT(*)::int AS cnt FROM audit_logs");
    if ((logsCheck.rows[0]?.cnt ?? 0) === 0) {
      for (const log of INITIAL_AUDIT_LOGS) {
        await client.query(
          `INSERT INTO audit_logs (id, timestamp, actor, category, action, ip_address, details)
           VALUES ($1, $2::timestamptz, $3, $4, $5, $6, $7)`,
          [log.id, log.timestamp, log.actor, log.category, log.action, log.ipAddress, log.details]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

/** Guarantees Postgres schema & seed data exist before executing queries. */
export async function ensureSchema(): Promise<void> {
  if (!globalThis.__factualSchemaReady) {
    globalThis.__factualSchemaReady = (async () => {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await initializeDatabase(client);
      } finally {
        client.release();
      }
    })().catch((err) => {
      globalThis.__factualSchemaReady = undefined;
      throw err;
    });
  }
  await globalThis.__factualSchemaReady;
}

/** Runs a parameterized SQL query after ensuring schema initialization. */
export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(sql, params);
}

/** Executes a callback inside an explicit ACID PostgreSQL transaction. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Writes an immutable security/admin audit entry to Postgres. */
export async function recordAuditLog(entry: Omit<AuditLog, "id" | "timestamp">): Promise<void> {
  const id = `log-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  await dbQuery(
    `INSERT INTO audit_logs (id, actor, category, action, ip_address, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      sanitizeInput(entry.actor).slice(0, 120),
      entry.category,
      sanitizeInput(entry.action).slice(0, 160),
      sanitizeInput(entry.ipAddress).slice(0, 64),
      sanitizeInput(entry.details).slice(0, 1000),
    ]
  );
}
