import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

async function seedJob(client: PoolClient) {
  const slug = `rls-test-email-log-${Math.random().toString(36).slice(2)}`;
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

function insertLog(client: PoolClient, appId: string, sentBy: string) {
  return client.query(
    `insert into public.application_email_log
       (application_id, sent_by_clerk_user_id, sent_by_role, template_id, template_name, recipient_email)
     values ($1, $2, 'staff', 'tmpl-1', 'Interview Invite', 'ada@example.com')`,
    [appId, sentBy]
  );
}

describe("application_email_log RLS", () => {
  it("anon cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await insertLog(client, appId, "user_test_staff");
      await impersonate(client, asAnon());
      await expect(client.query("select * from public.application_email_log")).rejects.toThrow(/permission denied/i);
    });
  });

  it("member cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await insertLog(client, appId, "user_test_staff");
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.application_email_log");
      expect(rows).toHaveLength(0);
    });
  });

  it("member cannot insert", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asMember());
      await expect(insertLog(client, appId, "user_test_member")).rejects.toThrow(/row-level security/i);
    });
  });

  it("staff can read and log a send under their own id", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await expect(insertLog(client, appId, "user_test_staff")).resolves.toBeDefined();

      const { rows } = await client.query("select * from public.application_email_log where application_id = $1", [
        appId,
      ]);
      expect(rows).toHaveLength(1);
      expect(rows[0].template_name).toBe("Interview Invite");
    });
  });

  it("staff cannot log a send under someone else's id", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await expect(insertLog(client, appId, "someone_else")).rejects.toThrow(/row-level security/i);
    });
  });

  it("admin can read and log a send", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAdmin());
      await expect(insertLog(client, appId, "user_test_admin")).resolves.toBeDefined();

      const { rows } = await client.query("select * from public.application_email_log where application_id = $1", [
        appId,
      ]);
      expect(rows).toHaveLength(1);
    });
  });

  it("nobody can update a log entry", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await insertLog(client, appId, "user_test_admin");
      await impersonate(client, asAdmin());

      await expect(
        client.query("update public.application_email_log set template_name = 'Changed' where application_id = $1", [
          appId,
        ])
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("nobody can delete a log entry", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await insertLog(client, appId, "user_test_admin");
      await impersonate(client, asAdmin());

      await expect(
        client.query("delete from public.application_email_log where application_id = $1", [appId])
      ).rejects.toThrow(/permission denied/i);
    });
  });
});
