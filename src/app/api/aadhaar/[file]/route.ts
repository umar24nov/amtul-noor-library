import { readAadhaarScan } from "@/lib/aadhaar-storage";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";

/**
 * Streams one private Aadhaar scan to a signed-in person who may review
 * applications.
 *
 * A private blob has no usable public URL, so the admin panel cannot point an
 * <img> or <iframe> at Vercel Blob directly. It points here instead, and this
 * route checks the session before reading the file. The check lives in the
 * route itself, next to the read, rather than in middleware: a middleware
 * mistake must not be able to expose a scan.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Not signed in.", { status: 401 });
  if (!can(session, "APPLICATIONS")) return new Response("Not allowed.", { status: 403 });

  const { file } = await params;
  const scan = await readAadhaarScan(file);
  if (!scan) return new Response("Not found.", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";

  return new Response(scan.stream, {
    headers: {
      "Content-Type": scan.contentType,
      "Content-Length": String(scan.size),
      // The preview opens the file inline; the Download link asks for it as an
      // attachment. Aadhaar is PII, so nothing is cached on the way back.
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
