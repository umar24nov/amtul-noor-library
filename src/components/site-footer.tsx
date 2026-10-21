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
  LIBRARY_PHONE,
  LIBRARY_PHONE_ALT,
  LIBRARY_PHONE_ALT_URL,
  LIBRARY_PHONE_URL,
  LIBRARY_TAGLINE,
  LIBRARY_WHATSAPP_URL,
} from "@/lib/constants";

export function SiteFooter() {
  // Footer links share one hover: the text darkens and a soft muted pill appears
  // behind it. No underline — at this text size an underline read as a stray rule.
  const linkClass =
    "-mx-2 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  // Contact values are already foreground coloured, so only the hover pill is
  // added here.
  const contactClass =
    "-mx-2 rounded-md px-2 py-1 text-foreground transition-colors hover:bg-muted";

  const libraryLinks = [
    { href: "/#amenities", label: "Facilities" },
    { href: "/#plans", label: "Membership & fees" },
    { href: "/#visit", label: "Visit the library" },
    { href: "/#faq", label: "FAQ" },
  ];

  const supportLinks: { href: string; label: string; external?: boolean }[] = [
    { href: "/join", label: "Apply for a seat" },
    { href: "/support", label: "Help & support" },
    { href: LIBRARY_MAPS_URL, label: "Reviews on Google Maps", external: true },
    { href: "/developer", label: "Developer" },
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

          <nav aria-label="Library">
            <h3 className="font-heading text-sm font-semibold">Library</h3>
            <ul className="mt-4 space-y-1.5 text-sm">
              {libraryLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="font-heading text-sm font-semibold">Support</h3>
            <ul className="mt-4 space-y-1.5 text-sm">
              {supportLinks.map((link) =>
                link.external ? (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className={linkClass}
                    >
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.label}>
                    <Link href={link.href} className={linkClass}>
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
                <span className="flex flex-col gap-0.5">
                  <a
                    href={LIBRARY_PHONE_URL}
                    aria-label={`Call ${LIBRARY_PHONE}`}
                    className={contactClass}
                  >
                    {LIBRARY_PHONE}
                  </a>
                  <a
                    href={LIBRARY_PHONE_ALT_URL}
                    aria-label={`Call ${LIBRARY_PHONE_ALT}`}
                    className={contactClass}
                  >
                    {LIBRARY_PHONE_ALT}
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <a href={LIBRARY_EMAIL_URL} className={contactClass}>
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
            Built by{" "}
            <Link
              href="/developer"
              className="-mx-1 rounded-md px-1 py-0.5 font-medium text-foreground transition-colors hover:bg-muted"
            >
              Mohammad Umar
            </Link>
          </p>
          <p>{LIBRARY_TAGLINE}</p>
        </div>
      </div>
    </footer>
  );
}