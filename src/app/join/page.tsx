import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { ApplicationForm, type RoomOption } from "@/components/application-form";
import { SITE_NAV } from "@/lib/site-nav";
import { LIBRARY_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: `Apply to join — ${LIBRARY_NAME}`,
  description:
    "Apply for a seat in one place: fill your details, attach your Aadhaar, and the library owner will get back to you after reviewing your application.",
};

/** Every room that still has at least one free seat, with those seats only. */
async function getAvailableRooms(): Promise<RoomOption[]> {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        seats: {
          where: { status: "AVAILABLE" },
          select: { id: true, seatNumber: true },
        },
      },
    });

    return rooms
      .map((room) => ({
        id: room.id,
        name: room.name,
        seats: [...room.seats].sort(
          (a, b) => Number(a.seatNumber) - Number(b.seatNumber),
        ),
      }))
      .filter((room) => room.seats.length > 0);
  } catch {
    // The join page must still render if the database is briefly unreachable;
    // the form will refuse to submit without a seat and tell the applicant so.
    return [];
  }
}

export default async function JoinPage() {
  const rooms = await getAvailableRooms();

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
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to the library
            </Link>
          </div>

          <ApplicationForm className="mt-8" rooms={rooms} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}