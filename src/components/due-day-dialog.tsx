"use client";

import { useState } from "react";
import { CalendarClock, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DueDayForm } from "@/components/due-day-form";
import { updateFeeDueDayAction } from "@/app/(app)/dashboard/actions";
import { ordinalDay } from "@/lib/format";

export function DueDayDialog({ dueDay }: { dueDay: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-11">
          <Settings2 className="size-4" />
          <span className="hidden sm:inline">Due day</span>
          <span className="sm:hidden" aria-hidden>
            <CalendarClock className="size-4" />
          </span>
          <span className="sr-only sm:hidden">Due day</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fee due day</DialogTitle>
          <DialogDescription>
            The fee for every month falls due on the {ordinalDay(dueDay)}.
          </DialogDescription>
        </DialogHeader>
        <DueDayForm
          dueDay={dueDay}
          action={updateFeeDueDayAction}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}