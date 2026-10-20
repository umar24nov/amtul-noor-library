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

/** Recent sign-ins and account changes, newest first. Read-only: the log is
 *  written by the actions themselves, never edited here. */
export function ActivityPanel({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>Sign-ins and account changes, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">{entry.email}</span>{" "}
                    <span className="text-muted-foreground">
                      {ACTION_LABELS[entry.action].toLowerCase()}
                    </span>
                    {entry.detail && <span className="text-muted-foreground"> · {entry.detail}</span>}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
