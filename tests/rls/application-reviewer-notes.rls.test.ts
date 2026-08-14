import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

async function seedJob(client: PoolClient) {
  const slug = `rls-test-reviewer-notes-${Math.random().toString(36).slice(2)}`;
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

describe("application_reviewer_notes RLS", () => {
  it("anon cannot insert", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAnon());
      await expect(
        client.query(
          "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'x', 'note')",
          [appId]
        )
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("anon cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_staff', 'note')",
        [appId]
      );
      await impersonate(client, asAnon());
      await expect(client.query("select * from public.application_reviewer_notes")).rejects.toThrow(
        /permission denied/i
      );
    });
  });

  it("member cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_staff', 'note')",
        [appId]
      );
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.application_reviewer_notes");
      expect(rows).toHaveLength(0);
    });
  });

  it("member cannot insert", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asMember());
      await expect(
        client.query(
          "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_member', 'note')",
          [appId]
        )
      ).rejects.toThrow();
    });
  });

  it("staff can insert a note as themselves and read it back", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_staff', 'looks good')",
        [appId]
      );
      const { rows } = await client.query(
        "select * from public.application_reviewer_notes where application_id = $1",
        [appId]
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].note).toBe("looks good");
      expect(rows[0].author_clerk_user_id).toBe("user_test_staff");
    });
  });

  it("staff cannot post a note under a different author_clerk_user_id (identity spoofing)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await expect(
        client.query(
          "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'someone_else', 'note')",
          [appId]
        )
      ).rejects.toThrow();
    });
  });

  it("admin can insert and read notes the same as staff", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAdmin());
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_admin', 'reviewed')",
        [appId]
      );
      const { rows } = await client.query(
        "select * from public.application_reviewer_notes where application_id = $1",
        [appId]
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("multiple staff/admins can each post their own note on the same application", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_staff', 'first note')",
        [appId]
      );
      await impersonate(client, asAdmin());
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_admin', 'second note')",
        [appId]
      );
      const { rows } = await client.query(
        "select * from public.application_reviewer_notes where application_id = $1 order by created_at",
        [appId]
      );
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.note)).toEqual(["first note", "second note"]);
    });
  });

  it("staff cannot update an existing note (no update grant)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const { rows: inserted } = await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_staff', 'note') returning id",
        [appId]
      );
      await impersonate(client, asStaff());
      await expect(
        client.query("update public.application_reviewer_notes set note = 'edited' where id = $1", [
          inserted[0].id,
        ])
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("admin cannot delete an existing note (no delete grant)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const { rows: inserted } = await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_admin', 'note') returning id",
        [appId]
      );
      await impersonate(client, asAdmin());
      await expect(
        client.query("delete from public.application_reviewer_notes where id = $1", [inserted[0].id])
      ).rejects.toThrow(/permission denied/i);
    });
  });
});
