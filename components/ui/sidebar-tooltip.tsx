"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

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
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 80);
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
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tipRef}
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
              onMouseEnter={show}
              onMouseLeave={hide}
              className={cn(
                "pointer-events-auto fixed z-[80] min-w-[180px] max-w-[260px] animate-in fade-in-0 zoom-in-95 rounded-xl border border-white/20 p-0 text-white shadow-2xl",
                "bg-gradient-to-br",
                toneClass,
              )}
            >
              <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-b border-l border-white/20 bg-inherit" />
              <div className="relative rounded-xl px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</div>
                {description ? <p className="mt-0.5 text-sm font-medium leading-snug">{description}</p> : null}
                {panel ? <div className="max-h-72 overflow-y-auto pr-0.5">{panel}</div> : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
