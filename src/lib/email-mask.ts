/** Shows just enough of an address to confirm which inbox received a code. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1) return "your email";
  return `${email[0]}***@${email.slice(at + 1)}`;
}
