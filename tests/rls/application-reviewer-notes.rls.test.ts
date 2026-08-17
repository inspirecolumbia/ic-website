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

// Seeded as the pool's superuser role, before any impersonation -- direct
// table INSERT is still how notes get created in production too (via the
// "staff and admin can add reviewer notes" RLS policy), this just skips
// that check for setup since it's exercised by its own tests below.
async function seedNote(client: PoolClient, appId: string, authorClerkUserId: string, note = "note") {
  const { rows } = await client.query(
    "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, author_role, note) values ($1, $2, 'staff', $3) returning id",
    [appId, authorClerkUserId, note]
  );
  return rows[0].id as string;
}

async function listNotes(client: PoolClient, appId: string) {
  const { rows } = await client.query("select * from public.list_reviewer_notes($1)", [appId]);
  return rows;
}

describe("application_reviewer_notes insert (direct table grant)", () => {
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

  it("staff can insert a note as themselves and read it back via list_reviewer_notes", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asStaff());
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_staff', 'looks good')",
        [appId]
      );
      const rows = await listNotes(client, appId);
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

  it("admin can insert notes the same as staff", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await impersonate(client, asAdmin());
      await client.query(
        "insert into public.application_reviewer_notes (application_id, author_clerk_user_id, note) values ($1, 'user_test_admin', 'reviewed')",
        [appId]
      );
      const rows = await listNotes(client, appId);
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
      const rows = await listNotes(client, appId);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.note)).toEqual(["first note", "second note"]);
    });
  });
});

describe("application_reviewer_notes direct table access is fully locked down", () => {
  // A failed query aborts the rest of a Postgres transaction, so each actor
  // gets its own transaction here rather than looping several
  // expected-to-fail queries inside one -- the second query in a loop like
  // that would fail with "current transaction is aborted" instead of the
  // permission error actually being tested.
  it.each([
    ["anon", asAnon()],
    ["member", asMember()],
    ["staff", asStaff()],
    ["admin", asAdmin()],
  ] as const)("%s cannot select the base table directly", async (_label, actor) => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await seedNote(client, appId, "user_test_staff");

      await impersonate(client, actor);
      await expect(client.query("select * from public.application_reviewer_notes")).rejects.toThrow(
        /permission denied/i
      );
    });
  });

  it("staff cannot update the base table directly, only through update_reviewer_note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");
      await impersonate(client, asStaff());
      await expect(
        client.query("update public.application_reviewer_notes set note = 'edited' where id = $1", [noteId])
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("admin cannot delete from the base table directly, only through delete_reviewer_note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_admin");
      await impersonate(client, asAdmin());
      await expect(
        client.query("delete from public.application_reviewer_notes where id = $1", [noteId])
      ).rejects.toThrow(/permission denied/i);
    });
  });
});

describe("list_reviewer_notes", () => {
  // anon has no EXECUTE grant at all, so Postgres blocks it before the
  // function body's own role check ever runs -- a different failure mode
  // than member, which is `authenticated` and does reach the function,
  // which then raises its own "not authorized".
  it("anon cannot call it (no execute grant)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asAnon());
      await expect(client.query("select * from public.list_reviewer_notes($1)", [appId])).rejects.toThrow(
        /permission denied for function/i
      );
    });
  });

  it("member cannot call it (not staff or admin)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asMember());
      await expect(client.query("select * from public.list_reviewer_notes($1)", [appId])).rejects.toThrow(
        /not authorized/i
      );
    });
  });

  it("redacts note content for a soft-deleted note but still shows it existed", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff", "secret feedback");

      await impersonate(client, asStaff());
      await client.query("select public.delete_reviewer_note($1)", [noteId]);

      const rows = await listNotes(client, appId);
      expect(rows).toHaveLength(1);
      expect(rows[0].note).toBeNull();
      expect(rows[0].is_deleted).toBe(true);
      expect(rows[0].deleted_at).not.toBeNull();
    });
  });

  it("never returns who deleted a note, even to an admin", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asAdmin());
      await client.query("select public.delete_reviewer_note($1)", [noteId]);

      const rows = await listNotes(client, appId);
      expect(rows[0]).not.toHaveProperty("deleted_by");
    });
  });

  it("orders notes chronologically", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      await seedNote(client, appId, "user_test_staff", "first");
      await seedNote(client, appId, "user_test_admin", "second");

      await impersonate(client, asStaff());
      const rows = await listNotes(client, appId);
      expect(rows.map((r) => r.note)).toEqual(["first", "second"]);
    });
  });
});

