import { Pool, type PoolClient } from "pg";

const CONNECTION_STRING = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const pool = new Pool({ connectionString: CONNECTION_STRING });

async function connect(): Promise<PoolClient> {
  try {
    return await pool.connect();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
      throw new Error(
        "Could not connect to local Postgres at 127.0.0.1:54322. Run `supabase start` first."
      );
    }
    throw err;
  }
}

export type PgRole = "anon" | "authenticated";

export type JwtClaims = {
  sub: string;
  role: "authenticated";
  user_role: "member" | "staff" | "admin";
};

export type Actor = { role: PgRole; claims: JwtClaims | null };

export function asAnon(): Actor {
  return { role: "anon", claims: null };
}

export function asMember(sub = "user_test_member"): Actor {
  return { role: "authenticated", claims: { sub, role: "authenticated", user_role: "member" } };
}

export function asStaff(sub = "user_test_staff"): Actor {
  return { role: "authenticated", claims: { sub, role: "authenticated", user_role: "staff" } };
}

export function asAdmin(sub = "user_test_admin"): Actor {
  return { role: "authenticated", claims: { sub, role: "authenticated", user_role: "admin" } };
}

// Switches an already-open transaction to impersonate `actor`. Call this
// AFTER any superuser seeding you need (fixtures must be inserted before
// the role switch, since RLS applies from this point on in the transaction).
export async function impersonate(client: PoolClient, actor: Actor): Promise<void> {
  if (actor.claims) {
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(actor.claims),
    ]);
  }
  await client.query(`set local role ${actor.role}`);
}

// Opens a transaction (as the pool's default superuser role, for seeding),
// always rolled back afterward so tests never pollute the database or each
// other. Call impersonate(client, actor) once seeding is done.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
  }
}

// Convenience wrapper for tests that don't need to seed fixtures first --
// opens a transaction and immediately impersonates `actor`.
export async function withTx<T>(actor: Actor, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withTransaction(async (client) => {
    await impersonate(client, actor);
    return fn(client);
  });
}

export async function closePool(): Promise<void> {
  await pool.end();
}
