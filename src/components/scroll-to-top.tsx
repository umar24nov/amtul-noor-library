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
        "fixed right-4 bottom-24 z-40 size-11 rounded-full border-border bg-background/90 shadow-lg backdrop-blur transition-opacity duration-200 sm:right-6 sm:bottom-1/4",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </Button>
  );
}
