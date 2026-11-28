import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { LIBRARY_NAME } from "@/lib/constants";

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
 * The member-area welcome hero. A quiet, text-free library photograph stays
 * behind a warm ivory wash in light mode and a navy wash in dark mode. Every
 * word sits on a solid card, so the picture sets the mood without competing
 * with the member's details.
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
    <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-[#E6DCC8] bg-[#F6F1E7] shadow-[0_20px_60px_-32px_rgba(16,43,70,0.45)] dark:border-[#17324D] dark:bg-[#06182B] dark:shadow-[0_24px_65px_-30px_rgba(0,0,0,0.85)]">
      <Image
        src="/images/member-details-light.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 1120px, 100vw"
        className="object-cover object-center dark:hidden"
      />
      <Image
        src="/images/member-details-dark.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 1120px, 100vw"
        className="hidden object-cover dark:block"
      />
      <div
        className="absolute right-8 top-8 hidden size-24 rounded-full border border-[#C79A4A]/30 sm:block"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C79A4A]/50 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex min-h-[20rem] flex-col justify-between gap-8 p-5 sm:min-h-[22rem] sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#DCE6DE] bg-white/95 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#102B46] shadow-sm dark:border-[#24445F] dark:bg-[#0B233A]/95 dark:text-[#E2E8F0]">
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="break-words">MEMBERS ONLY · {memberId}</span>
          </span>
          {staffAllowed && (
            <span className="rounded-full border border-[#D8B46A]/60 bg-[#FBF4E3]/95 px-3 py-1.5 text-[11px] font-semibold text-[#7A5716] dark:border-[#C79A4A]/50 dark:bg-[#0B233A]/95 dark:text-[#E7C87D]">
              Staff preview
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="relative min-w-0 max-w-2xl overflow-hidden rounded-3xl border border-[#E6DCC8] bg-white p-5 shadow-[0_18px_50px_-28px_rgba(16,43,70,0.55)] dark:border-[#24445F] dark:bg-[#102B46] dark:shadow-[0_20px_55px_-25px_rgba(0,0,0,0.85)] sm:p-6 lg:p-7">
            <span
              className="absolute left-0 top-7 h-10 w-1 rounded-r-full bg-[#C79A4A]/85"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Welcome back
            </p>
            <h1 className="font-heading mt-1 break-words text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-[#102B46] dark:text-[#F8FAFC]">
              {name}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#475569] dark:text-[#CBD5E1] sm:text-base">
              Your seat, your payments, your details — neatly organised. Choose a section below to
              see the full story.
            </p>
            <p className="mt-5 inline-flex max-w-full items-start gap-2 text-xs text-[#64748B] dark:text-[#CBD5E1]">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="break-words">{LIBRARY_NAME} · Roorkee</span>
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2.5 lg:w-auto lg:justify-end">
            <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/95 px-3.5 py-2 text-xs font-medium text-[#102B46] shadow-sm dark:border-[#24445F] dark:bg-[#0B233A]/95 dark:text-[#E2E8F0]">
              <ShieldCheck
                className="size-3.5 shrink-0 text-[#B98B33] dark:text-[#E7C87D]"
                aria-hidden="true"
              />
              <span className="break-words">Seat {seatLabel}</span>
            </span>
            <span className="inline-flex min-w-0 items-center rounded-full border border-[#E2E8F0] bg-white/95 px-3.5 py-2 text-xs font-medium text-[#102B46] shadow-sm dark:border-[#24445F] dark:bg-[#0B233A]/95 dark:text-[#E2E8F0]">
              <span className="break-words">Since {joined}</span>
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
