"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { paymentReminderUrl } from "@/lib/whatsapp";

export type ReminderRow = {
  memberPk: number;
  name: string;
  memberId: string;
  mobile: string | null;
  due: number;
  dueDate: Date;
  status: "PENDING" | "NONE";
};

function ReminderButton({ href, memberId, month }: { href: string; memberId: string; month: string }) {
  const [count, setCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const monthKey = `reminder-month-${memberId}`;
      const countKey = `reminder-sent-${memberId}`;
      const storedMonth = localStorage.getItem(monthKey);
      if (storedMonth !== month) {
        localStorage.setItem(monthKey, month);
        localStorage.setItem(countKey, "0");
        return 0;
      }
      const stored = localStorage.getItem(countKey);
      return stored ? Number(stored) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const incrementCount = () => {
    try {
      const monthKey = `reminder-month-${memberId}`;
      const countKey = `reminder-sent-${memberId}`;
      localStorage.setItem(monthKey, month);
      const next = count + 1;
      setCount(next);
      localStorage.setItem(countKey, String(next));
    } catch {
      // ignore
    }
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
        onClick={incrementCount}
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
 * ready message in the owner's WhatsApp. Sending is one tap per member.
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
                  href={`/payments?record=${row.memberPk}&tab=record`}
                  className="truncate text-sm font-medium underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.memberId} · {formatINR(row.due)} · due {formatDate(row.dueDate)}
                  </p>
                </div>
                {href ? (
                  <ReminderButton href={href} memberId={row.memberId} month={month} />
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
          Each button opens WhatsApp with that member&apos;s message ready. Send or edit, then
          record the payment from the Payments page once it clears.
        </p>
      </CardContent>
    </Card>
  );
}