"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type Item = { href: string; label: string; show: boolean; group: string; icon: typeof LayoutDashboard };

export function AppSidebar({
  open,
  collapsed,
  items,
  loading,
  onCloseMobile,
  onToggleCollapse,
}: {
  open: boolean;
  collapsed: boolean;
  items: Item[];
  loading?: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}) {
  const path = usePathname();
  const visible = items.filter((i) => i.show);
  const groups = [...new Set(visible.map((i) => i.group))];

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-black/40 lg:hidden", open ? "block" : "hidden")}
        onClick={onCloseMobile}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-64",
          "w-64",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
            <Store className="h-6 w-6 shrink-0 text-primary" />
            {(!collapsed || open) && <span className={cn("truncate text-xl", collapsed && "lg:hidden")}>Universal POS</span>}
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onCloseMobile}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="mx-3 h-8 animate-pulse rounded bg-muted" />
          ) : (
            groups.map((g) => (
              <div key={g} className="px-3 py-2">
                <h2
                  className={cn(
                    "mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    collapsed && "lg:hidden",
                  )}
                >
                  {g}
                </h2>
                <div className="space-y-1">
                  {visible
                    .filter((i) => i.group === g)
                    .map((i) => {
                      const active = path === i.href || path.startsWith(`${i.href}/`);
                      return (
                        <Link
                          key={i.href}
                          href={i.href}
                          title={i.label}
                          onClick={onCloseMobile}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                            active ? "bg-accent text-accent-foreground" : "text-foreground",
                            collapsed && "lg:justify-center lg:px-2",
                          )}
                        >
                          <i.icon className="h-4 w-4 shrink-0" />
                          <span className={cn(collapsed && "lg:hidden")}>{i.label}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </nav>
        <div className="hidden border-t p-2 lg:block">
          <Button variant="ghost" className="w-full justify-center gap-2" onClick={onToggleCollapse}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed ? <span className="text-xs">Collapse</span> : null}
          </Button>
        </div>
      </aside>
    </>
  );
}

export function posNavIcons() {
  return {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Boxes,
    Users,
  };
}
