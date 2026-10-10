export type SiteNavItem = { href: string; label: string };

/**
 * The shared page header links. Section links carry a leading slash
 * ("/#seats") so they keep working from any public page, including `/reviews`,
 * and Reviews points at the separate reviews page rather than a section on the
 * landing page.
 */
export const SITE_NAV: SiteNavItem[] = [
  { href: "/#seats", label: "Seats" },
  { href: "/#amenities", label: "Amenities" },
  { href: "/reviews", label: "Reviews" },
  { href: "/#plans", label: "Fees" },
  { href: "/#visit", label: "Visit" },
];