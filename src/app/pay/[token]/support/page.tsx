import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";
import { LIBRARY_EMAIL_URL, LIBRARY_PHONE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { getSupportUrl, loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { PageIntro } from "../portal-ui";

export const metadata: Metadata = {
  title: "Help & support",
};

/** Reach the library for help. */
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
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
        <PageIntro
          icon={LifeBuoy}
          tone="emerald"
          eyebrow="We are here"
          title="Help & support"
          description="Reach the library for help."
          action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/pay/${token}/details`}>Back to my details</Link>
          </Button>
        }
      />

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 max-w-4xl lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start">
        <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-card to-card p-5 shadow-sm sm:p-6 dark:border-emerald-500/20 dark:from-emerald-500/10">
          <div className="absolute -bottom-12 -right-12 size-40 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <h2 className="font-heading text-base font-semibold tracking-tight">Talk to us</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              WhatsApp is usually the quickest. Your name and member ID are already in the message.
            </p>

            <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2.5">
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
            </div>
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
          <Link
            href={`/pay/${token}/details`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">Back to my details</span>
            </span>
          </Link>
        </section>
      </div>
      </div>
    </PortalShell>
  );
}