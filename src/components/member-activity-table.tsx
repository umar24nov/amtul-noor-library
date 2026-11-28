"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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

/** Split a sanitised "Label: value" summary line into a readable pair. */
function contextPairs(lines: string[]): Array<{ label: string; value: string }> {
  return lines.map((line) => {
    const split = line.indexOf(": ");
    return split === -1
      ? { label: "Note", value: line }
      : { label: line.slice(0, split), value: line.slice(split + 2) };
  });
}

function memberName(row: MemberActivityRow): string {
  return row.member?.name ?? row.memberLabel ?? "Deleted member";
}

function memberSub(row: MemberActivityRow): string {
  return row.member ? `${row.member.memberId} · ${row.member.status}` : "Member removed";
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
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

/** The full event record, opened by clicking any row in the activity list. */
function ActivityDetails({ row }: { row: MemberActivityRow }) {
  const context = contextPairs(summarizeActivityMetadata(row.metadata));
  const changes = formatActivityChanges(row.changes);

  return (
    <DialogContent
      className="w-[calc(100%-1rem)] max-w-lg p-0 sm:max-w-2xl [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:size-9 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-border [&_[data-slot=dialog-close]]:bg-background/90 [&_[data-slot=dialog-close]]:shadow-sm [&_[data-slot=dialog-scroll]]:max-h-[90dvh] [&_[data-slot=dialog-scroll]]:gap-0 [&_[data-slot=dialog-scroll]]:p-0"
    >
      <header className="relative border-b border-border bg-gradient-to-br from-muted/70 via-card to-card px-5 py-5 pr-16 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isAlert(row.action) ? "destructive" : "secondary"}>
            {actionLabel(row.action)}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">Event #{row.id}</span>
        </div>
        <DialogTitle className="font-heading mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
          {row.summary || actionLabel(row.action)}
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-sm">
          {memberName(row)} · {formatDateTime(row.createdAt)}
        </DialogDescription>
      </header>

      <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            At a glance
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Member
              </dt>
              <dd className="mt-1 break-words text-sm font-medium">{memberName(row)}</dd>
              <dd className="mt-0.5 break-words text-xs text-muted-foreground">
                {memberSub(row)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                When
              </dt>
              <dd className="mt-1 break-words text-sm font-medium tabular-nums">
                {formatDateTime(row.createdAt)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                IP address
              </dt>
              <dd className="mt-1 break-all font-mono text-sm font-medium">{row.ip || "—"}</dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Device
              </dt>
              <dd className="mt-1 break-words text-sm font-medium">
                {deviceFromMetadata(row.metadata)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actor
              </dt>
              <dd className="mt-1 break-words text-sm font-medium">{row.actorName || "—"}</dd>
            </div>
          </dl>
        </section>

        {context.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Context
            </h3>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {context.map(({ label, value }) => (
                <div key={label} className="flex min-w-0 items-start gap-2 text-sm">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Changed fields
          </h3>
          {changes.length > 0 ? (
            <>
              <div className="mt-3 hidden overflow-hidden rounded-xl border border-border sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Field</th>
                      <th className="px-3 py-2 font-semibold">Before</th>
                      <th className="px-3 py-2 font-semibold">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {changes.map((change, index) => (
                      <tr key={`${change.label}-${index}`} className="align-top">
                        <td className="px-3 py-2 font-medium">{change.label}</td>
                        <td className="px-3 py-2 break-words text-muted-foreground">{change.old}</td>
                        <td className="px-3 py-2 break-words">{change.new}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid gap-2 sm:hidden">
                {changes.map((change, index) => (
                  <div key={`${change.label}-${index}`} className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                    <p className="font-semibold">{change.label}</p>
                    <p className="mt-1.5 break-words text-xs text-muted-foreground">
                      Before · {change.old}
                    </p>
                    <p className="mt-1 break-words text-xs">After · {change.new}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              No field changes recorded.
            </p>
          )}
        </section>
      </div>

      <div className="border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
        <p className="text-xs text-muted-foreground">Read-only record · Event #{row.id}</p>
      </div>
    </DialogContent>
  );
}

/**
 * Read-only monitor for member events. Only sanitised summaries and field
 * diffs are rendered — never raw metadata JSON. Clicking a row opens its
 * full record in a dialog with a persistent close button on every screen.
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
  const [selected, setSelected] = useState<MemberActivityRow | null>(null);
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
      <Card className="overflow-hidden">
        <CardContent className="px-0">
          {/* Table for tablet and desktop. Every row opens the event details. */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${memberName(row)}`}
                    className="group cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => setSelected(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(row);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/15">
                          {initials(memberName(row))}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{memberName(row)}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {memberSub(row)}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">
                      <time dateTime={row.createdAt.toISOString()}>
                        {formatDateTime(row.createdAt)}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs">
                        {row.ip || "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {deviceFromMetadata(row.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards for phones — the list flows with the page and each card
              opens the same details dialog. */}
          <ul className="divide-y divide-border md:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  aria-label={`Open details for ${memberName(row)}`}
                  className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => setSelected(row)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary ring-1 ring-primary/15">
                    {initials(memberName(row))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{memberName(row)}</span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {memberSub(row)}
                    </span>
                    <span className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                      <span>
                        <span className="block font-semibold uppercase tracking-wider text-muted-foreground">
                          When
                        </span>
                        <time className="mt-0.5 block break-words tabular-nums" dateTime={row.createdAt.toISOString()}>
                          {formatDateTime(row.createdAt)}
                        </time>
                      </span>
                      <span>
                        <span className="block font-semibold uppercase tracking-wider text-muted-foreground">
                          IP
                        </span>
                        <span className="mt-0.5 block break-all font-mono">{row.ip || "—"}</span>
                      </span>
                      <span className="col-span-2">
                        <span className="block font-semibold uppercase tracking-wider text-muted-foreground">
                          Device
                        </span>
                        <span className="mt-0.5 block break-words text-muted-foreground">
                          {deviceFromMetadata(row.metadata)}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
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

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {selected && <ActivityDetails row={selected} />}
      </Dialog>
    </div>
  );
}
