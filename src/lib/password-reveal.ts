import "server-only";
import { decryptPassword } from "@/lib/password-vault";
import type { PasswordRevealState } from "@/lib/action-result";
import type { RoleLevel } from "@/generated/prisma/enums";

/**
 * Reading somebody's password is a bigger step than changing it, so it is
 * kept behind a narrower door: only a full-access admin can do it, never a
 * role that merely holds the Users permission.
 */

/** Shown when somebody without full access tries to read a password. */
export const REVEAL_DENIED_MESSAGE = "Only a full-access admin can read a password.";

/**
 * Shown when there is nothing to read: the password was set before this
 * feature existed, or the encryption key no longer fits the stored copy.
 */
export const REVEAL_UNAVAILABLE_MESSAGE =
  "This password cannot be read back. Passwords set before this feature were never stored, and a changed encryption key makes older ones unreadable. Set a new password instead.";

/** Whether this level may read the passwords of other accounts. */
export function canRevealPassword(level: RoleLevel): boolean {
  return level === "ADMIN";
}

/**
 * Turns a stored copy into the password, or into the reason it cannot be
 * read. Kept separate from the action so the rule can be tested on its own.
 */
export function revealPassword(ciphertext: string | null): PasswordRevealState {
  const password = decryptPassword(ciphertext);
  if (!password) {
    return { status: "error", message: REVEAL_UNAVAILABLE_MESSAGE };
  }
  return { status: "success", password };
}
