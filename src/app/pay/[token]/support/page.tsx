import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import {
  LIBRARY_EMAIL_URL,
  LIBRARY_HOURS,
  LIBRARY_HOURS_DAYS,
  LIBRARY_PHONE_URL,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { getSupportUrl, loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { PageIntro } from "../portal-ui";

export const metadata: Metadata = {
  title: "Help & support",
};

/** One place for a member to reach the library, with their details prefilled. */
export default async function MemberSupportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  const supportUrl = getSupportUrl(member);

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed}>
      <div className="grid gap-6">
        <PageIntro
        icon={LifeBuoy}
        tone="emerald"
        eyebrow="We are here"
        title="Help & support"
        description="Something wrong, or just not sure where to look? Talk to the library directly."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/pay/${token}/details`}>Back to my details</Link>
          </Button>
        }
      />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start">
        <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card p-5 shadow-sm sm:p-6 dark:border-emerald-500/20 dark:from-emerald-500/10">
          <div className="absolute -bottom-12 -right-12 size-40 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <h2 className="font-heading text-base font-semibold tracking-tight">Talk to us</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              WhatsApp is usually the quickest. Your name and member ID are already in the message.
            </p>

            <div className="mt-5 grid gap-2.5">
              <Button asChild className="h-11 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                <a href={supportUrl} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  Chat on WhatsApp
                  <ArrowUpRight className="ml-auto size-4" />
                </a>
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button asChild variant="outline" className="h-10">
                  <a href={LIBRARY_PHONE_URL}>
                    <Phone className="size-4" />
                    Call
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-10">
                  <a href={LIBRARY_EMAIL_URL}>
                    <Mail className="size-4" />
                    Email
                  </a>
                </Button>
              </div>
              <Button asChild variant="ghost" className="mt-1 justify-start text-muted-foreground">
                <Link href="/support">
                  Visit help &amp; support
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>

            <p className="mt-4 flex items-center gap-2 border-t border-emerald-500/15 pt-4 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              {LIBRARY_HOURS_DAYS} · {LIBRARY_HOURS}
            </p>
          </div>
        </section>

        <div className="grid gap-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-base font-semibold tracking-tight">Your reference</h2>
            <p className="mt-1 text-xs text-muted-foreground">Share this if we ask for it.</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
                <dt className="text-muted-foreground">Member ID</dt>
                <dd className="font-medium">{member.memberId}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="truncate font-medium" title={member.name}>{member.name}</dd>
              </div>
            </dl>
          </section>

          <section className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Keep your link private.</span> Anyone with
              this page&apos;s link still needs a code sent to your email to open it. We never show
              identity documents here.
            </p>
          </section>
        </div>
      </div>
      </div>
    </PortalShell>
  );
}
