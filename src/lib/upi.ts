import { LIBRARY_UPI_ID, LIBRARY_UPI_NAME } from "@/lib/constants";

/** Whether a UPI address has been set yet; the pay UI is hidden until then. */
export function upiIsConfigured(): boolean {
  return LIBRARY_UPI_ID.trim().length > 0;
}

/**
 * The `upi://pay` deep link behind the "pay now" buttons. `am` is a whole
 * number of rupees because that is what every UPI app accepts.
 *
 * The QR codes shown on the site are the owner's own bank-generated image
 * (`LIBRARY_UPI_QR_PATH`), so this exists for the phone where an app link beats
 * a scan.
 */
export function upiPayLink(amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: LIBRARY_UPI_ID.trim(),
    pn: LIBRARY_UPI_NAME,
    am: String(Math.round(amount)),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}