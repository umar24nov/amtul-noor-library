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
  role: "Computer Science Undergraduate · Software Development & Machine Learning",
  email: "umar24nov@gmail.com",
  emailUrl: "mailto:umar24nov@gmail.com",
  phone: "8273306126",
  phoneDisplay: "+91 82733 06126",
  phoneUrl: "tel:+918273306126",
  location: "Roorkee, Uttarakhand, India",
  github: "https://github.com/umar24nov",
  linkedin: "https://linkedin.com/in/mohammadumarfarook",
  leetcode: "https://leetcode.com/u/umar24nov/",
  portfolio: "https://www.mohammadumarportfoloi.online/",
  university: "COER University, Roorkee",
  degree: "B.Tech in Computer Science and Engineering",
  degreeYears: "2023 – 2027",
  internship: "Frontend Developer Intern at NovaNectar Services Pvt. Ltd.",
  internshipDates: "June – September 2025",
  coursework:
    "Data Structures and Algorithms, Object-Oriented Programming, Database Management Systems, Operating Systems, Computer Networks, Web Development and Machine Learning",
};

const SKILL_GROUPS: { title: string; icon: typeof Code2; skills: string[] }[] = [
  {
    title: "Programming Languages",
    icon: Braces,
    skills: ["C", "C++", "JavaScript", "Python", "SQL"],
  },
  {
    title: "Frontend Development",
    icon: Code2,
    skills: ["HTML5", "CSS3", "React.js", "Next.js", "Tailwind CSS"],
  },
  {
    title: "Backend & Application Development",
    icon: Database,
    skills: [
      "Node.js",
      "Express.js",
      "REST API integration",
      "Authentication & application logic",
      "File uploads & third-party services",
    ],
  },
  {
    title: "Machine Learning & Data Analysis",
    icon: Sparkles,
    skills: [
      "NumPy",
      "Pandas",
      "scikit-learn",
      "Data preprocessing & EDA",
      "Model training & evaluation",
      "Matplotlib",
    ],
  },
  {
    title: "Databases & Storage",
    icon: Database,
    skills: ["PostgreSQL", "MySQL", "Firebase Firestore", "SQLite", "Prisma ORM"],
  },
  {
    title: "Tools & Deployment",
    icon: Wrench,
    skills: ["Git", "GitHub", "VS Code", "Jupyter Notebook", "Vercel", "Render"],
  },
  {
    title: "Core Computer Science",
    icon: Terminal,
    skills: [
      "Data Structures & Algorithms",
      "Object-Oriented Programming",
      "DBMS",
      "Operating Systems",
      "Computer Networks",
    ],
  },
];

const PROJECTS: {
  name: string;
  tagline: string;
  summary: string;
  stack: string;
  href?: string;
  hrefLabel?: string;
}[] = [
  {
    name: LIBRARY_NAME,
    tagline: "A digital platform for library operations",
    summary:
      "The site you are reading right now. I built it for a real reading-room institution in Roorkee, combining a public website with administrative tools that simplify daily operations: member records, seat allocation, membership fee tracking, UPI payments, digital receipts, payment reminders and role-based access. It shows how a thoughtful system can turn real operational needs into one integrated platform.",
    stack: "Next.js · React · TypeScript · PostgreSQL · Prisma · Tailwind CSS",
    href: "https://amtulnoorlibrary.site/",
    hrefLabel: "amtulnoorlibrary.site",
  },
  {
    name: "StudyVault — Academic Resource Sharing Platform",
    tagline: "A collaborative learning platform",
    summary:
      "A platform that makes academic resources easy to discover, access and share. Students contribute learning material and find relevant resources through an organised interface, with Google authentication, uploads, search and filtering, bookmarks, reviews and notifications.",
    stack: "HTML · CSS · JavaScript · Node.js · Express.js · Firebase · Cloudinary",
    href: "https://studyvaultapp.vercel.app/",
    hrefLabel: "Live demo",
  },
  {
    name: "Student Performance Analysis & Prediction System",
    tagline: "Machine learning for academic insight",
    summary:
      "A machine learning application that analyses student performance and explores how prediction can flag students who may be at academic risk. Trained on a dataset of 395 students, it compares models to classify performance and presents insights and personalised study recommendations. The Random Forest model reached 81% test accuracy, checked further with cross-validation.",
    stack: "Python · Pandas · NumPy · scikit-learn · React.js · SQLite",
    href: "https://github.com/umar24nov/student-predictor",
    hrefLabel: "Repository",
  },
];

