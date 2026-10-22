<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Security notes

What is already in place, so it is not re-litigated as a gap. Each item names
the file that holds it, because most of these are easy to undo by accident.

## Authentication and authorization

- Sessions are a signed JWT cookie (`jose`, 12h) but the identity is **re-read
  from the database on every request** (`src/lib/auth.ts`). A role change or a
  deactivated account takes effect on the next request, not at token expiry.
  Do not move permissions into the token; that reintroduces the stale-token
  window this was written to close.
- Passwords are bcrypt hashes from an env var (`ADMIN_PASSWORD_HASH`), never in
  the repo.
- The Users screen can show the last password the owner handed out
  (`src/lib/password-vault.ts`). That is a **second, reversible** copy of the
  plain password, encrypted with AES-256-GCM under a key derived from
  `PASSWORD_VAULT_SECRET` (falling back to `AUTH_SECRET` when that variable is
  not set, which is what keeps older copies readable); the bcrypt hash stays
  the real credential. The copy is written whenever a password is set, read
  only through the `revealUserPasswordAction` server action (which needs the
  Users permission **and** a full-access admin, `canRevealPassword` in
  `src/lib/password-reveal.ts`, and writes a `PASSWORD_VIEWED` entry to the
  activity log), and it is unreadable after the secret it was written with
  changes. Do not log the plain password, and do not put it in a URL, a query
  string, or a page prop.
- Migrations run from the production build (`scripts/vercel-migrate.mjs`),
  before `next build`, so the code never reaches the database ahead of the
  schema. A preview build must not migrate: the guard is `VERCEL_ENV`, and
  changing it needs a thought.
- Authorization is a per-role permission list (`src/lib/permission-defs.ts`)
  checked on the server in three places, and all three matter: the sidebar only
  *hides* links, it is not a control. Pages call `requirePermission`, server
  actions call `actionPermission`, and the export/receipt routes call
  `requireExport`. A new action must add its own check.
- The Users permission is not full access. `src/lib/user-management.ts` holds
  the two rules that keep it from being: `canManageLevel` (only a full admin
  may manage an admin account or an admin-level role) and `canAssignLevel`
  (only a full admin may hand out the admin level, for an account or a role).
  The account actions (`src/app/(app)/users/actions.ts`) and the role actions
  (`src/app/(app)/users/role-actions.ts`) call both, and the Users page hides
  the roles panel and the admin role from anybody without full access. The
  check is on the server, because the screen is only the visible part.
- The Payments area has two permissions: `PAYMENTS` (record and edit) and
  `PAYMENTS_VIEW` (look only). The read-only rules live in
  `src/lib/permission-defs.ts` (`roleCanViewPayments`, `roleCanEditPayments`)
  so the server check and the hidden buttons cannot drift apart. A viewer may
  open the payments page, scroll the list, pick a month, bring a status to the
  top and download a receipt; every write action still asks for `PAYMENTS`.
  A nav link or tab may list more than one permission (`NAV_ITEMS`,
  `PAYMENT_TABS`), and the filter is "any of them".
- A pending row is only generated for a month **after** the member joined
  (`src/lib/payments.ts`: `firstPendingMonth`, `pendingDueDate`), and it is
  dated on the joining day. Recording a payment fills that month's placeholder
  in instead of adding a second row, so a month never shows a pending and a
  paid row together (`src/app/(app)/payments/actions.ts`). The status filter
  on the payments screen **prioritises** a status, it does not filter rows
  out (`prioritiseStatus` in `src/lib/payments.ts`).
- A real `CSP` is deliberately absent (`next.config.ts` explains why: Aadhaar
  scans are embedded from Vercel Blob in an iframe). The other headers are set.

## Input, uploads, abuse

- Every form and action validates with Zod (`src/lib/validators.ts`). React
  escapes all rendered output; the only `dangerouslySetInnerHTML` is a JSON-LD
  block built from trusted local data. Emails HTML-escape their fields
  (`application-email.ts`, `support-email.ts`).
- Aadhaar scans are checked by **content, not name**: `sniffType` in
  `src/lib/aadhaar-storage.ts` reads the leading bytes (JPEG `FF D8 FF`, PNG
  `89 50 4E 47`, PDF `%PDF`) and rejects anything whose contents do not match
  its extension. Keep this ahead of the Blob write; a renamed file would
  otherwise be stored and served. Size is capped at 3 MB per scan, and the
  action body limit is raised to 12 MB for that reason (`next.config.ts`).
- Sign-in failures are rate limited by email **and** IP
  (`src/lib/login-rate-limit.ts`), reused by the join and support forms. The
  limiter fails *open* on a database error so the owner is never locked out by
  it.
- Public, unauthenticated links use unguessable tokens, not row ids:
  `/pay/[payToken]` and `/receipts/[receiptToken]`. Member pages (`/members/[id]`)
  are sequential ids, which is fine — they sit behind the MEMBERS permission and
  every member is visible to anyone who holds it.

## Dependencies

- `.env*` is gitignored. The tracked `.env.example` was removed on purpose, so
  no template values sit in the repo; the variables the app needs are listed
  in `src/lib/prisma.ts` and in the README.
- Spreadsheets are written with `exceljs` (`src/lib/export-workbook.ts`); the
  old `xlsx` dependency and its one-off import script were removed.
- The handful of Radix state variants the UI primitives need (`data-open`,
  `data-closed`, `data-checked`, and friends) live in `src/app/globals.css`.
  They used to be imported from the `shadcn` CLI package; inlining them removed
  that dependency and its audit advisories.
- `npm audit` still reports high advisories in `eslint-config-next`, which is
  build-time tooling and not reachable at runtime. `npm audit fix` cannot clear
  them.
