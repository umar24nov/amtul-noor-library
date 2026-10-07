import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { ReviewsGrid } from "@/components/reviews-grid";
import { SITE_NAV } from "@/lib/site-nav";
import { REVIEWS } from "@/lib/reviews";
import { LIBRARY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reviews — ${LIBRARY_NAME}`,
  description: `What members have left for ${LIBRARY_NAME} on Google.`,
};

export default function ReviewsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Star className="size-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                What people say
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Reviews members left on Google
              </h1>
              <p className="mt-2 max-w-prose text-muted-foreground">
                Word for word, from the library&apos;s own Google listing.
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

          <p className="mt-4 text-sm text-muted-foreground">
            {REVIEWS.length} reviews, rated 5 out of 5.
          </p>

          <ReviewsGrid />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}