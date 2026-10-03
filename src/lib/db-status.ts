import { prisma } from "@/lib/prisma";

/**
 * True when PostgreSQL answers. Used to show a helpful screen instead of a stack
 * trace when the local database has not been started.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}