import { defineConfig, devices } from "@playwright/test";

// Runs against a dedicated dev server pointed at the LOCAL Supabase stack
// (`supabase start`), never the shared dev project -- these tests submit
// real applications and upload real files, and exercise Storage's actual
// MIME/size enforcement on the application-documents bucket, which only a
// real (local) Storage backend can enforce. Port 3100, not 3000, so this
// doesn't collide with a developer's own `npm run dev` session.
const PORT = 3100;
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      // See next.config.ts -- keeps this server's build cache isolated from
      // a developer's own `npm run dev` (same repo, same default distDir),
      // so the two can run side by side.
      PLAYWRIGHT_DIST_DIR: ".next-e2e",
      // Same fixed local-CLI defaults `supabase status` prints for any
      // local Supabase project, not secrets.
      NEXT_PUBLIC_SUPABASE_URL: LOCAL_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: LOCAL_SUPABASE_PUBLISHABLE_KEY,
      // Clerk isn't exercised by these tests, but ClerkProvider in the root
      // layout needs a syntactically valid publishable key to boot at all,
      // reusing the same dev-instance key .env.local already uses.
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Z3JlYXQtd2FsbGV5ZS0xMS5jbGVyay5hY2NvdW50cy5kZXYk",
      CLERK_SECRET_KEY: "sk_test_iaeFOsZVF1qhL1NfiqK9qzDajlSIltizWtXxwc2g8T",
    },
  },
});
