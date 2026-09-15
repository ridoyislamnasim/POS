"use client";

import { cn } from "@/lib/cn";
import { ActionTooltip, type TooltipSide, type TooltipVariant } from "./action-tooltip";

type IconActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  side?: TooltipSide;
  variant?: TooltipVariant;
  size?: "sm" | "xs";
  className?: string;
  loading?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
};

const variantClasses = {
  default: "text-muted-foreground hover:bg-accent hover:text-foreground",
  primary: "text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30 dark:hover:text-orange-300",
  destructive: "text-destructive hover:bg-destructive/10 hover:text-destructive",
  success: "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300",
  warning: "text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30 dark:hover:text-amber-300",
  info: "text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/30 dark:hover:text-sky-300",
};

const sizeClasses = {
  sm: "h-8 w-8",
  xs: "h-7 w-7",
};

export function IconActionButton({
  icon,
  label,
  description,
  shortcut,
  side = "top",
  variant = "default",
  size = "sm",
  className,
  loading,
  onClick,
  disabled,
  type = "button",
}: IconActionButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <ActionTooltip label={label} description={description} shortcut={shortcut} side={side} variant={variant}>
      <button
        type={type}
        aria-label={description ? `${label} — ${description}` : label}
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-transparent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
      >
        {loading ? (
          <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          icon
        )}
      </button>
    </ActionTooltip>
  );
}
