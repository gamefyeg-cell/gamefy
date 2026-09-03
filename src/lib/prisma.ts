import { PrismaClient } from "@prisma/client";

// Next.js dev-mode singleton so hot-reload doesn't spawn a new
// PrismaClient (and a fresh connection pool) on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// How many Postgres connections THIS process's Prisma pool may open.
// Serverless (many short-lived instances) behind a Supabase pooler: the
// right value is LOW. Each instance holds ~1 connection and the pooler
// fans out. A high number here causes "FATAL: max clients reached".
// REQUIRED: DATABASE_URL must be the TRANSACTION pooler
// (pooler.supabase.com:6543 with ?pgbouncer=true). The session pooler
// (:5432) pins one real connection per client and exhausts in seconds --
// that is the "EMAXCONNSESSION / session mode" error. Put :5432 on
// DIRECT_URL (migrations only). A single long-lived server can override
// DATABASE_CONNECTION_LIMIT to 10-20.
const CONNECTION_LIMIT = process.env.DATABASE_CONNECTION_LIMIT ?? "1";
const POOL_TIMEOUT = process.env.DATABASE_POOL_TIMEOUT ?? "20"; // seconds

/// Returns DATABASE_URL with connection_limit / pool_timeout applied,
/// unless the URL already sets them explicitly (then the URL wins).
function runtimeDatasourceUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  try {
    const url = new URL(base);
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", CONNECTION_LIMIT);
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", POOL_TIMEOUT);
    return url.toString();
  } catch {
    return base; // not a parseable URL (e.g. SQLite "file:./dev.db") — leave it alone
  }
}

const datasourceUrl = runtimeDatasourceUrl();

// One-time boot log: which host/port/params this deployment actually uses
// for runtime queries. Credentials are never printed. Remove once the
// pooler config is confirmed. Expected: host ...pooler.supabase.com:6543
// with pgbouncer=true. If it says :5432 -> DATABASE_URL is the SESSION
// pooler and that is the "EMAXCONNSESSION / session mode" bug.
try {
  const u = new URL(datasourceUrl ?? process.env.DATABASE_URL ?? "");
  console.log(
    `[prisma] datasource host=${u.host} params=${u.search || "(none)"} ` +
      `DIRECT_URL=${process.env.DIRECT_URL ? "set" : "MISSING"}`
  );
  const others = Object.keys(process.env).filter(
    (k) => /^(POSTGRES|PG|SUPABASE|DATABASE)/.test(k) && k !== "DATABASE_URL"
  );
  if (others.length) console.log(`[prisma] other DB-ish env vars present: ${others.join(", ")}`);
} catch {
  console.log("[prisma] DATABASE_URL is missing or not a valid URL");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
