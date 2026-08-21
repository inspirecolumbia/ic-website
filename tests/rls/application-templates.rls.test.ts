import type { PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

async function seedTemplate(client: PoolClient) {
  const { rows } = await client.query(
    `insert into public.application_templates (name) values ('RLS Test Template') returning id`
  );
  return rows[0].id as string;
}

describe("application_templates RLS", () => {
  it("anon can select templates", async () => {
    // The public apply page (app/positions/[slug]/apply/page.tsx) needs to
    // read a job's template name -- using the anon client, same as every
    // other public-facing query -- to decide which form fields to render.
    // Template names aren't sensitive, so this is a public read; write
    // access stays staff/admin only (see the tests below).
    await withTransaction(async (client) => {
      const id = await seedTemplate(client);
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.application_templates where id = $1", [id]);
      expect(rows).toHaveLength(1);
    });
  });

  it("anon cannot insert templates", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAnon());
      await expect(
        client.query(`insert into public.application_templates (name) values ('Anon Template')`)
      ).rejects.toThrow(/permission denied|row-level security/i);
    });
  });

  it("anon cannot update templates", async () => {
    await withTransaction(async (client) => {
      const id = await seedTemplate(client);
      await impersonate(client, asAnon());
      await expect(
        client.query("update public.application_templates set name = 'Updated' where id = $1", [id])
      ).rejects.toThrow(/permission denied|row-level security/i);
    });
  });

  it("anon cannot delete templates", async () => {
    await withTransaction(async (client) => {
      const id = await seedTemplate(client);
      await impersonate(client, asAnon());
      await expect(
        client.query("delete from public.application_templates where id = $1", [id])
      ).rejects.toThrow(/permission denied|row-level security/i);
    });
  });

  it("member cannot select templates", async () => {
    await withTransaction(async (client) => {
      await seedTemplate(client);
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.application_templates");
      expect(rows).toHaveLength(0);
    });
  });

  it("member cannot insert templates", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asMember());
      await expect(
        client.query(`insert into public.application_templates (name) values ('Member Template')`)
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("staff can read, insert, update, and delete templates", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asStaff());
      const { rows } = await client.query(
        `insert into public.application_templates (name) values ('Staff Template') returning id`
      );
      const id = rows[0].id;

      const selected = await client.query("select * from public.application_templates where id = $1", [id]);
      expect(selected.rows).toHaveLength(1);

      await expect(
        client.query("update public.application_templates set name = 'Updated' where id = $1", [id])
      ).resolves.toBeDefined();

      const { rowCount } = await client.query("delete from public.application_templates where id = $1", [id]);
      expect(rowCount).toBe(1);
    });
  });

  it("admin can read, insert, update, and delete templates", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      const { rows } = await client.query(
        `insert into public.application_templates (name) values ('Admin Template') returning id`
      );
      const id = rows[0].id;

      const selected = await client.query("select * from public.application_templates where id = $1", [id]);
      expect(selected.rows).toHaveLength(1);

      await expect(
        client.query("update public.application_templates set name = 'Updated' where id = $1", [id])
      ).resolves.toBeDefined();

      const { rowCount } = await client.query("delete from public.application_templates where id = $1", [id]);
      expect(rowCount).toBe(1);
    });
  });
});
