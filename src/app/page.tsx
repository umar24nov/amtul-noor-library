import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Armchair,
  BookOpen,
  CalendarDays,
  Clock,
  DoorOpen,
  Droplets,
  Lock,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  Plug,
  Sparkles,
  VolumeOff,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";
import { getSession } from "@/lib/auth";
import {
  LIBRARY_ADDRESS,
  LIBRARY_FEES,
  LIBRARY_HOURS,
  LIBRARY_HOURS_DAYS,
  LIBRARY_MAPS_URL,
  LIBRARY_NAME,
  LIBRARY_PHONE,
  LIBRARY_PHONE_ALT,
  LIBRARY_PHONE_ALT_URL,
  LIBRARY_PHONE_URL,
  LIBRARY_PREPAID_OFFER,
  LIBRARY_PREPAID_PRICE,
  LIBRARY_TAGLINE,
  LIBRARY_WHATSAPP_URL,
} from "@/lib/constants";
import { formatINR, formatNumber } from "@/lib/format";
import { GALLERY_PHOTOS, HERO_PHOTO } from "@/lib/photos";
import { listPublicOccupancy, type PublicRoomOccupancy } from "@/lib/queries";

export const metadata: Metadata = {
  // Absolute, because the root layout appends the site name to every title and
  // "Amtul Noor Library · Amtul Noor Library" helps nobody.
  title: { absolute: LIBRARY_NAME },
  description: `${LIBRARY_NAME} — ${LIBRARY_TAGLINE}. A quiet study room in Roorkee with allocated seats, a personal locker in one room, and monthly membership from ${formatINR(LIBRARY_FEES.seat)}.`,
};

const NAV = [
  { href: "#seats", label: "Seats" },
  { href: "#amenities", label: "Amenities" },
  { href: "#plans", label: "Fees" },
  { href: "#visit", label: "Visit" },
];

/**
 * The public face of the library.
 *
 * Reachable without signing in, which is why the proxy lets `/` through.
 * Anyone already signed in is sent straight to the dashboard, so the owner
 * never has to click through a page they have no use for.
 */
export default async function LandingPage() {
  if (await getSession()) redirect("/dashboard");

  // Occupancy is advertised as live, so it is read fresh. A database that is
  // briefly unreachable must not take the whole page down with it, so this
  // falls back to no numbers rather than to an error.
  let rooms: PublicRoomOccupancy[] = [];
  try {
    rooms = await listPublicOccupancy();
  } catch {
    rooms = [];
  }

  const totals = rooms.reduce(
    (sum, room) => ({
      seats: sum.seats + room.total,
      open: sum.open + room.open,
    }),
    { seats: 0, open: 0 },
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <LiveBar rooms={rooms} />

      <main id="main" className="flex-1">
        <Hero totals={totals} roomCount={rooms.length} />
        <SeatStatus rooms={rooms} />
        <Gallery />
        <Amenities />
        <Fees />
        <Visit />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="min-w-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Brand compact />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* The only login link on the page. */}
        <Button asChild size="lg" className="h-9 shrink-0">
          <Link href="/login">Login</Link>
        </Button>
      </div>
    </header>
  );
}

/** One line of live numbers, the way the mockup's status strip worked. */
function LiveBar({ rooms }: { rooms: PublicRoomOccupancy[] }) {
  if (rooms.length === 0) return null;
  const withSeats = rooms.filter((room) => room.total > 0);
  if (withSeats.length === 0) return null;

  return (
    <div className="border-b border-border bg-muted/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <p className="flex items-center gap-2">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
          </span>
          <span className="font-medium text-foreground">Seats available now:</span>
          {withSeats.map((room) => (
            <span key={room.id}>
              {room.name} — {room.open} open
            </span>
          ))}
        </p>
        <p className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          <span>
            {LIBRARY_HOURS} · {LIBRARY_HOURS_DAYS}
          </span>
        </p>
      </div>
    </div>
  );
}

function Hero({
  totals,
  roomCount,
}: {
  totals: { seats: number; open: number };
  roomCount: number;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {LIBRARY_TAGLINE}
          </p>

          <h1 className="font-heading mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            A quiet room to read, study and get on with it.
          </h1>

          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
            {LIBRARY_NAME} is a small reading room in Roorkee for students and
            anyone who needs somewhere to sit and work without interruptions. Every
            member is given their own seat, and the fee is one fixed monthly amount
            with nothing else to pay.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-5">
              <a href={LIBRARY_WHATSAPP_URL} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                Ask about a seat
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href="#plans">
                See fees
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          {/* The mockup had a row of figures here. These are read from the
              database rather than written into the page, so they cannot drift
              away from what is actually true of the room. */}
          {totals.seats > 0 && (
            <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              <Metric label="Seats" value={formatNumber(totals.seats)} />
              <Metric label="Free right now" value={formatNumber(totals.open)} />
              <Metric label="Reading rooms" value={formatNumber(roomCount)} />
              <Metric label="Open daily" value={LIBRARY_HOURS} />
            </dl>
          )}
        </div>

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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-heading mt-0.5 text-lg font-semibold">{value}</dd>
    </div>
  );
}

