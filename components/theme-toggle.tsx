"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { cn } from "@/lib/cn";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; hint: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light mode", hint: "Bright theme", icon: Sun },
  { value: "dark", label: "Dark mode", hint: "Dim theme for night", icon: Moon },
  { value: "system", label: "System theme", hint: "Follow device setting", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const reduce = useReducedMotion();
  // Mounted gate (same pattern as dashboard-home): the stored preference lives
  // in localStorage and is only known after mount, while the server always
  // renders ThemeProvider's initial "system" state. Render that deterministic
  // SSR fallback until mounted so server HTML and the first client render are
  // identical — otherwise React reports a hydration mismatch and the page
  // renders dead (no clicks, no toasts, no dialogs).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const current = mounted ? preference : "system";
  return (
    <div className="inline-flex h-8 items-center rounded-full border bg-background p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.value;
        return (
          <ActionTooltip key={opt.value} label={opt.label} description={opt.hint} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className={cn("relative h-7 w-7 rounded-full", active && "text-highlight-foreground")}
              onClick={() => setPreference(opt.value)}
              type="button"
              aria-label={opt.label}
              aria-pressed={active}
            >
              {active && mounted ? (
                <motion.span
                  layoutId={reduce ? undefined : "theme-pill"}
                  className="absolute inset-0 rounded-full bg-highlight/20"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              ) : null}
              <Icon className={cn("relative z-[1] h-4 w-4", active && "text-amber-700 dark:text-amber-300")} aria-hidden />
            </Button>
          </ActionTooltip>
        );
      })}
    </div>
  );
}
