/**
 * Prints a bcrypt hash for a plain text password, ready to paste into .env as
 * ADMIN_PASSWORD_HASH.
 *
 *   npm run hash-password -- "your-password"
 *
 * The backslashes matter: Next.js expands $VAR inside .env values, so a raw
 * bcrypt hash would be silently emptied and login would always fail.
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your-password"');
  process.exit(1);
}

if (password.length < 8) {
  console.error("Use a password of at least 8 characters.");
  process.exit(1);
}

console.log(`ADMIN_PASSWORD_HASH=${bcrypt.hashSync(password, 10).replaceAll("$", "\\$")}`);