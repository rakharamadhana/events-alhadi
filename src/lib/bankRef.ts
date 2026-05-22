/** Bank transfer memo: no hyphens (e.g. EVT-ABC → EVTABC). */
export function formatBankRefForTransfer(
  bankRef: string | null | undefined,
): string {
  if (!bankRef) return "";
  return bankRef.replace(/-/g, "");
}
