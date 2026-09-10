"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiEnvelope, apiList, qs, type Pagination } from "@/lib/api";
import { useDebounced } from "@/lib/use-debounce";
import { DEFAULT_PAGE_SIZE, type Pager } from "@/lib/use-pagination";

const LIMITS = new Set([10, 25, 50, 100]);

function num(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function paramKey(base: string, namespace?: string) {
  return namespace ? `${namespace}_${base}` : base;
}

export type ListParams = {
  search: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  status: string;
  from: string;
  to: string;
  [key: string]: string | number;
};

export function useListState(opts?: {
  extraKeys?: string[];
  extraLabels?: Record<string, string>;
  defaultLimit?: number;
  defaultSort?: string;
  namespace?: string;
}) {
  const extraKeys = opts?.extraKeys ?? [];
  const extraLabels = opts?.extraLabels ?? {};
  const defaultLimit = opts?.defaultLimit ?? DEFAULT_PAGE_SIZE;
  const ns = opts?.namespace;
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const search = sp.get(paramKey("search", ns)) || sp.get(paramKey("q", ns)) || (!ns ? sp.get("q") || "" : "");
  const page = Math.max(1, num(sp.get(paramKey("page", ns)), 1));
  const parsedLimit = num(sp.get(paramKey("limit", ns)), defaultLimit);
  const limit = LIMITS.has(parsedLimit) ? parsedLimit : defaultLimit;
  const sortBy = sp.get(paramKey("sortBy", ns)) || opts?.defaultSort || "";
  const sortOrder = sp.get(paramKey("sortOrder", ns)) === "asc" ? "asc" : "desc";
  const status = sp.get(paramKey("status", ns)) || "";
  const from = sp.get(paramKey("from", ns)) || "";
  const to = sp.get(paramKey("to", ns)) || "";
  const extras = Object.fromEntries(extraKeys.map((k) => [k, sp.get(paramKey(k, ns)) || ""]));

  const [draft, setDraft] = useState(search);
  const debounced = useDebounced(draft, 400);

  useEffect(() => {
    setDraft(search);
  }, [search]);

  const replace = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [rawKey, value] of Object.entries(patch)) {
        const key = paramKey(rawKey, ns);
        if (value == null || value === "" || (rawKey === "page" && Number(value) === 1) || (rawKey === "limit" && Number(value) === defaultLimit) || (rawKey === "sortOrder" && value === "desc" && !patch.sortBy && !params.get(paramKey("sortBy", ns)))) {
          params.delete(key);
          continue;
        }
        params.set(key, String(value));
      }
      if (!ns) params.delete("q");
      const qsStr = params.toString();
      router.replace(qsStr ? `${pathname}?${qsStr}` : pathname, { scroll: false });
    },
    [sp, defaultLimit, pathname, router, ns],
  );

  useEffect(() => {
    if (debounced === search) return;
    replace({ search: debounced, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const setFilter = useCallback(
    (key: string, value: string) => {
      replace({ [key]: value, page: 1 });
    },
    [replace],
  );

  const reset = useCallback(() => {
    setDraft("");
    if (!ns) {
      router.replace(pathname, { scroll: false });
      return;
    }
    const params = new URLSearchParams(sp.toString());
    const keys = ["search", "q", "page", "limit", "sortBy", "sortOrder", "status", "from", "to", ...extraKeys];
    for (const k of keys) params.delete(paramKey(k, ns));
    const qsStr = params.toString();
    router.replace(qsStr ? `${pathname}?${qsStr}` : pathname, { scroll: false });
  }, [pathname, router, ns, sp, extraKeys]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; value: string }[] = [];
    if (search) chips.push({ key: "search", label: "Search", value: search });
    if (status) chips.push({ key: "status", label: "Status", value: status });
    if (from) chips.push({ key: "from", label: "From", value: from });
    if (to) chips.push({ key: "to", label: "To", value: to });
    for (const k of extraKeys) {
      if (extras[k]) chips.push({ key: k, label: extraLabels[k] ?? k, value: extras[k] });
    }
    return chips;
  }, [search, status, from, to, extraKeys, extras, extraLabels]);

  const params: ListParams = {
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    status,
    from,
    to,
    ...extras,
  };

  const queryParams = {
    search: search || undefined,
    page,
    limit,
    sortBy: sortBy || undefined,
    sortOrder: sortBy ? sortOrder : undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    ...Object.fromEntries(Object.entries(extras).map(([k, v]) => [k, v || undefined])),
  };

  const hasFilters = activeFilters.length > 0;
  const searching = draft !== search;

  return {
    draft,
    setDraft,
    search,
    page,
    limit,
    sortBy,
    sortOrder,
    status,
    from,
    to,
    extras,
    params,
    queryParams,
    setPage: (p: number) => replace({ page: p }),
    setLimit: (n: number) => replace({ limit: n, page: 1 }),
    setSort: (by: string) => replace({ sortBy: by, sortOrder: sortBy === by && sortOrder === "asc" ? "desc" : "asc", page: 1 }),
    setFilter,
    reset,
    replace,
    activeFilters,
    hasFilters,
    searching,
  };
}

export function toPager(
  pagination: Pagination | undefined,
  setPage: (p: number) => void,
  setPageSize: (n: number) => void,
): Pager {
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.limit ?? DEFAULT_PAGE_SIZE;
  const total = pagination?.total ?? 0;
  const pageCount = pagination?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { page, pageSize, total, pageCount, from, to, setPage, setPageSize };
}

type ServerListOpts = {
  extraKeys?: string[];
  extraLabels?: Record<string, string>;
  defaultLimit?: number;
  defaultSort?: string;
  enabled?: boolean;
  namespace?: string;
  fixedParams?: Record<string, string | number | boolean | undefined>;
};

export function useServerList<T>(key: string | (string | number | undefined)[], path: string, opts?: ServerListOpts) {
  const state = useListState(opts);
  const queryParams = { ...state.queryParams, ...opts?.fixedParams };
  const query = useQuery({
    queryKey: Array.isArray(key) ? [...key, queryParams] : [key, queryParams],
    queryFn: ({ signal }) => apiList<T>(`${path}${qs(queryParams)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
  });
  const pagination = query.data?.pagination;
  const pager = toPager(pagination, state.setPage, state.setLimit);
  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && pagination.page > pagination.totalPages) {
      state.setPage(pagination.totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.page, pagination?.totalPages]);
  return {
    ...state,
    query,
    rows: query.data?.data ?? [],
    pagination,
    pager,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useServerEnvelope<T>(key: string | (string | number | undefined)[], path: string, opts?: ServerListOpts) {
  const state = useListState(opts);
  const queryParams = { ...state.queryParams, ...opts?.fixedParams };
  const query = useQuery({
    queryKey: Array.isArray(key) ? [...key, queryParams] : [key, queryParams],
    queryFn: ({ signal }) => apiEnvelope<T>(`${path}${qs(queryParams)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled ?? true,
  });
  const pagination = query.data?.pagination;
  const pager = toPager(pagination, state.setPage, state.setLimit);
  useEffect(() => {
    if (pagination && pagination.totalPages > 0 && pagination.page > pagination.totalPages) {
      state.setPage(pagination.totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination?.page, pagination?.totalPages]);
  return {
    ...state,
    query,
    payload: query.data?.data,
    pagination,
    pager,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
