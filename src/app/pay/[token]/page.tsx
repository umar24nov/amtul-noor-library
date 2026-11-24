import type { Metadata } from "next";
import { redirect, RedirectType } from "next/navigation";
import { loadPortal } from "./portal-data";
import { PortalGate } from "./portal-shell";

export const metadata: Metadata = {
  title: "Member portal",
};

/**
 * A member's link always opens on their details, which is the one section they
 * are allowed to update. The gate is checked here first so an unauthorised
 * visitor only ever receives the sign-in form.
 */
export default async function MemberPortalEntryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { member, allowed } = await loadPortal(token);
  if (!allowed) return <PortalGate payToken={token} email={member.email} />;

  redirect(`/pay/${token}/details`, RedirectType.replace);
}
