import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

const PII_KEYS = ["first_name", "last_name", "email", "phone"];

async function seedJob(client: PoolClient) {
  const slug = `rls-test-audit-${Math.random().toString(36).slice(2)}`;
  const { rows } = await client.query(
    `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug, status)
     values ('RLS Test Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1, 'published')
     returning id`,
    [slug]
  );
  return rows[0].id as string;
}

// anon has no direct INSERT grant on applications -- submission only
// happens through this SECURITY DEFINER RPC (see
// supabase/migrations/20260809120400_submit_application_rpc.sql). Dummy
// storage paths are fine here since this exercises the DB layer directly.
async function submitViaRpc(client: PoolClient, jobId: string) {
  const appId = randomUUID();
  await client.query(
    `select public.submit_application(
       $1::uuid, $2::uuid, 'Ada', 'Lovelace', 'ada@example.com', '8035550100',
       'ada@email.sc.edu', 'University of South Carolina, Columbia', 'Computer Science', 'Junior', null,
       '[{"documentType":"resume","fileName":"r.pdf","storagePath":"applications/x/resume.pdf"},
         {"documentType":"transcript","fileName":"t.pdf","storagePath":"applications/x/transcript.pdf"}]'::jsonb,
       '[{"teamName":"Nonprofit Finances and Legal","rank":1},
         {"teamName":"Technology and Web Development","rank":2},
         {"teamName":"6a. Production","rank":3}]'::jsonb,
       '[]'::jsonb
     )`,
    [appId, jobId]
  );
  return appId;
}

describe("application audit_log redaction", () => {
  it("anon insert produces an audit_log row with no PII keys in new_data", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      await impersonate(client, asAnon());
      const appId = await submitViaRpc(client, jobId);

      await impersonate(client, asAdmin());
      const { rows } = await client.query(
        "select * from public.audit_log where table_name = 'applications' and record_id = $1 and action = 'insert'",
        [appId]
      );
      expect(rows).toHaveLength(1);
      const newData = rows[0].new_data;
      for (const key of PII_KEYS) {
        expect(newData).not.toHaveProperty(key);
      }
      expect(newData).toHaveProperty("job_id");
      expect(newData).toHaveProperty("status");
    });
  });

  it("staff status update produces an audit_log row with no PII keys in old_data or new_data", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const inserted = await client.query(
        `insert into public.applications (job_id, first_name, last_name, email)
         values ($1, 'Ada', 'Lovelace', 'ada@example.com') returning id`,
        [jobId]
      );
      const appId = inserted.rows[0].id;

      await impersonate(client, asStaff());
      await client.query("update public.applications set status = 'under_review' where id = $1", [appId]);

      await impersonate(client, asAdmin());
      const { rows } = await client.query(
        "select * from public.audit_log where table_name = 'applications' and record_id = $1 and action = 'update'",
        [appId]
      );
      expect(rows).toHaveLength(1);
      for (const key of PII_KEYS) {
        expect(rows[0].old_data).not.toHaveProperty(key);
        expect(rows[0].new_data).not.toHaveProperty(key);
      }
    });
  });

  it("staff still cannot select audit_log (existing admin-only policy unaffected)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      await impersonate(client, asAnon());
      await submitViaRpc(client, jobId);

      await impersonate(client, asStaff());
      const { rows } = await client.query("select * from public.audit_log where table_name = 'applications'");
      expect(rows).toHaveLength(0);
    });
  });
});
