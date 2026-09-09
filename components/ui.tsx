"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
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

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
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

export function Kpi({
  label,
  value,
  loading,
  icon: Icon,
  description,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  loading?: boolean;
  icon?: LucideIcon;
  description?: string;
  tone?: "neutral" | "increase" | "decrease" | "warning";
}) {
  const toneClass =
    tone === "increase"
      ? "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400"
      : tone === "decrease"
        ? "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400"
        : tone === "warning"
          ? "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400"
          : "text-muted-foreground bg-muted";
  const Trend =
    tone === "increase" ? TrendingUp : tone === "decrease" ? TrendingDown : tone === "warning" ? AlertTriangle : Minus;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn("rounded-full p-2", toneClass)}>
          {Icon ? <Icon className="h-4 w-4" /> : <Trend className="h-4 w-4" />}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
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

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
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
}: {
  open?: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
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
