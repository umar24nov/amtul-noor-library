"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download, Loader2, Mail, MessageCircle } from "lucide-react";
import { cn } from "cn";
import { sendReceiptEmailAction } from "@/app/(app)/payments/actions";

/**
 * The three ways one receipt can leave the app: download the PDF, send the PDF
 * by email, or open WhatsApp with the receipt text ready (the same PDF can be
 * attached in the chat). All three use the same receipt.
 */
export function ReceiptActions({
  paymentPk,
  whatsappHref,
  hasEmail,
  compact = false,
}: {
  paymentPk: number;
  whatsappHref: string | null;
  hasEmail: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  const emailReceipt = () => {
    startTransition(async () => {
      const result = await sendReceiptEmailAction(paymentPk);
      if (result.status === "error") {
        toast.error(result.message ?? "Could not send the receipt.");
      } else {
        toast.success(result.message ?? "Receipt sent.");
      }
    });
  };

  const iconClass = cn(
    "inline-flex items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
    compact ? "size-9" : "size-10",
  );

  return (
    <div className={cn("flex items-center", compact ? "justify-end gap-1.5" : "gap-2")}>
      <a
        href={`/api/receipts/${paymentPk}`}
        className={iconClass}
        aria-label="Download the receipt PDF"
        title="Download PDF"
      >
        <Download className="size-4" />
      </a>

      <button
        type="button"
        onClick={emailReceipt}
        disabled={pending || !hasEmail}
        className={cn(iconClass, "disabled:opacity-40")}
        aria-label={
          hasEmail
            ? "Email the receipt PDF"
            : "No email on record for this member yet"
        }
        title={hasEmail ? "Email PDF" : "No email on record — add one on the member's page"}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Mail className="size-4" />
        )}
      </button>

      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className={iconClass}
          aria-label="Send the receipt on WhatsApp"
          title="Send on WhatsApp"
        >
          <MessageCircle className="size-4" />
        </a>
      )}
    </div>
  );
}
