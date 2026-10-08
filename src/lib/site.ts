import "server-only";
import { headers } from "next/headers";

/**
 * The public origin of the site, with no trailing slash.
 *
 * Used for search-engine and social-sharing URLs, which must be absolute. The
 * owner's own domain wins when it is set as `NEXT_PUBLIC_SITE_URL`; otherwise
 * the host of the current request is trusted (that is how Vercel and a local
 * server both get the right address without configuration).
 */
export async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host) {
    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
}

/** The canonical page URL for the landing page. */
export async function siteHomeUrl(): Promise<string> {
  return `${await siteOrigin()}/`;
}