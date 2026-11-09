import {
  LIBRARY_BANK_ACCOUNT_HOLDER,
  LIBRARY_BANK_ACCOUNT_NUMBER,
  LIBRARY_BANK_IFSC,
} from "@/lib/constants";

/** Bank transfer (NEFT) details are always configured for display. */
export function bankDetailsConfigured(): boolean {
  return (
    LIBRARY_BANK_ACCOUNT_HOLDER.trim().length > 0 &&
    LIBRARY_BANK_ACCOUNT_NUMBER.trim().length > 0 &&
    LIBRARY_BANK_IFSC.trim().length > 0
  );
}

export function getBankDetails() {
  return {
    accountHolder: LIBRARY_BANK_ACCOUNT_HOLDER,
    accountNumber: LIBRARY_BANK_ACCOUNT_NUMBER,
    ifsc: LIBRARY_BANK_IFSC,
  };
}