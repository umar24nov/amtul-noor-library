import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Braces,
  Clock,
  Code2,
  Database,
  Globe,
  Link2,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAV } from "@/lib/site-nav";
import { LIBRARY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Developer",
  description:
    "Mohammad Umar built the Amtul Noor Library website. A short note on the project and how to get in touch.",
};

/** The developer's own contact details, kept here rather than in the site-wide
 *  constants because they belong to this page, not to the library. */
const DEVELOPER = {
  name: "Mohammad Umar",
  role: "Computer Science Undergraduate",
  email: "umar24nov@gmail.com",
  emailUrl: "mailto:umar24nov@gmail.com",
  phoneDisplay: "+91 82733 06126",
  phoneUrl: "tel:+918273306126",
  location: "Roorkee, Uttarakhand, India",
  github: "https://github.com/umar24nov",
  linkedin: "https://linkedin.com/in/mohammadumarfarook",
  leetcode: "https://leetcode.com/u/umar24nov/",
  portfolio: "https://www.mohammadumarportfoloi.online/",
};

/** What this build does, in plain terms — the one project this page is about. */
const FEATURES: { icon: typeof Users; title: string; detail: string }[] = [
  {
    icon: Users,
    title: "Member records",
    detail: "A searchable register of every member, with their full payment history kept forever.",
  },
  {
    icon: Sparkles,
    title: "Seat allocation",
    detail: "A visual map of the rooms — assign a seat, release it, or add new rooms and seats.",
  },
  {
    icon: Clock,
    title: "Fees & reminders",
    detail: "Monthly fee tracking, pending lists, UPI payments and payment reminders on WhatsApp.",
  },
  {
    icon: Braces,
    title: "Admin panel",
    detail: "Role-based access, so each staff member only sees the areas they are given.",
  },
];

const STACK = "Next.js · React · TypeScript · PostgreSQL · Prisma · Tailwind CSS";

/**
 * The developer's page.
 *
 * Public and reachable without signing in (see `src/proxy.ts`), because it is
 * shown in the footer as the credit for building the site. It stays short: a
 * plain note about this one project and how to get in touch. The full portfolio,
 * with every other project, is linked rather than reproduced here.
 */
export default function DeveloperPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to the library
          </Link>

          {/* Identity */}
          <div className="mt-6">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <Rocket className="size-3.5" aria-hidden="true" />
              Built &amp; developed by
            </p>
            <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {DEVELOPER.name}
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {DEVELOPER.role}
            </p>
            <p className="mt-3 max-w-prose text-muted-foreground">
              I designed and built the {LIBRARY_NAME} website end to end — a real
              reading room in Roorkee that needed its day-to-day operations in one
              place. This page is a short note about that work; everything else I
              build lives on my portfolio.
            </p>
          </div>

          {/* About this project */}
          <div className="mt-10">
            <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Database className="size-4" aria-hidden="true" />
              </span>
              About this project
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {LIBRARY_NAME} combines a public website with an admin panel that
              handles the library&apos;s daily work: keeping the member register,
              allotting seats, tracking monthly fees, collecting UPI payments and
              sending digital receipts and reminders. It runs on {STACK}, with
              data kept in a PostgreSQL database.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <feature.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {feature.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {feature.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <Card className="mt-10">
            <CardHeader>
              <CardTitle className="text-base">Get in touch</CardTitle>
              <CardDescription>
                Open to new opportunities, collaborations and interesting projects.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <a
                  href={DEVELOPER.emailUrl}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">{DEVELOPER.email}</span>
                </a>
                <a
                  href={DEVELOPER.phoneUrl}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{DEVELOPER.phoneDisplay}</span>
                </a>
                <span className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">{DEVELOPER.location}</span>
                </span>
                <a
                  href={DEVELOPER.portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted"
                >
                  <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">Portfolio</span>
                  <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={DEVELOPER.emailUrl}>
                    <Mail className="size-4" aria-hidden="true" />
                    Email
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={DEVELOPER.github} target="_blank" rel="noreferrer">
                    <Braces className="size-4" aria-hidden="true" />
                    GitHub
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={DEVELOPER.leetcode} target="_blank" rel="noreferrer">
                    <Code2 className="size-4" aria-hidden="true" />
                    LeetCode
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer">
                    <Link2 className="size-4" aria-hidden="true" />
                    LinkedIn
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
