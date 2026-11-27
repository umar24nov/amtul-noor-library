import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import {
  formatActivityChanges,
  isMemberActivityAction,
  MEMBER_ACTIVITY_LABELS,
  summarizeActivityMetadata,
} from "@/lib/member-activity";
import type { MemberActivityRow } from "@/lib/queries";

function actionLabel(action: string): string {
  return isMemberActivityAction(action) ? MEMBER_ACTIVITY_LABELS[action] : action;
}

function isAlert(action: string): boolean {
  return action === "MEMBER_OTP_FAILED" || action === "MEMBER_DELETED";
}

function deviceFromMetadata(metadata: unknown): string {
  const device = summarizeActivityMetadata(metadata).find((line) => line.startsWith("Device: "));
  return device ? device.slice("Device: ".length) : "—";
}

function pageHref(
  page: number,
  filters: { q: string; memberId: number | null; action: string; days: number | null },
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.memberId) params.set("member", String(filters.memberId));
  if (filters.action && filters.action !== "ALL") params.set("action", filters.action);
  if (filters.days) params.set("days", String(filters.days));
  params.set("page", String(page));
  return `?${params.toString()}`;
}

/**
 * Read-only monitor for member events. Never renders raw metadata JSON: only
 * the sanitised summary fields and field diffs prepared by member-activity.ts.
 */
export function MemberActivityTable({
  rows,
  total,
  page,
  pageSize,
  filters,
}: {
  rows: MemberActivityRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; memberId: number | null; action: string; days: number | null };
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="grid place-items-center gap-2 py-12 text-center">
          <Search className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No member activity found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Try a different search, member, event or time window. Events older than 12 months are
            not kept.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <Card>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2.5">Event</th>
                  <th className="px-4 py-2.5">Member</th>
                  <th className="px-4 py-2.5">When</th>
                  <th className="px-4 py-2.5">Actor</th>
                  <th className="px-4 py-2.5">IP</th>
                  <th className="px-4 py-2.5">Device</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const changes = formatActivityChanges(row.changes);
                  const context = summarizeActivityMetadata(row.metadata);
                  return (
                    <tr key={row.id} className="border-b border-border align-top last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={isAlert(row.action) ? "destructive" : "secondary"}>
                            {actionLabel(row.action)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {row.summary || actionLabel(row.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {row.member ? row.member.name : (row.memberLabel || "Deleted member")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {row.member
                              ? `${row.member.memberId} · ${row.member.status}`
                              : "Member removed"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <time dateTime={row.createdAt.toISOString()}>
                          {formatDateTime(row.createdAt)}
                        </time>
                      </td>
                      <td className="px-4 py-3">{row.actorName || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.ip || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {deviceFromMetadata(row.metadata)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <details className="group inline-block text-left">
                          <summary className="cursor-pointer list-none rounded-md px-2 py-1 text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            Details
                          </summary>
                          <div className="mt-2 grid w-80 gap-3 rounded-lg border border-border bg-background p-3 text-xs shadow-sm">
                            <div>
                              <p className="font-semibold">Event</p>
                              <p className="mt-0.5 text-muted-foreground">
                                {row.summary || actionLabel(row.action)} · #{row.id}
                              </p>
                            </div>
                            {context.length > 0 && (
                              <div>
                                <p className="font-semibold">Context</p>
                                <ul className="mt-0.5 grid gap-0.5 text-muted-foreground">
                                  {context.map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {changes.length > 0 ? (
                              <div>
                                <p className="font-semibold">Changed fields</p>
                                <div className="mt-1 overflow-hidden rounded-md border border-border">
                                  <table className="w-full text-left">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                      <tr>
                                        <th className="px-2 py-1">Field</th>
                                        <th className="px-2 py-1">Before</th>
                                        <th className="px-2 py-1">After</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {changes.map((change, index) => (
                                        <tr key={`${change.label}-${index}`} className="border-t border-border align-top">
                                          <td className="px-2 py-1 font-medium">{change.label}</td>
                                          <td className="px-2 py-1 break-words text-muted-foreground">
                                            {change.old}
                                          </td>
                                          <td className="px-2 py-1 break-words">{change.new}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No field changes recorded.</p>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {first}–{last} of {total} event{total === 1 ? "" : "s"}.
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page - 1, filters)}>
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="size-4" />
              Previous
            </Button>
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {last < total ? (
            <Button asChild variant="outline" size="sm">
              <Link href={pageHref(page + 1, filters)}>
                Next
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
