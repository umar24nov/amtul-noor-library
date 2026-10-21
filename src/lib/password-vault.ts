import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Keeps a copy of the last password the owner handed out, so they can read it
 * back when they forget what they gave someone.
 *
 * The bcrypt hash in `User.passwordHash` stays the real credential and is
 * never reversible. This is a second, encrypted copy of the plain text, used
 * only for the "show me the password I set" button on the Users screen. It is
 * encrypted with AES-256-GCM under a key derived from `PASSWORD_VAULT_SECRET`,
 * a secret of its own so the session secret (`AUTH_SECRET`) can be rotated
 * without making the stored copies unreadable. With no vault secret set, the
 * key is derived from `AUTH_SECRET` instead, so an existing installation keeps
 * working.
 *
 * The key is derived with HKDF, so it cannot be recovered from the ciphertext.
 * Changing either secret makes the copies unreadable; `decryptPassword`
 * returns null in that case and the screen asks for a new password instead of
 * failing.
 */

/** Bumped if the format ever changes, so old payloads are rejected cleanly. */
const VAULT_VERSION = "v1";

/** Separates this key from any other key derived from the same secret. */
const KEY_INFO = "amtul-noor-library:password-vault:v1";

/** 12 bytes, the size GCM expects for a fresh nonce. */
const IV_BYTES = 12;

/** The shortest secret worth deriving a key from. */
const MIN_SECRET_LENGTH = 32;

function deriveKey(secret: string): Buffer {
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
 * The keys the vault can use, best first.
 *
 * The dedicated vault secret comes first, so new copies are written with it.
 * The session secret stays as a second choice: it reads copies that were
 * written before the vault secret was added, which is what makes adding the
 * secret to a live site safe.
 */
function vaultKeys(): Buffer[] {
  const keys: Buffer[] = [];
  for (const secret of [process.env.PASSWORD_VAULT_SECRET, process.env.AUTH_SECRET]) {
    const trimmed = secret?.trim();
    if (!trimmed || trimmed.length < MIN_SECRET_LENGTH) continue;
    const key = deriveKey(trimmed);
    if (!keys.some((existing) => existing.equals(key))) keys.push(key);
  }
  if (keys.length === 0) {
    throw new Error(
      "PASSWORD_VAULT_SECRET must be set to a random string of at least 32 characters.",
    );
  }
  return keys;
}

/**
 * Encrypts a plain password for storage.
 *
 * The result is `v1.<iv>.<tag>.<ciphertext>`, each part base64, so the whole
 * thing is one printable string that fits in a text column.
 */
export function encryptPassword(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", vaultKeys()[0], iv);
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
 * saved, the payload is from an older format, or no key fits it.
 */
export function decryptPassword(payload: string | null): string | null {
  if (!payload) return null;

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VAULT_VERSION) return null;

  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const data = Buffer.from(parts[3], "base64");

  for (const key of vaultKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(data), decipher.final()]);
      return plain.toString("utf8");
    } catch {
      // This key does not fit. Try the next one.
    }
  }
  return null;
}
