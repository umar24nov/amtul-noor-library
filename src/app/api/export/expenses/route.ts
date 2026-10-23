import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireExport } from "@/lib/export-response";
import { buildExpensesWorkbook } from "@/lib/export-workbook";

export async function GET() {
  await requireExport("REPORTS");
  const expenses = await prisma.expense.findMany({
    orderBy: [{ date: "asc" }, { id: "asc" }],
  });

  const buffer = await buildExpensesWorkbook(expenses);
  const filename = `amtul-noor-library-expenses-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
