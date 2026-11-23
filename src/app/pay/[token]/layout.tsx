import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PayLayout } from "./portal-ui";

export const metadata: Metadata = {
  title: "Your member page",
  robots: { index: false, follow: false },
};

/**
 * Only the site frame lives here. The access gate and member shell are rendered
 * by each page after it has checked access, so blocked visitors never receive a
 * page's data in the RSC payload.
 */
export default function MemberPortalLayout({ children }: { children: ReactNode }) {
  return <PayLayout>{children}</PayLayout>;
}
