import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import { MemberEmailChange } from "../member-email-change";
import { loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { Accent, PageIntro } from "../portal-ui";

export const metadata: Metadata = {
  title: "Email & sign-in",
};

/** Where sign-in codes go, and the verified way to move them to a new inbox. */
export default async function MemberEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed, memberAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  const recordKey = member.updatedAt.toISOString();

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed}>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
        <PageIntro
        icon={Mail}
        tone="rose"
        eyebrow="Account access"
        title="Email & sign-in"
        description="Your one-time codes are sent to this address. To change it, we first send a code to the new inbox and you confirm it here."
      />

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 max-w-3xl">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
            <Accent icon={Mail} tone="sky" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Current address
              </p>
              <p className="mt-0.5 truncate text-sm font-medium" title={member.email ?? undefined}>
                {member.email ?? "No email saved yet"}
              </p>
            </div>
          </div>

          {memberAllowed ? (
            <div className="mt-4">
              <MemberEmailChange key={recordKey} payToken={token} />
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              You are viewing this record as staff. Change this member&apos;s email from the admin
              Members screen; member-only controls are hidden here.
            </p>
          )}
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Two different codes.</span> Sign-in codes
            and email-change codes have different purposes, so a code from one can never be used for
            the other. Your new address takes effect only after you confirm it.
          </p>
        </section>
      </div>
      </div>
    </PortalShell>
  );
}
