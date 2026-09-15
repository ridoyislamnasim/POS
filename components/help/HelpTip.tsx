"use client";

import type { ReactNode } from "react";
import { ActionTooltip } from "@/components/ui/action-tooltip";

/** Lightweight field hint. Prefer catalog page help over sprinkling these. */
export function HelpTip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <ActionTooltip label={text} side="top">
      <span className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2">{children}</span>
    </ActionTooltip>
  );
}
