# rnb-konference

A paid conference-streaming platform: each conference is a live YouTube
stream during the event and the same recording afterward. Payment is
reconciled outside the app; an admin then grants the paying customer
permanent access. There's no self-serve sign-up — every customer account is
created by an admin via an emailed invite, and everything (access grants,
watch-time tracking, a usage dashboard) is managed from an admin area built
on SvelteKit, Postgres, and a full shadcn-svelte component library.

## Stack

- **Runtime / package manager:** [Bun](https://bun.sh)
- **Framework:** [SvelteKit](https://svelte.dev/docs/kit) + TypeScript
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com)
- **UI components:** [shadcn-svelte](https://shadcn-svelte.com) (all components installed) + [lucide](https://lucide.dev) icons
- **Auth:** [better-auth](https://www.better-auth.com)
- **Database:** [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- **Email:** [nodemailer](https://nodemailer.com) over plain SMTP (access-granted + invite emails)
- **Testing:** [Vitest](https://vitest.dev)
- **Tooling:** Prettier, ESLint, Husky

See [CLAUDE.md](CLAUDE.md) for AI-assistant working notes.

## Documentation

- **README.md** (this file) — stack, setup, project structure, and
  per-topic explanations of how the app works.
- **[CLAUDE.md](CLAUDE.md)** — working notes for AI assistants (guardrails,
  commands, conventions).
- **`docs/project.md`** — project vision/documentation entry point; points at
  `docs/concepts/` for UI concepts (mockups, references).
- **`docs/feature.md`** — the feature currently being implemented: scope,
  requirements, open questions.
- **`docs/implemented.md`** — a running list of already-shipped features,
  each with a short summary.

## Setup

Prerequisites: [Bun](https://bun.sh) and [Docker](https://www.docker.com) (for
the local Postgres container).

```sh
bun install

cp .env.example .env   # then fill in the values, see Environment variables below

bun run db:start        # starts a local Postgres container (requires Docker)
bun run db:push          # pushes the schema to the database

bun run dev -- --open
```

### Environment variables

Copy `.env.example` to `.env` and fill in real values. `.env` is gitignored;
`.env.example` is the checked-in template and should be kept in sync whenever
a variable is added, renamed, or removed.

| Variable             | Description                                                                                                                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string, e.g. `postgres://user:pass@localhost:5432/db`. Used by Drizzle and better-auth.                                                                                            |
| `ORIGIN`             | The public origin of the app (e.g. `http://localhost:5173` in dev). Required by SvelteKit for form actions/CSRF, by better-auth as its `baseURL`, and to build the invite-completion link sent by email. |
| `BETTER_AUTH_SECRET` | Secret used by better-auth to sign sessions/tokens. Generate a high-entropy 32+ character value for production — see the [better-auth docs](https://www.better-auth.com/docs/installation).              |
| `SMTP_HOST`          | SMTP server host for outgoing email (access-granted notifications, invite emails).                                                                                                                       |
| `SMTP_PORT`          | SMTP server port, defaults to `587` if unset.                                                                                                                                                            |
| `SMTP_USER`          | SMTP auth username.                                                                                                                                                                                      |
| `SMTP_PASSWORD`      | SMTP auth password.                                                                                                                                                                                      |
| `SMTP_FROM`          | The `From:` address used on outgoing emails.                                                                                                                                                             |

Local defaults in `.env.example` match `compose.yaml` (the Docker Postgres
container), so `bun run db:start` + the default `DATABASE_URL` work together
out of the box. The `SMTP_*` variables are blank by default — with any of
`SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` empty, `$lib/server/email.ts`
skips sending and just logs a warning, so email is entirely optional in dev.

> To deploy this app you'll need to swap `@sveltejs/adapter-auto` for an [adapter](https://svelte.dev/docs/kit/adapters) matching your target platform.

## Project structure

```
src/
  app.html               HTML shell
  app.d.ts                Ambient types (locals, etc.)
  hooks.server.ts          Server hooks — wires better-auth into every request
  routes/                  SvelteKit routes (file-based routing)
    (public)/               Public site: layout with Navbar/Footer, its own +error.svelte
      +page.svelte            Homepage
      konference/              Public conference listing + detail/player page
      prihlaseni/               Login (no self-serve sign-up — accounts are admin-invited only)
      dokonceni-registrace/[token]/  Where an invited customer sets their password
    admin/
      +page.svelte            Admin login (outside the (protected) group)
      (protected)/             Everything gated by user.role === 'admin'; Sidebar layout, its own +error.svelte
        dashboard/               Stats, viewership chart, top users, conference list
        konference/               Conference CRUD list/new/[id], nested pristupy (access grants) + sledovat (live watch stats)
        uzivatele/               Customer list/[id]/new (admin-side invite form)
        logy/                    Access log viewer
    api/                     JSON endpoints (auth is under /api/auth/* via better-auth)
    layout.css               Tailwind entrypoint + shadcn-svelte theme tokens
  lib/
    components/ui/         shadcn-svelte components (vendored, CLI-managed — see UI components below)
    components/admin/      Admin-only building blocks (stat cards, charts)
    components/            Shared components: navbar, footer, conference-card,
                             youtube-player, rich-text-editor, error-page, ...
    hooks/                  Reusable Svelte hooks (e.g. is-mobile)
    server/
      auth.ts               better-auth instance (server-only)
      access.ts               hasConferenceAccess() — the actual access-control check
      access-log.ts            Records/reads granted-vs-denied view attempts
      conferences.ts           Conference listing, revenue total, deactivation
      customers.ts             Customer (non-admin user) listing
      invites.ts               Admin-side invite creation + invite-completion flow
      email.ts                 nodemailer wrapper — access-granted + invite emails
      sanitize.ts               Server-side HTML sanitization for rich-text descriptions
      watch-tracking.ts         Heartbeat recording + every "who watched what" query
      db/
        index.ts             Drizzle client
        schema.ts             Re-exports every *.schema.ts below
        auth.schema.ts         Generated by `bun run auth:schema`, do not hand-edit
        conference.schema.ts    conference, accessGrant, accessLog, watchSession, watchHeartbeat
        user-invite.schema.ts   userInvite (token + expiry for the pre-registration flow)
    format-name.ts          formatCustomerName() — firstName+lastName, falling back to name/email
    format-duration.ts      formatDuration() — seconds → "1 h 20 min" etc.
    youtube.ts               YouTube URL/ID/thumbnail helpers
    utils.ts                shadcn-svelte's `cn()` helper
```

**Request flow:** `hooks.server.ts` runs on every request, asks better-auth
for the current session, attaches it to `event.locals.session` /
`event.locals.user`, then hands off to `svelteKitHandler` so better-auth's own
routes (`/api/auth/*`) get served. Server-only code (`src/lib/server/**`) is
never bundled for the client.

**Path aliases:** `$lib` → `src/lib`; `$lib/components`, `$lib/components/ui`,
`$lib/hooks`, `$lib/utils` are the shadcn-svelte aliases, configured in
`components.json`.

## Scripts

| Script                | Description                                   |
| --------------------- | --------------------------------------------- |
| `bun run dev`         | Start the dev server                          |
| `bun run build`       | Build for production                          |
| `bun run preview`     | Preview the production build                  |
| `bun run check`       | Run Prettier (check) + ESLint                 |
| `bun run check:types` | Type-check the project                        |
| `bun run format`      | Format the project with Prettier              |
| `bun run test`        | Run Vitest once (passes with no test files)   |
| `bun run test:unit`   | Run Vitest in watch mode                      |
| `bun run db:start`    | Start the local Postgres container via Docker |
| `bun run db:push`     | Push the Drizzle schema to the database       |
| `bun run db:generate` | Generate Drizzle migrations                   |
| `bun run db:migrate`  | Run Drizzle migrations                        |
| `bun run db:studio`   | Open Drizzle Studio                           |
| `bun run auth:schema` | Regenerate the better-auth Drizzle schema     |

A Husky pre-commit hook runs `format` (then restages), `check`, and `test` on
every commit — see [CLAUDE.md](CLAUDE.md#pre-commit-hook).

## Database

PostgreSQL via [Drizzle ORM](https://orm.drizzle.team), using the `postgres.js` driver.
`compose.yaml` defines a local Postgres container matching the default
`DATABASE_URL` in `.env.example` (`bun run db:start`).

- `src/lib/server/db/schema.ts` — re-exports every `*.schema.ts` file below;
  Drizzle Kit and the Drizzle client both import from here.
- `src/lib/server/db/auth.schema.ts` — better-auth's tables (`user`, `session`,
  `account`, `verification`), plus the app's `additionalFields` on `user`
  (`role`, `firstName`, `lastName`, `status`, `registeredAt` — see
  Authentication below). **Generated file — do not hand-edit.** Regenerate it
  after changing the better-auth config with `bun run auth:schema`.
- `src/lib/server/db/conference.schema.ts` — `conference` (including the
  soft-delete `deactivatedAt` column), `accessGrant`, `accessLog`,
  `watchSession` (one row per viewer per conference, cumulative watch time),
  `watchHeartbeat` (one row per heartbeat, reconstructs concurrent-viewer
  timelines).
- `src/lib/server/db/user-invite.schema.ts` — `userInvite` (token + expiry for
  an admin-issued pre-registration invite).

Applying schema changes:

- **Prototyping:** `bun run db:push` pushes the current schema straight to the
  database (no migration files).
- **Migrations:** `bun run db:generate` writes a migration from the schema
  diff, `bun run db:migrate` applies pending migrations. Prefer this flow once
  the schema needs to move through multiple environments.
- `bun run db:studio` opens [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)
  to browse data.

`drizzle.config.ts` reads `DATABASE_URL` from `process.env`; Drizzle Kit loads
`.env` automatically, so the `bun run db:*` scripts work without extra setup.

## Authentication

Authentication is handled by [better-auth](https://www.better-auth.com), using
its Drizzle adapter against the Postgres database.

- `src/lib/server/auth.ts` — the `betterAuth()` instance: base URL, secret,
  `emailAndPassword: { enabled: true, disableSignUp: true }` (sign-**in**
  stays on, but self-serve sign-**up** is rejected at the API level, not just
  by having no page linking to it — every account is admin-invited, see the
  invite flow below), the `sveltekitCookies` plugin (must stay last in the
  `plugins` array — it needs to see the response from every other plugin
  before setting cookies), and `user.additionalFields`:
  - `role` — `'user'` (default) or `'admin'`; only ever set manually in the
    database, there's no role-management UI.
  - `firstName` / `lastName` — collected on the admin's invite form and shown
    via `formatCustomerName()` (`$lib/format-name.ts`) everywhere a
    customer's name is displayed, falling back to `name`/`email`.
  - `status` — `'active'` or `'invited'` (see the invite flow below).
  - `registeredAt` — when the account actually became usable: stays `null`
    for an invited account until the customer completes their invite and
    sets a password.
- `src/hooks.server.ts` — resolves the current session via
  `auth.api.getSession()` on every request and delegates to
  `svelteKitHandler`, which serves better-auth's own endpoints under
  `/api/auth/*` (sign-in, sign-out, session, etc.) — no need to write those
  routes yourself.

To add an auth method, enable it in `src/lib/server/auth.ts` (e.g. a social
provider, magic links, passkeys — see the
[better-auth plugin docs](https://www.better-auth.com/docs/plugins)), then
regenerate the schema and push it: `bun run auth:schema && bun run db:push`.

Read the session in a route via `locals.user` / `locals.session` (typed in
`src/app.d.ts`):

```ts
// +page.server.ts
export const load = async ({ locals }) => {
	return { user: locals.user };
};
```

**Client-side sign-in/sign-out:** `src/lib/auth-client.ts` exports `authClient`
(from `better-auth/svelte`, with `inferAdditionalFields<typeof auth>()` so the
extra `user` fields above are typed on the client too), used by
`(public)/prihlaseni` (`authClient.signIn.email(...)`) and the "Odhlásit"
buttons (`authClient.signOut()`). Two separate guards protect the admin area:
`src/routes/admin/(protected)/+layout.server.ts` redirects to `/admin` (the
login page) unless `locals.session` exists and `locals.user.role === 'admin'`;
`hasConferenceAccess()` (`$lib/server/access.ts`) is the actual per-conference
check used everywhere else — it returns `true` unconditionally for an admin,
otherwise looks for a matching `accessGrant` row.

## Conferences, access & invites

- **Conference lifecycle** (`$lib/server/conferences.ts`): admin CRUD under
  `/admin/konference`; `status` (`upcoming`/`live`/`ended`) is toggled
  manually, never derived from `startsAt`. Deleting a conference (the trash
  icon on its card) doesn't actually delete the row — `deactivateConference()`
  sets `deactivatedAt`, which every listing/detail query filters out
  (`isNull(conference.deactivatedAt)`), and direct URLs to it 404. There is no
  reactivate link anywhere in the regular admin nav; the only way back is the
  unlinked `/admin/konference/delete` page (`listDeactivatedConferences()` /
  `restoreConference()`).
- **Access grants**: an `accessGrant` row is the only thing that unlocks a
  conference for a customer — granted/revoked from a conference's `pristupy`
  tab or from a customer's own detail page, both ways round. Granting sends
  an email via `sendAccessGrantedEmail()`.
- **Invites** (`$lib/server/invites.ts`): `/admin/uzivatele/new` creates the
  `user` row immediately (`status: 'invited'`) so an admin can grant access
  before the customer ever logs in, plus a `userInvite` (token + 7-day
  expiry). The emailed link goes to
  `(public)/dokonceni-registrace/[token]`, where the customer sets a password
  (`completeInvite()` hashes it via `better-auth/crypto` and builds the
  `account` row by hand, matching better-auth's own shape) and is signed in.
  An orange dot marks an `'invited'` (not yet completed) customer everywhere
  they show up: the customer list, a conference's access-grant list, and
  "Celkem sledujících" on `sledovat`.
- **Public listing/detail** (`(public)/konference`): visible to everyone,
  logged in or not. A locked conference shows its price and a contact email
  instead of `videoUrl` — the server `load` only ever includes `videoUrl` if
  `hasConferenceAccess()` passes, so there's no way to reach it from the
  client regardless of what the page renders.
- **Playback** (`$lib/components/youtube-player.svelte`): a custom-controls
  wrapper around the YouTube IFrame API — right-click and native controls are
  disabled, and there's no direct link to the YouTube URL anywhere in the
  markup. These are deterrents on top of the real boundary (the access-grant
  check above), not a replacement for it.

## Watch tracking & admin dashboard

- **Heartbeats** (`$lib/server/watch-tracking.ts`): the player page pings
  `POST /api/konference/[id]/heartbeat` roughly every 15s while the tab is
  visible. Each beat upserts one cumulative `watchSession` row (live vs.
  recorded seconds; this is what "celkem sledujících" counts — leaving and
  reopening the stream doesn't count as a second viewer) and inserts one
  append-only `watchHeartbeat` row (this is what reconstructs a
  concurrent-viewers-over-time chart; a cumulative session row can't).
- **A conference's `sledovat` tab** — currently/total/live/recorded viewer
  counts, each backed by a modal listing who's behind the number, plus a
  viewer-count-over-time chart (`viewer-timeline-chart.svelte`, reused for
  both this and the dashboard's monthly chart via a `granularity` prop).
- **`/admin/dashboard`** — revenue (`getRevenueTotal`), current-month
  viewership, a "Uživatelé" card (every customer by total watch time, zero
  included, links to their detail page), a watched-vs-granted-access chart
  across recent conferences (`watch-summary-chart.svelte`), and a conference
  list (live → upcoming → ended, capped at 4, linking straight to `sledovat`).

## UI components

All components from [shadcn-svelte](https://shadcn-svelte.com) are installed
under `src/lib/components/ui/`. Unlike a typical npm package, these are
**vendored into the repo** — the CLI copies the source in so you can edit it
directly. Config lives in `components.json` (style `nova`, base color
`neutral`, icon library `lucide`).

```sh
bunx shadcn-svelte@latest add <component>
bunx shadcn-svelte@latest add <component> --overwrite   # re-sync from registry
```

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<Button variant="outline">Click me</Button>
```

Vendored files under `src/lib/components/ui/**` are exempted from
`svelte/no-navigation-without-resolve` and `@typescript-eslint/no-unused-vars`
in `eslint.config.js` — they're CLI-managed, not hand-written.

Icons come from [`@lucide/svelte`](https://lucide.dev/icons):

```svelte
<script lang="ts">
	import { Menu } from '@lucide/svelte';
</script>

<Menu class="size-4" />
```

Tailwind CSS v4 is configured via `@tailwindcss/vite` (no `tailwind.config.js`
— v4 is CSS-first). The entrypoint and shadcn-svelte theme tokens live in
`src/routes/layout.css`. The `cn()` helper for merging Tailwind classes is in
`src/lib/utils.ts`.

## Testing

Tests run on [Vitest](https://vitest.dev), configured in `vite.config.ts`
under `test.projects`. Tests live next to the code they test:

- `*.test.ts` / `*.spec.ts` — plain TypeScript (server code, utils), run in
  Vitest's `server` project (Node environment).
- `*.svelte.spec.ts` — Svelte component/rune logic, excluded from the
  `server` project; add a browser/component test project before writing these.

`bun run test` runs everything once and passes with zero test files
(`--passWithNoTests`), so adding tests is optional but never breaks the
pre-commit hook or CI. `bun run test:unit` runs Vitest in watch mode.
