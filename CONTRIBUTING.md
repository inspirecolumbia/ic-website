# Contributing

This is the website for Inspire Columbia, a Next.js app with a Supabase database and Clerk for staff authentication. This guide covers what a new contributor needs to get set up and start opening PRs.

## Table of contents

- [Getting started](#getting-started)
  - [Environment setup](#environment-setup)
- [How to contribute code](#how-to-contribute-code)
- [Images and static assets](#images-and-static-assets)
- [Common commands](#common-commands)
- [Testing](#testing)
  - [Setting up the local Supabase stack](#setting-up-the-local-supabase-stack)
- [Database migrations](#database-migrations)

## Getting started

1. Clone the repo and run `npm install`.
2. Set up your environment (see below) so the app has the credentials it needs to run.
3. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000). If the public pages load, you're set up correctly.

### Environment setup

Copy `.env.example` to a new file called `.env.local` and fill in four values:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (from the **dev** Supabase project)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (from the Clerk **dev instance**)

Ask a `tech-leads` member for these. They're needed just to run `npm run dev` at all, not only for auth- or database-specific work, since Clerk and Supabase are both wired in at the app's root. Without them, the app won't build or start locally.

**Never use production credentials for local development.** The dev Supabase project and Clerk dev instance exist specifically so nothing you do locally can touch real user data.

Two things beyond those four variables, only needed for certain kinds of work:

- **Testing staff/admin functionality** (not just the public pages) requires an actual Clerk user account with a staff role, set up by a `tech-leads` member in the Clerk dashboard. The keys above only let the app run. They don't give any particular account a role.
- **Writing or testing database migrations** doesn't require any shared credentials if you use the local Supabase stack (`supabase start`, see Common commands below). Only pushing a migration to the shared dev project directly requires a personal Supabase CLI login plus the dev project's database password.

## How to contribute code

```mermaid
flowchart LR
    A[Your feature branch] -->|PR, CI must pass, squash| B[dev]
    B -->|PR, CI + 1 tech-leads approval, merge| C[main, production]
    C -.->|auto: opens a merge PR into dev, auto-merges once CI passes| B
    B -.->|auto on merge| D[(dev Supabase)]
    C -.->|auto on merge, after a separate approval| E[(prod Supabase)]
```

- `dev` is the default branch. Branch off `dev` for your work, not `main` -- **this is enforced by CI, not just convention**: a PR into `main` fails its required checks unless it's coming from `dev`, even for an urgent fix. Branch off `dev`, merge that, then promote from there; there's no bypass.
- Open a PR into `dev`. It needs to pass CI (build, typecheck, lint, unit tests) before it can merge, but doesn't need anyone's approval.
- PRs into `dev` are squash merged (the default button), so don't worry about keeping your commit history clean as you work.
- Once your change is on `dev`, it gets promoted to production (`main`) periodically by a `tech-leads` member, via a separate PR that does require an approval. `main`'s ruleset only allows **merge** commits, not squash or rebase (an earlier rebase-only setup was tried and reverted -- rebasing `dev`'s squashed commits onto `main` isn't actually a clean fast-forward once `dev` has moved on, which happens constantly with more than one person committing), so each promoted feature stays visible as its own commit.
- Direct pushes to either `dev` or `main` are blocked for everyone, including admins, with no exceptions -- everything, human or automated, goes through a PR.
- **Syncing `main` back into `dev` after a promotion is automatic.** A workflow (`.github/workflows/sync-dev-from-main.yml`) fires on every push to `main`, opens a "Sync main back into dev" PR (merge method, not squash), and merges it itself once CI passes. Since `main` only ever advances via a promotion from `dev` (the CI check above guarantees that), this PR is never anything but commits `dev`'s own history already produced, so it merges cleanly essentially always. You'll only ever need to act on it if it genuinely can't merge (a real conflict -- possible but rare), in which case it's left open for you.

## Images and static assets

Anything in `public/` is copied into every deployment Vercel keeps, production and every preview build alike. An oversized file is stored once per retained deployment, so a handful of full-resolution photos can quietly add up to gigabytes and trip the free plan's deployment-storage limit.

Before adding an image to `public/`:

- Resize it to a web-appropriate size first. Roughly 2000px on the long edge for a full-width photo, 800px for a headshot, and aim for a few hundred KB rather than several MB. A photo straight off a phone or camera is 20 to 40 times larger than it needs to be.
- Run `npm run images:optimize`. It downsizes anything oversized under `public/`, strips EXIF metadata, and re-encodes at a sensible quality. It's idempotent, so running it when nothing needs changing is a no-op. `npm run images:check` reports without rewriting, in case you want to see what it would touch.
- Rendering doesn't change either way. Every image on the site goes through `next/image`, which serves each visitor a resized version regardless of the source file's size. Shrinking the source is only about what gets stored and shipped in the deployment.

Content that staff or applicants upload at runtime (job photos, resumes) goes in Supabase Storage, not `public/`. `public/` is for assets that ship with the code.

## Common commands

Day to day, you'll mostly just use:

- `npm run dev`: starts the local dev server
- `npm run test:unit`: runs the unit tests, worth running if you touched code that has tests for it

Before opening a PR, it can save you a round trip to run what CI is going to check anyway, so a failure shows up on your machine instead of after you've already pushed:

- `npm run build`
- `npm run lint`

Specialized, only relevant if you're touching the database schema:

- `supabase start` / `supabase stop`: starts or stops a local Postgres/Supabase stack, so you can test migrations without touching the shared dev project
- `npm run test:rls`: database permission tests. Requires that local stack to be running (`supabase start` first). Not run in CI yet.
- `npm run test:e2e`: browser tests that run against the local Supabase stack. Also requires the local stack to be running first. Not run in CI yet.
- `npm run types:gen`: regenerates `lib/database.types.ts` from the schema after a migration change. Run this any time you add a migration. Never hand-edit that file directly.

See [Testing](#testing) below for what each test command actually does and how to set up the local stack the first time.

## Testing

There are three kinds of tests in this repo:

- **Unit tests** (`npm run test:unit`). Test plain TypeScript functions, like form validation. No database needed. These run automatically in CI on every PR.
- **RLS tests** (`npm run test:rls`). Test database permissions, like confirming a regular visitor can't read applicant data but staff can. Needs the local Supabase stack running (see below). Not run in CI yet.
- **End to end tests** (`npm run test:e2e`). Open a real browser and click through the app, like filling out and submitting the application form. Also needs the local Supabase stack running. Not run in CI yet.

Run `npm run test:unit` often, it's fast and needs no setup. Run the other two when you touch the database schema or the application form.

### Setting up the local Supabase stack

You need this for the RLS tests, the end to end tests, or to safely try out a new migration before pushing it.

1. Open Docker Desktop and make sure it's running.
2. Run `supabase start`. The first time you run this it downloads some Docker images, so it can take a few minutes. It sets up a local copy of the database and applies every migration to it.
3. Just wrote a new migration and the stack was already running from before? Run `supabase db reset` instead. This rebuilds the local database from scratch and reapplies every migration in order. `supabase start` on its own won't pick up a new migration on a database that already exists.
4. Run `npm run test:rls` or `npm run test:e2e`.
5. Run `supabase stop` when you're done. You can also just leave it running, that's fine too.

A few things worth knowing:

- `npm run dev` still uses the shared dev Supabase project by default, not your local stack.
- `npm run test:e2e` starts its own dev server on a different port (3100) so it can run at the same time as your own `npm run dev`.
- The seeded `associate-2026` job still has its old Google Form link attached on a fresh local stack. On real dev and prod that link was cleared by hand after the in-house form shipped. The e2e tests clear it automatically, but if you're clicking through the apply form by hand against the local stack, run `update jobs set apply_url = null where slug = 'associate-2026';` first.

## Database migrations

Migration files live in `supabase/migrations/`, named `<timestamp>_<description>.sql`. Once a migration has been merged, don't edit that file. The database has already run it and won't run it again, so add a new migration instead.

Before opening a PR, test a new migration against the [local Supabase stack](#setting-up-the-local-supabase-stack). Run `supabase db reset`, then `npm run test:rls` or `npm run test:e2e`. This is the best way to catch a migration that doesn't apply cleanly, or that breaks an RLS policy, before it ever reaches the shared dev project.

They're applied automatically, not by hand:

- Merging into `dev` applies any new migrations to the dev Supabase project.
- Promoting to `main` applies them to production, after a manual approval step. Schema changes are harder to reverse than a code deploy, so this keeps a human in the loop specifically for that step.

After adding a migration, run `npm run types:gen` to regenerate `lib/database.types.ts`, so the rest of the app has correct types for your schema change.

If you add a new table and then immediately hit `Could not find the table 'public.your_table' in the schema cache` from the app, the migration itself is fine, PostgREST just hasn't picked up the change yet. It caches the schema at startup and normally reloads automatically on DDL, but that doesn't always fire reliably against the local stack. Force it with:

```
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "NOTIFY pgrst, 'reload schema';"
```

or just restart the stack (`supabase stop && supabase start`).

When writing a migration, prefer expand-style changes over contract-style changes where possible:

- **Expand**: new nullable columns, new tables, widened validation. Safe to land before the code that uses them, since the currently deployed app just ignores schema it doesn't reference yet.
- **Contract**: drops, renames, tightened constraints. These need careful sequencing with the code deploy, since the currently deployed code may still depend on what you're about to remove or rename.

### Rotating SUPABASE_ACCESS_TOKEN

The `SUPABASE_ACCESS_TOKEN` GitHub Actions secret authenticates the Supabase CLI in both `.github/workflows/deploy-dev-migrations.yml` and `.github/workflows/deploy-migrations.yml` (the prod one). It's the same secret for both, and it has an expiry, so it needs rotating before it lapses.

When it lapses or is otherwise invalid, both workflows fail immediately at the `supabase link` step with `Unauthorized`.

**It must be a legacy access token, not one of Supabase's newer scoped/fine-grained tokens.** A scoped token, even with Full access on every permission, hits a known bug where `supabase link` fails with `Your account does not have the necessary privileges to access this endpoint` -- the CLI needs to reveal the project's API keys, and that call isn't supported for scoped tokens yet ([supabase/supabase#50244](https://github.com/supabase/supabase/issues/50244), [supabase/cli#6392](https://github.com/supabase/cli/issues/6392)). Widening individual permissions on a scoped token won't fix this.

To rotate it:

1. In the Supabase dashboard, go to **Account > Access Tokens > Generate new token**.
2. On the configure screen, click **Create legacy token** (a text link next to "Resource access", not the main flow) -- this skips the project/permission pickers entirely, since a legacy token has full account access.
3. Name it clearly, e.g. `ic-website-ci-legacy`, set an expiry, and copy the value immediately.
4. Update the `SUPABASE_ACCESS_TOKEN` secret in the repo's **Settings > Secrets and variables > Actions**.
5. Re-run the failed workflow (from the Actions tab, or `gh run rerun <run-id>`) rather than pushing a new commit.