describe("update_reviewer_note", () => {
  it("anon cannot call it (no execute grant)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asAnon());
      await expect(
        client.query("select public.update_reviewer_note($1, $2)", [noteId, "edited"])
      ).rejects.toThrow(/permission denied for function/i);
    });
  });

  it("member cannot call it (not staff or admin)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asMember());
      await expect(
        client.query("select public.update_reviewer_note($1, $2)", [noteId, "edited"])
      ).rejects.toThrow(/not authorized/i);
    });
  });

  it("staff can edit their own note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff", "original");

      await impersonate(client, asStaff());
      await client.query("select public.update_reviewer_note($1, $2)", [noteId, "edited"]);

      const rows = await listNotes(client, appId);
      expect(rows[0].note).toBe("edited");
      expect(rows[0].updated_at).not.toEqual(rows[0].created_at);
    });
  });

  it("saving the same content back does not bump updated_at", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff", "unchanged");

      await impersonate(client, asStaff());
      await client.query("select public.update_reviewer_note($1, $2)", [noteId, "unchanged"]);

      const rows = await listNotes(client, appId);
      expect(rows[0].note).toBe("unchanged");
      expect(rows[0].updated_at).toEqual(rows[0].created_at);
    });
  });

  it("staff cannot edit another reviewer's note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_admin", "admin's note");

      await impersonate(client, asStaff());
      await expect(
        client.query("select public.update_reviewer_note($1, $2)", [noteId, "hijacked"])
      ).rejects.toThrow(/cannot edit another reviewer/i);
    });
  });

  it("admin cannot edit another reviewer's note either", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff", "staff's note");

      await impersonate(client, asAdmin());
      await expect(
        client.query("select public.update_reviewer_note($1, $2)", [noteId, "hijacked"])
      ).rejects.toThrow(/cannot edit another reviewer/i);
    });
  });

  it("cannot edit a deleted note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asStaff());
      await client.query("select public.delete_reviewer_note($1)", [noteId]);
      await expect(
        client.query("select public.update_reviewer_note($1, $2)", [noteId, "resurrected"])
      ).rejects.toThrow(/cannot edit a deleted note/i);
    });
  });
});

describe("delete_reviewer_note", () => {
  it("anon cannot call it (no execute grant)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asAnon());
      await expect(client.query("select public.delete_reviewer_note($1)", [noteId])).rejects.toThrow(
        /permission denied for function/i
      );
    });
  });

  it("member cannot call it (not staff or admin)", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asMember());
      await expect(client.query("select public.delete_reviewer_note($1)", [noteId])).rejects.toThrow(
        /not authorized/i
      );
    });
  });

  it("staff can delete their own note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asStaff());
      await client.query("select public.delete_reviewer_note($1)", [noteId]);
      const rows = await listNotes(client, appId);
      expect(rows[0].is_deleted).toBe(true);
    });
  });

  it("staff cannot delete another reviewer's note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_admin");

      await impersonate(client, asStaff());
      await expect(client.query("select public.delete_reviewer_note($1)", [noteId])).rejects.toThrow(
        /not authorized to delete/i
      );
    });
  });

  it("admin can delete another reviewer's note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asAdmin());
      await client.query("select public.delete_reviewer_note($1)", [noteId]);
      const rows = await listNotes(client, appId);
      expect(rows[0].is_deleted).toBe(true);
    });
  });

  it("cannot delete an already-deleted note", async () => {
    await withTransaction(async (client) => {
      const jobId = await seedJob(client);
      const appId = await seedApplication(client, jobId);
      const noteId = await seedNote(client, appId, "user_test_staff");

      await impersonate(client, asStaff());
      await client.query("select public.delete_reviewer_note($1)", [noteId]);
      await expect(client.query("select public.delete_reviewer_note($1)", [noteId])).rejects.toThrow(
        /already deleted/i
      );
    });
  });
});
