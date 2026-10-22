import type { Permission } from "@/generated/prisma/enums";

/**
 * The permission keys, labels and groups.
 *
 * Kept free of any server-only imports so the sidebar (a client component) and
 * the role editor can share the same list as the server. The checks that use
 * them live in `permissions.ts`, which is server-only.
 */

/** Every area a role can be granted, in the order the owner sees them. */
export const PERMISSION_KEYS = [
  "MEMBERS",
  "APPLICATIONS",
  "PAYMENTS",
  "PAYMENTS_VIEW",
  "REMINDERS",
  "SEATS",
  "REPORTS",
  "SETTINGS",
  "USERS",
] as const satisfies readonly Permission[];

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * The tick lists on the role editor, grouped so the owner reads them by job
 * rather than as one long column. Every permission appears in exactly one group.
 */
export const PERMISSION_GROUPS: {
  title: string;
  description: string;
  options: { key: PermissionKey; label: string; hint: string }[];
}[] = [
  {
    title: "Library",
    description: "The everyday running of the library.",
    options: [
      { key: "MEMBERS", label: "Members", hint: "Add members and change their details" },
      { key: "APPLICATIONS", label: "Applications", hint: "Approve or reject join requests" },
      { key: "REMINDERS", label: "Reminders", hint: "Send fee reminders to members" },
      { key: "SEATS", label: "Seats", hint: "Assign and release seats" },
    ],
  },
  {
    title: "Money",
    description: "What the library collects.",
    options: [
      { key: "PAYMENTS", label: "Payments", hint: "Record and edit payments" },
      {
        key: "PAYMENTS_VIEW",
        label: "View payments",
        hint: "See the payments and dues without changing them",
      },
      { key: "REPORTS", label: "Reports", hint: "See totals and export sheets" },
    ],
  },
  {
    title: "Administration",
    description: "Sensitive settings and access.",
    options: [
      { key: "SETTINGS", label: "Settings", hint: "The monthly fee and pending rows" },
      { key: "USERS", label: "Users", hint: "Manage accounts and roles" },
    ],
  },
];

/** The permissions a day-to-day role gets by default, so a new role starts from
 *  the usual library work and the owner only has to remove what it should not do. */
export const DAY_TO_DAY_DEFAULTS: PermissionKey[] = [
  "MEMBERS",
  "APPLICATIONS",
  "PAYMENTS",
  "REMINDERS",
  "SEATS",
  "REPORTS",
];

export function permissionLabel(key: PermissionKey): string {
  for (const group of PERMISSION_GROUPS) {
    const match = group.options.find((option) => option.key === key);
    if (match) return match.label;
  }
  return key;
}

/** Narrows an unknown value (from a form or the DB) to a real permission key. */
export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && (PERMISSION_KEYS as readonly string[]).includes(value);
}

/** The permissions a role actually has. A full admin has every one, so callers
 *  only ever deal with one list rather than a level plus a list. */
export function effectivePermissions(
  level: "ADMIN" | "DAY_TO_DAY",
  permissions: readonly Permission[],
): PermissionKey[] {
  if (level === "ADMIN") return [...PERMISSION_KEYS];
  return PERMISSION_KEYS.filter((key) => permissions.includes(key));
}

/**
 * The two rules that separate looking at the payments from changing them.
 *
 * `PAYMENTS` opens the area and allows changes. `PAYMENTS_VIEW` opens it for
 * looking only: what has been collected and what is owed, with nothing to
 * change. A full admin may always do both.
 */
export function roleCanViewPayments(
  level: "ADMIN" | "DAY_TO_DAY",
  permissions: readonly Permission[],
): boolean {
  if (level === "ADMIN") return true;
  return permissions.includes("PAYMENTS") || permissions.includes("PAYMENTS_VIEW");
}

export function roleCanEditPayments(
  level: "ADMIN" | "DAY_TO_DAY",
  permissions: readonly Permission[],
): boolean {
  if (level === "ADMIN") return true;
  return permissions.includes("PAYMENTS");
}
