"use client";

import { keepPreviousData, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { api, qs } from "@/lib/api";
import { getQueryClient } from "@/lib/query-client";

export const DASH_STALE = 20_000;

export function dashQs(period: string, branchId: string | null, extra?: Record<string, string | undefined>) {
  return qs({ period, branchId: branchId || undefined, ...extra });
}

export function DashQueryProvider({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: getQueryClient() }, children);
}

export function useDashQuery<T>(name: string, path: string, period: string, branchId: string | null) {
  return useQuery({
    queryKey: ["dash", name, period, branchId],
    queryFn: () => api<T>(path),
    staleTime: DASH_STALE,
    placeholderData: keepPreviousData,
  });
}

export function useDashBranchQuery<T>(name: string, path: string, branchId: string | null) {
  return useQuery({
    queryKey: ["dash", name, branchId],
    queryFn: () => api<T>(path),
    staleTime: DASH_STALE,
  });
}
