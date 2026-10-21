import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Keeps a copy of the last password the owner handed out, so they can read it
 * back when they forget what they gave someone.
 *
 * The bcrypt hash in `User.passwordHash` stays the real credential and is
 * never reversible. This is a second, encrypted copy of the plain text, used
 * only for the "show me the password I set" button on the Users screen. It is
 * encrypted with AES-256-GCM under a key derived from `AUTH_SECRET` (the same
 * secret that signs the session cookie), so the ciphertext is useless on its
 * own and no new environment variable is needed.
 *
 * Changing `AUTH_SECRET` changes the key, so passwords saved before that
 * change can no longer be read. `decryptPassword` returns null in that case
 * and the screen asks for a new password instead of failing.
 */

/** Bumped if the format ever changes, so old payloads are rejected cleanly. */
const VAULT_VERSION = "v1";

/** Separates this key from any other key derived from the same secret. */
const KEY_INFO = "amtul-noor-library:password-vault:v1";

/** 12 bytes, the size GCM expects for a fresh nonce. */
const IV_BYTES = 12;

function vaultKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters.");
  }
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(secret, "utf8"),
      Buffer.alloc(0),
      Buffer.from(KEY_INFO, "utf8"),
      32,
    ),
  );
}

/**
 * Encrypts a plain password for storage.
 *
 * The result is `v1.<iv>.<tag>.<ciphertext>`, each part base64, so the whole
 * thing is one printable string that fits in a text column.
 */
export function encryptPassword(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VAULT_VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    data.toString("base64"),
  ].join(".");
}

/**
 * Reads a stored password back, or null when it cannot be read: nothing was
 * saved, the payload is from an older format, or the key has changed.
 */
export function decryptPassword(payload: string | null): string | null {
  if (!payload) return null;

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VAULT_VERSION) return null;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      vaultKey(),
      Buffer.from(parts[1], "base64"),
    );
    decipher.setAuthTag(Buffer.from(parts[2], "base64"));
    const data = Buffer.concat([
      decipher.update(Buffer.from(parts[3], "base64")),
      decipher.final(),
    ]);
    return data.toString("utf8");
  } catch {
    // Wrong key or damaged payload. The caller asks for a new password.
    return null;
  }
}
