import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LIBRARY_NAME, LIBRARY_WHATSAPP_URL } from "@/lib/constants";
import { MemberAccessForm } from "./member-access-form";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

/**
 * The public sign-in screen stays a single compact card at every size. On wider
 * screens the two fields sit side by side so the page does not become a long,
 * narrow column or a decorative two-panel layout.
 */
export default function MemberEntryPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="Back to library website"
            className="inline-flex w-fit items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
          <ThemeToggle />
        </div>

        <main className="flex flex-1 items-center justify-center py-8 sm:py-10">
          <div className="w-full">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] sm:p-7">
              <div className="flex items-center gap-3 border-b border-border pb-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
                  <BookOpen className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-heading truncate text-sm font-semibold tracking-tight">
                    {LIBRARY_NAME}
                  </p>
                  <p className="text-xs text-muted-foreground">Member access</p>
                </div>
              </div>

              <div className="pt-5">
                <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                  Login
                </h1>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Enter your Member ID and registered email address. We&apos;ll send a one-time
                  verification code (OTP) to your email to verify your identity.
                </p>
              </div>

              <div className="mt-6">
                <MemberAccessForm />
              </div>
            </section>

            <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              Don&apos;t have the saved email?{" "}
              <a
                href={LIBRARY_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                Contact support
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
