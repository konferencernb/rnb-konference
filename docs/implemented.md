# Implemented features

## Paid conference streaming platform (core)

The original scoped feature (see git history / this file's other entries for
what's been layered on since): admins create conferences (`title`,
`description`, `price`, `videoUrl`, optional `startsAt`) and manually toggle
`status` between `upcoming`/`live`/`ended`. Payment happens outside the app;
an admin manually creates an `accessGrant` linking a customer to a conference
once paid, which is the only thing that unlocks it — enforced server-side
(`hasConferenceAccess()` in `$lib/server/access.ts`), never just in the UI.
All conferences are listed publicly regardless of login state; locked ones
show price + a contact email instead of the video. Playback is a custom
YouTube-IFrame-API player with right-click disabled and no direct link to the
YouTube URL exposed anywhere (deterrents, not the real security boundary).
`role === 'admin'` bypasses the access-grant check entirely.

## Accounts: name split, invite-only registration

- Every customer account is created by an admin — there's no self-serve
  sign-up. Accounts use separate `firstName`/`lastName` fields (previously a
  single `name` field — existing rows were backfilled to the new structure).
  `formatCustomerName()` (`$lib/format-name.ts`) is the one place that turns
  a user record into a display name, falling back through
  firstName+lastName → name → email.
- Admin-side invites: `/admin/uzivatele/new` (reached via the "+" button on
  the customer list or the dashboard's "Uživatelé" card) creates the `user`
  row immediately with `status: 'invited'`, so access can be granted before
  the customer ever logs in. The invite email links to
  `(public)/dokonceni-registrace/[token]`, a 7-day link where the customer
  sets a password twice and is auto-signed-in on completion
  (`$lib/server/invites.ts`).
- An orange "pending" status dot marks an invited-but-not-yet-registered
  customer everywhere they appear: the customer list, a conference's
  `pristupy` grant list, and the "Celkem sledujících" roster on `sledovat`.
- **Public self-registration removed**: the `(public)/registrace` page and
  its route are gone, along with the "Registrace" navbar button and the
  "Zaregistrujte se" link on the login page. `emailAndPassword.disableSignUp`
  is set in `auth.ts` so `/api/auth/sign-up/email` itself rejects sign-up
  (sign-_in_ is untouched) — removing the page alone wouldn't have closed
  that endpoint. The navbar's "Úvod"/"Konference" links now sit to the right,
  next to "Přihlásit se", instead of centered.

## Watch tracking ("Sledovat" tab)

Each conference's `/admin/konference/[id]/sledovat` page shows: who's online
right now (green dot), total unique viewers vs. how many have access at all
(a modal roster color-coded online/watched/invited/never watched), and a
live-vs-recorded breakdown — each stat card opens a modal with the relevant
viewer list, and the live one additionally shows a viewer-count-over-time
chart. Backed by `$lib/server/watch-tracking.ts`: the player pings a
heartbeat endpoint roughly every 15s while its tab is visible, which upserts
a cumulative `watchSession` row (per viewer, live/recorded seconds) and
inserts an append-only `watchHeartbeat` row (needed to reconstruct
concurrent viewers _over time_ — a cumulative row can't do that). The
timeline chart (`viewer-timeline-chart.svelte`) always extends through "now"
with zero-fill rather than stopping at the last real data point.

## Admin dashboard

Redesigned `/admin/dashboard`: four stat cards (total revenue — sum of each
access grant's conference price, total conferences, granted/denied access
attempts), a current-month viewership chart, a "Uživatelé" card (every
customer ordered by total watch time, zero-watch ones included, each row
linking to that user's detail page; "+" links to inviting a new user), a
watched-vs-granted-access chart across recent conferences, and a conference
list capped at 4 rows (live → upcoming → ended, with a divider after the
live ones) that links straight to each conference's `/sledovat` page. Backed
by new query helpers in `getRevenueTotal` (`conferences.ts`) and
`getMonthlyViewershipTimeline` / `getUsersByWatchTime` /
`getRecentConferenceWatchSummary` (`watch-tracking.ts`).

## Admin sidebar redesign

White background (was a slightly off-white token) with a soft shadow on its
right edge instead of a hard border; the active nav item gets a tinted
primary background + primary-colored text/icon instead of a plain gray
highlight; fixed the "Administrace" header icon being off-center in the
collapsed (icon-only) rail — it had its own redundant horizontal padding on
top of the sidebar header's.

## Conference soft-delete (deactivation) + restore

A trash icon in the top-right corner of each conference card on
`/admin/konference` opens a confirmation alert ("Smazat konferenci" /
Zrušit / Ano). Confirming doesn't delete the row — it sets
`conference.deactivatedAt` instead, so existing access grants, watch
history, and logs referencing it stay intact. A deactivated conference is
filtered out of every listing and detail page and 404s if visited directly
(admin edit/`pristupy`/`sledovat` via the shared `[id]/+layout.server.ts`
guard, and the public detail page). There's no link to it from the regular
admin nav, but `/admin/konference/delete` lists every deactivated
conference (same card design, no trash icon, a blue "Obnovit" button in its
place) and restores it via `restoreConference()` — both functions live in
`conferences.ts`, alongside `listDeactivatedConferences()`.

## Toast notifications

The shadcn-svelte `sonner` component (`$lib/components/ui/sonner`) was
vendored but unused; it's now mounted once in the root `+layout.svelte`
(`richColors`, bottom-right) so `toast.success()`/`toast.error()` from
`svelte-sonner` work anywhere. Wired into every admin form that mutates
something so far: inviting a user, creating/editing a conference, and
deactivating one — each shows a green toast on success (with the specific
server error in the red one on failure). Where the action redirects
(invite, conference create), the toast is fired just before a manual `goto`
in the `use:enhance` callback, since `<Toaster/>` stays mounted across the
navigation. The deactivate confirmation `AlertDialog` also needed an
explicit `bind:open` closed on success — unlike `AlertDialogCancel`,
`AlertDialogAction` doesn't auto-close (bits-ui's own behavior; the "action"
is expected to do something first), so it wouldn't have dismissed itself
otherwise.

## Error pages

A shared `$lib/components/error-page.svelte` renders a status-aware message
(404, 401, 403, 400, 5xx, and a generic fallback) with an icon, heading,
description, and a "back" button. Wired up via three `+error.svelte` files
so each surface keeps its own chrome: the root one (bare/unmatched routes,
no layout), `(public)/+error.svelte` (keeps navbar/footer), and
`admin/(protected)/+error.svelte` (keeps the sidebar, links back to the
dashboard instead of the homepage).

## Basic UI Implementation

Implemented the base application UI (layout, `Navbar`, `Footer`, and other
reusable components) following the direction in `docs/concepts/ui`, built with
shadcn-svelte components wherever practical.
