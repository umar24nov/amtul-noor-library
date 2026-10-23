"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** How far down the page the pointer stays hidden. */
const SHOW_AFTER = 360;

/**
 * A floating "back to top" pointer. It only appears once the page has been
 * scrolled away from the top, so it never covers a page that already fits on
 * the screen. Mounted in the root layout, so every page gets it.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      setVisible(window.scrollY > SHOW_AFTER);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={scrollToTop}
      className={cn(
        "fixed right-4 bottom-20 z-40 size-12 rounded-full border border-emerald-700/40 bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-950/25 transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:from-emerald-600 hover:to-emerald-800 hover:shadow-xl focus-visible:ring-emerald-400/50 active:translate-y-0 sm:right-6 sm:bottom-40",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden="true" />
    </Button>
  );
}
