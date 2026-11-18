import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { ApplicationForm } from "@/components/application-form";
import { SITE_NAV } from "@/lib/site-nav";
import { LIBRARY_NAME } from "@/lib/constants";
import { listApplicationSeatOptions, type SeatOption } from "@/lib/queries";

export const metadata: Metadata = {
  title: `Apply to join — ${LIBRARY_NAME}`,
  description:
    "Apply for a seat in one place: fill your details, attach your Aadhaar, and the library owner will get back to you after reviewing your application.",
};

/**
 * Every seat, with availability but no member details.
 *
 * Taken seats are included so both maps can show them in place rather than
 * leaving gaps. If none is free the form says so and refuses to submit.
 */
async function getSeats(): Promise<SeatOption[]> {
  try {
    return await listApplicationSeatOptions();
  } catch {
    // The join page must still render if the database is briefly unreachable;
    // the form will refuse to submit without a seat and tell the applicant so.
    return [];
  }
}

const asSeatNumber = (value?: string): number | null =>
  value && /^\d+$/.test(value) ? Number(value) : null;

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ seat?: string }>;
}) {
  const [seats, params] = await Promise.all([getSeats(), searchParams]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Apply online
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Apply for a seat
              </h1>
              <p className="mt-2 max-w-prose text-muted-foreground">
                Fill this once and the library owner will review your application
                and get back to you. Your Aadhaar scan is only used to confirm
                your identity.
              </p>
            </div>
            <Link
              href="/"
              className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to the library
            </Link>
          </div>

          <ApplicationForm
            className="mt-8"
            seats={seats}
            defaultSeatNumber={asSeatNumber(params.seat)}
          />
        </section>
      </main>
    </div>
  );
}