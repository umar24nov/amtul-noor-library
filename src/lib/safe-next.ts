/**
 * Only same-origin paths may be used as a post-login destination.
 *
 * `next` arrives from a URL query string, so checking that it merely starts
 * with "/" is not enough: browsers treat a backslash as a slash in special
 * URLs and would resolve "/\\evil.com" to a different host. Parsing the value
 * against a fixed base and comparing origins closes that gap.
 */
const UNSAFE_PATH = /[\\\u0000-\u001f\u007f]/;
const BASE_ORIGIN = "https://same-origin.invalid";

export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (UNSAFE_PATH.test(value)) return fallback;

  try {
    const url = new URL(value, BASE_ORIGIN);
    if (url.origin !== BASE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
