"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Brand } from "@/components/brand";
import { LIBRARY_TAGLINE } from "@/lib/constants";

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          className="size-10"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {/* compact, so the motto below is not repeated and truncated here */}
          <Brand compact />
          <p className="text-xs text-muted-foreground">{LIBRARY_TAGLINE}</p>
        </SheetHeader>
        <div className="p-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
}