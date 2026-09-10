"use client";

import type { ReactNode } from "react";

/** Lightweight field hint. Prefer catalog page help over sprinkling these. */
export function HelpTip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1" title={text}>
      {children}
    </span>
  );
}
