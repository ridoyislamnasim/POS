"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { SIDEBAR_WIDTH_COLLAPSED_PX, SIDEBAR_WIDTH_EXPANDED_PX, sidebarTransition } from "@/lib/sidebar-layout";
import { HelpProvider } from "@/components/help/HelpProvider";

const COLLAPSE_KEY = "pos_sidebar_collapsed";

function readCollapsedPreference(): boolean | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COLLAPSE_KEY);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

function defaultCollapsedForWidth(width: number): boolean {
  if (width >= 992 && width < 1280) return true;
  return false;
}

function initialShellLayout() {
  if (typeof window === "undefined") {
    return { collapsed: false, isDesktop: true };
  }
  const w = window.innerWidth;
  const saved = readCollapsedPreference();
  return {
    collapsed: saved ?? defaultCollapsedForWidth(w),
    isDesktop: w >= 992,
  };
}

export function AppShell({ children, pos }: { children: React.ReactNode; pos?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const { me, can, isLoading } = useMe();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [{ collapsed, isDesktop }, setLayout] = useState(initialShellLayout);
  const layoutTransition = reduceMotion ? { duration: 0 } : sidebarTransition;

  useLayoutEffect(() => {
    setLayout(initialShellLayout());
  }, []);

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 992px)");
    const syncDesktop = () => setLayout((cur) => ({ ...cur, isDesktop: desktopMq.matches }));

    function onResize() {
      const pref = readCollapsedPreference();
      if (pref !== null) return;
      setLayout((cur) => ({ ...cur, collapsed: defaultCollapsedForWidth(window.innerWidth) }));
    }

    desktopMq.addEventListener("change", syncDesktop);
    window.addEventListener("resize", onResize);

    return () => {
      desktopMq.removeEventListener("change", syncDesktop);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setOpen(false);
    // close mobile drawer on route change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

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
    setLayout((cur) => {
      const next = !cur.collapsed;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return { ...cur, collapsed: next };
    });
  }

  const mainOffset = isDesktop ? (collapsed ? SIDEBAR_WIDTH_COLLAPSED_PX : SIDEBAR_WIDTH_EXPANDED_PX) : 0;

  return (
    <HelpProvider>
      <div className="h-screen overflow-hidden bg-background print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <AppSidebar
          open={open}
          collapsed={collapsed}
          isDesktop={isDesktop}
          can={can}
          isPlatform={Boolean(me?.isPlatform)}
          loading={isLoading}
          onCloseMobile={() => setOpen(false)}
          onToggleCollapse={toggleCollapse}
        />
      </div>
      <motion.div
        className="fixed top-0 right-0 z-40 print:hidden"
        initial={false}
        animate={{ left: mainOffset }}
        transition={layoutTransition}
      >
        <AppTopBar
          path={path}
          userName={me?.name}
          branches={me?.branches ?? []}
          canNotify={can("notification.view")}
          collapsed={collapsed}
          onMenu={() => setOpen((v) => !v)}
          onToggleCollapse={toggleCollapse}
          onSignOut={signOut}
        />
      </motion.div>
      <motion.div
        className="flex h-full flex-col pt-12 print:h-auto print:pt-0"
        initial={false}
        animate={{ marginLeft: mainOffset }}
        transition={layoutTransition}
      >
        <main className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto print:overflow-visible", pos ? "p-0" : "p-3 md:p-4")}>
          {me && !me.isPlatform && me.apiAccessEnabled === false && path !== "/subscription" && path !== "/login" ? (
            <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
              <h1 className="text-xl font-semibold tracking-tight">Access paused</h1>
              <p className="text-sm text-muted-foreground">
                {me.lockMessage || "Please pay your previous month's bill to continue using the platform."}
              </p>
              <Link
                href="/subscription"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                View bills
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </motion.div>
      </div>
    </HelpProvider>
  );
}
