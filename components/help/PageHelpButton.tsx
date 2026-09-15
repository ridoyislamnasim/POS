"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { useHelpOptional } from "@/components/help/HelpProvider";

export function PageHelpButton({ className }: { className?: string }) {
  const help = useHelpOptional();
  if (!help) return null;
  return (
    <ActionTooltip label="Page help" description="Learn what you can do on this page" side="bottom">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className ?? "h-7 w-7 shrink-0 text-muted-foreground"}
        onClick={help.openPageHelp}
        aria-label="Open page help"
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </Button>
    </ActionTooltip>
  );
}
