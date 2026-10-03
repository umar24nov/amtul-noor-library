import * as XLSX from "xlsx";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { paymentModeLabels, paymentStatusLabels } from "@/lib/constants";
import type { ExportResult } from "@/lib/export";
import type { MemberExportRow, SeatExportRow } from "@/lib/export";

/** Money cells are written as numbers so Excel can total and chart them. */
const RUPEE_FORMAT = "#,##0";

type Sheet = { name: string; rows: Record<string, unknown>[]; widths?: number[] };

function toWorkbook(sheets: Sheet[]): Buffer {
  const book = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    worksheet["!cols"] = (sheet.widths ?? []).map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, worksheet, sheet.name);
  }

  const data = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return data;
}

function paymentSheets(data: ExportResult, scopeLabel: string): Sheet[] {
  const payments: Sheet = {
    name: "Payments",
    widths: [14, 10, 22, 14, 14, 8, 10, 14, 14, 12, 12, 24],
    rows: data.rows.map((row) => ({
      "Payment ID": row.paymentId,
      "Member ID": row.memberId,
      "Member": row.memberName,
      Mobile: row.mobile ?? "",
      // The seat a member holds today, so it is blank once they have left.
      "Current Room": row.roomName ?? "",
      "Current Seat": row.seatNumber ?? "",
      Month: row.month,
      Amount: row.amount,
      Mode: paymentModeLabels[row.mode],
      Status: paymentStatusLabels[row.status],
      Date: formatDate(row.paymentDate),
      Remarks: row.remarks ?? "",
    })),
  };

  const summary: Sheet = {
    name: "Summary",
    widths: [30, 16, 18],
    rows: [
      { Item: "Scope", Detail: scopeLabel, Amount: "" },
      { Item: "Generated", Detail: formatDate(new Date()), Amount: "" },
      { Item: "", Detail: "", Amount: "" },
      { Item: "Records", Detail: "", Amount: data.totals.records },
      { Item: "Total amount", Detail: "", Amount: data.totals.amount },
      { Item: "Paid", Detail: "", Amount: data.totals.paid },
      { Item: "Pending", Detail: "", Amount: data.totals.pending },
      { Item: "Waived", Detail: "", Amount: data.totals.waived },
      { Item: "On hold", Detail: "", Amount: data.totals.onHold },
      { Item: "", Detail: "", Amount: "" },
      { Item: "By month", Detail: "Records", Amount: "Amount" },
      ...data.byMonth.map((row) => ({
        Item: formatMonth(row.month),
        Detail: row.records,
        Amount: row.amount,
      })),
      { Item: "", Detail: "", Amount: "" },
      { Item: "By mode", Detail: "Records", Amount: "Amount" },
      ...data.byMode.map((row) => ({
        Item: paymentModeLabels[row.mode],
        Detail: row.records,
        Amount: row.amount,
      })),
      { Item: "", Detail: "", Amount: "" },
      { Item: "By status", Detail: "Records", Amount: "Amount" },
      ...data.byStatus.map((row) => ({
        Item: paymentStatusLabels[row.status],
        Detail: row.records,
        Amount: row.amount,
      })),
    ],
  };

  return [payments, summary];
}

export function buildPaymentsWorkbook(data: ExportResult, scopeLabel: string): Buffer {
  return toWorkbook(paymentSheets(data, scopeLabel));
}

export function buildMembersWorkbook(rows: MemberExportRow[]): Buffer {
  const sheet: Sheet = {
    name: "Members",
    widths: [10, 24, 14, 10, 10, 8, 12, 12, 10, 14],
    rows: rows.map((row) => ({
      "Member ID": row.memberId,
      Name: row.name,
      Mobile: row.mobile ?? "",
      Status: row.status,
      Room: row.roomName ?? "",
      Seat: row.seatNumber ?? "",
      Joined: row.joiningDate ? formatDate(row.joiningDate) : "",
      Left: row.leavingDate ? formatDate(row.leavingDate) : "",
      Payments: row.payments,
      Paid: row.paid,
    })),
  };

  const totals: Sheet = {
    name: "Summary",
    widths: [30, 16],
    rows: [
      { Item: "Generated", Detail: formatDate(new Date()) },
      { Item: "Members", Detail: rows.length },
      { Item: "Active", Detail: rows.filter((row) => row.status === "ACTIVE").length },
      { Item: "Left", Detail: rows.filter((row) => row.status === "LEFT").length },
      {
        Item: "Total paid",
        Detail: formatINR(rows.reduce((total, row) => total + row.paid, 0)),
      },
    ],
  };

  return toWorkbook([sheet, totals]);
}

export function buildSeatsWorkbook(rows: SeatExportRow[]): Buffer {
  const sheet: Sheet = {
    name: "Seats",
    widths: [12, 8, 12, 10, 24, 14, 12],
    rows: rows.map((row) => ({
      Room: row.room,
      Seat: row.seatNumber,
      Status: row.status,
      "Member ID": row.memberId ?? "",
      Member: row.memberName ?? "",
      Mobile: row.mobile ?? "",
      Joined: row.joiningDate ? formatDate(row.joiningDate) : "",
    })),
  };

  const occupied = rows.filter((row) => row.memberId).length;
  const totals: Sheet = {
    name: "Summary",
    widths: [30, 16],
    rows: [
      { Item: "Generated", Detail: formatDate(new Date()) },
      { Item: "Seats", Detail: rows.length },
      { Item: "Occupied", Detail: occupied },
      { Item: "Free", Detail: rows.length - occupied },
    ],
  };

  return toWorkbook([sheet, totals]);
}

export { RUPEE_FORMAT };