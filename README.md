# Amtul Noor Library

Library management app for Amtul Noor Library: members, monthly payments and seat allocation.

## What it does

- **Dashboard** — member counts, seat usage, money collected for the current month, pending payments and who has not paid yet.
- **Members** — searchable, paginated list that can be ordered eight ways (active first, name A-Z or Z-A, seat number, oldest or newest joining date, member ID, recently updated), and narrowed by status and by room (including members who are not sitting in any seat). Add/edit a member, view one member with their full payment history, and mark a member as left.
- **Payments** — every payment is its own row, so several payments in one month are kept and nothing is overwritten. Filter by month, member, mode or status. You can also generate the pending rows for a month in one go.
- **Seats** — a visual map of the rooms. Assign a member to a free seat, release a seat, add rooms or seats, and rename a room without disturbing its seats or members.

Members are permanent records. Marking someone as left keeps their payment history, releases their seat and stores the leaving date.

### Lists scroll, they do not page

The members and payments lists have no Next/Previous buttons. The column headers stay pinned to the top of the screen while you scroll, and reaching the bottom fetches the next batch and appends it, so a long list reads as one continuous table. `LoadMoreFooter` runs an `IntersectionObserver` on a sentinel and starts the next fetch before the sentinel is actually visible; the Load more button is there as a keyboard and no-observer fallback.

Two things make the pinned header work, and both are easy to break by accident:

- **No clipping ancestor.** `position: sticky` follows the viewport only while no ancestor sets `overflow-hidden`, `overflow-auto` or `overflow-scroll`. Any one of those turns that box into a scroll container and the header sticks to it instead, which looks exactly like the feature not working. This is why the table wrappers carry a plain `rounded-xl border` and no `overflow-hidden`, and why the payments results `Card` passes `overflow-visible` to undo the `overflow-hidden` on `Card` itself.
- **An opaque background.** The header cells use solid `bg-muted`, not `bg-muted/50`, so rows do not show through them as they pass underneath. Below the `lg` breakpoint the app has a 56px top bar, so the header parks at `top-14` there and `top-0` from `lg` up. Both live in `STICKY_HEADER_CELL` in `src/lib/constants.ts`.

Changing any filter re-renders the page, and the table is keyed on the filter values, so a fresh list starts from the first batch rather than appending rows that no longer match. Because the visible rows are only a prefix of the result set, the payments headline count and total come from a `COUNT` and a `SUM` over the same filters, so they describe the whole month rather than whatever has been scrolled into view.

### Months are derived, not hardcoded

Every month picker is built from the data: the oldest payment or joining date sets the floor, the newest payment or leaving date sets the ceiling, and both ends are padded (`MONTH_PAD_BACK` and `MONTH_PAD_FORWARD` in `src/lib/constants.ts`). `monthWindow()` caps the result at `MAX_MONTH_WINDOW` months so bad data cannot build an unbounded list, and the fallback used when a caller has no data-derived list comes from the same helper, so the two can never disagree.

There is no list to maintain by hand. Recording a payment in a new month extends the range on its own, because the range is read from the data rather than stored.

### Two month ranges, on purpose

Browsing and recording want opposite things, so they are padded differently:

| | Padding ahead | Why |
| --- | --- | --- |
| Filters (dashboard, payments) | `MONTH_FILTER_PAD_FORWARD` (3) | A filter is for looking at months that have records. A long tail of empty future months only makes it harder to use. |
| Forms that record a payment | `MONTH_PAD_FORWARD` (36) | A fee for next month has to be enterable before that month arrives. |

Both come from the same `listSelectableMonths`, which takes the padding as an argument. Keep them separate when adding a month picker: a form that writes should be given `listSelectableMonthOptions()`, which keeps the full padding.

### The month filter is a stepper, not a dropdown

The filters show `‹ October 2026 ›`. The arrows step one month at a time, and tapping the name opens a year strip above a twelve-month grid, so any month is two taps away no matter how long the range grows. Months outside the range are disabled rather than hidden, which is what shows you where the edges are.

