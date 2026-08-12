import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

async function seedJob(client: PoolClient, status: "published" | "draft" = "published") {
  const slug = `rls-test-child-${status}-${Math.random().toString(36).slice(2)}`;
  const { rows } = await client.query(
    `insert into public.jobs (title, role, location, commitment_type, apply_url, description, slug, status)
     values ('RLS Test Job', 'Associate', 'Columbia, SC', 'Part-time', 'https://example.com', 'desc', $1, $2)
     returning id`,
    [slug, status]
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

const childTables = [
  {
    name: "application_documents",
    insertSql: (appId: string) =>
      `insert into public.application_documents (application_id, document_type, file_name) values ('${appId}', 'resume', 'resume.pdf')`,
    updateColumn: "file_name",
    updateValue: "changed.pdf",
  },
  {
    name: "application_team_preferences",
    insertSql: (appId: string) =>
      `insert into public.application_team_preferences (application_id, team_name, preference_rank) values ('${appId}', 'Programming', 1)`,
    updateColumn: "team_name",
    updateValue: "Marketing",
  },
  {
    name: "application_screening_answers",
    insertSql: (appId: string) =>
      `insert into public.application_screening_answers (application_id, question, answer) values ('${appId}', 'Why?', 'Because')`,
    updateColumn: "answer",
    updateValue: "Changed",
  },
];

describe.each(childTables)("$name RLS", ({ name, insertSql, updateColumn, updateValue }) => {
  // anon has no direct INSERT grant on any application child table -- the
  // only anon write path is the submit_application RPC (see
  // supabase/migrations/20260809120400_submit_application_rpc.sql), which is
  // exercised separately below via the "anon writes via submit_application"
  // block instead of a raw insert per table.
  it("anon cannot insert directly, even referencing a valid application_id", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAnon());
      await expect(client.query(insertSql(appId))).rejects.toThrow(/permission denied/i);
    });
  });

  it("anon cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query(insertSql(appId));
      await impersonate(client, asAnon());
      await expect(client.query(`select * from public.${name}`)).rejects.toThrow(/permission denied/i);
    });
  });

  it("staff can select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query(insertSql(appId));
      await impersonate(client, asStaff());
      const { rows } = await client.query(`select * from public.${name} where application_id = $1`, [appId]);
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it("member cannot select", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await client.query(insertSql(appId));
      await impersonate(client, asMember());
      const { rows } = await client.query(`select * from public.${name}`);
      expect(rows).toHaveLength(0);
    });
  });

  it("staff cannot update (no grant at all)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const { rows } = await client.query(`${insertSql(appId)} returning id`);
      const childId = rows[0].id;
      await impersonate(client, asStaff());
      await expect(
        client.query(`update public.${name} set ${updateColumn} = $2 where id = $1`, [childId, updateValue])
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("admin cannot delete directly on the child table (no delete policy)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const { rows } = await client.query(`${insertSql(appId)} returning id`);
      const childId = rows[0].id;
      await impersonate(client, asAdmin());
      await expect(client.query(`delete from public.${name} where id = $1`, [childId])).rejects.toThrow(
        /permission denied/i
      );
    });
  });
});

describe("anon writes via submit_application", () => {
  it("populates every child table when called by anon", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      await impersonate(client, asAnon());
      const {
        rows: [{ submit_application: appId }],
      } = await client.query(
        `select public.submit_application(
           gen_random_uuid(), $1::uuid, 'Ada', 'Lovelace', $2, null,
           'ada@school.edu', 'Test University', 'Computer Science', 'Junior', null,
           '[{"documentType":"resume","fileName":"r.pdf","storagePath":"applications/x/resume.pdf"},
             {"documentType":"transcript","fileName":"t.pdf","storagePath":"applications/x/transcript.pdf"}]'::jsonb,
           '[{"teamName":"Production and Operations","rank":1}]'::jsonb,
           '[{"question":"What appeals to you about joining Inspire Columbia?","answer":"Because it matters."}]'::jsonb
         ) as submit_application`,
        [jobId, `ada-${Math.random().toString(36).slice(2)}@example.com`]
      );

      await impersonate(client, asAdmin());
      for (const { name } of childTables) {
        const { rows } = await client.query(`select * from public.${name} where application_id = $1`, [appId]);
        expect(rows.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("cascade delete", () => {
  it("deleting the parent application cascades to every child table and status history", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      for (const { insertSql } of childTables) {
        await client.query(insertSql(appId));
      }
      await client.query("update public.applications set status = 'under_review' where id = $1", [appId]);

      await impersonate(client, asAdmin());
      const { rowCount } = await client.query("delete from public.applications where id = $1", [appId]);
      expect(rowCount).toBe(1);

      for (const { name } of childTables) {
        const { rows } = await client.query(`select * from public.${name} where application_id = $1`, [appId]);
        expect(rows).toHaveLength(0);
      }
      const history = await client.query(
        "select * from public.application_status_history where application_id = $1",
        [appId]
      );
      expect(history.rows).toHaveLength(0);
    });
  });
});
