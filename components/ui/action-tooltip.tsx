"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

export type TooltipVariant = "default" | "primary" | "destructive" | "success" | "warning" | "info";
export type TooltipSide = "top" | "bottom" | "left" | "right";

const variantStyles: Record<TooltipVariant, { bubble: string; arrow: string }> = {
  default: {
    bubble:
      "border-white/10 bg-slate-900/95 text-slate-50 shadow-slate-900/25 dark:border-slate-200/60 dark:bg-white/95 dark:text-slate-900 dark:shadow-black/25",
    arrow: "bg-slate-900 dark:bg-white border-white/10 dark:border-slate-200/60",
  },
  primary: {
    bubble:
      "border-white/20 bg-gradient-to-br from-orange-600 to-amber-600 text-white shadow-orange-900/30 dark:from-orange-500 dark:to-amber-500",
    arrow: "bg-orange-600 dark:bg-orange-500 border-white/20",
  },
  destructive: {
    bubble:
      "border-white/20 bg-gradient-to-br from-red-600 to-red-700 text-white shadow-red-900/30",
    arrow: "bg-red-600 border-white/20",
  },
  success: {
    bubble:
      "border-white/20 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-emerald-900/30",
    arrow: "bg-emerald-600 border-white/20",
  },
  warning: {
    bubble:
      "border-amber-900/15 bg-gradient-to-br from-amber-300 to-amber-400 text-amber-950 shadow-amber-900/25 dark:from-amber-400 dark:to-amber-500 dark:text-amber-950",
    arrow: "bg-amber-300 dark:bg-amber-400 border-amber-900/15",
  },
  info: {
    bubble:
      "border-white/20 bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-sky-900/30",
    arrow: "bg-sky-600 border-white/20",
  },
};

type Placement = { top: number; left: number; side: TooltipSide };

const GAP = 8;

function computePlacement(
  trigger: DOMRect,
  tipW: number,
  tipH: number,
  preferred: TooltipSide,
): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const order: TooltipSide[] =
    preferred === "top"
      ? ["top", "bottom", "right", "left"]
      : preferred === "bottom"
        ? ["bottom", "top", "right", "left"]
        : preferred === "left"
          ? ["left", "right", "top", "bottom"]
          : ["right", "left", "top", "bottom"];

  for (const side of order) {
    let top = 0;
    let left = 0;
    if (side === "top") {
      top = trigger.top - tipH - GAP;
      left = trigger.left + trigger.width / 2 - tipW / 2;
    } else if (side === "bottom") {
      top = trigger.bottom + GAP;
      left = trigger.left + trigger.width / 2 - tipW / 2;
    } else if (side === "left") {
      top = trigger.top + trigger.height / 2 - tipH / 2;
      left = trigger.left - tipW - GAP;
    } else {
      top = trigger.top + trigger.height / 2 - tipH / 2;
      left = trigger.right + GAP;
    }
    const fitsV = top >= 8 && top + tipH <= vh - 8;
    const fitsH = left >= 8 && left + tipW <= vw - 8;
    if (fitsV && fitsH) return { top, left, side };
  }
  // Fallback: clamp preferred placement into viewport
  let top =
    preferred === "top"
      ? trigger.top - tipH - GAP
      : preferred === "bottom"
        ? trigger.bottom + GAP
        : trigger.top + trigger.height / 2 - tipH / 2;
  let left =
    preferred === "left"
      ? trigger.left - tipW - GAP
      : preferred === "right"
        ? trigger.right + GAP
        : trigger.left + trigger.width / 2 - tipW / 2;
  top = Math.max(8, Math.min(top, vh - tipH - 8));
  left = Math.max(8, Math.min(left, vw - tipW - 8));
  return { top, left, side: preferred };
}

