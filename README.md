# Amtul Noor Library

A website and management system for **Amtul Noor Library**, a reading room in
Roorkee, Uttarakhand. It gives the library a public face on the web and gives
its staff a single place to run day-to-day operations — members, seats and
monthly fees.

Live site: [amtulnoorlibrary.in](https://www.amtulnoorlibrary.in)

## What this is

The library runs on a simple monthly-fee model: a member books a seat and pays
each month to keep it. Before this project that work lived in a spreadsheet and
on paper. This app replaces both with one system that is usable by the owner and
by members themselves.

It is two things in one:

- A **public website** anyone can visit — the library's address, timings, fees,
  facilities, photos, a map, and a form to apply for a seat.
- An **admin panel** behind a login, where the library's records and payments are
  managed.

## What you can do with it

### For visitors and members

- **See the library** — what it offers, where it is, when it is open, and what a
  seat costs.
- **Apply for a membership** through the public join form, without a phone call.
- **Open your member page** from the link the library sends, confirmed with a
  one-time code emailed to you. There you can see your details, payment history
  and receipts, pay the monthly fee via NEFT/bank transfer, correct your own name
  and contact numbers, confirm a new email address, and contact the library
  directly on WhatsApp, by phone or by email.

### For the library staff

- **Dashboard** — member counts, seat usage, money collected this month, what is
  still pending and who has not paid.
- **Members** — a searchable register. Add or edit a member, view anyone's full
  payment history, and mark someone as left without losing their records.
- **Applications** — review the seat applications that come in from the public
  form, and approve or reject each one.
- **Payments** — record every payment as its own entry, filter by month, member,
  mode or status, and generate the pending rows for a month in one go. The
  filters apply the moment they are chosen, and the status filter brings a
  status to the top of the list rather than hiding the other records. A pending
  row is only generated for a month after the member joined, so a new member's
  joining month is never marked as owed; recording the payment then fills that
  month's row in instead of leaving a pending and a paid row side by side.
- **Reminders** — see who still owes a month, and reach them on WhatsApp.
- **Seats** — one visual map of seats `1`–`44`. Assign a member to a free seat,
  release it, or add a seat to the numbered list. Seats `1`–`22` are non-locker;
  seats `23`–`44` come with a locker.
- **Users** — admin accounts with role-based access, so each staff member only
  sees the areas they are given. A full-access admin can also read back the
  last password they set for an account, instead of handing out a new one every
  time they forget it.

Holding the *Users* permission does the day-to-day account work: add people,
edit their details, set a password, switch an account off and on. Full access is
a bigger step, and it stays with the admin level: only a full-access admin can
manage an admin account, give somebody the admin role, create a role at that
level, or read a password back. Without that rule, holding *Users* would be the
same as full access one saved form away.

The *View payments* permission is the read-only half of *Edit payments*:
somebody with it sees what has been collected and what is owed, and can pick a
month or bring a status to the top, but there is no button that changes a
record. The full *Edit payments* permission does both.

Members are kept forever. Marking someone as *left* frees their seat and stores
the leaving date, but their payment history stays.

## How it is built

A single Next.js application (App Router) with a PostgreSQL database.

| Layer | Choice |
| --- | --- |
| Framework | Next.js (React, TypeScript) |
| UI | Tailwind CSS with shadcn-style components |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Signed session cookie, permissions resolved per role |
| Payments | NEFT bank transfer details and member payment links |
| Storage | Vercel Blob, private store for Aadhaar scans |
| Hosting | Vercel, with the database on Neon |

## Notes

- Admin accounts are managed in the **Users** tab. The original environment
  variable pair is kept only as a break-glass login when no matching account row
  exists yet.
- The public site is open to everyone; everything behind `/login` is not, and is
  checked again on each page and action by role.
- A forgotten password is recovered at `/forgot-password`: the sign-in email gets
  a six digit code, which expires in 10 minutes, is stored only as an HMAC, and
  works once. Entering it sets a new password and signs you in. Requests are
  capped at three per email or address every 15 minutes, and five wrong codes
  burn a request, so the flow cannot be used to spray or guess codes.
- A member's `/pay/<token>` link is no longer a bearer link: opening it asks for
  a six digit code sent to the email saved in **Members**. The same rules apply —
  10 minute expiry, one use, HMAC-hashed, three requests per link or address per
  15 minutes, five wrong attempts — and these codes live in a separate table so
  they cannot reset a staff password. Verifying issues a 12 hour httpOnly cookie
  scoped to that one member and link; `/receipts/<token>` honours the same gate,
  while signed-in staff with members or payments access keep their direct links.
  A member with no email saved sees a contact-library message instead, and their
  link stays blocked until the email is added in Members. The code email keeps the
  six digits selectable in the message itself, so members can copy it without
  leaving the email; `/copy-code` remains for older messages that linked to it.
  The WhatsApp confirmation names the member and offers Cash or Online (NEFT), and
  fee reminders point to opening hours or online payment.
- The public **Members** tab opens `/member`, a standalone sign-in screen with no
  site header or footer. A member enters their member ID and saved email; if they
  match, a one-time code is sent to the saved address and verifying it opens
  `/pay/<token>/details`. The reply is generic when they do not match, so the
  form cannot be used to discover who is a member. Existing `/pay/<token>` links
  work as before and now open on details too.
- The verified `/pay/<token>` link opens a private member app with a permanent
  side navigation (a slide-over on small screens) and no public site navigation
  or footer. Details is the default page (`/pay/<token>` redirects to
  `/pay/<token>/details`); the other sections are payments (`/payments`), payment
  history (`/payments/history`), email and sign-in (`/email`), and support
  (`/support`). The details page has the library photograph as a full-bleed hero.
  A member may correct their own name, mobile and guardian contacts, but seat,
  fee, joining date, status and internal remarks stay staff-only, and no Aadhaar
  data is shown. Changing the email sends a code
  to the **new** address and only takes effect once that code is entered, so
  future sign-in codes go to an inbox the member proved they control. Sign-in
  and email-change codes share a table but use different purposes (`ACCESS` /
  `EMAIL_CHANGE`) and different HMAC prefixes, so a code for one can never be
  replayed as the other. Self-service edits require the member's own access
  cookie, not a staff session; staff use the admin Members screen. Every
  self-edit and email change is written to the member audit log. The support
  page offers WhatsApp, phone, email and the public help page.
- A monthly fee of **₹0** is allowed everywhere a fee is set — the standard fee,
  a member's own fee, and when a seat is assigned or changed — so an offer can
  make a membership free. An explicit amount (including 0) always overrides the
  seat-derived fee. A zero-fee member owes nothing: no arrears are counted and no
  fee reminders are sent, and their member page shows "no fee due" instead of
  bank details.
- Configuration that the owner is likely to change — fees, timings, phone
  numbers, the address, the rules — lives in `src/lib/constants.ts`.
- The Users screen keeps an encrypted copy of the last password that was set
  for an account, so a full-access admin can read it back. The copy is
  encrypted with AES-256-GCM under a key derived from `PASSWORD_VAULT_SECRET`
  (falling back to `AUTH_SECRET` when that variable is not set), and the
  bcrypt hash stays the real credential. Keep the secret: change it and the
  stored copies can no longer be read, so those accounts need a new password.
- `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`,
  `PASSWORD_VAULT_SECRET`, `RESEND_API_KEY` and `RESEND_FROM` are the variables
  the app needs. They live in `.env` locally and in the Vercel project settings
  in production; `.env` is gitignored and there is no template in the repo on
  purpose.
- Aadhaar scans live in a **private** Vercel Blob store, so a scan has no public
  URL and is only readable through the session-checked `/api/aadhaar/[file]`
  route. Blob fixes a store's access mode when it is created, so the old public
  store cannot be flipped in place: create a private store, connect it to the
  project, and run `npm run migrate-aadhaar-private` (add `-- --dry` first) to
  copy the existing scans across and rewrite the rows to their pathnames. Once
  the script reports no failures, delete the old public store — it holds
  nothing else. The store connection supplies `BLOB_STORE_ID` (with OIDC) or
  `BLOB_READ_WRITE_TOKEN`; `AADHAAR_BLOB_STORE_ID` and
  `AADHAAR_BLOB_READ_WRITE_TOKEN` are only needed if the scan store is not the
  one connected as the project's Blob store. `AADHAAR_BLOB_ACCESS=public` is a
  temporary fallback while the private store is being set up — do not leave it
  set.

- Database migrations are applied by the production build itself
  (`scripts/vercel-migrate.mjs`), so a deployment never runs against a schema
  it does not have. A preview build never touches the database.
- After a deploy, `npm run check-routes` asks the live site for the public
  routes and for the private ones, and fails if a private screen answers
  without a session instead of sending the visitor to the sign-in page.
- Continuous integration runs the type check, the lint and the tests on every
  push and pull request (`.github/workflows/ci.yml`).

## License

Released under the MIT License. See [LICENSE](LICENSE).
