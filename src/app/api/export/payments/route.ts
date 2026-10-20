import { getPaymentsForExport } from "@/lib/export";
import { buildPaymentsWorkbook } from "@/lib/export-workbook";
import { exportFilename, requireExport, workbookResponse } from "@/lib/export-response";
import { formatMonth } from "@/lib/format";
import { paymentModeLabels, paymentStatusLabels } from "@/lib/constants";
import type { PaymentMode, PaymentStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function GET(request: Request) {
  const denied = await requireExport("REPORTS");
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const month = MONTH.test(params.get("month") ?? "") ? params.get("month")! : undefined;
  const memberId = params.get("memberId")?.trim().toUpperCase() || undefined;

  const rawMode = params.get("mode") ?? "ALL";
  const mode = (rawMode in paymentModeLabels ? rawMode : "ALL") as PaymentMode | "ALL";

  const rawStatus = params.get("status") ?? "ALL";
  const status = (rawStatus in paymentStatusLabels ? rawStatus : "ALL") as
    | PaymentStatus
    | "ALL";

  const data = await getPaymentsForExport({ month, memberId, mode, status });

  const parts = ["amtul-noor-library", "payments"];
  if (month) parts.push(month);
  else parts.push("all-months");
  if (memberId) parts.push(memberId);
  if (mode !== "ALL") parts.push(mode.toLowerCase());
  if (status !== "ALL") parts.push(status.toLowerCase());

  const scopeLabel = month
    ? `${formatMonth(month)}${memberId ? ` · ${memberId}` : ""}`
    : `All months${memberId ? ` · ${memberId}` : ""}`;

  const workbook = buildPaymentsWorkbook(data, scopeLabel);

  return workbookResponse(workbook, exportFilename(parts));
}