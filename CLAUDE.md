# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repo.

**Start of task:** read [README.md](README.md) first, then `docs/*.md` — see
Documentation below for what each file covers.

## Stack

Bun · SvelteKit (TypeScript) · Tailwind CSS v4 · shadcn-svelte (all components,
vendored) · lucide icons (`@lucide/svelte`) · better-auth · Drizzle ORM ·
PostgreSQL · Vitest · Prettier · ESLint · Husky.

Full detail is in [README.md](README.md) — Setup, Project structure,
Database, Authentication, UI components, and Testing sections.

## Documentation

- [README.md](README.md) — stack, setup, project structure, and detailed
  per-topic explanations. The primary reference for how the app works.
- `docs/project.md` — project vision/documentation entry point; currently
  points at `docs/concepts/` for UI concepts (mockups, references).
- `docs/feature.md` — the feature currently being implemented: scope,
  requirements, open questions. Reflects what's in progress right now, not
  history — keep it current as the feature's shape changes.
- `docs/implemented.md` — a running list of already-shipped features, each
  with a short summary. When a feature described in `docs/feature.md` ships,
  move its summary here and clear `docs/feature.md` out for the next one.

**Keep docs in sync:** when a change is made, update whichever of
README.md, CLAUDE.md, and the relevant `docs/*.md` files describe it, rather
than letting them drift from the code — do this as part of the change, not as
a follow-up.

## Guardrails

These override any general instinct to "just get it done" — check with the
user rather than acting, even if the fix seems small or obvious.

- **Database:** never start, stop, drop, or otherwise modify the database
  (including `bun run db:start`, `db:push`, `db:migrate`, `db:studio`, or raw
  `docker compose` commands against it) without asking the user first and
  getting explicit go-ahead. `bun run db:generate` only writes a local
  migration file and doesn't touch a live database, so it's fine on its own —
  but actually applying it (`db:push` / `db:migrate`) still needs approval.
- **Dev server:** never start, stop, restart, or change the configuration of
  the dev server without the user's permission.
- **Git:** never `git commit` or `git push` without the user explicitly
  asking for it in that turn. A prior approval doesn't carry forward to later
  changes.
- **Assume both the Postgres container and the dev server are already
  running.** Don't start them "to check." If a command fails because one of
  them isn't reachable, tell the user and wait for them to start it — don't
  start it yourself.
- **Stay in scope:** if finishing a task well would mean touching more than
  what was asked (extra files, unrelated refactors, broader renames), stop
  and ask before doing the additional work rather than expanding scope
  silently.
- **Tests:** never write or run tests — UI tests included, e.g. Playwright —
  without asking the user first and getting explicit go-ahead. This is
  separate from the verification commands (`bun run check`, `bun run
check:types`, `bun run test`) that are still expected before finishing a
  task; it's about adding new test files or exercising UI flows, not running
  the existing suite.

## Commands

```sh
bun install
bun run dev              # dev server
bun run check             # prettier --check + eslint — run before considering a task done
bun run check:types        # svelte-check / type-check — run before considering a task done
bun run format               # prettier --write
bun run test                  # vitest --run (passes with no tests found)
bun run test:unit              # vitest in watch mode
bun run build                    # production build
bun run db:start                  # start local Postgres (Docker) — ask first, see Guardrails
bun run db:push                    # push Drizzle schema to the database — ask first, see Guardrails
bun run auth:schema                 # regenerate better-auth's Drizzle schema
```

Always use `bun`, not `npm`/`pnpm`/`yarn` — including inside scripts and hooks.

## Working conventions

- **shadcn-svelte components (`src/lib/components/ui/**`) are vendored, not
  hand-written.** Prefer `bunx shadcn-svelte@latest add <name>` /
  `--overwrite` over manually recreating a component's internals. Editing one
  directly is fine (that's the point of vendoring), but don't fight its
  existing structure without reason.
- **`src/lib/server/db/auth.schema.ts` is generated** by `bun run
auth:schema` from `src/lib/server/auth.ts`. Never hand-edit it — change the
  better-auth config and regenerate instead.
- **Server-only code stays under `src/lib/server/`** (the Drizzle client,
  better-auth instance, secrets). SvelteKit enforces this isn't imported into
  client code — respect the boundary rather than routing around it.
- **Env vars:** add new ones to both `.env` and `.env.example`, and document
  them in the Environment variables section of [README.md](README.md). Never
  commit real secrets — `.env` is gitignored.
- **After schema changes:** run `bun run db:generate` to write the migration
  file, but ask the user before applying it with `db:push` or `db:migrate`
  (see Guardrails).
- **Tests live next to the code they test** (`*.spec.ts` / `*.test.ts` for
  plain TS, `*.svelte.spec.ts` for Svelte component logic — see
  `vite.config.ts`'s `test.projects`). `bun run test` must pass with zero
  test files (`--passWithNoTests`), so adding tests is optional but never
  breaks the hook or CI.
- **Before finishing a task:** run `bun run check`, `bun run check:types`, and
  `bun run test`; run `bun run build` for anything touching routing, config,
  or the auth/db wiring. Husky's pre-commit hook runs the same three steps
  automatically (see below), but never commit without the user asking first.

### Colors: use tokens, not raw values

- Colors live in [src/routes/layout.css](src/routes/layout.css) as CSS
  variables (`--background`, `--primary`, `--muted-foreground`, `--border`,
  etc.), mapped to Tailwind utilities via `@theme inline`. Use the resulting
  classes (`bg-background`, `text-muted-foreground`, `border-border`,
  `bg-primary text-primary-foreground`, …) — never a raw hex/oklch value or an
  arbitrary Tailwind color (`bg-gray-100`, `text-[#111]`) in component markup.
- Need a color that doesn't exist yet? Add a token (both `:root` and `.dark`,
  plus the `@theme inline` mapping) instead of hardcoding a one-off value, so
  dark mode and future reuse come for free.

### Components: rule of three

- Don't extract a component preemptively. Once the same markup/logic is
  written a **third** time, pull it into a component under
  `src/lib/components/` (or `src/lib/components/admin/` for admin-only UI).
  Two occurrences can stay duplicated.
- Reach for an existing `src/lib/components/ui/**` (shadcn-svelte) primitive
  before building new markup that reimplements one.

### Follow Svelte 5 idioms

- Runes, not legacy reactivity: `$state`, `$derived`, `$effect`, `$props` —
  not `export let`, `$:`, or `writable` stores for local component state.
- Snippets (`{#snippet ...}` / `{@render ...}`) instead of named slots.
- Event props (`onclick={...}`) instead of `on:click`; no `createEventDispatcher`.
- If existing code in the file you're touching still uses the legacy form,
  match the surrounding style rather than mixing runes and legacy reactivity
  in the same component — flag it instead of silently rewriting unrelated
  code.

## Pre-commit hook

`.husky/pre-commit` runs on every commit, in order:

1. `bun run format` — Prettier writes the whole tree, then `git add -u`
   restages any changes to already-tracked files.
2. `bun run check` — Prettier `--check` + ESLint over the whole tree.
3. `bun run test` — Vitest in run mode; passes even if no test files exist.

Any step failing aborts the commit. Don't bypass this with `--no-verify`
unless the user explicitly asks — and remember commits themselves require the
user's go-ahead (see Guardrails).
