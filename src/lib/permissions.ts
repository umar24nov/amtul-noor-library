import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth";
import type { ActionState } from "@/lib/action-result";
import { errorState } from "@/lib/action-result";
import type { PermissionKey } from "@/lib/permission-defs";
import { roleCanEditPayments, roleCanViewPayments } from "@/lib/permission-defs";

export {
  DAY_TO_DAY_DEFAULTS,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  isPermissionKey,
  permissionLabel,
} from "@/lib/permission-defs";
export type { PermissionKey } from "@/lib/permission-defs";

/**
 * Whether a session may use an area.
 *
 * A full admin is always allowed everything: its permission list is not
 * consulted, so raising or lowering a level can never lock the owner out of the
 * app. Day-to-day and custom roles are allowed exactly the permissions on their
 * role, resolved from the database on every request so a change takes effect at
 * once without waiting for a fresh sign-in.
 */
export function can(session: SessionPayload, key: PermissionKey): boolean {
  if (session.level === "ADMIN") return true;
  if (session.level === "VIEW_ONLY") return session.permissions.includes(key);
  return session.permissions.includes(key);
}

/** Whether the session may reach any of the listed areas. Used where a couple of
 *  roles share an action, e.g. both members and seats can read a member. */
export function canAny(session: SessionPayload, keys: PermissionKey[]): boolean {
  return keys.some((key) => can(session, key));
}

/**
 * Whether the session may look at the payments area.
 *
 * `PAYMENTS` is the permission to record and edit payments. `PAYMENTS_VIEW` is
 * the read-only one: enough to see what has been collected and what is owed,
 * not enough to change a record. A role with the full permission can do both,
 * so it is checked first.
 */
export function canViewPayments(session: SessionPayload): boolean {
  return roleCanViewPayments(session.level, session.permissions);
}

/** Whether the session may change a payment record. */
export function canEditPayments(session: SessionPayload): boolean {
  return roleCanEditPayments(session.level, session.permissions);
}

/**
 * The session for a page, or a redirect away when the role lacks the area.
 *
 * Pages call this so a hand-typed URL cannot reach an area the role was not
 * granted; a layout's checks are not enough on their own, because a page can be
 * reached without its layout's checks running first.
 */
export async function requirePermission(key: PermissionKey): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!can(session, key)) redirect("/dashboard");
  return session;
}

/**
 * The session for a page that any one of several areas opens.
 *
 * The payments page is opened by two permissions — the one that records
 * payments and the read-only one — so the page asks for "either of these".
 */
export async function requireAnyPermission(
  keys: PermissionKey[],
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAny(session, keys)) redirect("/dashboard");
  return session;
}

/**
 * The session for a server action that needs an area, or a ready-made error.
 *
 * Actions return a message rather than redirecting, so a form that fails on
 * permission shows a note next to the button instead of bouncing the person
 * somewhere else. The nested shape lets a caller write
 * `if ("denied" in gate) return gate.denied;` and then use `gate.session`.
 */
export async function actionPermission(
  key: PermissionKey,
): Promise<{ session: SessionPayload } | { denied: ActionState }> {
  const session = await getSession();
  if (!session) return { denied: errorState("Please sign in to continue.") };
  if (!can(session, key)) return { denied: errorState("Your role does not allow this.") };
  return { session };
}
