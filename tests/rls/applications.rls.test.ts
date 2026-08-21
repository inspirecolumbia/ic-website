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
// needs to persist across tests.
async function seedJob(client: Client, status: "published" | "draft" | "closed") {
  const slug = `rls-test-${status}-${Math.random().toString(36).slice(2)}`;
  const { rows } = await client.query(
    `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug, status)
     values ('RLS Test Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1, $2)
     returning id`,
    [slug, status]
  );
  return rows[0].id as string;
}

async function seedApplication(client: Client, jobId: string, overrides: { email?: string } = {}) {
  const { rows } = await client.query(
    `insert into public.applications (job_id, first_name, last_name, email)
     values ($1, 'Ada', 'Lovelace', $2)
     returning id`,
    [jobId, overrides.email ?? `ada-${Math.random().toString(36).slice(2)}@example.com`]
  );
  return rows[0].id as string;
}

// anon has no direct INSERT grant on applications (or its child tables) --
// submission only happens through this SECURITY DEFINER RPC (see
// supabase/migrations/20260809120400_submit_application_rpc.sql). Dummy
// storage paths are fine here since this exercises the DB layer directly,
// no real Storage upload involved.
async function submitViaRpc(client: Client, jobId: string, overrides: { email?: string } = {}) {
  return client.query(
    `select public.submit_application(
       gen_random_uuid(), $1::uuid, 'Ada', 'Lovelace', $2, '8035550100',
       'ada@email.sc.edu', 'University of South Carolina, Columbia', 'Computer Science', 'Junior', null,
       '[{"documentType":"resume","fileName":"r.pdf","storagePath":"applications/x/resume.pdf"},
         {"documentType":"transcript","fileName":"t.pdf","storagePath":"applications/x/transcript.pdf"}]'::jsonb,
       '[{"teamName":"Nonprofit Finances and Legal","rank":1},
         {"teamName":"Technology and Web Development","rank":2},
         {"teamName":"Production","rank":3}]'::jsonb,
       '[]'::jsonb
     )`,
    [jobId, overrides.email ?? `ada-${Math.random().toString(36).slice(2)}@example.com`]
  );
}

describe("applications RLS", () => {
  it("anon can submit an application for a published job via submit_application", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      await impersonate(client, asAnon());
      await expect(submitViaRpc(client, jobId, { email: "ada@example.com" })).resolves.toBeDefined();
    });
  });

  it("anon cannot submit an application for a draft job", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "draft");
      await impersonate(client, asAnon());
      await expect(submitViaRpc(client, jobId, { email: "ada@example.com" })).rejects.toThrow(
        /not open for applications/i
      );
    });
  });

  it("anon cannot insert directly into applications, bypassing the RPC", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      await impersonate(client, asAnon());
      await expect(
        client.query(
          `insert into public.applications (job_id, first_name, last_name, email) values ($1, 'Ada', 'Lovelace', 'ada@example.com')`,
          [jobId]
        )
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("anon cannot select applications back, even the one it just submitted", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      await impersonate(client, asAnon());
      await submitViaRpc(client, jobId, { email: "ada@example.com" });
      await expect(client.query("select * from public.applications")).rejects.toThrow(/permission denied/i);
    });
  });

  it("anon cannot update applications", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAnon());
      await expect(
        client.query("update public.applications set status = 'still_in_consideration' where id = $1", [appId])
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("anon cannot delete applications", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAnon());
      await expect(client.query("delete from public.applications where id = $1", [appId])).rejects.toThrow(
        /permission denied/i
      );
    });
  });

  it("member cannot read applications", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      await seedApplication(client, jobId);
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.applications");
      expect(rows).toHaveLength(0);
    });
  });

  it("staff can read applications including PII", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId, { email: "staff-visible@example.com" });
      await impersonate(client, asStaff());
      const { rows } = await client.query("select * from public.applications where id = $1", [appId]);
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe("staff-visible@example.com");
    });
  });

  it("admin can read applications the same as staff", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAdmin());
      const { rows } = await client.query("select * from public.applications where id = $1", [appId]);
      expect(rows).toHaveLength(1);
    });
  });

  it("staff can update status", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await expect(
        client.query("update public.applications set status = 'still_in_consideration' where id = $1", [appId])
      ).resolves.toBeDefined();
    });
  });

  it("staff cannot update email (column-level grant, not RLS)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await expect(
        client.query("update public.applications set email = 'changed@example.com' where id = $1", [appId])
      ).rejects.toThrow(/permission denied for table applications/i);
    });
  });

  it("staff's delete silently affects 0 rows (RLS-filtered, not an error)", async () => {
    // Staff has the table-level DELETE grant (matching the jobs-table
    // pattern of grant-broad/RLS-narrows), but the admin-only USING clause
    // filters the row out before the delete ever touches it -- Postgres
    // doesn't error on a DELETE whose USING clause matches nothing, it just
    // deletes 0 rows. Don't "fix" this to expect a thrown error.
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      const { rowCount } = await client.query("delete from public.applications where id = $1", [appId]);
      expect(rowCount).toBe(0);

      await impersonate(client, asAdmin());
      const { rows } = await client.query("select id from public.applications where id = $1", [appId]);
      expect(rows).toHaveLength(1);
    });
  });

  it("admin can delete applications", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAdmin());
      const { rowCount } = await client.query("delete from public.applications where id = $1", [appId]);
      expect(rowCount).toBe(1);
    });
  });

  it("rejects a duplicate email for the same job regardless of case", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client, "published");
      await seedApplication(client, jobId, { email: "Foo@Example.com" });
      await expect(seedApplication(client, jobId, { email: "foo@example.com" })).rejects.toThrow(
        /applications_job_id_email_unique/
      );
    });
  });

  it("allows the same email to apply to two different jobs", async () => {
    await withTransaction(async (client) => {
      const jobA = await seedJob(client, "published");
      const jobB = await seedJob(client, "published");
      await expect(seedApplication(client, jobA, { email: "same@example.com" })).resolves.toBeDefined();
      await expect(seedApplication(client, jobB, { email: "same@example.com" })).resolves.toBeDefined();
    });
  });
});
