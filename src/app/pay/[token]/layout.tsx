import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { destroyMemberLinkAccess } from "@/lib/member-link-auth";
import { MemberLinkGate } from "./member-link-gate";
import { getPortalAccess, loadMemberIdentity } from "./portal-data";
import { PortalNav } from "./portal-nav";
import { PayLayout } from "./portal-ui";

export const metadata: Metadata = {
  title: "Your member page",
  robots: { index: false, follow: false },
};

/**
 * Every page under /pay/<token> shares this gate and shell. A visitor enters a
 * code emailed to the member once; the short-lived cookie then opens all of the
 * member's pages for that session. Staff with members or payments permission can
 * inspect any member page, but never see the member-only edit controls.
 */
export default async function MemberPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const member = await loadMemberIdentity(token);
  const { staffAllowed, allowed } = await getPortalAccess(token, member.id);

  if (!allowed) {
    return (
      <PayLayout>
        <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
          <MemberLinkGate payToken={token} email={member.email} />
        </section>
      </PayLayout>
    );
  }

  async function signOutAction() {
    "use server";
    await destroyMemberLinkAccess();
    redirect(`/pay/${token}`);
  }

  return (
    <PayLayout>
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-16 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Member portal · {member.memberId}
              </p>
              <p className="font-heading truncate text-sm font-semibold">{member.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link href="/">
                <ArrowLeft className="size-3.5" />
                Library home
              </Link>
            </Button>
            {!staffAllowed && (
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut className="size-3.5" />
                  Sign out
                </Button>
              </form>
            )}
          </div>
        </div>

        <PortalNav token={token} />

        <div className="mt-6">{children}</div>
      </div>
    </PayLayout>
  );
}
