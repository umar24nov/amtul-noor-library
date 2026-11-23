import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAV } from "@/lib/site-nav";

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
      <div className="flex items-start gap-4">
        <Accent icon={icon} tone={tone} size="lg" />
        <div>
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
    <>
      <div className="flex items-center justify-between gap-2">
        <Accent icon={icon} tone={tone} />
        {href && <ArrowUpRight className="size-4 text-muted-foreground/60" aria-hidden="true" />}
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-heading mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </>
  );

  const className =
    "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-950/5";

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
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

export function PayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
