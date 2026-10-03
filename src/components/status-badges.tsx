import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { MemberStatus, PaymentMode, PaymentStatus, SeatStatus } from "@/generated/prisma/enums";

const MEMBER_TONE: Record<MemberStatus, string> = {
  ACTIVE: "bg-success/10 text-success ring-success/25",
  LEFT: "bg-muted text-muted-foreground ring-border",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant="outline" className={cn("h-5 px-2 ring-1", MEMBER_TONE[status])}>
      {status === "ACTIVE" ? "Active" : "Left"}
    </Badge>
  );
}

const SEAT_TONE: Record<SeatStatus, string> = {
  AVAILABLE: "bg-success/10 text-success ring-success/25",
  OCCUPIED: "bg-warning/20 text-warning-foreground ring-warning/40",
};

export function SeatStatusBadge({ status }: { status: SeatStatus }) {
  return (
    <Badge variant="outline" className={cn("h-5 px-2 ring-1", SEAT_TONE[status])}>
      {status === "AVAILABLE" ? "Available" : "Occupied"}
    </Badge>
  );
}

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  PAID: "bg-success/10 text-success ring-success/25",
  PENDING: "bg-warning/20 text-warning-foreground ring-warning/40",
  WAIVED: "bg-muted text-foreground ring-border",
  NOT_APPLICABLE: "bg-muted text-muted-foreground ring-border",
  ON_HOLD: "bg-muted text-foreground ring-border",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PENDING: "Pending",
  WAIVED: "Waived",
  NOT_APPLICABLE: "N/A",
  ON_HOLD: "On hold",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus | "NONE" }) {
  if (status === "NONE") {
    return (
      <Badge variant="outline" className="h-5 px-2 text-muted-foreground ring-1 ring-border">
        Not recorded
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("h-5 px-2 ring-1", PAYMENT_TONE[status])}>
      {PAYMENT_LABEL[status]}
    </Badge>
  );
}

const MODE_LABEL: Record<PaymentMode, string> = {
  CASH: "Cash",
  ONLINE: "Online",
  OFFER: "Offer",
};

export function PaymentModeText({ mode }: { mode: PaymentMode }) {
  return <span>{MODE_LABEL[mode]}</span>;
}