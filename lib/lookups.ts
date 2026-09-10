"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Named = { id: string; name: string };
export type VariantOption = { id: string; sku: string; cost?: string | null; name?: string; productId?: string };

export function useNamedList(key: string, path: string, enabled = true) {
  return useQuery({
    queryKey: [key, "lookup"],
    queryFn: () => api<Named[]>(`${path}${path.includes("?") ? "&" : "?"}limit=100`),
    enabled,
    staleTime: 30_000,
  });
}

export function useVariantOptions(enabled = true) {
  return useQuery({
    queryKey: ["variants-lookup"],
    queryFn: () => api<VariantOption[]>("/api/v1/catalog/variants?limit=100"),
    enabled,
    staleTime: 30_000,
  });
}
