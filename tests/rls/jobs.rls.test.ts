import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

type Client = PoolClient;

// Seeds one job (as superuser) inside the same transaction the caller is
// already in, so it's visible to whatever role gets impersonated next but
// disappears on rollback along with everything else -- no fixture ever
// needs to persist across tests. Mirrors tests/rls/applications.rls.test.ts.
async function seedJob(
  client: Client,
  overrides: {
    status?: "draft" | "published" | "closed" | "archived";
    posting_date?: string | null;
    closing_date?: string | null;
  } = {}
) {
  const slug = `rls-test-job-${Math.random().toString(36).slice(2)}`;
  const { rows } = await client.query(
    `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug, status, posting_date, closing_date)
     values ('RLS Test Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1, $2, $3, $4)
     returning id`,
    [slug, overrides.status ?? "published", overrides.posting_date ?? null, overrides.closing_date ?? null]
  );
  return rows[0].id as string;
}

describe("jobs RLS", () => {
  it("anon can read a published job with no posting/closing date", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(1);
    });
  });

  it("anon cannot read a draft job", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, { status: "draft" });
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(0);
    });
  });

  it("anon cannot read a published job whose posting_date is in the future", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, { posting_date: "2999-01-01" });
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(0);
    });
  });

  it("anon cannot read a published job whose closing_date has passed", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, { closing_date: "2000-01-01" });
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(0);
    });
  });

  it("anon can read a published job whose closing_date hasn't arrived yet", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, { closing_date: "2999-01-01" });
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(1);
    });
  });

  it("anon cannot insert, update, or delete jobs", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      await impersonate(client, asAnon());

      // Postgres aborts the whole transaction on the first error and
      // refuses every later statement with "current transaction is
      // aborted..." regardless of what it is -- a savepoint per assertion
      // is what lets each one actually get checked instead of only ever
      // proving the first.
      await client.query("savepoint sp");
      await expect(
        client.query(
          `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug)
           values ('x', 'x', 'x', 'x', 'https://example.com', 'x', $1)`,
          [`rls-test-job-${Math.random().toString(36).slice(2)}`]
        )
      ).rejects.toThrow(/permission denied/i);
      await client.query("rollback to savepoint sp");

      await client.query("savepoint sp");
      await expect(
        client.query("update public.jobs set title = 'changed' where id = $1", [jobId])
      ).rejects.toThrow(/permission denied/i);
      await client.query("rollback to savepoint sp");

      await client.query("savepoint sp");
      await expect(client.query("delete from public.jobs where id = $1", [jobId])).rejects.toThrow(
        /permission denied/i
      );
      await client.query("rollback to savepoint sp");
    });
  });

  it("member can read draft jobs but cannot write", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, { status: "draft" });
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(1);
      // jobs grants UPDATE to the whole authenticated role and narrows via
      // RLS USING, so a member's update against a row RLS hides from them
      // doesn't error -- it just matches 0 rows and resolves normally.
      const result = await client.query("update public.jobs set title = 'changed' where id = $1", [jobId]);
      expect(result.rowCount).toBe(0);
    });
  });

  it("staff can read every job regardless of status or date", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, { status: "draft", posting_date: "2999-01-01" });
      await impersonate(client, asStaff());
      const { rows } = await client.query("select * from public.jobs where id = $1", [jobId]);
      expect(rows).toHaveLength(1);
    });
  });

  it("staff can insert, update, and delete jobs", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asStaff());
      const { rows } = await client.query(
        `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug)
         values ('Staff Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1)
         returning id`,
        [`rls-test-job-${Math.random().toString(36).slice(2)}`]
      );
      const jobId = rows[0].id;
      await expect(
        client.query("update public.jobs set title = 'Updated' where id = $1", [jobId])
      ).resolves.toBeDefined();
      const { rowCount } = await client.query("delete from public.jobs where id = $1", [jobId]);
      expect(rowCount).toBe(1);
    });
  });

  it("admin can insert, update, and delete jobs", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      const { rows } = await client.query(
        `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug)
         values ('Admin Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1)
         returning id`,
        [`rls-test-job-${Math.random().toString(36).slice(2)}`]
      );
      const jobId = rows[0].id;
      await expect(
        client.query("update public.jobs set title = 'Updated' where id = $1", [jobId])
      ).resolves.toBeDefined();
      const { rowCount } = await client.query("delete from public.jobs where id = $1", [jobId]);
      expect(rowCount).toBe(1);
    });
  });
});
