import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LIBRARY_HOURS,
  LIBRARY_HOURS_DAYS,
  LIBRARY_NAME,
  LIBRARY_WHATSAPP_URL,
} from "@/lib/constants";
import { HERO_PHOTO } from "@/lib/photos";
import { MemberAccessForm } from "./member-access-form";

export const metadata: Metadata = {
  title: "Member sign in",
  robots: { index: false, follow: false },
};

/**
 * The public Members entry. It is a standalone screen: no landing header, no
 * footer, no admin navigation. Members identify themselves with their ID and
 * saved email, then continue to the OTP-protected portal.
 */
export default function MemberEntryPage() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <section className="relative isolate hidden overflow-hidden bg-slate-950 lg:block">
        <Image
          src={`/images/${HERO_PHOTO.src}`}
          alt={HERO_PHOTO.alt}
          fill
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="object-cover object-[center_45%] opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent" />
        <div
          className="absolute -left-24 top-1/4 size-96 rounded-full bg-emerald-500/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-lg text-sm text-white/75 outline-none transition-colors hover:text-white focus-visible:ring-3 focus-visible:ring-emerald-400/60"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to library website
          </Link>

          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-white/90 backdrop-blur-md">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              MEMBERS ONLY
            </span>
            <h1 className="font-heading mt-6 text-4xl font-semibold tracking-tight sm:text-5xl xl:text-6xl xl:leading-tight">
              Your library,
              <br />
              one quiet place.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/75">
              Your seat, your payments, your details — neatly organised. Sign in with a code sent
              to the email we have on file.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">
                <ShieldCheck className="size-3.5 text-emerald-300" aria-hidden="true" />
                One-time code
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">
                <Clock className="size-3.5" aria-hidden="true" />
                {LIBRARY_HOURS_DAYS} · {LIBRARY_HOURS}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/50">{LIBRARY_NAME} · Roorkee</p>
        </div>
      </section>

      <section className="flex min-h-dvh flex-col bg-[#f6f7f9] px-4 py-5 sm:px-8 sm:py-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Library website
          </Link>
          <span className="ml-auto rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Member access
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 sm:py-12">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-heading text-base font-semibold tracking-tight">{LIBRARY_NAME}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Member portal
                </p>
              </div>
            </div>

            <div className="mt-6 lg:mt-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Secure sign in
              </p>
              <h2 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Open your member area
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Enter your member ID and the email saved with the library. We&apos;ll send a
                one-time code to that address.
              </p>
            </div>

            <div className="mt-7 rounded-3xl border border-border bg-card p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-7">
              <MemberAccessForm />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-3.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Don&apos;t have the saved email? Ask the library to update it.
              </p>
              <Button asChild variant="ghost" size="sm" className="text-emerald-700 hover:text-emerald-800">
                <a href={LIBRARY_WHATSAPP_URL} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                  Contact support
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
