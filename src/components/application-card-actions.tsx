"use client";

import { Check, X } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { approveApplicationAction, rejectApplicationAction } from "@/app/(app)/applications/actions";

export function PendingApplicationActions({ id }: { id: number }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form action={approveApplicationAction} className="contents">
        <input type="hidden" name="id" value={id} />
        <SubmitButton
          pendingLabel="Approving..."
          className="flex-1"
        >
          <Check className="size-4" />
          Approve
        </SubmitButton>
      </form>
      <form action={rejectApplicationAction} className="contents">
        <input type="hidden" name="id" value={id} />
        <SubmitButton pendingLabel="Rejecting..." variant="destructive" className="flex-1">
          <X className="size-4" />
          Reject
        </SubmitButton>
      </form>
    </div>
  );
}