Every control in it is a real submit button carrying `name="month"`. That matters for two reasons: the surrounding GET form submits its other fields at the same time, so switching month never resets the room or scope next to it, and the arrows still work with scripting unavailable. Only the grid needs JavaScript, and it closes on outside click or `Escape`.

### Rooms filter more than the members list

`src/lib/room-filter.ts` owns the `?room=` filter so every page reads it the same way, including the fallback when a room id in the URL no longer points at a real room. On the dashboard the room narrows **everything** — headcount, seats, collection and pending totals — because picking a room means "show me this room", and cards showing all-rooms figures next to a room dropdown would contradict the choice. The scope dropdown is different: it only filters the table, so the collection figures stay whole. The dashboard has no "No seat" option, since a room of members without seats has no seats to count.


### The fee is due on one day every month

The dashboard has a **Fee Due** card showing the date the selected month's fee falls due, plus how long that is: `Due in 5 days`, `Due today`, `Overdue by 3 days`, or `Was due 12 days ago` once you are looking at a month that has finished. A past month reads as history rather than as a permanent overdue warning, because the number it would show could never change.

The day is set once, from the **Due day** button on the dashboard, and applies to every month. It is a `Setting` row like the fee itself (`monthlyFeeDueDay`, default the 10th), read through `getMonthlyFeeDueDay()` in `src/lib/settings.ts`.

Two details worth knowing before changing it:

- The day is **clamped to the length of the month**, so a due day of 31 shows the 28th or 29th in February rather than rolling forward into March and quietly reporting the wrong month. `monthDueDate()` in `src/lib/format.ts` does this.
- The card is only informational. It does **not** change when a payment counts as pending: that still comes from `deriveMonthStatus` and the payment records, so adding a due day never retroactively marks anyone overdue.

## Local development

There is no need to install PostgreSQL or Docker. `npm run db:local` starts a PostgreSQL that ships inside `node_modules`, and stores its data in `.local-db/`.

```bash
npm install
cp .env.example .env
npm run db:local start      # leave this running in its own terminal
```

`db:local start` prints the connection string to use. Put that in `.env` as `DATABASE_URL`, then:

```bash
npm run db:deploy           # create the tables
npm run import              # load Library.xlsx
npm run check-data          # print a summary to verify the import
npm run dev
```

Sign in at http://localhost:3000 with the `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` from `.env`.
Two terminals are needed: one for `npm run db:local start`, one for `npm run dev`. If
login is rejected, run `npm run check-login`, and if the pages show an error run
`npm run smoke`.

To stop the database use `npm run db:local stop` in another terminal. To stop only the
dev server on Windows use `npm run stop-dev`, which leaves the database running.

## When something is wrong

| Symptom | Cause and fix |
| --- | --- |
| Login always says the details are wrong | The password hash was emptied. Next.js expands `$VAR` in `.env`, so each `$` must be written as `\$`. Run `npm run check-login`, then `npm run hash-password -- "your-password"` |
| A page says "Cannot reach the database" | The database is not running. Start it with `npm run db:local start` |
| `Another next dev server is already running` | A previous dev server is still up. On Windows run `npm run stop-dev` |
| `port 54329 is already in use` | Something else holds the port, or the database is already running. `npm run db:local stop` then start it again |
| A raw stack trace appears | Read the terminal running `npm run dev`; that is where the real cause is printed |

## Importing the Excel register

```bash
npm run import                       # import Library.xlsx from this folder or one level up
npm run import -- other.xlsx         # import a different file
npx tsx prisma/import-excel.ts --force   # replace everything that is already there
```

`Sheet1` is the member register and is the only sheet that is read. Each month column
holds a payment mode in one cell and an amount in the next, and each one becomes a
separate `Payment` row. `Sheet2` and `Sheet3` are deliberately ignored.

The import prints everything it could not decide for you:

- **Seat conflicts** — two active members claim the same seat. The first one keeps it.
- **Duplicate mobile numbers** — both members are kept, since they may really be two people.
- **Notes** — missing joining dates, and payments that fall before a joining date.

Room 1 is created with 22 seats. Amounts of `0` with a mode of `Offer` are recorded as a
paid zero.

## Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:local start` / `stop` | The development PostgreSQL |
| `npm run db:migrate` | Create and apply a migration after changing the schema |
| `npm run db:deploy` | Apply existing migrations |
| `npm run db:studio` | Browse the data |
| `npm run import` | Import the Excel register |
| `npm run check-data` | Summary and consistency check |
| `npm run hash-password -- "secret"` | Print an `ADMIN_PASSWORD_HASH` line, ready to paste |
| `npm run check-login` | Check that the login settings in `.env` are usable |
| `npm run smoke` | Sign in for real and load every page, needs a running dev server. Asks for the admin password unless `TEST_ADMIN_PASSWORD` is set |
| `npm run dev-token` | Print a session cookie, for local smoke testing only |
| `npm run clear-lockout` | Reset the login rate limiter after too many failed attempts |

## Login security

Five failed sign-ins for the same account or IP address within 15 minutes
locks further attempts for the rest of that window, including attempts with the
correct password. Failures are counted in the database, because serverless
instances do not share memory and an in-process counter would reset on every
request. A successful sign-in clears the counter, so a few typos are harmless.

If the limiter ever locks you out of the deployed site, point `DATABASE_URL` at
the production database and run `npm run clear-lockout`.

## Deploying

The app needs two things: somewhere to run the Next.js server, and a real
PostgreSQL database. The bundled database in `npm run db:local` is for local
development only, it is a single process on your own machine.

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | The production PostgreSQL connection string, use the pooled one |
| `AUTH_SECRET` | Long random string used to sign the session cookie |
| `ADMIN_EMAIL` | Admin login |
| `ADMIN_PASSWORD_HASH` | bcrypt hash, generate with `npm run hash-password` |

### Vercel and Neon, step by step

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech) and copy
   both connection strings it shows: the **pooled** one and the **direct** one.
2. Import the repo into Vercel. The build command stays `npm run build`, and
   `prisma generate` runs automatically on install.
3. Add the four environment variables above in the Vercel dashboard. For
   `DATABASE_URL` use the **pooled** string, because a serverless function opens
   a new connection per request and would otherwise run out of connections.
4. Run the migrations once against the **direct** string, from your machine:

   ```bash
   $env:DATABASE_URL="<the direct string>"; npm run db:deploy
   ```

   To keep both strings in a gitignored `.env.neon` instead of retyping them,
   run `powershell -ExecutionPolicy Bypass -File scripts/save-neon-urls.ps1`. It
   asks for each string, checks you have not pasted the same one twice, and
   writes `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` to that file. To use
   the direct one for a migration:

   ```bash
   $env:DATABASE_URL=(Get-Content .env.neon | Select-String '^DIRECT_DATABASE_URL=') -replace '^DIRECT_DATABASE_URL="','' -replace '"$',''; npm run db:deploy
   ```

5. Load the register once, the same way:

   ```bash
   npm run import
   ```

6. Deploy. Sign in with your admin email and password.

### The one thing that catches people

Next.js expands `$VAR` inside `.env` **files**, which is why the local `.env`
needs every `$` in the bcrypt hash written as `\$`. Cloud hosts pass the value
straight to the app with no expansion, so in the Vercel dashboard the plain form
`$2b$10$...` is the right one. Use whichever your host gives you literally:
`verifyCredentials` accepts the escaped, unescaped and quoted forms, and prints
a clear message in the server log if the hash arrives mangled.

If you run `vercel env pull` to work against the production settings locally,
you get a `.env` file with the unescaped hash in it, which Next.js will then
expand. Re-escape it with `npm run hash-password`, or set the hash through your
own `.env` instead.

### Other hosts

Any host that runs Next.js works: the build is `npm run build` and the start is
`npm run start`, with `npm run db:deploy` as the release step. Make sure
`prisma generate` runs after `npm install` (it does, through `postinstall`), and
that `DATABASE_URL` points at a pooler. Railway, Render and Fly.io all have a
PostgreSQL option on the free tier.

## Notes

- Admin accounts come from environment variables, not a database table, so there is only
  ever one login.
- Routes are protected in `src/proxy.ts` (Next.js 16 renamed `middleware` to `proxy`) and
  again in the app layout.