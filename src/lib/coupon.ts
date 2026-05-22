/** Normalize coupon codes for comparison (trim, uppercase, no spaces). */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidDiscountPercent(percent: number): boolean {
  return Number.isInteger(percent) && percent >= 1 && percent <= 100;
}

/** Per-seat price after percentage discount (2 decimal places). */
export function applySeatDiscount(price: number, discountPercent: number): number {
  const discounted = price * (1 - discountPercent / 100);
  return Math.round(discounted * 100) / 100;
}

export function sumDiscountedSeatPrices(
  prices: number[],
  discountPercent: number,
): number {
  const total = prices.reduce(
    (sum, price) => sum + applySeatDiscount(price, discountPercent),
    0,
  );
  return Math.round(total * 100) / 100;
}

export function sumSeatPrices(prices: number[]): number {
  const total = prices.reduce((sum, price) => sum + price, 0);
  return Math.round(total * 100) / 100;
}

export type EventCouponConfig = {
  couponCode: string | null;
  couponDiscountPercent: number | null;
};

export function resolveEventCoupon(
  config: EventCouponConfig,
  enteredCode: string | null | undefined,
): { discountPercent: number; normalizedCode: string } | null {
  const storedCode = config.couponCode?.trim();
  const percent = config.couponDiscountPercent;
  if (!storedCode || percent == null || !isValidDiscountPercent(percent)) {
    return null;
  }

  const normalizedEntered = normalizeCouponCode(enteredCode || "");
  if (!normalizedEntered) return null;

  const normalizedStored = normalizeCouponCode(storedCode);
  if (normalizedEntered !== normalizedStored) return null;

  return { discountPercent: percent, normalizedCode: normalizedStored };
}
