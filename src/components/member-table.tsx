"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUpDown, Pencil, Eye } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { LoadMoreFooter } from "@/components/load-more-footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MemberForm, type SeatOption } from "@/components/member-form";
import { SubmitButton } from "@/components/submit-button";
import { MemberStatusBadge } from "@/components/status-badges";
import { DeleteMemberButton } from "@/components/delete-member-button";
import { formatDate, todayInputValue } from "@/lib/format";
import { markMemberLeftAction, updateMemberAction, loadMoreMembersAction, getMemberForEdit } from "@/app/(app)/members/actions";
import type { MemberWithSeat } from "@/lib/queries";
import { DEFAULT_MEMBER_SORT, STICKY_HEADER_CELL, type MemberSort } from "@/lib/constants";

export type EditableMember = {
  id: number;
  memberId: string;
  name: string;
  mobile: string | null;
  email: string | null;
  guardianName: string | null;
  guardianMobile: string | null;
  joiningDate: Date;
  remarks: string | null;
  seatId: number | null;
  status: MemberWithSeat["status"];
  /** The seat relation, when the row was loaded with one. */
  seat?: MemberWithSeat["seat"] | null;
  /** Fee this member pays; pre-fills the edit dialog. */
  defaultFee: number;
};

/** The active filters, sent back to the server when the next batch is needed. */
export type MemberListQuery = {
  q?: string;
  status?: string;
  room?: string;
  sort?: string;
};

function seatText(member: EditableMember): string {
  if (!member.seat) return "—";
  return `${member.seat.room ? `${member.seat.room.name} · ` : ""}${member.seat.seatNumber}`;
}

/**
 * The edit dialog lists every seat the member could keep, but the page only
 * hands over seats that are free right now. A member who already sits on a
 * seat must still see that seat so the select can show it: an occupied seat
 * has no option otherwise and the chosen seat silently appears as
 * "No seat / assign later".
 */
function dialogSeats(member: EditableMember, seats: SeatOption[]): SeatOption[] {
  if (!member.seat || seats.some((seat) => seat.id === member.seat!.id)) return seats;
  return [
    {
      id: member.seat.id,
      label: `${member.seat.room ? `${member.seat.room.name} · ` : ""}Seat ${member.seat.seatNumber}`,
    },
    ...seats,
  ];
}

