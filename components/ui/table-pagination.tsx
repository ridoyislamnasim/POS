"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PAGE_SIZE_OPTIONS, type Pager } from "@/lib/use-pagination";
import { Button } from "@/components/ui/button";

function pageWindow(page: number, pageCount: number) {
  const span = 2;
  let start = Math.max(1, page - span);
  let end = Math.min(pageCount, page + span);
  if (end - start < span * 2) {
    start = Math.max(1, end - span * 2);
    end = Math.min(pageCount, start + span * 2);
  }
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

export function TablePagination({
  page,
  pageSize,
  total,
  pageCount,
  from,
  to,
  setPage,
  setPageSize,
  className,
}: Pager & { className?: string }) {
  const pages = pageWindow(page, pageCount);
  const canPrev = page > 1;
  const canNext = page < pageCount;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-gradient-to-r from-sky-50 via-white to-violet-50 px-3 py-2.5",
        className,
      )}
    >
      <p className="text-xs text-slate-600">
        Showing <span className="font-semibold text-slate-900">{from}</span>–
        <span className="font-semibold text-slate-900">{to}</span> of{" "}
        <span className="font-semibold text-slate-900">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          Rows
          <select
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-0.5">
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!canPrev} onClick={() => setPage(1)} aria-label="First page">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!canPrev} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages[0] > 1 ? <span className="px-1 text-xs text-slate-400">…</span> : null}
          {pages.map((n) => (
            <Button
              key={n}
              type="button"
              size="icon"
              variant={n === page ? "default" : "outline"}
              className={cn("h-8 w-8 text-xs", n === page && "bg-violet-600 hover:bg-violet-700")}
              onClick={() => setPage(n)}
            >
              {n}
            </Button>
          ))}
          {pages[pages.length - 1] < pageCount ? <span className="px-1 text-xs text-slate-400">…</span> : null}
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!canNext} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={!canNext} onClick={() => setPage(pageCount)} aria-label="Last page">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
