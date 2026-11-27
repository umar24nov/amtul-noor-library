"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { paymentReminderUrl } from "@/lib/whatsapp";
import { recordReminderSentAction } from "@/app/(app)/reminders/actions";

export type ReminderRow = {
  memberPk: number;
  name: string;
  memberId: string;
  mobile: string | null;
  due: number;
  dueDate: Date;
  status: "PENDING" | "NONE";
  /** Reminders already sent for this member this month, from the database. */
  sentCount: number;
};

function ReminderButton({
  href,
  memberPk,
  month,
  initialCount,
}: {
  href: string;
  memberPk: number;
  month: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  // The count is stored on the server, so it stays put across a reload and is
  // shared by everyone. It is keyed by month, so a new month starts from zero.
  const recordSend = () => {
    setCount((current) => current + 1);
    startTransition(async () => {
      const result = await recordReminderSentAction(memberPk, month);
      if (result.status === "error") {
        setCount((current) => Math.max(0, current - 1));
        toast.error(result.message ?? "Could not record the reminder.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Sent: {count}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={recordSend}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium underline-offset-2 hover:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MessageCircle className="size-4" />
        Send reminder
      </a>
    </div>
  );
}

/**
 * The members who still owe a month, each with a WhatsApp button that opens a
 * ready message in the owner's WhatsApp. Sending is one tap per member, and the
 * "Sent" count is kept on the server for the chosen month.
 */
export function PaymentReminders({
  rows,
  month,
}: {
  rows: ReminderRow[];
  month: string;
}) {
  if (rows.length === 0) return null;

  const dueTotal = rows.reduce((total, row) => total + row.due, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          Payment reminders
          <span className="font-normal text-muted-foreground">
            {rows.length} {rows.length === 1 ? "member" : "members"} ·{" "}
            {formatINR(dueTotal)} due for {formatMonth(month)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {rows.map((row) => {
            const href = paymentReminderUrl(row.mobile, {
              name: row.name,
              due: row.due,
              month,
              dueDate: row.dueDate,
            });
            return (
              <li key={row.memberPk} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                <Link
                  href={`/payments?record=${row.memberPk}&tab=record&returnTo=${encodeURIComponent(`/reminders?month=${month}`)}`}
                  className="truncate text-sm font-medium underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.memberId} · {formatINR(row.due)} · due {formatDate(row.dueDate)}
                  </p>
                </div>
                {href ? (
                  <ReminderButton
                    href={href}
                    memberPk={row.memberPk}
                    month={month}
                    initialCount={row.sentCount}
                  />
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    No mobile on record
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Each button opens WhatsApp with that member&apos;s message ready. The Sent count is kept
          for {formatMonth(month)} and starts again at 0 next month.
        </p>
      </CardContent>
    </Card>
  );
}
