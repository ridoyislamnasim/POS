"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { sidebarHover } from "@/lib/sidebar-layout";

type Props = {
  label: string;
  description?: string;
  toneClass: string;
  disabled?: boolean;
  children: ReactNode;
  panel?: ReactNode;
};

export function SidebarTooltip({ label, description, toneClass, disabled, children, panel }: Props) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timer = useRef<number | null>(null);
  const reduced = useReducedMotion();

  function place() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tipH = tipRef.current?.offsetHeight ?? 48;
    const maxTop = window.innerHeight - tipH - 12;
    setCoords({
      top: Math.max(12, Math.min(r.top + r.height / 2 - tipH / 2, maxTop)),
      left: r.right + 12,
    });
  }

  function show() {
    if (disabled) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 120);
  }

  function hide() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 120);
  }

  useLayoutEffect(() => {
    if (open) place();
  }, [open, panel, label]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <div
      ref={triggerRef}
      className="w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="sidebar-tooltip"
                  ref={tipRef}
                  role="tooltip"
                  initial={reduced ? false : { opacity: 0, x: -4, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -4, scale: 0.98 }}
                  transition={reduced ? { duration: 0 } : sidebarHover}
                  style={{ top: coords.top, left: coords.left }}
                  onMouseEnter={show}
                  onMouseLeave={hide}
                  className={cn(
                    "pointer-events-auto fixed z-[80] min-w-[160px] max-w-[228px] rounded-lg border border-white/20 p-0 text-white shadow-xl backdrop-blur-sm",
                    "bg-gradient-to-br",
                    toneClass,
                  )}
                >
                  <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-white/20 bg-inherit" />
                  <div className="relative rounded-lg px-2 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/80">{label}</div>
                    {description ? <p className="mt-0.5 text-[13px] font-medium leading-snug">{description}</p> : null}
                    {panel ? <div className="max-h-72 overflow-y-auto pr-0.5">{panel}</div> : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
