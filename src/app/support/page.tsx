import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, HelpCircle, Mail, MapPin, Phone } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { SupportForm } from "@/components/support-form";
import { SITE_NAV } from "@/lib/site-nav";
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
} from "@/lib/constants";

export const metadata: Metadata = {
  title: `Help & support — ${LIBRARY_NAME}`,
  description:
    "Ask a question, report a problem with the website, or send a note to the library. Fill in the form and we will reply by email.",
};

/**
 * The public help & support page.
 *
 * Reachable without signing in, which is why the proxy lets `/support` through.
 * It exists so the footer's "Help & support" link opens a real page with a form
 * rather than dropping the visitor into WhatsApp.
 */
export default function SupportPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <HelpCircle className="size-3.5" aria-hidden="true" />
                Help &amp; support
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                How can we help?
              </h1>
              <p className="mt-2 max-w-prose text-muted-foreground">
                Ask a question, report a problem with the website, or send us a
                note. Fill in the form and we will reply to your email address.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to the library
            </Link>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-10">
            <div className="space-y-6">
              <div>
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Prefer to talk to us?
                </h2>
                <dl className="mt-4 space-y-4 text-sm">
                  <div className="flex gap-3">
                    <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="font-medium">Call</dt>
                      <dd className="flex flex-wrap gap-x-3 gap-y-1">
                        <a
                          href={LIBRARY_PHONE_URL}
                          className="text-foreground underline underline-offset-4"
                        >
                          {LIBRARY_PHONE}
                        </a>
                        <a
                          href={LIBRARY_PHONE_ALT_URL}
                          className="text-foreground underline underline-offset-4"
                        >
                          {LIBRARY_PHONE_ALT}
                        </a>
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="font-medium">Email</dt>
                      <dd>
                        <a
                          href={LIBRARY_EMAIL_URL}
                          className="text-foreground underline underline-offset-4"
                        >
                          {LIBRARY_EMAIL}
                        </a>
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="font-medium">When</dt>
                      <dd className="text-muted-foreground">
                        {LIBRARY_HOURS} · {LIBRARY_HOURS_DAYS}
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <dt className="font-medium">Where</dt>
                      <dd className="text-muted-foreground">
                        <a
                          href={LIBRARY_MAPS_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-4 hover:text-foreground"
                        >
                          {LIBRARY_ADDRESS}
                        </a>
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <p className="text-xs text-muted-foreground">
                Messages sent here are also emailed to the library, so we see
                them even if we are not at the desk.
              </p>
            </div>

            <SupportForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
