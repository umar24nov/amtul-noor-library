# Amtul Noor Library

Library management app for Amtul Noor Library: members, monthly payments and seat allocation.

## What it does

- **Dashboard** — member counts, seat usage, money collected for the current month, pending payments and who has not paid yet.
- **Members** — searchable, paginated list that can be ordered eight ways (active first, name A-Z or Z-A, seat number, oldest or newest joining date, member ID, recently updated), and narrowed by status and by room (including members who are not sitting in any seat). Add/edit a member, view one member with their full payment history, and mark a member as left.
- **Payments** — every payment is its own row, so several payments in one month are kept and nothing is overwritten. Filter by month, member, mode or status. You can also generate the pending rows for a month in one go.
- **Seats** — a visual map of the rooms. Assign a member to a free seat, release a seat, add rooms or seats, and rename a room without disturbing its seats or members.

Members are permanent records. Marking someone as left keeps their payment history, releases their seat and stores the leaving date.

### Months are derived, not hardcoded

Every month dropdown is built from the data: the oldest payment or joining date sets the floor, the newest payment or leaving date sets the ceiling, and both ends are padded (`MONTH_PAD_BACK` and `MONTH_PAD_FORWARD` in `src/lib/constants.ts`). With the padding in place the pickers currently run from `2024-06` to `2029-10`, so a future month can be recorded or viewed without editing any code, and the list keeps growing as history is added. `monthWindow()` caps the result at `MAX_MONTH_WINDOW` months so bad data cannot build an unbounded list, and the fallback used when a caller has no data-derived list comes from the same helper, so the two can never disagree.


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