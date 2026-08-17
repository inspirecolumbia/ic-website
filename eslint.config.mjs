import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Supabase CLI's local runtime artifacts (created by `supabase start`),
    // gitignored but not otherwise excluded from lint globs.
    "supabase/.temp/**",
    "supabase/.branches/**",
    // The e2e test suite's own isolated Next.js build cache (see
    // next.config.ts/playwright.config.ts) and Playwright's own run
    // artifacts -- all gitignored, but eslint's globs don't consult
    // .gitignore for anything outside the default ignores above.
    ".next-e2e/**",
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
