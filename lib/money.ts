/** Match backend ROUND_HALF_UP at 2 decimals for POS display totals. */
export function roundMoney(value: number, scale = 2): number {
  const f = 10 ** scale;
  return Math.round((Number(value) + Number.EPSILON) * f) / f;
}

/** Percent of a base amount, rounded with the backend's rule (0 when percent <= 0). */
export function percentAmount(value: number, percent: number): number {
  const p = Number(percent);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return roundMoney(Number(value) * (p / 100));
}

/**
 * Discount on a single line. Percent applies to the extended price (unit price × qty),
 * flat is an absolute amount — either or both. Clamped to the extended price, never negative.
 * Mirrors backend/src/shared/money.ts itemDiscountAmount.
 */
export function itemDiscountAmount(input: {
  unitPrice: number;
  qty: number;
  flat?: number;
  percent?: number;
}): number {
  const extended = roundMoney(Number(input.unitPrice) * Number(input.qty));
  const raw = Number(input.flat ?? 0) + percentAmount(extended, input.percent ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return roundMoney(Math.min(Math.max(raw, 0), extended));
}

/**
 * Discount on the whole bill. Percent applies to the subtotal (before VAT), flat is an
 * absolute amount — either or both. Clamped to the subtotal, never negative.
 * Mirrors backend/src/shared/money.ts transactionDiscountAmount.
 */
export function transactionDiscountAmount(input: {
  subtotal: number;
  flat?: number;
  percent?: number;
}): number {
  const subtotal = roundMoney(Number(input.subtotal));
  const raw = Number(input.flat ?? 0) + percentAmount(subtotal, input.percent ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return roundMoney(Math.min(Math.max(raw, 0), subtotal));
}

export function lineCharge(input: {
  unitPrice: number;
  qty: number;
  discount?: number;
  discountPercent?: number;
  taxRatePercent?: number;
}) {
  const extended = roundMoney(Number(input.unitPrice) * Number(input.qty));
  const discount = itemDiscountAmount({
    unitPrice: Number(input.unitPrice),
    qty: Number(input.qty),
    flat: input.discount ?? 0,
    percent: input.discountPercent ?? 0,
  });
  const after = Math.max(extended - discount, 0);
  const taxable = roundMoney(after);
  const tax = roundMoney(taxable * (Number(input.taxRatePercent ?? 0) / 100));
  return { extended, discount, taxable, tax, lineTotal: roundMoney(taxable + tax) };
}
