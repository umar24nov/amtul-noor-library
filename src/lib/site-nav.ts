export type SiteNavItem = { href: string; label: string };

/**
 * The shared page header links. Section links carry a leading slash
 * ("/#seats") so they keep working from any public page. Reviews deliberately
 * have no nav entry: the Google listing is the single source of truth for them
 * and is linked from the footer instead.
 */
export const SITE_NAV: SiteNavItem[] = [
  { href: "/#seats", label: "Seats" },
  { href: "/#amenities", label: "Amenities" },
  { href: "/#plans", label: "Fees" },
  { href: "/#visit", label: "Visit" },
];
