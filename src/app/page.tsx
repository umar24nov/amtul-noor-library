import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Images, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/auth";
import {
  LIBRARY_ADDRESS,
  LIBRARY_MAPS_URL,
  LIBRARY_NAME,
  LIBRARY_TAGLINE,
} from "@/lib/constants";
import { GALLERY_PHOTOS, HERO_PHOTO } from "@/lib/photos";

export const metadata: Metadata = {
  // Absolute, because the root layout appends the site name to every title and
  // "Amtul Noor Library · Amtul Noor Library" helps nobody.
  title: { absolute: LIBRARY_NAME },
  description: `${LIBRARY_NAME} — ${LIBRARY_TAGLINE}. A quiet place to read, study and borrow, with monthly memberships and allocated seating.`,
};

/**
 * The public face of the library.
 *
 * Reachable without signing in, which is why the proxy lets `/` through. Anyone
 * already signed in is sent straight to the dashboard instead, so the owner
 * never has to click through a page they have no use for.
 */
export default async function LandingPage() {
  if (await getSession()) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />
        <Gallery />
        <FindUs />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="min-w-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Brand compact />
        </Link>
        <Button asChild size="lg" className="h-10">
          <Link href="/login">
            Owner login
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-4 sm:px-6 sm:pt-16">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="size-4" aria-hidden="true" />
            {LIBRARY_TAGLINE}
          </p>
          <h1 className="font-heading mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {LIBRARY_NAME}
          </h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
            A quiet place to read, study and spend time with books. Members get an
            allocated seat, a monthly membership, and a library that keeps track of
            the details for them.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-5">
              <Link href="/login">
                Owner login
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href="#photos">
                <Images className="size-4" />
                See inside
              </Link>
            </Button>
          </div>
        </div>

        {/* The owner chose this picture, so it is the one that leads. */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
          <Image
            src={`/images/${HERO_PHOTO.src}`}
            alt={HERO_PHOTO.alt}
            width={HERO_PHOTO.width}
            height={HERO_PHOTO.height}
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section id="photos" className="scroll-mt-16 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Inside the library
        </h2>
        <p className="mt-2 max-w-prose text-muted-foreground">
          The reading room, the shelves, and the seats that members use every day.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GALLERY_PHOTOS.map((photo) => (
            <li
              key={photo.src}
              className="relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              <Image
                src={`/images/${photo.src}`}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FindUs() {
  // The embed takes the written address, because the Embed API would otherwise
  // need a key. The tap target is the owner's short link, which lands on the
  // exact pin rather than on a search for the street.
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${LIBRARY_NAME}, ${LIBRARY_ADDRESS}`,
  )}&z=16&output=embed`;

  return (
    <section id="find-us" className="scroll-mt-16 border-t border-border bg-muted/40 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Find us
          </h2>
          <p className="mt-3 flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{LIBRARY_ADDRESS}</span>
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Tap the map to open directions in Google Maps.
          </p>
          <Button asChild variant="outline" size="lg" className="mt-6 h-11 px-5">
            <Link href={LIBRARY_MAPS_URL} target="_blank" rel="noreferrer">
              <MapPin className="size-4" />
              Open in Google Maps
            </Link>
          </Button>
        </div>

        <a
          href={LIBRARY_MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-2xl border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label={`Open ${LIBRARY_NAME} in Google Maps`}
        >
          <iframe
            src={embedSrc}
            title={`Map showing ${LIBRARY_NAME}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-72 w-full border-0 sm:h-80 lg:h-96"
          />
        </a>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Owner login
          </Link>
        </div>
      </div>
      <p className="mx-auto mt-6 w-full max-w-6xl text-xs text-muted-foreground">
        {LIBRARY_ADDRESS}
      </p>
    </footer>
  );
}