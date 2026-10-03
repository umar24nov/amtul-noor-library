import { getMembersForExport } from "@/lib/export";
import { buildMembersWorkbook } from "@/lib/export-workbook";
import { exportFilename, requireSession, workbookResponse } from "@/lib/export-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const rows = await getMembersForExport();
  const workbook = buildMembersWorkbook(rows);

  return workbookResponse(workbook, exportFilename(["amtul-noor-library", "members"]));
}