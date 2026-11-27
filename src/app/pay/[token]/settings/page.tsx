import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Settings, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberDetailsEditor, MemberEmailChange } from "../member-details";
import { loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { PageIntro, SectionHeading } from "../portal-ui";

export const metadata: Metadata = {
  title: "Settings",
};

/** Where a member manages their personal details and email. */
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

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <SectionHeading
            icon={Mail}
            tone="rose"
            title="Email & sign-in"
            description="Manage the inbox for your sign-in codes and change your email address."
          />

          {memberAllowed ? (
            <MemberEmailChange payToken={token} />
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              You are viewing this record as staff. Email change controls are hidden here;
              use the admin Members screen to change this record.
            </p>
          )}
        </section>
      </div>
    </PortalShell>
  );
}