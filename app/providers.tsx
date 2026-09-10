"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { AppToaster } from "@/components/app-toaster";
import { NavigationProgress } from "@/components/navigation-progress";
import { QueryProvider } from "@/components/query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <AppToaster />
        <NavigationProgress />
      </ThemeProvider>
    </QueryProvider>
  );
}
