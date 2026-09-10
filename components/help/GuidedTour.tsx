"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { HelpTour } from "@/lib/help";

function place(rect: DOMRect, placement: HelpTour["steps"][0]["placement"]) {
  const gap = 12;
  const cardW = 280;
  const cardH = 160;
  let top = rect.bottom + gap;
  let left = rect.left;
  if (placement === "top") top = rect.top - cardH - gap;
  if (placement === "left") {
    top = rect.top;
    left = rect.left - cardW - gap;
  }
  if (placement === "right") {
    top = rect.top;
    left = rect.right + gap;
  }
  left = Math.min(Math.max(12, left), window.innerWidth - cardW - 12);
  top = Math.min(Math.max(12, top), window.innerHeight - 12 - 120);
  return { top, left };
}

export function GuidedTour({
  tour,
  stepIndex,
  onNext,
  onBack,
  onClose,
}: {
  tour: HelpTour;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const step = tour.steps[stepIndex];
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useEffect(() => {
    let n = 0;
    const tick = () => {
      measure();
      n += 1;
      if (n < 40) window.setTimeout(tick, 80);
    };
    tick();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, stepIndex]);

  if (typeof document === "undefined" || !step) return null;

  const pos = rect ? place(rect, step.placement) : { top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 140 };
  const last = stepIndex >= tour.steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[90] print:hidden" role="dialog" aria-modal="true" aria-labelledby="help-tour-title">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Skip tour" onClick={onClose} />
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-orange-400"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)",
          }}
        />
      ) : null}
      <div
        className="absolute w-[min(280px,calc(100vw-24px))] rounded-lg border border-orange-200 bg-card p-3 text-sm shadow-xl dark:border-orange-900"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {tour.title} · {stepIndex + 1}/{tour.steps.length}
        </div>
        <h2 id="help-tour-title" className="mt-1 font-semibold">
          {step.title}
        </h2>
        <p className="mt-1 text-muted-foreground">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={onClose}>
            Skip
          </button>
          <div className="flex gap-1">
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" size="xs" onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Button type="button" size="xs" onClick={last ? onClose : onNext}>
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
