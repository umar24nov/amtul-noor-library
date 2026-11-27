/**
 * The site's own address, shared by metadata and by request-generated links.
 *
 * `NEXT_PUBLIC_SITE_URL` still wins when set. Otherwise production uses the
 * owner's real domain, so a missing request header can never put localhost in
 * a sitemap, canonical tag or welcome email. Local development keeps its usual
 * localhost address.
 */

export const PRODUCTION_SITE_ORIGIN = "https://www.amtulnoorlibrary.in";
export const LOCAL_SITE_ORIGIN = "http://localhost:3000";

export function configuredSiteOrigin(
  environment: string | undefined = process.env.NODE_ENV,
): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  return environment === "production" ? PRODUCTION_SITE_ORIGIN : LOCAL_SITE_ORIGIN;
}
