import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

async function seedJob(client: PoolClient) {
  const slug = `rls-test-history-${Math.random().toString(36).slice(2)}`;
  const { rows } = await client.query(
    `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug, status)
     values ('RLS Test Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1, 'published')
     returning id`,
    [slug]
  );
  return rows[0].id as string;
}

async function seedApplication(client: PoolClient, jobId: string) {
  const { rows } = await client.query(
    `insert into public.applications (job_id, first_name, last_name, email)
     values ($1, 'Ada', 'Lovelace', $2)
     returning id`,
    [jobId, `ada-${Math.random().toString(36).slice(2)}@example.com`]
  );
  return rows[0].id as string;
}

describe("application_status_history RLS", () => {
  it("anon cannot insert directly", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAnon());
      await expect(
        client.query(
          "insert into public.application_status_history (application_id, new_status, changed_by_clerk_user_id) values ($1, 'under_review', 'x')",
          [appId]
        )
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("staff cannot insert directly (no grant exists for authenticated)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await expect(
        client.query(
          "insert into public.application_status_history (application_id, new_status, changed_by_clerk_user_id) values ($1, 'under_review', 'x')",
          [appId]
        )
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("staff can select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query("update public.applications set status = 'under_review' where id = $1", [appId]);
      await impersonate(client, asStaff());
      const { rows } = await client.query(
        "select * from public.application_status_history where application_id = $1",
        [appId]
      );
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it("member cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query("update public.applications set status = 'under_review' where id = $1", [appId]);
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.application_status_history");
      expect(rows).toHaveLength(0);
    });
  });

  it("staff changing status writes exactly one history row with correct old/new/role", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await client.query("update public.applications set status = 'under_review' where id = $1", [appId]);

      await impersonate(client, asAdmin());
      const { rows } = await client.query(
        "select * from public.application_status_history where application_id = $1",
        [appId]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].old_status).toBe("submitted");
      expect(rows[0].new_status).toBe("under_review");
      expect(rows[0].changed_by_role).toBe("staff");
    });
  });

  it("updating reviewer_notes without changing status writes no history row", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await client.query("update public.applications set reviewer_notes = 'checked in' where id = $1", [appId]);

      await impersonate(client, asAdmin());
      const { rows } = await client.query(
        "select * from public.application_status_history where application_id = $1",
        [appId]
      );
      expect(rows).toHaveLength(0);
    });
  });
});
