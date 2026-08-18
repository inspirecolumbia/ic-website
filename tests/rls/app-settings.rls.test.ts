import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asMember, asStaff, closePool, impersonate, withTransaction } from "./helpers/db";

afterAll(async () => {
  await closePool();
});

describe("app_settings RLS", () => {
  it("anon can read the singleton row", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAnon());
      const { rows } = await client.query("select * from public.app_settings");
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(1);
    });
  });

  it("member can read but not update", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asMember());
      const { rows } = await client.query("select * from public.app_settings");
      expect(rows).toHaveLength(1);

      const { rowCount } = await client.query(
        "update public.app_settings set resend_from_address = 'member@example.com' where id = 1"
      );
      expect(rowCount).toBe(0);
    });
  });

  it("staff can read but not update", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asStaff());
      const { rows } = await client.query("select * from public.app_settings");
      expect(rows).toHaveLength(1);

      const { rowCount } = await client.query(
        "update public.app_settings set resend_from_address = 'staff@example.com' where id = 1"
      );
      expect(rowCount).toBe(0);
    });
  });

  it("admin can update the from address", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      await client.query("update public.app_settings set resend_from_address = 'admin@example.com' where id = 1");
      const { rows } = await client.query("select resend_from_address from public.app_settings where id = 1");
      expect(rows[0].resend_from_address).toBe("admin@example.com");
    });
  });

  it("admin can update the staff alert template id", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      await client.query("update public.app_settings set staff_alert_template_id = 'tmpl-123' where id = 1");
      const { rows } = await client.query("select staff_alert_template_id from public.app_settings where id = 1");
      expect(rows[0].staff_alert_template_id).toBe("tmpl-123");
    });
  });

  it("the three feature-toggle columns default to true on the seeded row", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAnon());
      const { rows } = await client.query(
        "select application_delete_enabled, user_delete_enabled, history_delete_enabled from public.app_settings where id = 1"
      );
      expect(rows[0]).toEqual({
        application_delete_enabled: true,
        user_delete_enabled: true,
        history_delete_enabled: true,
      });
    });
  });

  it("member can read the feature-toggle columns but not update them", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asMember());
      const { rows } = await client.query("select application_delete_enabled from public.app_settings where id = 1");
      expect(rows).toHaveLength(1);

      const { rowCount } = await client.query(
        "update public.app_settings set application_delete_enabled = false where id = 1"
      );
      expect(rowCount).toBe(0);
    });
  });

  it("admin can update the feature-toggle columns", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      await client.query(
        "update public.app_settings set application_delete_enabled = false, user_delete_enabled = false, history_delete_enabled = false where id = 1"
      );
      const { rows } = await client.query(
        "select application_delete_enabled, user_delete_enabled, history_delete_enabled from public.app_settings where id = 1"
      );
      expect(rows[0]).toEqual({
        application_delete_enabled: false,
        user_delete_enabled: false,
        history_delete_enabled: false,
      });
    });
  });

  it("nobody can insert a second row", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      await expect(
        client.query("insert into public.app_settings (id, resend_from_address) values (2, 'x@example.com')")
      ).rejects.toThrow();
    });
  });

  it("nobody can delete the settings row", async () => {
    await withTransaction(async (client) => {
      await impersonate(client, asAdmin());
      await expect(client.query("delete from public.app_settings where id = 1")).rejects.toThrow();
    });
  });
});
