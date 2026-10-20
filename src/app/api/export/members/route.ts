import { getMembersForExport } from "@/lib/export";
import { buildMembersWorkbook } from "@/lib/export-workbook";
import { exportFilename, requireExport, workbookResponse } from "@/lib/export-response";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireExport("REPORTS");
  if (denied) return denied;

  const rows = await getMembersForExport();
  const workbook = await buildMembersWorkbook(rows);

  return workbookResponse(workbook, exportFilename(["amtul-noor-library", "members"]));
}