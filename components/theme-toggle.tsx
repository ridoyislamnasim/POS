"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="inline-flex items-center rounded-full border bg-background p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = preference === opt.value;
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-full", active && "bg-primary/10 text-primary")}
            onClick={() => setPreference(opt.value)}
            title={opt.label}
            aria-label={opt.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
