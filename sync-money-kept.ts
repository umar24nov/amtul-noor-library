import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import ExcelJS from 'exceljs';
import { nextMoneyKeptId } from './src/lib/ids';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseMonthYear(monthName: string): Date {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const m = months[monthName.toLowerCase()];
  if (m !== undefined) {
    return new Date(2026, m, 1);
  }
  return new Date(2026, 0, 1);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('Library.xlsx');
  const ws = wb.worksheets[0];
  
  const entries: Array<{date: Date, person: string, amount: number}> = [];
  let currentMonth = new Date(2026, 5, 1); // June 2026
  
  for (let i = 4; i <= 35; i++) {
    const r = ws.getRow(i);
    const p = r.getCell(4).value;
    const a = r.getCell(5).value;
    
    if (!p) continue;
    const personStr = String(p).trim();
    
    // Check if it's a month header
    if (personStr.match(/^(June|July|August|September|October|November|December|January|February|March|April)\s*(\d{4})?$/i)) {
      currentMonth = parseMonthYear(personStr.replace(/\s*\d{4}$/, ''));
      continue;
    }
    
    if (personStr === 'Money I Kept') continue;
    
    const amount = Number(a) || 0;
    if (amount > 0) {
      entries.push({ date: currentMonth, person: personStr, amount });
    }
  }
  
  await prisma.moneyKept.deleteMany({});
  
  for (const entry of entries) {
    await prisma.moneyKept.create({
      data: {
        moneyKeptId: await nextMoneyKeptId(prisma),
        date: entry.date,
        amount: entry.amount,
        person: entry.person,
        purpose: null,
        remarks: null,
      },
    });
  }
  
  const total = entries.reduce((s, e) => s + e.amount, 0);
  console.log('Synced', entries.length, 'money kept entries, total:', total);
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
