import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import {
  LIBRARY_ADDRESS,
  LIBRARY_EMAIL,
  LIBRARY_EMAIL_URL,
  LIBRARY_HOURS,
  LIBRARY_HOURS_DAYS,
  LIBRARY_MAPS_URL,
  LIBRARY_NAME,
  LIBRARY_PHONE,
  LIBRARY_PHONE_ALT,
  LIBRARY_PHONE_ALT_URL,
  LIBRARY_PHONE_URL,
  LIBRARY_TAGLINE,
  LIBRARY_WHATSAPP_URL,
} from "@/lib/constants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  const productLinks = [
    { href: "/#amenities", label: "Features" },
    { href: "/#plans", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ];

  const companyLinks: { href: string; label: string; external?: boolean }[] = [
    { href: "/#visit", label: "Contact" },
    { href: "/support", label: "Help & support" },
    { href: LIBRARY_MAPS_URL, label: "Reviews on Google Maps", external: true },
  ];

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-4">
            <Brand />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              A quiet reading room in Roorkee with your own reserved seat, free
              Wi-Fi and charging — on one simple monthly fee.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={LIBRARY_WHATSAPP_URL} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Ask about a seat
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={LIBRARY_MAPS_URL} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" aria-hidden="true" />
                  Visit us
                </Link>
              </Button>
            </div>
          </div>

          <nav aria-label="Product">
            <h3 className="font-heading text-sm font-semibold">Product</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Company">
            <h3 className="font-heading text-sm font-semibold">Company</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {companyLinks.map((link) =>
                link.external ? (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          <div>
            <h3 className="font-heading text-sm font-semibold">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="flex flex-col gap-1">
                  <a
                    href={LIBRARY_PHONE_URL}
                    aria-label={`Call ${LIBRARY_PHONE}`}
                    className="text-foreground underline underline-offset-4"
                  >
                    {LIBRARY_PHONE}
                  </a>
                  <a
                    href={LIBRARY_PHONE_ALT_URL}
                    aria-label={`Call ${LIBRARY_PHONE_ALT}`}
                    className="text-foreground underline underline-offset-4"
                  >
                    {LIBRARY_PHONE_ALT}
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a
                  href={LIBRARY_EMAIL_URL}
                  className="text-foreground underline underline-offset-4"
                >
                  {LIBRARY_EMAIL}
                </a>
              </li>
              <li className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {LIBRARY_HOURS} · {LIBRARY_HOURS_DAYS.toLowerCase()}
                </span>
              </li>
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{LIBRARY_ADDRESS}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>
            &copy; {year} {LIBRARY_NAME} · {LIBRARY_ADDRESS}
          </p>
          <p>{LIBRARY_TAGLINE}</p>
        </div>
      </div>
    </footer>
  );
}