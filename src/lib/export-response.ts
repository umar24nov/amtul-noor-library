import { getSession } from "@/lib/auth";
import { canAny } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/permission-defs";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Guards an export endpoint. The proxy already redirects anonymous requests, but
 * an API call should answer 401 rather than hand back a login page, and a signed
 * in person still needs the area the sheet covers.
 */
export async function requireExport(key: PermissionKey): Promise<Response | null> {
  return requireExportAny([key]);
}

/**
 * The same guard for an area that more than one permission opens.
 *
 * A receipt PDF is part of looking at a payment, so the read-only payments
 * permission may fetch one as well.
 */
export async function requireExportAny(keys: PermissionKey[]): Promise<Response | null> {
  const session = await getSession();
  if (!session) return new Response("Not signed in.", { status: 401 });
  if (!canAny(session, keys)) return new Response("Not allowed.", { status: 403 });
  return null;
}

export function workbookResponse(buffer: Buffer, filename: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** A filename that is safe on Windows and still readable. */
export function exportFilename(parts: (string | number)[]): string {
  return `${parts.join("-").replace(/[^\w.-]+/g, "_")}.xlsx`;
}