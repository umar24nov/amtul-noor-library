import type { Metadata } from "next";
import { CopyCode } from "./copy-code";

export const metadata: Metadata = {
  title: "Copy your code",
  robots: { index: false, follow: false },
};

/** Tiny helper opened by the code email's Copy code button. */
export default function CopyCodePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <CopyCode />
    </main>
  );
}
