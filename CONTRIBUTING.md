# Contributing

This is the website for Inspire Columbia, a Next.js app with a Supabase database and Clerk for staff authentication. This guide covers what a new contributor needs to get set up and start opening PRs.

## Table of contents

- [Getting started](#getting-started)
  - [Environment setup](#environment-setup)
- [How to contribute code](#how-to-contribute-code)
- [Common commands](#common-commands)
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
    C -.->|sync-back PR, merge| B
    B -.->|auto on merge| D[(dev Supabase)]
    C -.->|auto on merge, after a separate approval| E[(prod Supabase)]
```

- `dev` is the default branch. Branch off `dev` for your work, not `main`.
- Open a PR into `dev`. It needs to pass CI (build, typecheck, lint, unit tests) before it can merge, but doesn't need anyone's approval.
- PRs into `dev` are squash merged (the default button), so don't worry about keeping your commit history clean as you work.
- Once your change is on `dev`, it gets promoted to production (`main`) periodically by a `tech-leads` member, via a separate PR that does require an approval. `main`'s merge button only offers a real merge commit, not squash, so each promoted feature stays visible as its own commit.
- Direct pushes to either `dev` or `main` are blocked for everyone, including admins. Everything goes through a PR.
- **After a promotion, sync `main` back into `dev`**: open one more PR (`main` as head, `dev` as base) and merge it using the **merge** method, not the default squash button. This keeps the two branches' git history aligned. Skipping this, or squashing it by mistake, doesn't break anything, but leaves a permanent, confusing gap between the branches that has to be fixed the same way later.

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
- `npm run types:gen`: regenerates `lib/database.types.ts` from the schema after a migration change. Run this any time you add a migration. Never hand-edit that file directly.

## Database migrations

Migration files live in `supabase/migrations/`, named `<timestamp>_<description>.sql`. Once a migration has been merged, don't edit that file. The database has already run it and won't run it again, so add a new migration instead.

They're applied automatically, not by hand:

- Merging into `dev` applies any new migrations to the dev Supabase project.
- Promoting to `main` applies them to production, after a manual approval step. Schema changes are harder to reverse than a code deploy, so this keeps a human in the loop specifically for that step.

After adding a migration, run `npm run types:gen` to regenerate `lib/database.types.ts`, so the rest of the app has correct types for your schema change.

When writing a migration, prefer expand-style changes over contract-style changes where possible:

- **Expand**: new nullable columns, new tables, widened validation. Safe to land before the code that uses them, since the currently deployed app just ignores schema it doesn't reference yet.
- **Contract**: drops, renames, tightened constraints. These need careful sequencing with the code deploy, since the currently deployed code may still depend on what you're about to remove or rename.
