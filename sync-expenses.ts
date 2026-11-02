import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import ExcelJS from 'exceljs';
import { nextExpenseId } from './src/lib/ids';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('Library.xlsx');
  const ws = wb.worksheets[0];
  
  const excelEntries: Array<{date: string, amount: number, purpose: string}> = [];
  let lastDate = '';
  
  for (let i = 4; i <= 76; i++) {
    const r = ws.getRow(i);
    const d = r.getCell(1).value;
    const amt = r.getCell(2).value;
    const p = r.getCell(3).value;
    if ((amt === null || amt === undefined) && !p) continue;
    
    let ds = '';
    if (d instanceof Date) {
      ds = d.toISOString().slice(0, 10);
      lastDate = ds;
    } else if (d && String(d).trim()) {
      ds = String(d).trim().slice(0, 10);
      lastDate = ds;
    } else {
      ds = lastDate;
    }
    
    const purpose = String(p || '').trim();
    const amount = Number(amt) || 0;
    
    // Skip the AC split lines - we'll add them as one
    if (purpose.includes('AC Mechanic') || purpose.includes('AC Gas') || purpose.includes('Pipe, Tape, Sensor')) {
      continue;
    }
    
    excelEntries.push({ date: ds, amount, purpose });
  }
  
  // Add consolidated AC expense
  excelEntries.push({ date: '2026-06-06', amount: 5805, purpose: 'AC Expense' });
  
  // Clear existing expenses and reimport
  await prisma.expense.deleteMany({});
  
  for (let idx = 0; idx < excelEntries.length; idx++) {
    const entry = excelEntries[idx];
    await prisma.expense.create({
      data: {
        expenseId: await nextExpenseId(prisma),
        date: new Date(entry.date + 'T00:00:00.000Z'),
        amount: entry.amount,
        purpose: entry.purpose,
        category: null,
        paidTo: null,
        remarks: null,
      },
    });
  }
  
  const total = excelEntries.reduce((s, e) => s + e.amount, 0);
  console.log('Synced', excelEntries.length, 'entries, total:', total);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
