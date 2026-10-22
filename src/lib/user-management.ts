import type { RoleLevel } from "@/generated/prisma/enums";

/**
 * Who may do what to accounts and to roles.
 *
 * The Users permission lets somebody do the day-to-day account work: add
 * people, change their details, set a password, switch a role off and on,
 * read a password back. Full access is a separate, larger step, and it stays
 * with the full-admin level:
 *
 * - only a full admin may manage an account or a role that sits at the
 *   full-admin level, so a day-to-day manager cannot edit, disable or reset
 *   the owner's account;
 * - only a full admin may hand out the full-admin level, so the same person
 *   cannot promote themselves or mint a new full admin.
 *
 * Without this, holding the Users permission was the same as holding full
 * access, one saved form away.
 */

/** Shown when somebody without full access touches an admin account. */
export const MANAGE_ADMIN_MESSAGE = "Only a full-access admin can manage an admin account.";

/** Shown when somebody without full access tries to hand out full access. */
export const ASSIGN_ADMIN_MESSAGE = "Only a full-access admin can give full access.";

/** Whether this level may manage an account or a role that sits at `level`. */
export function canManageLevel(sessionLevel: RoleLevel, level: RoleLevel): boolean {
  if (sessionLevel === "ADMIN") return true;
  return level !== "ADMIN";
}

/** Whether this level may hand out an account or a role at `level`. */
export function canAssignLevel(sessionLevel: RoleLevel, level: RoleLevel): boolean {
  if (sessionLevel === "ADMIN") return true;
  return level !== "ADMIN";
}
