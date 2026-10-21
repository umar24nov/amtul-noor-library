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
import { MobileNav } from "@/components/app-nav";
import type { PermissionKey } from "@/lib/permission-defs";

export function MobileMenu({ permissions }: { permissions: PermissionKey[] }) {
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
          {/* The plain mark, the same one the top bar and the desktop header
              use. The motto stays out of the menu so the brand reads the same
              everywhere it appears. */}
          <Brand compact />
        </SheetHeader>
        <div className="p-3">
          {/* Choosing a destination dismisses the menu. Without this the sheet
              stays open over the page you just asked for, because the route
              change does not close a Radix dialog on its own. */}
          <MobileNav onNavigate={() => setOpen(false)} permissions={permissions} />
        </div>
      </SheetContent>
    </Sheet>
  );
}