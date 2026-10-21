"use client";

import { useState, useTransition, type ReactNode } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import type { PaymentStatus } from "@/generated/prisma/enums";

/**
 * The ways one receipt can leave the app: download the PDF, send the PDF by
 * email, open WhatsApp with the receipt text (and its public download link), or
 * copy that same link so it can be sent wherever the member will see it. The
 * link needs no login, so it is how a member gets their own copy.
 *
 * On a wide screen they live behind a single "…" dropdown so the payments
 * table stays readable. On a phone a dropdown opening near the bottom of the
 * list looked cramped and landed in the bottom-left corner, so the same actions
 * open as a full-width bottom sheet with thumb-sized rows instead.
 */
export function ReceiptActions({
  paymentPk,
  status,
  whatsappHref,
  hasEmail,
  compact = false,
  publicUrl = null,
}: {
  paymentPk: number;
  /** Only a PAID record has a receipt; anything else explains why instead. */
  status: PaymentStatus;
  whatsappHref: string | null;
  hasEmail: boolean;
  compact?: boolean;
  /** Public download link for the member, null until the payment has a token. */
  publicUrl?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unpaidOpen, setUnpaidOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const isPaid = status === "PAID";

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

  const openUnpaid = () => {
    setSheetOpen(false);
    setUnpaidOpen(true);
  };

  const openEmailConfirm = () => {
    setSheetOpen(false);
    setConfirmOpen(true);
  };

  const copyFromSheet = () => {
    setSheetOpen(false);
    void copyLink();
  };

  return (
    <>
      {/* Phones: one bottom sheet keeps every action inside the screen. */}
      <Button
        variant="outline"
        size="icon"
        className={cn(compact ? "size-9" : "size-10", "text-muted-foreground sm:hidden")}
        aria-label="Receipt actions"
        title="Receipt actions"
        onClick={() => setSheetOpen(true)}
      >
        <MoreHorizontal className="size-4" />
      </Button>

      {/* Wider screens: the compact dropdown beside the payment row. */}
      <div className="hidden sm:block">
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
          <DropdownMenuContent align="end" sideOffset={6} collisionPadding={12} className="w-56">
            <DropdownMenuLabel>Receipt</DropdownMenuLabel>

            {isPaid ? (
              <DropdownMenuItem asChild>
                <a href={`/api/receipts/${paymentPk}`}>
                  <Download className="size-4" />
                  Download PDF
                </a>
              </DropdownMenuItem>
            ) : (
              // A month that has not been paid has no receipt yet. Rather than
              // hand over a link that would 404, open a short explanation.
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  openUnpaid();
                }}
              >
                <Download className="size-4" />
                Download receipt
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              disabled={!isPaid || !hasEmail || pending}
              onSelect={(event) => {
                event.preventDefault();
                if (!isPaid || !hasEmail) return;
                openEmailConfirm();
              }}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              {pending ? "Sending…" : "Email receipt"}
            </DropdownMenuItem>

            {isPaid && whatsappHref && (
              <DropdownMenuItem asChild>
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  Send on WhatsApp
                </a>
              </DropdownMenuItem>
            )}

            {isPaid && publicUrl && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={copyLink}>
                  <Link2 className="size-4" />
                  Copy receipt link
                </DropdownMenuItem>
              </>
            )}

            {isPaid && !hasEmail && (
              <>
                <DropdownMenuSeparator />
                <p className="px-1.5 py-1 text-xs text-muted-foreground">
                  Add an email on the member&apos;s page to email receipts.
                </p>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] rounded-t-2xl px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-1">
            <SheetTitle>Receipt actions</SheetTitle>
            <SheetDescription>Download, email, or share this receipt.</SheetDescription>
          </SheetHeader>

          <div className="grid gap-1">
            {isPaid ? (
              <SheetAction
                href={`/api/receipts/${paymentPk}`}
                icon={<Download className="size-4" />}
                label="Download PDF"
                onClick={() => setSheetOpen(false)}
              />
            ) : (
              <SheetAction
                icon={<Download className="size-4" />}
                label="Download receipt"
                onClick={openUnpaid}
              />
            )}

            <SheetAction
              icon={
                pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )
              }
              label={pending ? "Sending…" : "Email receipt"}
              disabled={!isPaid || !hasEmail || pending}
              onClick={openEmailConfirm}
            />

            {isPaid && whatsappHref && (
              <SheetAction
                href={whatsappHref}
                external
                icon={<MessageCircle className="size-4" />}
                label="Send on WhatsApp"
                onClick={() => setSheetOpen(false)}
              />
            )}

            {isPaid && publicUrl && (
              <SheetAction
                icon={<Link2 className="size-4" />}
                label="Copy receipt link"
                onClick={copyFromSheet}
              />
            )}

            {isPaid && !hasEmail && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Add an email on the member&apos;s page to email receipts.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={unpaidOpen} onOpenChange={setUnpaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fee yet to be paid</AlertDialogTitle>
            <AlertDialogDescription>
              This month has not been paid, so there is no receipt to download
              yet. The receipt appears here as soon as the payment is recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10">Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function SheetAction({
  icon,
  label,
  href,
  external = false,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const className = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors",
    disabled
      ? "pointer-events-none opacity-50"
      : "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
  );

  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={className}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  );
}
