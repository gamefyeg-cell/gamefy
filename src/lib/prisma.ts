import { PrismaClient } from "@prisma/client";

// Next.js dev-mode singleton so hot-reload doesn't spawn a new
// PrismaClient (and a fresh connection pool) on every file change.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// How many Postgres connections THIS process's Prisma pool may open.
// Prisma's built-in default is `num_physical_cpus * 2 + 1` — on a small
// host / serverless function that's only ~5, so a single request that
// fans out several queries at once (the homepage and product pages run
// `Promise.all([...])` of 3–6 queries, plus the header) exhausts the pool
// and the next request blocks until `pool_timeout` and then errors. Bump
// it here; override per-environment with DATABASE_CONNECTION_LIMIT.
//
// NOTE: this is capped by the database side too. On Supabase, raise
// "Pool Size" for the pooler user under Project → Database → Connection
// pooling (default 15) to at least (connection_limit × running instances),
// or the extra slots requested here just queue at Supavisor instead.
const CONNECTION_LIMIT = process.env.DATABASE_CONNECTION_LIMIT ?? "20";
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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
