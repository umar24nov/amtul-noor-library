import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageCircle } from "lucide-react";
import { LIBRARY_NAME, LIBRARY_WHATSAPP_URL } from "@/lib/constants";
import { MemberAccessForm } from "./member-access-form";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

/**
 * The public sign-in screen. It stays deliberately small and identical on every
 * screen size: identify with a Member ID and saved email, then verify by code.
 * No landing header, footer, admin navigation or marketing panel lives here.
 */
export default function MemberEntryPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f6f7f9]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          aria-label="Back to library website"
          className="inline-flex w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Link>

        <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full">
            <div className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <BookOpen className="size-5" aria-hidden="true" />
              </span>
              <p className="font-heading mt-4 text-sm font-semibold tracking-tight">
                {LIBRARY_NAME}
              </p>
              <h1 className="font-heading mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Login
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Enter your Member ID and registered email address. We&apos;ll send a one-time
                verification code (OTP) to your email to verify your identity.
              </p>
            </div>

            <div className="mt-7 rounded-3xl border border-border bg-card p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-7">
              <MemberAccessForm />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
              <span>Don&apos;t have the saved email?</span>
              <a
                href={LIBRARY_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-700 underline-offset-4 hover:underline"
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
