import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { LIBRARY_NAME } from "@/lib/constants";
import { HERO_PHOTO } from "@/lib/photos";

/** One colour language across every page of the member area. */
export const tones = {
  indigo:
    "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
  emerald:
    "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  amber:
    "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  sky: "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
  rose: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
} as const;

export type Tone = keyof typeof tones;

export function Accent({
  icon: Icon,
  tone,
  size = "md",
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl ring-1",
        size === "lg" ? "size-11" : "size-9",
        tones[tone],
      )}
      aria-hidden="true"
    >
      <Icon className={size === "lg" ? "size-5" : "size-4"} />
    </span>
  );
}

export function SectionHeading({
  icon,
  tone,
  title,
  description,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Accent icon={icon} tone={tone} size="lg" />
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/** The consistent title block used at the top of every inner member page. */
export function PageIntro({
  icon,
  tone,
  eyebrow,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  tone: Tone;
  eyebrow: string;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        <Accent icon={icon} tone={tone} size="lg" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon,
  tone,
  label,
  value,
  hint,
  href,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint: string;
  href?: string;
}) {
  const body = (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <Accent icon={icon} tone={tone} />
        {href && <ArrowUpRight className="size-4 text-muted-foreground/60" aria-hidden="true" />}
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className="font-heading mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums"
        title={value}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );

  const className =
    "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-950/5";

  return href ? (
    <Link href={href} className={cn(className, "block")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** A large, tappable destination on the member home page. */
export function PortalTile({
  href,
  icon,
  tone,
  title,
  description,
  meta,
}: {
  href: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl hover:shadow-slate-950/5"
    >
      <div
        className={cn(
          "absolute -right-10 -top-10 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          tones[tone].split(" ")[0],
        )}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <Accent icon={icon} tone={tone} size="lg" />
          <ArrowUpRight
            className="size-4 text-muted-foreground/50 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
        <h3 className="font-heading mt-5 text-base font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {meta}
        </p>
      </div>
    </Link>
  );
}

export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

/**
 * The member-area hero. The library photograph is a full-bleed background with
 * two gradients: one keeps the copy readable, the other gives the lower edge a
 * natural fade into the page. The result feels like a private club poster rather
 * than another admin card.
 */
export function PortalHero({
  name,
  memberId,
  seatLabel,
  joined,
  staffAllowed,
}: {
  name: string;
  memberId: string;
  seatLabel: string;
  joined: string;
  staffAllowed: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.7)]">
      <Image
        src={`/images/${HERO_PHOTO.src}`}
        alt={HERO_PHOTO.alt}
        fill
        priority
        sizes="(min-width: 1024px) 1120px, 100vw"
        className="object-cover object-[center_42%] opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
      <div
        className="absolute -right-24 -top-24 size-80 rounded-full bg-emerald-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative flex min-h-[19rem] flex-col justify-between gap-8 p-6 text-white sm:min-h-[21rem] sm:p-9 lg:p-11">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-white/90 backdrop-blur-md">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            MEMBERS ONLY · {memberId}
          </span>
          {staffAllowed && (
            <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1.5 text-[11px] font-semibold text-amber-100 backdrop-blur-md">
              Staff preview
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-7">
          <div className="min-w-0 max-w-2xl">
            <p className="text-sm font-medium text-emerald-300">Welcome back</p>
            <h1 className="font-heading mt-1 break-words text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              {name}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              Your seat, your payments, your details — neatly organised. Choose a section below to
              see the full story.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-xs text-white/60">
              <MapPin className="size-3.5" aria-hidden="true" />
              {LIBRARY_NAME} · Roorkee
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white/90 backdrop-blur-md">
              <ShieldCheck className="size-3.5" />
              Seat {seatLabel}
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs text-white/90 backdrop-blur-md">
              Since {joined}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The member area owns its own frame. The public landing header and footer are
 * deliberately absent so a private page never looks like a marketing page with
 * a form slid into it.
 */
export function PayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      {children}
    </div>
  );
}
