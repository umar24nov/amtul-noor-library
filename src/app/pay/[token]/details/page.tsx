import type { Metadata } from "next";
import { ShieldCheck, UserRound } from "lucide-react";
import { MemberStatusBadge } from "@/components/status-badges";
import { formatDate, formatINR } from "@/lib/format";
import { MemberDetailsEditor } from "../member-details";
import { getFeeSummary, getSeatLabel, loadPortal } from "../portal-data";
import { PortalGate, PortalShell } from "../portal-shell";
import { Detail, PageIntro } from "../portal-ui";

export const metadata: Metadata = {
  title: "My details",
};

/** The member's record, with self-service limited to the fields they may edit. */
export default async function MemberDetailsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed, staffAllowed, memberAllowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  const summary = await getFeeSummary(member);
  // Remount the editor after a save so the form closes with the fresh values.
  const recordKey = member.updatedAt.toISOString();

  return (
    <PortalShell token={token} member={member} staffAllowed={staffAllowed}>
      <div className="grid gap-6">
        <PageIntro
        icon={UserRound}
        tone="indigo"
        eyebrow="Membership"
        title="My details"
        description="Your record at a glance. If something is wrong, you can correct your own name and contact numbers here."
        action={
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {member.memberId}
          </span>
        }
      />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          <Detail label="Member ID" value={member.memberId} />
          <Detail label="Full name" value={member.name} />
          <Detail label="Mobile" value={member.mobile ?? "—"} />
          <Detail label="Guardian" value={member.guardianName ?? "—"} />
          <Detail label="Guardian mobile" value={member.guardianMobile ?? "—"} />
          <Detail label="Seat" value={getSeatLabel(member)} />
          <Detail label="Monthly fee" value={<span className="tabular-nums">{formatINR(summary.monthlyFee)}</span>} />
          <Detail label="Joined" value={formatDate(member.joiningDate)} />
          <Detail label="Status" value={<MemberStatusBadge status={member.status} />} />
          <Detail label="Payment link" value={<span className="text-xs text-muted-foreground">Private · yours only</span>} />
        </dl>

        {memberAllowed ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-border pt-5">
            <MemberDetailsEditor
              key={recordKey}
              payToken={token}
              details={{
                name: member.name,
                mobile: member.mobile,
                guardianName: member.guardianName,
                guardianMobile: member.guardianMobile,
              }}
            />
            <p className="text-xs text-muted-foreground">
              Seat, fee and joining date are managed by the library.
            </p>
          </div>
        ) : (
          <p className="mt-5 border-t border-dashed border-border pt-5 text-xs text-muted-foreground">
            You are viewing this record as staff. Edit it from the admin Members screen; member-only
            controls are hidden here.
          </p>
        )}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Only you can edit your contact details.</span>{" "}
          Seat, fee, joining date, status and internal remarks stay with the library, and identity
          documents are never shown here.
        </p>
      </section>
      </div>
    </PortalShell>
  );
}
