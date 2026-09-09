"use client";

import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

const EMPTY: never[] = [];

export type Pager = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function usePagedRows<T>(items: T[] | undefined | null, initialSize: number = DEFAULT_PAGE_SIZE) {
  const list = items ?? (EMPTY as T[]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  const rows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function changeSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const pager: Pager = {
    page,
    pageSize,
    total,
    pageCount,
    from,
    to,
    setPage,
    setPageSize: changeSize,
  };

  return { rows, pager };
}
