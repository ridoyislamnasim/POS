"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, CircleHelp, Layers, PiggyBank, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filterLinks, helpForPath, helpNavHref, taskById, visibleTasks } from "@/lib/help";
import { cn } from "@/lib/cn";

export function HelpPanel({
  path,
  can,
  onNavigate,
  onOpenTask,
  onStartTour,
  className,
}: {
  path: string;
  can: (p: string) => boolean;
  onNavigate: (href: string) => void;
  onOpenTask?: (id: string) => void;
  onStartTour?: (id: string) => void;
  className?: string;
}) {
  const page = helpForPath(path);
  const next = page ? filterLinks(page.next, can) : [];
  const tasks = (page?.tasks ?? []).map(taskById).filter((t) => t && (!t.permission || can(t.permission)));

  if (!page) {
    return (
      <div className={cn("space-y-2 text-sm", className)}>
        <p className="text-muted-foreground">No extra notes for this screen. Search Help for a task.</p>
        <Link href="/help" className="text-sm font-medium text-primary hover:underline" onClick={() => onNavigate("/help")}>
          Open Help Center
        </Link>
      </div>
    );
  }

  const isCashFlow = path === "/cash-flow";

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <p className="text-muted-foreground">{page.blurb}</p>

      {isCashFlow ? (
        <div className="rounded-md border bg-muted/30 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" /> How money moves — at a glance
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-xs">
            <div className="space-y-1 rounded border bg-card p-1.5">
              <div className="flex items-center gap-1 font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" /> Inflow
              </div>
              <div className="space-y-0.5 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> Sales Collected
                </div>
                <div className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> Dues Collected
                </div>
                <div className="flex items-center gap-1">
                  <PiggyBank className="h-3 w-3" /> Other Income
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-1 rounded border bg-card p-1.5">
              <div className="flex items-center gap-1 font-medium text-rose-600">
                <TrendingDown className="h-3 w-3" /> Outflow
              </div>
              <div className="space-y-0.5 text-muted-foreground">
                <div>Expenses</div>
                <div>Supplier Paid</div>
                <div className="font-medium text-foreground">Refunds (separate)</div>
              </div>
            </div>
          </div>
          <div className="mt-1.5 rounded bg-card px-2 py-1 text-center text-xs">
            Sale <span className="font-mono">10,000</span> + Refund <span className="font-mono">-3,000</span> = Net{" "}
            <span className="font-semibold">+7,000</span>
            <span className="ml-1 text-muted-foreground">· Return without refund = 0</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded bg-card px-1.5 py-0.5">
              <CalendarDays className="h-3 w-3" /> One point / day
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-card px-1.5 py-0.5">
              <BarChart3 className="h-3 w-3" /> Branch + businessDate
            </span>
          </div>
        </div>
      ) : null}

      {page.canDo.length ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What you can do</div>
          <ul className={cn("space-y-1", isCashFlow && "space-y-1.5")}>
            {page.canDo.map((line) => (
              <li
                key={line}
                className={cn(isCashFlow ? "flex gap-2 rounded border bg-card px-2 py-1.5 leading-snug" : "list-disc pl-4")}
              >
                {isCashFlow ? <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> : null}
                <span className={isCashFlow ? "text-xs" : ""}>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {next.length ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where next</div>
          <div className={cn(isCashFlow ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-1")}>
            {next.map((l) => (
              <button
                key={l.href + l.label}
                type="button"
                className={cn(
                  isCashFlow
                    ? "rounded-md border bg-card px-2.5 py-2 text-left text-xs font-medium hover:bg-accent"
                    : "text-left text-sm font-medium text-primary hover:underline",
                )}
                onClick={() => onNavigate(helpNavHref(l.href, l.action))}
              >
                <span className={isCashFlow ? "flex items-center justify-between" : ""}>
                  {l.label} <span className={isCashFlow ? "text-muted-foreground" : ""}>→</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {tasks.length ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tasks</div>
          <div className="flex flex-col gap-1">
            {tasks.map((t) =>
              t ? (
                <button
                  key={t.id}
                  type="button"
                  className="text-left text-sm font-medium text-primary hover:underline"
                  onClick={() => onOpenTask?.(t.id)}
                >
                  {t.title}
                </button>
              ) : null,
            )}
          </div>
        </div>
      ) : null}
      {visibleTasks(can).some((t) => t.id === "first-sale") && path === "/pos" && onStartTour ? (
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onStartTour("cashier-pos")}>
          <CircleHelp className="mr-1.5 h-3.5 w-3.5" />
          Replay register tour
        </Button>
      ) : null}
      <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => onNavigate("/help")}>
        Search all help
      </button>
    </div>
  );
}
