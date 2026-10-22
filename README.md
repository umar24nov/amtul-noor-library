# Amtul Noor Library

A website and management system for **Amtul Noor Library**, a reading room in
Roorkee, Uttarakhand. It gives the library a public face on the web and gives
its staff a single place to run day-to-day operations — members, seats and
monthly fees.

Live site: [amtulnoorlibrary.site](https://amtulnoorlibrary.site)

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
- **Open a payment link** sent by the library and pay the monthly fee over UPI,
  with a digital receipt to follow.
- **View a receipt** at a private link, or ask a question through the help &
  support form.

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
- **Seats** — a visual map of the rooms. Assign a member to a free seat, release
  it, and add rooms or seats.
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
| Payments | UPI deep links with a QR fallback |
| Hosting | Vercel, with the database on Neon |

## Notes

- Admin accounts come from environment variables rather than a database table,
  so there is a single owner login.
- The public site is open to everyone; everything behind `/login` is not, and is
  checked again on each page and action by role.
- Configuration that the owner is likely to change — fees, timings, phone
  numbers, the address, the rules — lives in `src/lib/constants.ts`.
- The Users screen keeps an encrypted copy of the last password that was set
  for an account, so a full-access admin can read it back. The copy is
  encrypted with AES-256-GCM under a key derived from `PASSWORD_VAULT_SECRET`
  (falling back to `AUTH_SECRET` when that variable is not set), and the
  bcrypt hash stays the real credential. Keep the secret: change it and the
  stored copies can no longer be read, so those accounts need a new password.
- `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and
  `PASSWORD_VAULT_SECRET` are the variables the app needs. They live in `.env`
  locally and in the Vercel project settings in production; `.env` is
  gitignored and there is no template in the repo on purpose.

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
