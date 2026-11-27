import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Eye, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { logMemberActivity, MEMBER_AUDIT_ACTIONS } from "@/lib/member-audit";
import { destroyMemberLinkAccess } from "@/lib/member-link-auth";
import { MemberLinkGate } from "./member-link-gate";
import { PortalNav } from "./portal-nav";
import { PayLayout } from "./portal-ui";

/** Shown while a visitor has not entered the emailed code. No member data is rendered here. */
export function PortalGate({ payToken, email }: { payToken: string; email: string | null }) {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto mb-3 flex w-full max-w-md justify-end">
        <ThemeToggle />
      </div>
      <MemberLinkGate payToken={payToken} email={email} />
    </section>
  );
}

/**
 * The private-area frame. Each page checks access before rendering this shell,
 * so a blocked visitor never receives member content in the RSC payload.
 */
export function PortalShell({
  token,
  member,
  staffAllowed,
  hero,
  children,
}: {
  token: string;
  member: { id: number; memberId: string; name: string };
  staffAllowed: boolean;
  hero?: ReactNode;
  children: ReactNode;
}) {
  async function signOutAction() {
    "use server";
    await logMemberActivity(member.id, MEMBER_AUDIT_ACTIONS.MEMBER_SIGNED_OUT, {
      metadata: { channel: "Member portal" },
    });
    await destroyMemberLinkAccess();
    redirect("/member");
  }

  return (
    <PayLayout>
      <PortalNav
        token={token}
        memberId={member.memberId}
        staffAllowed={staffAllowed}
        signOutAction={staffAllowed ? undefined : signOutAction}
      />

      <div className="min-h-dvh min-w-0 overflow-x-hidden lg:pl-[280px]">
        {staffAllowed && (
          <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-900 dark:text-amber-100 sm:px-6 lg:px-8">
            <Eye className="size-3.5 shrink-0" aria-hidden="true" />
            Staff preview — read only. This member&apos;s self-service controls are hidden.
          </div>
        )}

        <main
          id="main"
          className="mx-auto w-full min-w-0 max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9"
        >
          {hero}
          <div
            className={hero ? "mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6" : "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6"}
          >
            {children}
          </div>

          <p className="mt-10 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Private member area · identity documents are never shown here
          </p>
        </main>
      </div>
    </PayLayout>
  );
}
