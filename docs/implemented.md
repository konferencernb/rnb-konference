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

**Video URL validation**: the create/edit conference forms reject a `videoUrl`
that `getYoutubeVideoId()` (`$lib/youtube.ts`) can't parse — without this, a
pasted-wrong link saved fine and the customer just got a silently broken,
unresponsive black player with no explanation. `youtube-player.svelte`
separately handles the case URL-parsing can't catch (a well-formed link to a
video that's since been removed, made private, or has embedding disabled):
the player skips creating a `YT.Player` at all for an unparseable id, and
treats the IFrame API's own `onError` event the same way, showing "Přenos se
nepodařilo načíst" instead of a dead black box either way.

**`startsAt` is always Prague wall-clock time, regardless of server
timezone**: the admin form's `<input type="datetime-local">` gives back a
bare string with no timezone attached (e.g. `"2026-09-15T14:30"`), which
`new Date(value)` interprets in whatever timezone the _server process_
happens to run in — silently correct on a dev machine already set to
Europe/Prague, but 1-2 hours off (depending on DST) on a production host
defaulting to UTC, the norm for most cloud platforms. `$lib/server/prague-time.ts`'s
`parsePragueDatetimeLocal()` (used by both the create and edit actions)
explicitly resolves the input as Europe/Prague time via `Intl.DateTimeFormat`
instead of trusting the ambient server timezone, so the same input always
produces the same stored UTC instant no matter where this runs. The
companion `$lib/prague-time.ts`'s `formatPragueDatetimeLocal()` (plain
`$lib`, not `$lib/server`, since it's called from the edit page's markup)
does the reverse for pre-filling the edit form, for the same reason: reading
the value back with the JS `Date` object's local getters would depend on
whether that runs during SSR (server's timezone) or after hydration
(browser's timezone) instead of always meaning Prague.

The same class of bug existed on the _display_ side too: every
`.toLocaleDateString('cs-CZ')`/`.toLocaleTimeString(...)`/`.toLocaleString(...)`
call across the app (conference cards, the customer detail page, access
logs, granted-access lists, the dashboard, the viewer timeline chart's axis
labels) read the ambient timezone the same way — correct by coincidence in
dev, but wrong (and inconsistent between SSR and hydration) on a
UTC-timezone host, most visibly for anything near midnight Prague time
crossing into the wrong calendar day. `$lib/prague-time.ts`'s
`formatPragueDate()`/`formatPragueTime()`/`formatPragueDateTime()` wrap the
three native calls with `timeZone: 'Europe/Prague'` forced in and are what
every one of those call sites uses now.

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
- **Password rules**: completing an invite requires at least 8 characters, an
  uppercase letter, a digit, and a special character —
  `validatePassword()` (`$lib/password.ts`) is the single source of truth,
  used both for instant feedback on the completion form and as the real
  server-side check in `/api/dokonceni-registrace`.
- **Post-registration session refresh**: finishing registration now shows a
  success toast and calls `goto(..., { invalidateAll: true })`, so the
  navbar immediately reflects the new logged-in session instead of only
  updating after a manual page reload.
- **Deleting a customer**: `/admin/uzivatele/[id]` has a "Smazat uživatele"
  button (below the registration-status text) behind the same
  confirm/cancel `AlertDialog` pattern used elsewhere in admin. Unlike a
  conference, a customer has no soft-delete — the `deleteUser` action
  removes the `user` row outright, cascading to their access grants, watch
  history, and any pending invite.
- **Local network (LAN) testing**: `better-auth`'s origin check rejects a
  sign-in POST whenever the request's `Origin` header doesn't match
  `baseURL` (pinned to `http://localhost:5173`) — so opening the dev server
  from a phone on the same Wi-Fi via its LAN IP (e.g.
  `http://192.168.1.23:5173`) loaded pages fine but silently failed to log
  in. `auth.ts` now adds `trustedOrigins` wildcard patterns for private
  network ranges (`192.168.*.*`, `10.*.*.*`, `172.*.*.*` on port 5173), but
  only when `dev` (`$app/environment`) is true — production is unaffected
  and `baseURL`/`ORIGIN` stay the only source of truth for real links.

## Watch tracking ("Sledovat" tab)

Each conference's `/admin/konference/[id]/sledovat` page shows: who's online
right now (green dot), total unique viewers vs. how many have access at all
(a modal roster color-coded online/watched/invited/never watched), and a
live-vs-recorded breakdown — every stat card (including "Sledovalo ze
záznamu", backed by `getRecordedViewers()`) opens a modal with the relevant
viewer list, and the live one additionally shows a viewer-count-over-time
chart. Backed by `$lib/server/watch-tracking.ts`: the player pings a
heartbeat endpoint roughly every 15s while its tab is visible, which upserts
a cumulative `watchSession` row (per viewer, live/recorded seconds) and
inserts an append-only `watchHeartbeat` row (needed to reconstruct
concurrent viewers _over time_ — a cumulative row can't do that).

- **Timeline range**: the chart (`viewer-timeline-chart.svelte`) extends
  through "now" with zero-fill only while the conference is still `live`
  (`getViewerTimeline`'s `extendToNow` option, driven by
  `conference.status`) — otherwise it stops at the last real heartbeat, so
  an ended conference's chart stays scoped to when the stream actually
  happened instead of padding a long flat tail out to whenever an admin
  happens to check the page.
- **Chart layout**: the chart's width container needs `min-w-0` inside the
  dialog's grid — without it, the SVG's initial (pre-measurement) default
  width could exceed the dialog's `max-width` and overflow past its edge
  instead of shrinking to fit, a classic CSS grid/flex "intrinsic minimum
  size" bug.
- **Search + scroll**: every non-empty viewer list in these modals
  ("Aktuálně sledující", "Celkem sledujících", "Sledovalo živě", "Sledovalo
  ze záznamu") has a name search field at the top (same style as the
  conference combobox on `/admin/uzivatele/[id]`) filtering client-side, and
  the list itself scrolls (`max-h-72 overflow-y-auto`) instead of growing
  the dialog unbounded.

## Transactional email

Both emails the app sends (invite, access-granted) go through nodemailer
(`$lib/server/email.ts`, SMTP credentials in `.env` — see README) and share
one "bulletproof" HTML layout (`$lib/server/email-template.ts`): table-based
markup, inline styles only, MSO conditional comments for Outlook desktop's
Word rendering engine, no flexbox/grid/background-images, a hidden preheader,
and a plain-text fallback alongside every HTML body — chosen to render
consistently across Outlook, Gmail, and Apple Mail rather than degrading
gracefully in some of them. `getTransport()` sets `secure: true` only for
port 465 (implicit TLS); other ports negotiate TLS via STARTTLS instead —
nodemailer doesn't infer this from the port number. The invite email's
greeting uses both `firstName` and `lastName`, and both emails' footers
include a "V případě problémů se obraťte na community@nember.cz" contact
line (in the HTML and the plain-text body).

## Self-service password reset

"Zapomenuté heslo?" on `/prihlaseni` leads to `/zapomenute-heslo` (enter
email) → `/obnoveni-hesla/[token]` (set a new password), both public pages.
Built on better-auth's own reset-password endpoints rather than reinventing
token storage — `auth.api.requestPasswordReset`/`auth.api.resetPassword`
called directly from two thin `+server.ts` wrappers
(`/api/zapomenute-heslo`, `/api/obnoveni-hesla`), the same "call the server
API directly, not over HTTP" pattern `/api/dokonceni-registrace` already
used, which also sidesteps the origin-check entirely (no `ctx.request`
present). The token itself lives in better-auth's own `verification` table,
single-use and expiring after 1 hour (better-auth's default).

- `auth.ts`'s `emailAndPassword.sendResetPassword` callback sends the email
  via a new `sendPasswordResetEmail()` (`$lib/server/email.ts`, same
  bulletproof template as the other two) — built from `token` as a plain
  `${ORIGIN}/obnoveni-hesla/${token}` string, not the `url` better-auth hands
  the callback (which points at _its own_ redirect-helper endpoint instead of
  our page — same reasoning as the invite email's URL).
- The `user` a `sendResetPassword` callback receives is typed from the base
  schema, without `additionalFields` — `firstName`/`lastName` for the
  greeting are fetched with a direct `db` lookup by `user.id` rather than a
  cast, since that augmentation only reaches consumers of the client's
  inferred session type, not a callback inside the same config that defines
  it.
- The set-new-password endpoint runs the same `validatePassword()` complexity
  rule as the invite-completion flow before calling `auth.api.resetPassword`
  — better-auth's own endpoint only checks min/max length.
- Both the request step and better-auth's own endpoint respond identically
  whether or not the email matches an account, so the flow can't be used to
  enumerate registered addresses.
- **Invite-completion bypass fix**: better-auth's reset-password endpoint
  will happily create a credential account and let a customer sign in even
  if they never went through `/dokonceni-registrace` — it has no notion of
  our own `status`/`registeredAt` fields, so an invited customer who used
  "Zapomenuté heslo" instead of their invite link would end up fully able to
  log in while permanently stuck showing as "Pozván" everywhere in admin
  (`status` never left `'invited'`), with the original invite token still
  sitting there — completing it later would then try to create a _second_
  credential account for the same user and hit the unique `(issuer,
accountId)` index. `emailAndPassword.onPasswordReset` in `auth.ts` closes
  this: after any reset, it flips `status: 'invited'` rows to `'active'` with
  `registeredAt` set, and deletes any leftover `userInvite` row for that
  user — the same bookkeeping `completeInvite()` does, just reachable from
  either path now.

## Responsive public navbar

`$lib/components/navbar.svelte`: below the `md` breakpoint, the nav links
and login/account block are replaced by a hamburger button that opens a
`Sheet` (shadcn-svelte) sliding in from the right — vertical nav links
(active one highlighted the same way as desktop), and at the bottom either a
profile card (avatar + email in a `bg-muted` block) with an outline "Odhlásit
se" button below it, or a full-width "Přihlásit se" button when logged out.
Any link/action inside closes the sheet. Desktop (`md` and up) layout is
unchanged. The admin section didn't need equivalent work — shadcn-svelte's
`Sidebar` component already ships its own mobile Sheet fallback.

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
