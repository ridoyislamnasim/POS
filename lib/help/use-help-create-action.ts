"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Opens a create dialog when a task guide links with ?helpAction=create */
export function useHelpCreateAction(open: () => void, enabled = true) {
  const pathname = usePathname();
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("helpAction") !== "create") return;
    openRef.current();
    sp.delete("helpAction");
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, enabled]);
}
