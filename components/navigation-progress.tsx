"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  attachNavigationProgress,
  getNavigationProgress,
  onRouteSettled,
  subscribeNavigationProgress,
  type NavigationProgressState,
} from "@/lib/navigation-progress";
import { cn } from "@/lib/cn";

export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<NavigationProgressState>(getNavigationProgress);

  useEffect(() => subscribeNavigationProgress(setState), []);

  useEffect(() => attachNavigationProgress(), []);

  useEffect(() => {
    const id = window.setTimeout(() => onRouteSettled(), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div
      aria-hidden
      className={cn(
        "nav-top-progress pointer-events-none fixed inset-x-0 top-0 z-[99999] h-[2px] w-full max-w-[100vw] overflow-hidden print:hidden",
        state.visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className="nav-top-progress__bar h-full w-full origin-left bg-primary"
        style={{ transform: `scaleX(${Math.max(state.value, 0) / 100})` }}
      />
    </div>
  );
}
