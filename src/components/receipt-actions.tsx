"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Download,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sendReceiptEmailAction } from "@/app/(app)/payments/actions";

/**
 * The ways one receipt can leave the app: download the PDF, send the PDF by
 * email, open WhatsApp with the receipt text (and its public download link), or
 * copy that same link so it can be sent wherever the member will see it. The
 * link needs no login, so it is how a member gets their own copy.
 *
 * They live behind a single "…" button so the payments table stays readable,
 * and emailing asks for confirmation before anything is sent.
 */
export function ReceiptActions({
  paymentPk,
  whatsappHref,
  hasEmail,
  compact = false,
  publicUrl = null,
}: {
  paymentPk: number;
  whatsappHref: string | null;
  hasEmail: boolean;
  compact?: boolean;
  /** Public download link for the member, null until the payment has a token. */
  publicUrl?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const emailReceipt = () => {
    startTransition(async () => {
      const result = await sendReceiptEmailAction(paymentPk);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not send the receipt.");
      } else {
        toast.success(result.message ?? "Receipt sent.");
      }
      setConfirmOpen(false);
    });
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Receipt link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(compact ? "size-9" : "size-10", "text-muted-foreground")}
            aria-label="Receipt actions"
            title="Receipt actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Receipt</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <a href={`/api/receipts/${paymentPk}`}>
              <Download className="size-4" />
              Download PDF
            </a>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!hasEmail || pending}
            onSelect={(event) => {
              event.preventDefault();
              if (!hasEmail) return;
              setConfirmOpen(true);
            }}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            {pending ? "Sending…" : "Email receipt"}
          </DropdownMenuItem>

          {whatsappHref && (
            <DropdownMenuItem asChild>
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                Send on WhatsApp
              </a>
            </DropdownMenuItem>
          )}

          {publicUrl && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={copyLink}>
                <Link2 className="size-4" />
                Copy receipt link
              </DropdownMenuItem>
            </>
          )}

          {!hasEmail && (
            <>
              <DropdownMenuSeparator />
              <p className="px-1.5 py-1 text-xs text-muted-foreground">
                Add an email on the member&apos;s page to email receipts.
              </p>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this receipt by email?</AlertDialogTitle>
            <AlertDialogDescription>
              The PDF receipt will be emailed to the address on the member&apos;s
              record. Are you sure you want to send it now?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <Button type="button" className="h-10" onClick={emailReceipt} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Yes, send it"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