const SERVICES: { title: string; detail: string }[] = [
  {
    title: "Business & institutional websites",
    detail: "Professional, responsive sites that establish an online presence and communicate clearly.",
  },
  {
    title: "Admin dashboards & management systems",
    detail: "Custom apps for records, memberships, resources, payments and everyday workflows.",
  },
  {
    title: "Interactive web applications",
    detail: "Feature-rich apps with authentication, databases, REST APIs, file uploads and payments.",
  },
  {
    title: "Machine learning applications",
    detail: "Predictive models that surface patterns, generate forecasts and support decisions.",
  },
  {
    title: "Data analysis & visualisation",
    detail: "Data preparation, exploratory analysis, model evaluation and clear, useful insight.",
  },
  {
    title: "Website optimisation & redesign",
    detail: "Better usability, responsiveness, performance, accessibility and visual consistency.",
  },
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
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {DEVELOPER.role}
              </p>
              <p className="mt-3 max-w-prose text-muted-foreground">
                I designed and developed the {LIBRARY_NAME} website, turning
                practical requirements into a fully functional digital platform.
                I enjoy exploring new technologies, solving real-world problems
                and building purposeful digital experiences — and I am open to
                new opportunities, meaningful collaborations and projects that
                turn ideas into reality.
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
                <Button asChild variant="outline">
                  <a href={DEVELOPER.leetcode} target="_blank" rel="noreferrer">
                    <Braces className="size-4" aria-hidden="true" />
                    LeetCode
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={GraduationCap}>About me</SectionHeading>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              I am a Computer Science undergraduate at {DEVELOPER.university},
              pursuing a {DEVELOPER.degree} ({DEVELOPER.degreeYears}). My
              interests span software development, web applications, machine
              learning and data analysis, with a focus on building practical
              solutions to real problems.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              I enjoy translating ideas into functional, intuitive and reliable
              applications. From responsive interfaces and backend services to
              analysing datasets and training predictive models, I treat each
              project as a chance to combine technical knowledge with purposeful
              problem-solving. My projects reflect that range: StudyVault for
              sharing academic resources, a Student Performance Analysis and
              Prediction System exploring machine learning in education, and the{" "}
              {LIBRARY_NAME} platform built for a real institution.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              I believe good software goes beyond functionality — it should be
              thoughtfully designed, dependable, accessible and genuinely useful
              to the people who rely on it. Before this, I worked as a{" "}
              {DEVELOPER.internship} ({DEVELOPER.internshipDates}), where I
              gained practical experience in frontend development and responsive
              web interfaces.
            </p>
          </div>

          {/* What I can build */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={Sparkles}>What I can build for you</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <div key={service.title} className="rounded-xl border border-border p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {service.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {service.detail}
                  </p>
                </div>
              ))}
            </div>
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
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {project.tagline}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {project.summary}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">{project.stack}</p>
                  {project.href ? (
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {project.hrefLabel}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={GraduationCap}>Education</SectionHeading>
            <div className="rounded-xl border border-border p-4">
              <h3 className="font-heading text-sm font-semibold tracking-tight">
                {DEVELOPER.degree}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {DEVELOPER.university} · {DEVELOPER.degreeYears}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Relevant coursework includes {DEVELOPER.coursework}.
              </p>
            </div>
          </div>

          {/* Open source */}
          <div className="mt-10 grid gap-4">
            <SectionHeading icon={Globe}>GitHub &amp; open source</SectionHeading>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              My GitHub profile documents my ongoing development work, personal
              projects and continued exploration of software engineering and
              machine learning. I use hands-on projects to strengthen my
              fundamentals, experiment with new approaches and turn ideas into
              working applications.
            </p>
            <Button asChild variant="outline" className="w-fit">
              <a href={DEVELOPER.github} target="_blank" rel="noreferrer">
                <Globe className="size-4" aria-hidden="true" />
                github.com/umar24nov
              </a>
            </Button>
          </div>

          {/* Closing call to action */}
          <div className="mt-10 rounded-xl border border-border bg-muted/40 p-5 text-center">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Have an idea? Let&apos;s build it.
            </h2>
            <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
              I am actively exploring internship opportunities, collaborative
              projects and meaningful software work. Whether you have a project
              in mind, want to discuss technology, or are interested in
              collaborating, I would be glad to hear from you.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <a href={DEVELOPER.emailUrl}>
                  <Mail className="size-4" aria-hidden="true" />
                  Send a message
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer">
                  <Link2 className="size-4" aria-hidden="true" />
                  LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
