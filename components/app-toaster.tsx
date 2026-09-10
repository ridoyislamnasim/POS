"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { usePathname } from "next/navigation";

export function AppToaster() {
  const { resolved } = useTheme();
  const path = usePathname();
  const pos = path === "/pos";
  return (
    <Toaster
      theme={resolved}
      position={pos ? "top-center" : "top-right"}
      closeButton
      richColors
      duration={3500}
      visibleToasts={4}
      offset={16}
      toastOptions={{
        classNames: {
          toast: "border bg-card text-card-foreground shadow-lg",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
          success: "border-success/30",
          error: "border-destructive/30",
          warning: "border-warning/40 bg-warning/10",
          info: "border-highlight/40 bg-highlight/10",
          closeButton: "border bg-card text-muted-foreground",
        },
      }}
    />
  );
}
