# Feature: Paid Conference Streaming Access

## Summary

Streaming platform for conferences. Each conference is a live YouTube stream
during the event, and the same recording afterward. Payment happens outside
the app (accountant reconciles bank transfers and tells the admin who paid);
the admin then grants the paying customer permanent access to that specific
conference — both live, while it's happening, and as a replay afterward.
Customers register their own accounts.

## Requirements

### 1. Conference (event) management

- Admin can create a conference: `title`, `description`, `price`, `videoUrl`
  (YouTube embed URL), optional `startsAt` (informational only, shown in
  listings — does not drive status).
- Conference has a `status`: `upcoming` / `live` / `ended`, toggled manually
  by the admin (not derived from `startsAt`/`endsAt` — stream start times
  aren't reliable enough to automate this without risking showing "live"
  when nothing is actually streaming).
- `videoUrl` is a single field reused for both the live stream and the
  replay — a YouTube live stream keeps the same video ID/URL once it ends
  and archiving/saving is enabled on the YouTube side. The admin can still
  edit `videoUrl` after the conference ends (e.g. to swap in an edited cut),
  but it's optional, not a required step.
- Access to a purchased conference does not expire — once granted, it's
  permanent.

### 2. Accounts

- Customers self-register (email/password, via the existing better-auth
  setup) — no admin-created accounts.
- Admin role is a `role` column on the user, set manually in the database
  for now — no role-management UI. The app only needs to check
  `user.role === 'admin'` to gate the admin area; promoting further admins
  later is a manual DB edit, not a feature to build yet.
- `role === 'admin'` also bypasses the access-grant check entirely — an
  admin can watch any conference without needing their own grant record.
- The accountant does not get an app account. They reconcile payment
  externally and pass who-paid-for-what to the admin (email/message,
  outside the app), who enters the access grant manually.

### 3. Payment & access granting

- Payment happens outside the app; price is per individual conference (no
  bundles/subscriptions for now).
- Accountant reconciles payment externally and informs the admin who paid
  for which conference.
- Admin looks up the existing (self-registered) user by email and creates an
  `access grant` linking that user to that conference.
- Admin can also revoke an access grant (mistaken grant, refund) — deleting
  the grant immediately removes the customer's access.
- No `access grant` record for a user+conference pair means no access to
  that conference at all — enforced server-side (the page's server-side
  `load` must check the grant before ever including `videoUrl` in the
  response; the frontend player is not the security boundary).
- When an access grant is created, the customer gets an email notification
  that they now have access, sent via SMTP through an existing mailbox
  (e.g. the Active24 email account) using nodemailer — not a transactional
  email service. Needs SMTP host/port/user/password as new env vars (see
  Environment variables section of README.md).

### 4. Conference listing & playback

- All conferences are visible to everyone, logged in or not, including ones
  the visitor hasn't purchased — the listing and locked detail pages don't
  require login. Locked ones show the price and static payment/contact info
  (e.g. bank details or an email/phone to reach out to) — no "request
  access" button or in-app purchase flow, the customer reaches out outside
  the app.
- Conferences the customer has an access grant for are playable, live or as
  replay, via an embedded player (iframe), never a direct link to the
  YouTube URL.

### 5. Playback protections (deterrents, not real security)

- Right-click and text selection disabled on the player page.
- YouTube video set to Unlisted/Private with embedding restricted to the
  app's domain.
- Optional: watermark overlay with the logged-in user's email/name over the
  video, to discourage screen-recording redistribution.
- These are all deterrents on top of the real control, which is the
  server-side access-grant check in requirement 3 — none of this prevents a
  determined user from using DevTools or copying the stream URL.

## Open questions

None currently — all resolved for this iteration.

## Acceptance Criteria

- [ ] Admin can create/edit a conference with `title`, `description`,
      `price`, `videoUrl`, optional `startsAt`
- [ ] Admin can manually toggle conference status between `upcoming` /
      `live` / `ended`
- [ ] Customers can self-register and log in
- [ ] Admin can grant/revoke a specific user's access to a specific
      conference
- [ ] Admin area is gated by `user.role === 'admin'`, and an admin can play
      any conference without needing an access grant
- [ ] All conferences are listed for everyone, logged in or not; unpurchased
      ones show as locked with price/contact info
- [ ] A conference's `videoUrl` is only ever sent to the client if the
      requesting user has an access grant for it (server-side check)
- [ ] Player page disables right-click/text selection and embeds via iframe
      only, never a direct YouTube link
- [ ] Customer receives an email (via SMTP/nodemailer) when an admin grants
      them access to a conference
