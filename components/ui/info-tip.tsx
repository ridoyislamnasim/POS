"use client";

import { CircleHelp, Info, type LucideIcon } from "lucide-react";
import { ActionTooltip, type TooltipSide, type TooltipVariant } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/cn";

export function InfoTip({
  label,
  description,
  side = "top",
  variant = "default",
  icon: Icon = CircleHelp,
  className,
}: {
  label: string;
  description?: string;
  side?: TooltipSide;
  variant?: TooltipVariant;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <ActionTooltip label={label} description={description} side={side} variant={variant}>
      <button
        type="button"
        aria-label={description ? `${label}: ${description}` : label}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </ActionTooltip>
  );
}

export function InlineInfo({ icon: Icon = Info }: { icon?: LucideIcon }) {
  return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}
