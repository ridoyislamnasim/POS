"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CardContent, CardDescription, CardHeader, CardTitle, EmptyState, ErrorState, ShellCard, Skeleton } from "@/components/ui";
import { cn } from "@/lib/cn";

export function ChartSkeleton({ className }: { className?: string }) {
  return <div className={cn("h-[200px] w-full animate-pulse rounded-md bg-muted", className)} />;
}

export function WidgetShell({
  title,
  description,
  action,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle,
  emptyHint,
  skeletonRows = 5,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  skeletonRows?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("min-w-0", className)}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <ShellCard className="h-full min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-3 pb-2 md:p-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold tracking-tight md:text-base">{title}</CardTitle>
            {description ? <CardDescription className="mt-0.5 text-xs">{description}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
        <CardContent className="min-w-0 p-3 pt-0 md:p-3 md:pt-0">
          {loading ? <Skeleton rows={skeletonRows} /> : null}
          {!loading && error ? <ErrorState message={`Could not load ${title.toLowerCase()}.`} onRetry={onRetry} /> : null}
          {!loading && !error && empty ? <EmptyState compact title={emptyTitle ?? "Nothing to show"} hint={emptyHint} /> : null}
          {!loading && !error && !empty ? children : null}
        </CardContent>
      </ShellCard>
    </motion.div>
  );
}
