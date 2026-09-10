export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const RETURN_CONDITIONS = [
  { value: "GOOD", label: "Good / resellable" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "DEFECTIVE", label: "Defective" },
  { value: "EXPIRED", label: "Expired" },
  { value: "MISSING_PARTS", label: "Missing parts" },
  { value: "RESTOCK_NOT_ALLOWED", label: "Do not restock" },
] as const;

export const RECEIPT_KINDS = [
  { value: "PURCHASE", label: "Purchase" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "OPENING", label: "Opening stock" },
  { value: "CUSTOMER_RETURN", label: "Customer return" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "TRANSFER", label: "Transfer" },
] as const;

export const DAMAGE_REASONS = [
  { value: "BROKEN", label: "Broken" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DEFECTIVE", label: "Defective" },
  { value: "SPOILED", label: "Spoiled" },
  { value: "LOST", label: "Lost" },
  { value: "THEFT", label: "Theft" },
  { value: "HANDLING_DAMAGE", label: "Handling damage" },
  { value: "CUSTOMER_RETURN_DAMAGE", label: "Customer return damage" },
  { value: "SUPPLIER_DAMAGE", label: "Supplier damage" },
  { value: "OTHER", label: "Other" },
] as const;

export function statusVariant(status: string): "warning" | "destructive" | "success" | "secondary" | "info" {
  if (status === "PENDING" || status === "DRAFT" || status === "SUBMITTED") return "warning";
  if (status === "REJECTED" || status === "CANCELLED") return "destructive";
  if (status === "REFUNDED" || status === "COMPLETED" || status === "RECEIVED" || status === "STOCK_ADJUSTED" || status === "APPROVED") return "success";
  if (status === "PARTIALLY_REFUNDED") return "info";
  return "secondary";
}
