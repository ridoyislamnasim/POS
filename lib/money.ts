/** Match backend ROUND_HALF_UP at 2 decimals for POS display totals. */
export function roundMoney(value: number, scale = 2): number {
  const f = 10 ** scale;
  return Math.round((Number(value) + Number.EPSILON) * f) / f;
}

export function lineCharge(input: {
  unitPrice: number;
  qty: number;
  discount?: number;
  taxRatePercent?: number;
}) {
  const extended = Number(input.unitPrice) * Number(input.qty);
  const after = Math.max(extended - Number(input.discount ?? 0), 0);
  const taxable = roundMoney(after);
  const tax = roundMoney(taxable * (Number(input.taxRatePercent ?? 0) / 100));
  return { taxable, tax, lineTotal: roundMoney(taxable + tax) };
}
