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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar transition-all duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-sidebar-collapsed" : "lg:w-sidebar",
          "w-sidebar-mobile",
        )}
      >
        <div className="flex h-sidebar-header items-center justify-between border-b px-1.5">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-1 font-semibold">
            <Store className="h-4 w-4 shrink-0 text-primary" />
            {(!collapsed || open) && <span className={cn("text-[13px]", collapsed && "lg:hidden")}>Universal POS</span>}
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onCloseMobile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="mx-2 h-7 animate-pulse rounded bg-muted" />
          ) : (
            groups.map((g) => (
              <div key={g} className="px-1.5 py-1">
                <h2
                  className={cn(
                    "mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                    collapsed && "lg:hidden",
                  )}
                >
                  {g}
                </h2>
                <div className="space-y-px">
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
                            "flex h-8 items-center gap-1 rounded-md px-1.5 text-[12.5px] font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                            active ? "bg-accent text-accent-foreground" : "text-foreground",
                            collapsed && "lg:justify-center lg:px-1",
                          )}
                        >
                          <i.icon className="h-4 w-4 shrink-0" />
                          <span className={cn("min-w-0 whitespace-normal", collapsed && "lg:hidden")}>{i.label}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </nav>
        <div className="hidden border-t p-1 lg:block">
          <Button variant="ghost" className="h-7 w-full justify-center gap-1" onClick={onToggleCollapse}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed ? <span className="text-[11px]">Collapse</span> : null}
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
