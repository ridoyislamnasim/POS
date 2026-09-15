"use client";

import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Feature = {
  feature: string;
  label: string;
  enabled: boolean;
  source: string;
};

type Props = {
  features: Feature[];
  onRequestAccess?: (feature: string) => void;
};

export function FeatureAccessGrid({ features, onRequestAccess }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {features.map((f) => (
        <div
          key={f.feature}
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
            f.enabled ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30" : "border-muted bg-muted/30"
          )}
        >
          {f.enabled ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className={cn("flex-1 truncate", !f.enabled && "text-muted-foreground")}>{f.label}</span>
          {!f.enabled && onRequestAccess && (
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={() => onRequestAccess(f.feature)}>
              Request
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
