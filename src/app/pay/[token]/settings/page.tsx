import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, Mail, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberDetailsEditor } from "../member-details";
import { loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { PageIntro, SectionHeading } from "../portal-ui";

export const metadata: Metadata = {
  title: "Settings",
};

/** Where a member corrects their own name and contact details. */
export default async function MemberSettingsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed, memberAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
        <PageIntro
          icon={Settings}
          tone="indigo"
          eyebrow="Settings"
          title="Change your details"
          description="Correct the personal information we hold for you. Library-managed fields stay locked."
          action={
            <Button asChild variant="outline" size="sm" className="h-9 w-full sm:w-auto">
              <Link href={`/pay/${token}/details`}>Back to My details</Link>
            </Button>
          }
        />

        <section className="max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={ShieldCheck}
            tone="emerald"
            title="Your details"
            description="Only your name, mobile, guardian name and guardian mobile can be changed here."
          />

          <div className="mt-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            {memberAllowed ? (
              <MemberDetailsEditor
                key={member.updatedAt.toISOString()}
                payToken={token}
                details={{
                  name: member.name,
                  mobile: member.mobile,
                  guardianName: member.guardianName,
                  guardianMobile: member.guardianMobile,
                }}
              />
            ) : (
              <p className="text-xs leading-relaxed text-muted-foreground">
                You are viewing this record as staff. Member-only edit controls are hidden here;
                use the admin Members screen to change this record.
              </p>
            )}
          </div>
        </section>

        <section className="grid max-w-3xl gap-3 sm:grid-cols-2">
          <Link
            href={`/pay/${token}/email`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">Email &amp; sign-in</span>
              <span className="block truncate text-xs text-muted-foreground">Where your codes go</span>
            </span>
          </Link>
          <Link
            href={`/pay/${token}/support`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
              <LifeBuoy className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">Help &amp; support</span>
              <span className="block truncate text-xs text-muted-foreground">Talk to the library</span>
            </span>
          </Link>
          <Link
            href={`/pay/${token}/details`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
              <UserRound className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">My details</span>
              <span className="block truncate text-xs text-muted-foreground">Name, contact and guardian</span>
            </span>
          </Link>
        </section>
      </div>
    </PortalShell>
  );
}
