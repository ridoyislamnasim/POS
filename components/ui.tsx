"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PageHelpButton } from "@/components/help/PageHelpButton";
import { cn } from "@/lib/cn";

export { Badge } from "@/components/ui/badge";
export { Button } from "@/components/ui/button";
export {
  Card as ShellCard,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export { TablePagination } from "@/components/ui/table-pagination";
export {
  DataTable,
  TableToolbar,
  TableTabs,
  TableBulkBar,
  TableLoadingSkeleton,
  tableToolbarInputClass,
  tableCellNumeric,
  tableCellActions,
  tableSubText,
} from "@/components/ui/data-table";
export { StatusBadge, statusTone } from "@/components/ui/status-badge";
export { ActionTooltip, Tooltip } from "@/components/ui/action-tooltip";
export { InfoTip } from "@/components/ui/info-tip";
export { IconActionButton } from "@/components/ui/icon-action-button";
export { SearchInput, DateRangeFilter, FilterSelect, FilterPopover, FilterChips, Truncate } from "@/components/ui/list-toolbar";

export function PageHeader({
  title,
  description,
  children,
  help = true,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  help?: boolean;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div data-help="page-header">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          {help ? <PageHelpButton /> : null}
        </div>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border bg-card p-4 text-card-foreground shadow-sm md:p-6", className)}>{children}</section>;
}

/** Backward-compatible padded card used by existing POS pages. */
export function SimpleCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Panel className={className}>{children}</Panel>;
}

export type KpiAccent = "orange" | "emerald" | "amber" | "rose" | "lime" | "sky" | "violet" | "teal" | "stone" | "fuchsia";

export const KPI_ACCENT_ORDER: KpiAccent[] = ["orange", "emerald", "sky", "violet", "amber", "rose", "lime", "teal", "fuchsia", "stone"];

const KPI_ACCENT: Record<KpiAccent, { card: string; icon: string }> = {
  orange: {
    card: "border-l-[3px] border-l-orange-500 bg-gradient-to-br from-orange-50/90 to-card dark:from-orange-950/40",
    icon: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  emerald: {
    card: "border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/90 to-card dark:from-emerald-950/40",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    card: "border-l-[3px] border-l-amber-500 bg-gradient-to-br from-amber-50/90 to-card dark:from-amber-950/40",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  rose: {
    card: "border-l-[3px] border-l-rose-500 bg-gradient-to-br from-rose-50/90 to-card dark:from-rose-950/40",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  lime: {
    card: "border-l-[3px] border-l-lime-500 bg-gradient-to-br from-lime-50/90 to-card dark:from-lime-950/40",
    icon: "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  },
  sky: {
    card: "border-l-[3px] border-l-sky-500 bg-gradient-to-br from-sky-50/90 to-card dark:from-sky-950/40",
    icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  violet: {
    card: "border-l-[3px] border-l-violet-500 bg-gradient-to-br from-violet-50/90 to-card dark:from-violet-950/40",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  teal: {
    card: "border-l-[3px] border-l-teal-500 bg-gradient-to-br from-teal-50/90 to-card dark:from-teal-950/40",
    icon: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  },
  stone: {
    card: "border-l-[3px] border-l-stone-400 bg-gradient-to-br from-stone-50/90 to-card dark:from-stone-900/40",
    icon: "bg-stone-500/15 text-stone-600 dark:text-stone-300",
  },
  fuchsia: {
    card: "border-l-[3px] border-l-fuchsia-500 bg-gradient-to-br from-fuchsia-50/90 to-card dark:from-fuchsia-950/40",
    icon: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
  },
};

export type SummaryItem = {
  label: string;
  value: string | number;
  accent?: KpiAccent;
  description?: string;
  loading?: boolean;
  icon?: LucideIcon;
  tone?: "neutral" | "increase" | "decrease" | "warning";
};

function accentFromTone(tone: SummaryItem["tone"]): KpiAccent {
  if (tone === "increase") return "emerald";
  if (tone === "decrease") return "rose";
  if (tone === "warning") return "amber";
  return "orange";
}

export function Kpi({
  label,
  value,
  loading,
  icon: Icon,
  description,
  tone = "neutral",
  accent,
  size = "sm",
  className,
}: SummaryItem & {
  size?: "default" | "sm";
  className?: string;
}) {
  const toneStyles = KPI_ACCENT[accent ?? accentFromTone(tone)];
  const Trend = tone === "increase" ? TrendingUp : tone === "decrease" ? TrendingDown : tone === "warning" ? AlertTriangle : Minus;
  const compact = size !== "default";

  return (
    <div className={cn("rounded-lg border p-2 shadow-sm transition-shadow hover:shadow-md", compact ? "sm:p-2.5" : "p-3 sm:p-3.5", toneStyles.card, className)}>
      <div className="flex items-start justify-between gap-1.5">
        <p className={cn("font-medium uppercase tracking-wide text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>{label}</p>
        <span className={cn("shrink-0 rounded-md", compact ? "p-1" : "p-1.5", toneStyles.icon)}>
          {Icon ? <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> : <Trend className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
        </span>
      </div>
      {loading ? (
        <div className={cn("mt-1 animate-pulse rounded bg-muted/80", compact ? "h-5 w-14" : "h-6 w-20")} />
      ) : (
        <p className={cn("mt-0.5 truncate font-semibold leading-tight tabular-nums", compact ? "text-sm sm:text-base" : "text-lg")}>{value}</p>
      )}
      {description ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function SummaryStrip({ children, className, count }: { children: ReactNode; className?: string; count?: number }) {
  const cols =
    count && count <= 3
      ? "grid-cols-2 sm:grid-cols-3"
      : count && count === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
  return <div className={cn("mb-3 grid gap-1.5 sm:gap-2", cols, className)}>{children}</div>;
}

export function SummaryCards({ items, className }: { items: SummaryItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <SummaryStrip className={className} count={items.length}>
      {items.map((item) => (
        <Kpi key={item.label} {...item} />
      ))}
    </SummaryStrip>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-7 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  compact,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed text-center",
        compact ? "px-3 py-4" : "px-3 py-6 sm:px-4 sm:py-8",
        className,
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{hint}</p> : null}
      {action ? <div className="mt-2 sm:mt-3">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
      <div>{message}</div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: ReactNode;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

export function FiltersBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export { Dialog } from "@/components/ui/dialog";
export { ConfirmDialog } from "@/components/confirm-dialog";

export function Modal({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  className,
  size = "md",
  zIndex = 50,
}: {
  open?: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  zIndex?: number;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      footer={footer}
      onClose={onClose}
      className={className}
      size={size}
      zIndex={zIndex}
    >
      {children}
    </Dialog>
  );
}

export const inputClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = cn(buttonVariants({ variant: "default", size: "sm" }));
export const btnGhost = cn(buttonVariants({ variant: "outline", size: "sm" }));

export function PasswordInput({
  value,
  onChange,
  className = inputClass,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        className={`${className} pr-11`}
        type={visible ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** @deprecated use Panel — alias so `Card` from this module stays padded */
export { Panel as Card };
