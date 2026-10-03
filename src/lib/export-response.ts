import { getSession } from "@/lib/auth";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Guards an export endpoint. The proxy already redirects anonymous requests, but
 * an API call should answer 401 rather than hand back a login page.
 */
export async function requireSession(): Promise<Response | null> {
  const session = await getSession();
  if (session) return null;
  return new Response("Not signed in.", { status: 401 });
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