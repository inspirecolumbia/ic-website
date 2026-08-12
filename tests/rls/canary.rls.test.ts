import { afterAll, describe, expect, it } from "vitest";
import { asAnon, closePool, withTransaction, withTx } from "./helpers/db";

// This suite must pass before any other RLS test is trusted. The pool's
// default connection is the `postgres` superuser, which has BYPASSRLS --
// if a test forgets to switch roles, every assertion passes vacuously.

afterAll(async () => {
  await closePool();
});

describe("canary: role switching actually engages RLS", () => {
  it("anon and authenticated do not have BYPASSRLS", async () => {
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        "select rolname, rolbypassrls from pg_roles where rolname in ('anon', 'authenticated') order by rolname"
      );
      expect(rows).toEqual([
        { rolname: "anon", rolbypassrls: false },
        { rolname: "authenticated", rolbypassrls: false },
      ]);
    });
  });

  it("set local role anon actually changes current_user", async () => {
    await withTx(asAnon(), async (client) => {
      const { rows } = await client.query("select current_user");
      expect(rows[0].current_user).toBe("anon");
    });
  });

  it("anon cannot read audit_log", async () => {
    await withTx(asAnon(), async (client) => {
      await expect(client.query("select * from public.audit_log")).rejects.toThrow(/permission denied/i);
    });
  });
});
