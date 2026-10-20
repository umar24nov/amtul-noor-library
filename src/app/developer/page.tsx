import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Braces,
  Code2,
  Database,
  Globe,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_NAV } from "@/lib/site-nav";
import { LIBRARY_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Developer",
  description:
    "Mohammad Umar built the Amtul Noor Library website. Get in touch for web development work — React, Next.js, Node.js and more.",
};

/** The developer's own contact details, kept here rather than in the site-wide
 *  constants because they belong to this page, not to the library. */
const DEVELOPER = {
  name: "Mohammad Umar",
  role: "Full-stack Web Developer",
  email: "umar24nov@gmail.com",
  emailUrl: "mailto:umar24nov@gmail.com",
  phone: "8273306126",
  phoneDisplay: "+91 82733 06126",
  phoneUrl: "tel:+918273306126",
  location: "Roorkee, Uttarakhand, India",
  github: "https://github.com/umar24nov",
  linkedin: "https://www.linkedin.com/in/mohammad-umar",
  portfolio: "https://www.mohammadumarportfoloi.online/",
  university: "COER University",
  degree: "B.Tech in Computer Science and Engineering",
  degreeYears: "2023 – 2027",
  internship: "Frontend Developer Intern · NovaNectar Services Pvt. Ltd. (Jun 2025 – Sep 2025)",
};

const SKILL_GROUPS: { title: string; icon: typeof Code2; skills: string[] }[] = [
  {
    title: "Languages",
    icon: Braces,
    skills: ["C", "C++", "JavaScript", "Python"],
  },
  {
    title: "Frontend",
    icon: Code2,
    skills: ["HTML5", "CSS3", "React.js", "Next.js", "Tailwind CSS"],
  },
  {
    title: "Backend & Database",
    icon: Database,
    skills: ["Node.js", "Express.js", "REST APIs", "PostgreSQL", "Prisma", "Firebase Firestore", "MySQL"],
  },
  {
    title: "Tools & Deployment",
    icon: Wrench,
    skills: ["Git", "GitHub", "Vercel", "Render", "VS Code", "Jupyter Notebook"],
  },
  {
    title: "Core CS",
    icon: Terminal,
    skills: ["Data Structures", "Algorithms", "OOP", "DBMS", "Operating Systems", "Computer Networks"],
  },
];

const PROJECTS: { name: string; summary: string; stack: string }[] = [
  {
    name: LIBRARY_NAME,
    summary:
      "The site you are reading right now. A complete library management system with member records, seat allocation, fee collection, UPI payments, receipts, reminders and a role-based admin panel.",
    stack: "Next.js · React · TypeScript · PostgreSQL · Prisma · Tailwind CSS",
  },
  {
    name: "Academic Resource Sharing Platform",
    summary:
      "A platform where students share and discover study material, with search, filtering, bookmarks, reviews and notifications, plus Google authentication.",
    stack: "Node.js · Express.js · Firebase · Cloudinary",
  },
  {
    name: "Student Performance Analysis & Prediction System",
    summary:
      "A web app with assessments, a performance dashboard and personalised study recommendations, backed by a model trained on 395 students (81% test accuracy).",
    stack: "React.js · Python · scikit-learn · SQLite",
  },
];

const SERVICES = [
  "Business & institution websites",
  "Admin dashboards and management systems",
  "Web apps with payments, logins and databases",
  "Fixing, speeding up or redesigning an existing site",
];

function SectionHeading({ icon: Icon, children }: { icon: typeof Code2; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {children}
    </h2>
  );
}

/**
 * The developer's page.
 *
 * Public and reachable without signing in (see `src/proxy.ts`), because it is
 * shown in the footer as the credit for building the site. It says who built it
 * and invites anyone who wants similar work done to get in touch.
 */
export default function DeveloperPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <LandingHeader items={SITE_NAV} />

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Built &amp; developed by
              </p>
              <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {DEVELOPER.name}
              </h1>
              <p className="mt-2 max-w-prose text-muted-foreground">
                {DEVELOPER.role}. I designed and built the entire {LIBRARY_NAME}{" "}
                website — front to back — and I am available for new projects.
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

          {/* Contact card — the main call to action at the top of the page. */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-base">Want a website like this?</CardTitle>
              <CardDescription>
                If you like this site and would like something similar built for
                your own work, reach out and I will get back to you.
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
                  <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate">Portfolio</span>
                  <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={DEVELOPER.emailUrl}>
                    <Mail className="size-4" aria-hidden="true" />
                    Email me
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={DEVELOPER.github} target="_blank" rel="noreferrer">
                    <Globe className="size-4" aria-hidden="true" />
                    GitHub
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

          {/* About */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={GraduationCap}>About me</SectionHeading>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              I am a Computer Science undergraduate at {DEVELOPER.university}{" "}
              ({DEVELOPER.degree}, {DEVELOPER.degreeYears}) with hands-on
              experience building responsive web applications and integrating
              REST APIs. I work across the stack — from a clean, fast front end
              to the database and server behind it — and I like building
              practical software that solves real problems. {LIBRARY_NAME} is
              one of those: a live system used every day by a real library.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              I spent three months as a {DEVELOPER.internship}.
            </p>
          </div>

          {/* What I can build */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={Sparkles}>What I can build for you</SectionHeading>
            <ul className="grid gap-2 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <li
                  key={service}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
                >
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Skills */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={Code2}>Skills &amp; tools</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              {SKILL_GROUPS.map((group) => (
                <div key={group.title} className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <group.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    {group.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {group.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={Braces}>Selected projects</SectionHeading>
            <div className="grid gap-3">
              {PROJECTS.map((project) => (
                <div key={project.name} className="rounded-xl border border-border p-4">
                  <h3 className="font-heading text-sm font-semibold tracking-tight">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {project.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{project.stack}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Closing call to action */}
          <div className="mt-10 rounded-xl border border-border bg-muted/40 p-5 text-center">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Have a project in mind?
            </h2>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              Whether it is a new website, an admin panel or a fix to something
              that already exists, I would be glad to help.
            </p>
            <Button asChild className="mt-4">
              <a href={DEVELOPER.emailUrl}>
                <Mail className="size-4" aria-hidden="true" />
                Get in touch
              </a>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