export function ActionTooltip({
  label,
  description,
  shortcut,
  side = "top",
  variant = "default",
  delay = 200,
  disabled = false,
  maxWidth = 240,
  children,
}: {
  label: string;
  description?: string;
  shortcut?: string;
  side?: TooltipSide;
  variant?: TooltipVariant;
  delay?: number;
  disabled?: boolean;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement>({ top: -9999, left: -9999, side });
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const touchTimer = useRef<number | null>(null);
  const tooltipId = useId();
  const style = variantStyles[variant];
  const hasRich = Boolean(description || shortcut);

  const clearTimers = useCallback(() => {
    if (showTimer.current) window.clearTimeout(showTimer.current);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }, []);

  const place = useCallback(
    (preferred: TooltipSide = side) => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const tipW = Math.min(tipRef.current?.offsetWidth || 120, maxWidth + 32);
      const tipH = tipRef.current?.offsetHeight || 32;
      setPlacement(computePlacement(r, tipW, tipH, preferred));
    },
    [side, maxWidth],
  );

  const doShow = useCallback(
    (immediate = false) => {
      if (disabled) return;
      if (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches && !immediate) {
        // On touch-only devices, only show via explicit touch/focus with immediate flag.
        return;
      }
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (open) {
        place();
        return;
      }
      if (showTimer.current) window.clearTimeout(showTimer.current);
      const wait = immediate ? 0 : delay;
      showTimer.current = window.setTimeout(() => {
        place();
        // Defer a frame so the tooltip node exists for measurement.
        requestAnimationFrame(() => place());
        setOpen(true);
      }, wait);
    },
    [delay, disabled, open, place],
  );

  const doHide = useCallback(
    (immediate = false) => {
      if (showTimer.current) {
        window.clearTimeout(showTimer.current);
        showTimer.current = null;
      }
      if (touchTimer.current) {
        window.clearTimeout(touchTimer.current);
        touchTimer.current = null;
      }
      if (immediate) {
        setOpen(false);
        return;
      }
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setOpen(false), 90);
    },
    [],
  );

  // Re-measure once visible so the bubble never clips.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, label, description, shortcut]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    const onResize = () => place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  useEffect(() => clearTimers, [clearTimers]);

  if (disabled || !label) {
    return <span ref={triggerRef} className="inline-flex min-w-0">{children}</span>;
  }

  const arrowClass =
    placement.side === "top"
      ? "left-1/2 top-full -mt-[5px] -translate-x-1/2 rotate-45 rounded-[1px] border-b border-r"
      : placement.side === "bottom"
        ? "bottom-full -mb-[5px] left-1/2 -translate-x-1/2 rotate-45 rounded-[1px] border-l border-t"
        : placement.side === "left"
          ? "left-full -ml-[5px] top-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border-r border-t"
          : "right-full -mr-[5px] top-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border-b border-l";

  const motionProps = reduced
    ? {}
    : placement.side === "left"
      ? { initial: { opacity: 0, x: 4, scale: 0.96 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: 4, scale: 0.96 } }
      : placement.side === "right"
        ? { initial: { opacity: 0, x: -4, scale: 0.96 }, animate: { opacity: 1, x: 0, scale: 1 }, exit: { opacity: 0, x: -4, scale: 0.96 } }
        : placement.side === "bottom"
          ? { initial: { opacity: 0, y: -4, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.96 } }
          : { initial: { opacity: 0, y: 4, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 4, scale: 0.96 } };

  const bubble = (
    <div
      ref={tipRef}
      id={tooltipId}
      role="tooltip"
      style={{
        position: "fixed",
        top: placement.top,
        left: placement.left,
        zIndex: 9999,
        pointerEvents: "none",
        maxWidth,
      }}
      className={cn(
        "pointer-events-none rounded-lg border px-2.5 py-1.5 shadow-lg backdrop-blur-sm",
        style.bubble,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          hasRich ? "max-w-full" : "whitespace-nowrap",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-semibold leading-tight tracking-wide">
            {label}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[11px] font-normal leading-snug opacity-90" style={{ whiteSpace: "normal" }}>
              {description}
            </span>
          ) : null}
        </span>
        {shortcut ? (
          <kbd className="ml-1 hidden shrink-0 rounded border border-white/25 bg-white/15 px-1 py-px font-mono text-[10px] font-semibold leading-tight sm:inline-block dark:border-slate-900/15 dark:bg-slate-900/10">
            {shortcut}
          </kbd>
        ) : null}
      </div>
      <span aria-hidden className={cn("absolute h-2 w-2", style.arrow, arrowClass)} />
    </div>
  );

  return (
    <>
      <span
        ref={triggerRef}
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex min-w-0"
        onMouseEnter={() => doShow(false)}
        onMouseLeave={() => doHide(false)}
        onFocus={() => doShow(true)}
        onBlur={() => doHide(true)}
        onTouchStart={() => {
          doShow(true);
          if (touchTimer.current) window.clearTimeout(touchTimer.current);
          touchTimer.current = window.setTimeout(() => setOpen(false), 1600);
        }}
        onClick={() => doHide(true)}
      >
        {children}
      </span>
      {typeof document !== "undefined"
        ? createPortal(
            reduced ? (
              open ? (
                <div key="action-tooltip" style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}>
                  {bubble}
                </div>
              ) : null
            ) : (
              <AnimatePresence>
                {open ? (
                  <motion.div
                    key="action-tooltip"
                    {...motionProps}
                    transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
                    style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}
                  >
                    {bubble}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            ),
            document.body,
          )
        : null}
    </>
  );
}

/** Backwards-compatible alias — prefer ActionTooltip. */
export const Tooltip = ActionTooltip;
