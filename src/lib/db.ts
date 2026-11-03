// Data-access layer: the ONLY place the app talks to PostgreSQL.
// Server-side code only (route handlers, server components). Never import
// this from a "use client" component: it holds the database connection.
import { Pool, type PoolClient, type QueryResultRow } from "pg";

// A pool keeps a few database connections open and reuses them, instead of
// opening a new connection for every request (which is slow).
//
// In development, Next.js re-runs modules every time a file is saved. Keeping
// the pool on globalThis means a reload reuses the existing pool instead of
// opening a new one each time (which would leak connections).
const globalForDb = globalThis as unknown as { pgPool?: Pool };

// The pool is created on first use, not when this file is imported, so that
// `next build` works even on a machine without a database.
function getPool(): Pool {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env and fill in your password.",
      );
    }
    globalForDb.pgPool = new Pool({ connectionString, max: 10 });
  }
  return globalForDb.pgPool;
}

// Runs one parameterized query and returns its rows.
// Values are passed separately in `params` and referenced as $1, $2, ... in
// the SQL text. PostgreSQL never treats them as SQL, which is what prevents
// SQL injection. Never build SQL by pasting user input into the string.
//
// Note: pg returns DECIMAL/NUMERIC and COUNT(*) values as strings (to avoid
// losing precision). Cast in SQL (e.g. COUNT(*)::int) or convert with Number().
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

// Runs several queries as ONE transaction: all succeed, or none are saved.
//   BEGIN -> your queries -> COMMIT
//   if any query throws (e.g. the eligibility trigger rejects) -> ROLLBACK
// Every query inside must use the `client` passed to `work`, because a
// transaction belongs to a single connection.
export async function withTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release(); // hand the connection back to the pool
  }
}

// True if `error` is PostgreSQL rejecting a duplicate value (SQLSTATE 23505)
// on the given UNIQUE constraint, e.g. "users_email_key".
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (typeof error !== "object" || error === null) return false;
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === "23505" && pgError.constraint === constraint;
}

// Converts an embedding (array of 768 numbers) into pgvector's text format
// '[0.1,0.2,...]', so it can be passed as a query parameter: $1::vector
export function toVector(values: number[]): string {
  return `[${values.join(",")}]`;
}
