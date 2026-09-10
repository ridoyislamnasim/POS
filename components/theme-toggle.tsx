"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  const reduce = useReducedMotion();
  return (
    <div className="inline-flex h-8 items-center rounded-full border bg-background p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = preference === opt.value;
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="icon"
            className={cn("relative h-7 w-7 rounded-full", active && "text-highlight-foreground")}
            onClick={() => setPreference(opt.value)}
            type="button"
            title={opt.label}
            aria-label={opt.label}
            aria-pressed={active}
          >
            {active ? (
              <motion.span
                layoutId={reduce ? undefined : "theme-pill"}
                className="absolute inset-0 rounded-full bg-highlight/20"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            ) : null}
            <Icon className={cn("relative z-[1] h-4 w-4", active && "text-amber-700 dark:text-amber-300")} />
          </Button>
        );
      })}
    </div>
  );
}