function MarkLeftDialog({
  member,
  seat,
  onUpdated,
}: {
  member: EditableMember;
  seat: string;
  onUpdated: (member: EditableMember) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto">
          Mark as Left
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {member.name} as Left?</AlertDialogTitle>
          <AlertDialogDescription>
            This keeps all personal details and payment history. {seat !== "—" ? `Seat ${seat} will be released and become available again.` : "No seat is currently assigned."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={async (formData) => {
            await markMemberLeftAction(formData);
            const fresh = await getMemberForEdit(member.id);
            if (fresh) onUpdated(fresh);
            setOpen(false);
            toast.success(`${member.name} marked as Left. Seat released.`);
          }}
        >
          <input type="hidden" name="memberId" value={member.id} />
          <div className="grid gap-1.5 py-2">
            <label htmlFor={`leaving-${member.id}`} className="text-sm font-medium">
              Leaving date
            </label>
            <input
              id={`leaving-${member.id}`}
              name="leavingDate"
              type="date"
              defaultValue={todayInputValue()}
              required
              className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10">Cancel</AlertDialogCancel>
            <SubmitButton variant="destructive" pendingLabel="Marking…">
              Yes, mark as Left
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditDialog({
  member,
  seats,
  onUpdated,
}: {
  member: EditableMember;
  seats: SeatOption[];
  onUpdated: (member: EditableMember) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Update the permanent record for {member.name} ({member.memberId}).
          </DialogDescription>
        </DialogHeader>
        <MemberForm
          action={async (prev, formData) => {
            const result = await updateMemberAction(prev, formData);
            if (result.status === "success") {
              const fresh = await getMemberForEdit(member.id);
              if (fresh) onUpdated(fresh);
              setOpen(false);
            }
            return result;
          }}
          showPayment={false}
          submitLabel="Save changes"
          seats={seats}
          defaultFee={member.defaultFee}
          defaults={{
            memberId: member.memberId,
            name: member.name,
            mobile: member.mobile ?? undefined,
            email: member.email ?? undefined,
            guardianName: member.guardianName ?? undefined,
            guardianMobile: member.guardianMobile ?? undefined,
            // A LEFT member being brought back starts a fresh term, so the field
            // opens on today. Saving with a seat marks the away months as not
            // applicable, matching the member detail page.
            joiningDate:
              member.status === "LEFT"
                ? todayInputValue()
                : member.joiningDate.toISOString().slice(0, 10),
            remarks: member.remarks ?? undefined,
            seatId: member.seatId,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function RowActions({
  member,
  seats,
  onUpdated,
}: {
  member: EditableMember;
  seats: SeatOption[];
  onUpdated: (member: EditableMember) => void;
}) {
  const seat = seatText(member);

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button asChild variant="outline" size="sm" className="h-9">
        <a href={`/members/${member.id}`}>
          <Eye className="size-3.5" />
          View
        </a>
      </Button>
      <EditDialog member={member} seats={dialogSeats(member, seats)} onUpdated={onUpdated} />
      {member.status === "ACTIVE" ? (
        <MarkLeftDialog member={member} seat={seat} onUpdated={onUpdated} />
      ) : (
        <span className="px-2 text-xs text-muted-foreground">No seat</span>
      )}
      <DeleteMemberButton
        memberId={member.id}
        name={member.name}
        memberIdCode={member.memberId}
        compact
      />
    </div>
  );
}

export function MemberTable({
  members,
  seats,
  sort,
  sortBase = "",
  total: totalCount,
  query,
}: {
  members: EditableMember[];
  seats: SeatOption[];
  /** Current sort, so the matching column header can show which way it points. */
  sort?: MemberSort;
  /** Current filter query without `sort`, so headers keep the active filters. */
  sortBase?: string;
  /** How many members match the filters in total, for the scrolling footer. */
  total: number;
  /** Filters to replay when loading the next batch. */
  query: MemberListQuery;
}) {
  // The list grows by scrolling rather than paging. The page hands over the
  // first batch and remounts this component (via a key) whenever a filter
  // changes, so these start from a clean slate every time.
  const [rows, setRows] = useState(members);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const hasMore = rows.length < total;

  // Replaces a row with its fresh record after an in-table edit or leave, so
  // the next time that row's dialog opens it shows today's values, not the
  // ones from when the page first loaded.
  const refreshRow = useCallback(
    (fresh: EditableMember) => {
      setRows((current) =>
        current.map((row) => (row.id === fresh.id ? fresh : row)),
      );
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (loading || rows.length >= total) return;
    setLoading(true);
    try {
      const next = await loadMoreMembersAction({ ...query, page: page + 1 });
      setRows((current) => {
        // A row can arrive twice if a filter changed while a batch was in
        // flight; the id keeps the list free of duplicates.
        const seen = new Set(current.map((row) => row.id));
        return [...current, ...next.members.filter((row) => !seen.has(row.id))];
      });
      setTotal(next.total);
      setPage((current) => current + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, page, query, rows.length, total]);

  const sortHref = (next: MemberSort) => {
    const params = new URLSearchParams(sortBase);
    if (next !== DEFAULT_MEMBER_SORT) params.set("sort", next);
    const queryString = params.toString();
    return queryString ? `/members?${queryString}` : "/members";
  };

  const heading = (key: MemberSort, label: string) => {
    const active = sort === key;
    const content = (
      <span className="inline-flex items-center gap-1.5">
        {label}
        {active ? (
          <ArrowDown className="size-3" aria-hidden="true" />
        ) : (
          <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />
        )}
        <span className="sr-only">
          {active ? ", currently sorted" : ", activate to sort by this column"}
        </span>
      </span>
    );

    return (
      <th
        key={key}
        className={cn(STICKY_HEADER_CELL, "top-0")}
        aria-sort={active ? "ascending" : "none"}
      >
        <Link
          href={sortHref(key)}
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </Link>
      </th>
    );
  };

  return (
    /* One scroll box holds the whole list. The page underneath stays still no
       matter how many members there are, the table header sticks to the top of
       the box, and the loading sentinel at the end of the list sits inside the
       box, so scrolling it starts the next batch. */
    <div className="max-h-[65dvh] overflow-y-auto overscroll-contain rounded-xl border border-border bg-card md:max-h-[calc(100dvh-16rem)]">
      {/* Desktop / tablet table. The header cells use top-0 because their
          nearest scroll container is this box, not the page. */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              {heading("member-id", "Member ID")}
              {heading("name-asc", "Name")}
              <th className={cn(STICKY_HEADER_CELL, "top-0")}>Mobile</th>
              {heading("seat", "Seat")}
              {heading("oldest", "Joining date")}
              <th className={cn(STICKY_HEADER_CELL, "top-0")}>Status</th>
              <th className={cn(STICKY_HEADER_CELL, "top-0 text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((member) => (
              <tr key={member.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                  {member.memberId}
                </td>
                <td className="px-3 py-2.5 font-medium">{member.name}</td>
                <td className="px-3 py-2.5 tabular-nums">{member.mobile}</td>
                <td className="px-3 py-2.5 tabular-nums">{seatText(member)}</td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                  {formatDate(member.joiningDate)}
                </td>
                <td className="px-3 py-2.5">
                  <MemberStatusBadge status={member.status} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <RowActions member={member} seats={seats} onUpdated={refreshRow} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards, in the same scroll box so the page stays still. */}
      <div className="grid gap-2.5 p-2 md:hidden">
        {rows.map((member) => (
          <div key={member.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{member.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{member.memberId}</p>
              </div>
              <MemberStatusBadge status={member.status} />
            </div>

            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Mobile</dt>
                <dd className="tabular-nums">{member.mobile}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Seat</dt>
                <dd className="tabular-nums">{seatText(member)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Joining date</dt>
                <dd className="tabular-nums">{formatDate(member.joiningDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Guardian</dt>
                <dd className="truncate">{member.guardianName || "—"}</dd>
              </div>
            </dl>

            <div className="mt-3 flex gap-2">
              <Button asChild variant="secondary" size="sm" className="h-10 flex-1">
                <a href={`/members/${member.id}`}>View</a>
              </Button>
              <EditDialog member={member} seats={dialogSeats(member, seats)} onUpdated={refreshRow} />
            </div>

            {member.status === "ACTIVE" && (
              <div className="mt-2">
                <MarkLeftDialog member={member} seat={seatText(member)} onUpdated={refreshRow} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <LoadMoreFooter
          loaded={rows.length}
          total={total}
          unit="members"
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
