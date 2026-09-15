"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { PAGE_SIZE_OPTIONS, type Pager } from "@/lib/use-pagination";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/action-tooltip";

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
        "flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/25 px-2 py-1.5 animate-in fade-in duration-150 sm:px-3",
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground sm:text-xs">
        <span className="tabular-nums">
          {from}–{to}
        </span>{" "}
        of <span className="font-medium tabular-nums text-foreground">{total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
          Rows
          <select
            className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] font-medium text-foreground transition-colors sm:text-xs"
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
          <ActionTooltip label="First page" side="top">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={!canPrev} onClick={() => setPage(1)} aria-label="First page">
              <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </ActionTooltip>
          <ActionTooltip label="Previous page" side="top">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={!canPrev} onClick={() => setPage(page - 1)} aria-label="Previous page">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </ActionTooltip>
          {pages[0] > 1 ? <span className="px-0.5 text-[10px] text-muted-foreground">…</span> : null}
          {pages.map((n) => (
            <Button
              key={n}
              type="button"
              size="icon"
              variant={n === page ? "warning" : "outline"}
              className={cn("h-7 w-7 text-[11px] tabular-nums transition-colors", n === page && "pointer-events-none")}
              aria-label={`Page ${n}`}
              aria-current={n === page ? "page" : undefined}
              onClick={() => setPage(n)}
            >
              {n}
            </Button>
          ))}
          {pages[pages.length - 1] < pageCount ? <span className="px-0.5 text-[10px] text-muted-foreground">…</span> : null}
          <ActionTooltip label="Next page" side="top">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={!canNext} onClick={() => setPage(page + 1)} aria-label="Next page">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </ActionTooltip>
          <ActionTooltip label="Last page" side="top">
            <Button type="button" variant="outline" size="icon" className="h-7 w-7" disabled={!canNext} onClick={() => setPage(pageCount)} aria-label="Last page">
              <ChevronsRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
}
