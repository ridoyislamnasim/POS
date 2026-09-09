"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";

const COLLAPSE_KEY = "pos_sidebar_collapsed";

export function AppShell({ children, pos }: { children: React.ReactNode; pos?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const { me, can, isLoading } = useMe();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  async function signOut() {
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
      toastSuccess("Signed out");
    } catch (e) {
      toastError(e, "Could not sign out");
    }
    router.push("/login");
  }

  function toggleCollapse() {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        open={open}
        collapsed={collapsed}
        can={can}
        loading={isLoading}
        onCloseMobile={() => setOpen(false)}
        onToggleCollapse={toggleCollapse}
      />
      <div className={cn("flex min-h-screen flex-col", collapsed ? "lg:ml-16" : "lg:ml-72")}>
        <AppTopBar
          path={path}
          userName={me?.name}
          canActivity={can("report.view")}
          collapsed={collapsed}
          onMenu={() => setOpen((v) => !v)}
          onToggleCollapse={toggleCollapse}
          onSignOut={signOut}
        />
        <main className={cn("min-w-0 flex-1 overflow-y-auto", pos ? "p-0" : "p-4 md:p-6")}>{children}</main>
      </div>
    </div>
  );
}
