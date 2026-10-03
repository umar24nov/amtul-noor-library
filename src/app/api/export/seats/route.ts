import { getSeatsForExport } from "@/lib/export";
import { buildSeatsWorkbook } from "@/lib/export-workbook";
import { exportFilename, requireSession, workbookResponse } from "@/lib/export-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const rows = await getSeatsForExport();
  const workbook = buildSeatsWorkbook(rows);

  return workbookResponse(workbook, exportFilename(["amtul-noor-library", "seats"]));
}