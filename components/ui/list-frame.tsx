"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Button,
  DataTable,
  DateRangeFilter,
  EmptyState,
  ErrorState,
  FilterChips,
  FilterPopover,
  FilterSelect,
  SearchInput,
  TableLoadingSkeleton,
  TablePagination,
  TableToolbar,
} from "@/components/ui";
import type { Pager } from "@/lib/use-pagination";
import { emptyHintFor } from "@/lib/help";

export type ListController = {
  draft: string;
  setDraft: (v: string) => void;
  searching: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  rows: unknown[];
  hasFilters: boolean;
  reset: () => void;
  status: string;
  from: string;
  to: string;
  setFilter: (k: string, v: string) => void;
  activeFilters: { key: string; label: string; value: string }[];
  pager: Pager;
};

export function ListFrame({
  list,
  searchPlaceholder = "Search…",
  statusOptions,
  dateFilter,
  extraFilters,
  moreFilters,
  moreCount,
  emptyTitle = "No records found",
  emptyHint,
  emptyAction,
  columnCount = 6,
  children,
  toolbarEnd,
}: {
  list: ListController;
  searchPlaceholder?: string;
  statusOptions?: { value: string; label: string }[];
  dateFilter?: boolean;
  extraFilters?: ReactNode;
  moreFilters?: ReactNode;
  moreCount?: number;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  columnCount?: number;
  children: ReactNode;
  toolbarEnd?: ReactNode;
}) {
  const pathname = usePathname();
  const empty = list.hasFilters ? "No records match your current filters." : emptyTitle;
  const hint = list.hasFilters ? "Try clearing filters or searching something else." : emptyHint ?? emptyHintFor(pathname);
  return (
    <>
      {list.isLoading ? <TableLoadingSkeleton columns={columnCount} rows={8} /> : null}
      {list.isError && !list.rows.length ? (
        <ErrorState message={(list.error as Error)?.message ?? "Could not load records."} onRetry={() => void list.refetch()} />
      ) : null}
      {!list.isLoading ? (
        <DataTable>
          <TableToolbar>
            <SearchInput
              value={list.draft}
              onChange={list.setDraft}
              placeholder={searchPlaceholder}
              loading={list.searching || (list.isFetching && !list.isLoading)}
            />
            {statusOptions?.length ? (
              <FilterSelect value={list.status} onChange={(v) => list.setFilter("status", v)} options={statusOptions} placeholder="Status" />
            ) : null}
            {dateFilter ? <DateRangeFilter from={list.from} to={list.to} onChange={(k, v) => list.setFilter(k, v)} /> : null}
            {extraFilters}
            {moreFilters ? <FilterPopover count={moreCount ?? 0}>{moreFilters}</FilterPopover> : null}
            {list.hasFilters ? (
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={list.reset}>
                Reset
              </Button>
            ) : null}
            {toolbarEnd}
          </TableToolbar>
          <FilterChips
            chips={list.activeFilters}
            onRemove={(k) => (k === "search" ? list.setDraft("") : list.setFilter(k, ""))}
            onClear={list.reset}
          />
          {list.isError && list.rows.length ? (
            <div className="px-3 py-2">
              <ErrorState message={(list.error as Error)?.message ?? "Could not load records."} onRetry={() => void list.refetch()} />
            </div>
          ) : null}
          {!list.rows.length ? (
            <EmptyState
              title={empty}
              hint={hint}
              action={
                list.hasFilters ? (
                  <Button type="button" variant="outline" size="sm" onClick={list.reset}>
                    Clear filters
                  </Button>
                ) : (
                  emptyAction
                )
              }
            />
          ) : (
            children
          )}
          <TablePagination {...list.pager} />
        </DataTable>
      ) : null}
    </>
  );
}
