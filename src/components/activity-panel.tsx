import { Activity, LogIn, LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { ActivityAction } from "@/generated/prisma/enums";

export type ActivityEntry = {
  id: number;
  email: string;
  action: ActivityAction;
  detail: string;
  createdAt: Date;
};

const ACTION_LABELS: Record<ActivityAction, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  ROLE_CHANGED: "Role changed",
  DEACTIVATED: "Account switched off",
  REACTIVATED: "Account switched back on",
};

const ACTION_ICONS: Record<ActivityAction, LucideIcon> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  ROLE_CHANGED: ShieldCheck,
  DEACTIVATED: ShieldOff,
  REACTIVATED: ShieldCheck,
};

const ACTION_TONES: Record<ActivityAction, string> = {
  LOGIN: "bg-success/10 text-success",
  LOGOUT: "bg-muted text-muted-foreground",
  ROLE_CHANGED: "bg-primary/10 text-primary",
  DEACTIVATED: "bg-destructive/10 text-destructive",
  REACTIVATED: "bg-primary/10 text-primary",
};

/** Recent sign-ins and account changes, newest first. Read-only: the log is
 *  written by the actions themselves, never edited here. */
export function ActivityPanel({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Activity className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Sign-ins and account changes, newest first.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const Icon = ACTION_ICONS[entry.action];
              return (
                <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      ACTION_TONES[entry.action],
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{entry.email}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABELS[entry.action].toLowerCase()}
                      </span>
                      {entry.detail && (
                        <span className="text-muted-foreground"> · {entry.detail}</span>
                      )}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
