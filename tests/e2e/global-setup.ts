import { Pool } from "pg";

// Runs once before the whole e2e suite, direct against the local Postgres
// stack (never the shared dev project -- see playwright.config.ts).
export default async function globalSetup() {
  const pool = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  try {
    // The seed migration gives associate-2026 an apply_url (the old external
    // Google Form), which real dev/prod clear out by hand in the admin UI
    // once the in-house form ships -- an out-of-band dashboard action, not
    // captured in any migration. A fresh local stack still has it set,
    // which would redirect every /apply request straight out to Google
    // Forms instead of rendering JobApplicationForm.
    await pool.query("update public.jobs set apply_url = null where slug = 'associate-2026'");

    // Previous local runs' test applications would otherwise accumulate
    // (e.g. the duplicate-email test would start seeing leftover rows from
    // a prior run) and make results depend on run history.
    await pool.query("delete from public.applications");
  } finally {
    await pool.end();
  }
}