/**
 * The seat map, driven by the same rows the owner manages.
 *
 * Only seat numbers and whether they are taken are read, so nothing about who
 * sits where is published. If the database cannot be reached the section hides
 * itself rather than showing an empty grid.
 */
function SeatStatus({ rooms }: { rooms: PublicRoomOccupancy[] }) {
  const withSeats = rooms.filter((room) => room.total > 0);
  if (withSeats.length === 0) return null;

  return (
    <section id="seats" className="border-y border-border bg-muted/40 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Which seats are free
            </h2>
            <p className="mt-2 max-w-prose text-muted-foreground">
              Taken at the moment. Seats change through the day, so ask on WhatsApp
              before you set off.
            </p>
          </div>
          <ul className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-border bg-muted-foreground/70" />
              Occupied
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-emerald-600/40 bg-emerald-500/15" />
              Free
            </li>
          </ul>
        </div>

        <div className="space-y-8">
          {withSeats.map((room) => (
            <div key={room.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-heading text-lg font-semibold">{room.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {room.open} free of {room.total}
                </p>
              </div>
              <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {room.seats.map((seat) => (
                  <li
                    key={seat.id}
                    className={
                      seat.occupied
                        ? "rounded-md border border-border bg-muted-foreground/70 px-2 py-2.5 text-center font-mono text-xs text-background"
                        : "rounded-md border border-emerald-600/40 bg-emerald-500/15 px-2 py-2.5 text-center font-mono text-xs font-medium text-emerald-800 dark:text-emerald-300"
                    }
                  >
                    {seat.seatNumber}
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
          The reading room as it is.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
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
                sizes="(min-width: 640px) 33vw, 100vw"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const AMENITIES: {
  icon: LucideIcon;
  title: string;
  body: string;
  wide?: boolean;
}[] = [
  {
    icon: Wifi,
    title: "High-Speed Wi-Fi",
    body: "Reliable high-speed internet for lectures, research, and online preparation. And both the girls' and the boys' rooms get it.",
  },
  {
    icon: Lock,
    title: "Personal Locker",
    body: "Your own locker for books, notes, and study essentials. Lockers are in one room and carry a small extra charge.",
  },
  {
    icon: Armchair,
    title: "Comfortable Seating",
    body: "Proper chairs and a desk to work at, lit so that reading and screen work are both comfortable.",
  },
  {
    icon: VolumeOff,
    title: "Quiet Environment",
    body: "Calls and group conversation do not happen here. What you get is an hour or three of not being interrupted.",
  },
  {
    icon: DoorOpen,
    title: "Separate Study Rooms",
    body: "Dedicated study spaces for girls and boys, so everyone can study at ease.",
  },
  {
    icon: Plug,
    title: "Charging Points",
    body: "A socket for your own plug at the place you sit, rather than one socket the whole room has to queue for.",
  },
  {
    icon: Droplets,
    title: "Drinking Water",
    body: "Clean drinking water and washrooms on site, so a break does not mean leaving.",
  },
  {
    icon: Sparkles,
    title: "Clean & Hygienic",
    body: "A well-maintained and clean environment for your daily study routine.",
  },
  {
    icon: Maximize2,
    title: "Spacious Study Area",
    body: "Plenty of room to study and prepare without feeling crowded.",
  },
  {
    icon: CalendarDays,
    title: "Open All Days",
    body: `Study any day of the week, ${LIBRARY_HOURS}.`,
    wide: true,
  },
];

function Amenities() {
  return (
    <section id="amenities" className="scroll-mt-16 border-t border-border px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          What you get
        </h2>
        <p className="mt-2 max-w-prose text-muted-foreground">
          What the room has, and nothing beyond it.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.map((amenity) => (
            <li
              key={amenity.title}
              className={`rounded-xl border border-border bg-card p-5 ${amenity.wide ? "lg:col-span-3" : ""}`}
            >
              <amenity.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-heading mt-3 font-semibold">{amenity.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {amenity.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Fees() {
  return (
    <section id="plans" className="scroll-mt-16 border-t border-border bg-muted/40 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            What it costs
          </h2>
          <p className="mt-2 max-w-prose text-muted-foreground">
            One monthly fee, no deposit and no joining charge.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          <PriceCard
            name="A seat"
            price={LIBRARY_FEES.seat}
            unit="per month"
            points={[
              "Your own seat, yours for as long as you are a member",
              "Reading room access during opening hours",
              "Wi-Fi and power at the desk",
              "Quiet study conditions",
            ]}
          />
          <PriceCard
            name="A seat with a locker"
            price={LIBRARY_FEES.seatWithLocker}
            unit="per month"
            points={[
              "Everything in the plain seat",
              `A personal locker, so books stay overnight`,
              "Only available in the room that has lockers",
              "Tell us on WhatsApp which room you want",
            ]}
            highlighted
          />
        </ul>

        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-heading font-semibold">
                Pay for {LIBRARY_PREPAID_OFFER.paidMonths} months, get{" "}
                {LIBRARY_PREPAID_OFFER.totalMonths}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay for three months in one go and the fourth is free, so it works out
                at {formatINR(LIBRARY_PREPAID_PRICE / LIBRARY_PREPAID_OFFER.totalMonths)} a
                month for the plain seat.
              </p>
            </div>
            <p className="shrink-0 font-heading text-2xl font-semibold">
              {formatINR(LIBRARY_PREPAID_PRICE)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {LIBRARY_PREPAID_OFFER.totalMonths} months
              </span>
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          To join, message us on{" "}
          <a
            href={LIBRARY_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            WhatsApp
          </a>{" "}
          and we will show you around and take the first month.
        </p>
      </div>
    </section>
  );
}

function PriceCard({
  name,
  price,
  unit,
  points,
  highlighted = false,
}: {
  name: string;
  price: number;
  unit: string;
  points: string[];
  highlighted?: boolean;
}) {
  return (
    <li
      className={
        highlighted
          ? "flex flex-col rounded-xl border-2 border-foreground bg-card p-6"
          : "flex flex-col rounded-xl border border-border bg-card p-6"
      }
    >
      <h3 className="font-heading text-lg font-semibold">{name}</h3>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="font-heading text-3xl font-semibold">{formatINR(price)}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </p>
      <ul className="mt-5 space-y-2.5 border-t border-border pt-5 text-sm text-muted-foreground">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="text-foreground">
              &middot;
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

const FAQ = [
  {
    q: "Can I move to a different seat later?",
    a: "Usually yes. Seats come free as people leave, and we can move you. Ask at the desk or on WhatsApp.",
  },
  {
    q: "What happens if I go away for a while?",
    a: "Tell us and we will pause your seat and hold your record. Your place in the room and your payment history are kept for you, so coming back is just a message away.",
  },
  {
    q: "Is the fee really the same every month?",
    a: "Yes. The monthly fee does not change, and there is nothing else to pay. The only difference between the two options is a locker.",
  },
];

function Visit() {
  // The embed takes the written address, because the Embed API would otherwise
  // need a key. The tap target is the owner's short link, which lands on the
  // exact pin rather than on a search for the street.
  const embedSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${LIBRARY_NAME}, ${LIBRARY_ADDRESS}`,
  )}&z=16&output=embed`;

  return (
    <section id="visit" className="scroll-mt-16 border-t border-border px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Come and see it
          </h2>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <dt className="font-medium">Where</dt>
                <dd className="text-muted-foreground">{LIBRARY_ADDRESS}</dd>
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
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 px-5">
              <a href={LIBRARY_WHATSAPP_URL} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                Message on WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href={LIBRARY_MAPS_URL} target="_blank" rel="noreferrer">
                <MapPin className="size-4" />
                Directions
              </Link>
            </Button>
          </div>

          <div className="mt-8 space-y-4 border-t border-border pt-6">
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Common questions
            </h3>
            <dl className="space-y-4 text-sm">
              {FAQ.map((item) => (
                <div key={item.q}>
                  <dt className="font-medium">{item.q}</dt>
                  <dd className="mt-1 text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
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
            className="h-64 w-full border-0 sm:h-80 lg:h-full lg:min-h-96"
          />
        </a>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <Brand />
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-6 w-full max-w-6xl text-xs text-muted-foreground">
        {LIBRARY_ADDRESS} · {LIBRARY_HOURS}, {LIBRARY_HOURS_DAYS.toLowerCase()}
      </p>
    </footer>
  );
}