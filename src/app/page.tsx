import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  BookOpen,
  Clock,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Plug,
  Share2,
  Snowflake,
  VolumeOff,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing-header";
import { SeatMap, type SeatMapSeat } from "@/components/seat-map";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAV } from "@/lib/site-nav";
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
  LIBRARY_PREPAID_FULL_PRICES,
  LIBRARY_PREPAID_OFFER,
  LIBRARY_PREPAID_PRICES,
  LIBRARY_TAGLINE,
  LIBRARY_WHATSAPP_URL,
} from "@/lib/constants";
import { formatINR, formatNumber } from "@/lib/format";
import { HERO_PHOTO, GALLERY_PHOTOS } from "@/lib/photos";
import { listPublicOccupancy, type PublicRoomOccupancy } from "@/lib/queries";
import { layoutForRoom } from "@/lib/seat-layouts";
import { siteHomeUrl, siteOrigin } from "@/lib/site";
import { JoinForm } from "@/components/join-form";
import { whatsappShareUrl } from "@/lib/whatsapp";

/**
 * Landing page metadata.
 *
 * Absolute because the root layout appends the site name to every title, and
 * "Amtul Noor Library · Amtul Noor Library" helps nobody. Everything a social
 * network shows for a shared link lives here too.
 */
export async function generateMetadata(): Promise<Metadata> {
  const origin = await siteOrigin();
  const title = LIBRARY_NAME;
  const description = `${LIBRARY_NAME} — ${LIBRARY_TAGLINE}. A quiet study room in Roorkee with allocated seats, a personal locker in one room, and monthly membership from ${formatINR(LIBRARY_FEES.seat)}.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${origin}/` },
    openGraph: {
      type: "website",
      url: `${origin}/`,
      siteName: LIBRARY_NAME,
      title,
      description,
      images: [
        {
          url: `${origin}/images/hero.jpg`,
          width: HERO_PHOTO.width,
          height: HERO_PHOTO.height,
          alt: HERO_PHOTO.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/images/hero.jpg`],
    },
  };
}

/**
 * The landing page metadata and schema are built from the same facts. Search
 * engines read the JSON-LD block to describe the library in local results;
 * the `generateMetadata` above covers social links.
 */
function librarySchema(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Library",
    name: LIBRARY_NAME,
    description: LIBRARY_TAGLINE,
    url: `${origin}/`,
    image: `${origin}/images/hero.jpg`,
    telephone: `+91${LIBRARY_PHONE}`,
    priceRange: `₹${LIBRARY_FEES.seat}+`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Rampur Chungi, Eidgah Enclave, Farukh Colony",
      addressLocality: "Roorkee",
      addressRegion: "Uttarakhand",
      postalCode: "247667",
      addressCountry: "IN",
    },
    openingHours: "Mo-Su 07:00-24:00",
  };
}

const NAV = SITE_NAV;

/**
 * The public face of the library.
 *
 * Reachable without signing in, which is why the proxy lets `/` through.
 * Signed-in members can return here too, because the name in the dashboard
 * links back to this page.
 */
export default async function LandingPage() {
  // Occupancy is advertised as live, so it is read fresh. A database that is
  // briefly unreachable must not take the whole page down with it, so this
  // falls back to no numbers rather than to an error.
  let rooms: PublicRoomOccupancy[] = [];
  try {
    rooms = await listPublicOccupancy();
  } catch {
    rooms = [];
  }

  const [origin, homeUrl] = await Promise.all([siteOrigin(), siteHomeUrl()]);

  const totals = rooms.reduce(
    (sum, room) => ({
      seats: sum.seats + room.total,
      open: sum.open + room.open,
    }),
    { seats: 0, open: 0 },
  );

  const shareHref = whatsappShareUrl(`${LIBRARY_NAME} — ${LIBRARY_TAGLINE}`, homeUrl);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(librarySchema(origin)) }}
      />
      <LandingHeader items={NAV} />
      <LiveBar rooms={rooms} />

      <main id="main" className="flex-1">
        <Hero totals={totals} roomCount={rooms.length} shareHref={shareHref} />
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

/** One line of live numbers, the way the mockup's status strip worked. */
function LiveBar({ rooms }: { rooms: PublicRoomOccupancy[] }) {
  if (rooms.length === 0) return null;
  const withSeats = rooms.filter((room) => room.total > 0);
  if (withSeats.length === 0) return null;
  const open = withSeats.reduce((sum, room) => sum + room.open, 0);

  return (
    <div className="border-b border-border bg-muted/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-xs text-muted-foreground sm:px-6">
        <p className="flex items-center gap-2">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
          </span>
          <span className="font-medium text-foreground">Seats available now:</span>
          <span>{open} open</span>
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
  shareHref,
}: {
  totals: { seats: number; open: number };
  roomCount: number;
  shareHref: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {LIBRARY_TAGLINE}
          </p>

          <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            <span className="block">A Quiet Place to Study.</span>
            <span className="block">A Better Way to Succeed.</span>
          </h1>

          <p className="mt-4 max-w-prose text-base leading-relaxed text-muted-foreground">
            {LIBRARY_NAME} is a peaceful reading room in Roorkee, designed for
            students and anyone who needs a quiet, comfortable space to focus on
            their studies or work. Every member gets their own reserved study
            seat, along with Wi-Fi, charging facilities, and a distraction-free
            environment.
          </p>

          <p className="mt-4 max-w-prose font-semibold text-foreground">
            Simple monthly fees. No hidden charges. Just a peaceful place to
            focus, learn, and move closer to your goals.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-11 px-5">
              <Link href="/join">
                Apply to join
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <a href={LIBRARY_WHATSAPP_URL} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                Ask about a seat
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-11 px-5">
              <Link href="#plans">
                See membership plans
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-11 px-5">
              <a href={shareHref} target="_blank" rel="noreferrer">
                <Share2 className="size-4" />
                Send to a friend
              </a>
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

  const totals = withSeats.reduce(
    (sum, room) => ({ seats: sum.seats + room.total, open: sum.open + room.open }),
    { seats: 0, open: 0 },
  );

  return (
    <section id="seats" className="border-y border-border bg-muted/40 px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Check seat availability
            </h2>
            <p className="mt-2 max-w-prose text-muted-foreground">
              {totals.open} of {totals.seats} seats free right now. Tap a free
              seat to apply for it, or ask on WhatsApp before you set off.
            </p>
          </div>
          <ul className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-emerald-600/40 bg-emerald-500" />
              Available
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border border-border bg-muted-foreground/40" />
              Booked
            </li>
          </ul>
        </div>

        {/* Side by side from `md`, not just `lg`, so the maps stay short on a
            laptop whose window is narrower than the `lg` breakpoint. */}
        <div className="grid gap-6 md:grid-cols-2">
          {withSeats.map((room) => {
            const layout = layoutForRoom(room.name);
            const seats: SeatMapSeat[] = room.seats.map((seat) => ({
              number: Number(seat.seatNumber),
              status: seat.occupied ? "OCCUPIED" : "AVAILABLE",
            }));

            return (
              <div
                key={room.id}
                className="flex flex-col rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <p className="text-center text-sm text-muted-foreground">
                  {room.open} free of {room.total}
                </p>

                {layout ? (
                  <SeatMap
                    layout={layout}
                    seats={seats}
                    seatHrefTemplate={`/join?room=${room.id}&seat={seat}`}
                    ariaLabel={`${room.name} seat map. ${room.open} of ${room.total} seats free.`}
                    className="mx-auto mt-3 w-full max-w-lg"
                  />
                ) : (
                  <ul className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-8">
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
                )}
              </div>
            );
          })}
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
}[] = [
  {
    icon: Wifi,
    title: "High-Speed Wi-Fi",
    body: "Reliable high-speed internet for lectures, research, and online preparation.",
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
    icon: Snowflake,
    title: "Fully Air Conditioned",
    body: "The whole reading room is fully air conditioned, so it stays comfortable even in the hottest months.",
  },
  {
    icon: Plug,
    title: "Charging Points",
    body: "A socket for your own plug at the place you sit, rather than one socket the whole room has to queue for.",
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
              className="rounded-xl border border-border bg-card p-5"
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

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PriceCard
            name="Regular Seat"
            price={LIBRARY_FEES.seat}
            unit="/ month"
            points={[
              "Your own reserved study seat for as long as your membership continues.",
              "Access to the library during opening hours.",
              "Free Wi-Fi and charging facilities.",
              "A quiet and comfortable environment for focused study.",
            ]}
          />
          <PriceCard
            name="Seat with Locker"
            price={LIBRARY_FEES.seatWithLocker}
            unit="/ month"
            points={[
              "Includes all the benefits of a regular seat.",
              "A personal locker to keep your books and study materials safely at the library.",
              "Available only in rooms with lockers.",
              "Contact us on WhatsApp to ask about locker availability and choose your preferred room.",
            ]}
            highlighted
          />
          <PriceCard
            name={`${LIBRARY_PREPAID_OFFER.totalMonths} Months for the Price of ${LIBRARY_PREPAID_OFFER.paidMonths}`}
            price={LIBRARY_PREPAID_PRICES.seat}
            unit={`/ ${LIBRARY_PREPAID_OFFER.totalMonths} months`}
            points={[
              `Pay for ${LIBRARY_PREPAID_OFFER.paidMonths} months. Get the ${LIBRARY_PREPAID_OFFER.totalMonths}th FREE.`,
              <>
                Regular Seat: {formatINR(LIBRARY_PREPAID_PRICES.seat)}{" "}
                <s className="opacity-70">{formatINR(LIBRARY_PREPAID_FULL_PRICES.seat)}</s> —
                save{" "}
                {formatINR(
                  LIBRARY_PREPAID_FULL_PRICES.seat - LIBRARY_PREPAID_PRICES.seat,
                )}
              </>,
              <>
                Seat with Locker:{" "}
                {formatINR(LIBRARY_PREPAID_PRICES.seatWithLocker)}{" "}
                <s className="opacity-70">
                  {formatINR(LIBRARY_PREPAID_FULL_PRICES.seatWithLocker)}
                </s>{" "}
                — save{" "}
                {formatINR(
                  LIBRARY_PREPAID_FULL_PRICES.seatWithLocker -
                    LIBRARY_PREPAID_PRICES.seatWithLocker,
                )}
              </>,
              `Your selected seat stays reserved for all ${LIBRARY_PREPAID_OFFER.totalMonths} months.`,
            ]}
          />
        </ul>

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
  points: ReactNode[];
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
      <ul className="mt-5 flex-1 space-y-2.5 border-t border-border pt-5 text-sm text-muted-foreground">
        {points.map((point, index) => (
          <li key={index} className="flex gap-2">
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
      <div className="mx-auto grid w-full max-w-6xl gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="flex flex-col rounded-2xl border border-border bg-muted/40 p-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Visit Amtul Noor Library
          </h2>
          <p className="mt-2 max-w-prose text-muted-foreground">
            Find the location, check opening hours, and contact us about
            membership.
          </p>

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
              <a href={LIBRARY_PHONE_URL}>
                <Phone className="size-4" />
                Call now
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-5">
              <Link href={LIBRARY_MAPS_URL} target="_blank" rel="noreferrer">
                <MapPin className="size-4" />
                Get directions
              </Link>
            </Button>
          </div>
        </div>

        <a
          href={LIBRARY_MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="relative block min-h-64 overflow-hidden rounded-2xl border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-80 lg:min-h-0"
          aria-label={`Open ${LIBRARY_NAME} in Google Maps`}
        >
          <iframe
            src={embedSrc}
            title={`Map showing ${LIBRARY_NAME}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        </a>

        <JoinForm />

        <div
          id="faq"
          className="scroll-mt-16 rounded-2xl border border-border bg-muted/40 p-6"
        >
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Frequently asked questions
          </h3>
          <dl className="mt-3 divide-y divide-border text-sm">
            {FAQ.map((item) => (
              <div key={item.q} className="py-3 first:pt-0 last:pb-0">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-1 text-muted-foreground">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}