"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Globe, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePOSStore } from "@/lib/pos-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/nav-config";

type Activity = { id: string; action: string; entityType: string; time: string };

export function AppTopBar({
  path,
  userName,
  canActivity,
  collapsed,
  onMenu,
  onToggleCollapse,
  onSignOut,
}: {
  path: string;
  userName?: string;
  canActivity?: boolean;
  collapsed?: boolean;
  onMenu: () => void;
  onToggleCollapse?: () => void;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const locale = usePOSStore((s) => s.locale);
  const setLocale = usePOSStore((s) => s.setLocale);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<"user" | "lang" | "note" | null>(null);
  const initials = (userName ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const activity = useQuery({
    queryKey: ["header-activity"],
    queryFn: () => api<Activity[]>("/api/v1/dashboard/activity"),
    enabled: !!canActivity,
  });
  const notes = activity.data ?? [];

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term || path === "/pos") return;
    router.push(`/products?q=${encodeURIComponent(term)}`);
  }

  const meta = useMemo(() => pageMeta(path), [path]);
  const crumb = meta.crumb;
  const title = path.startsWith("/products/new") ? "New product" : meta.title;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b bg-header px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open sidebar">
          <Menu className="h-5 w-5" />
        </Button>
        {onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        ) : null}
        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-xs text-muted-foreground">{crumb}</div>
          <div className="truncate text-sm font-semibold">{title}</div>
        </div>
        <form onSubmit={onSearch} className="relative hidden md:block md:w-[280px] lg:w-[350px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={path === "/pos" ? "Use the scan box (F2)" : "Search products, SKU, barcode"}
            className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
            disabled={path === "/pos"}
          />
        </form>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <ThemeToggle />
        <div className="relative">
          <Button className="relative h-8 w-8 rounded-full bg-primary/10 p-2 hover:bg-primary/5" onClick={() => setMenu(menu === "note" ? null : "note")}>
            <Bell className="h-4 w-4 text-primary" />
            {notes.length > 0 ? (
              <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]" variant="destructive">
                {Math.min(9, notes.length)}
              </Badge>
            ) : null}
          </Button>
          {menu === "note" ? (
            <div className="absolute right-0 mt-2 w-72 rounded-md border bg-popover p-2 text-sm shadow-md">
              <div className="px-2 py-1 text-xs font-semibold">Activity</div>
              {notes.length === 0 ? <div className="px-2 py-3 text-muted-foreground">No recent activity</div> : null}
              {notes.slice(0, 6).map((n) => (
                <div key={n.id} className="rounded px-2 py-1.5 hover:bg-accent">
                  {n.action} <span className="text-muted-foreground">{n.entityType}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="relative">
          <Button className="h-8 w-8 rounded-full bg-primary/10 p-2 hover:bg-primary/5" onClick={() => setMenu(menu === "lang" ? null : "lang")}>
            <Globe className="h-4 w-4 text-primary" />
          </Button>
          {menu === "lang" ? (
            <div className="absolute right-0 mt-2 w-36 rounded-md border bg-popover p-1 shadow-md">
              <button type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => { setLocale("en"); setMenu(null); }}>
                English {locale === "en" ? "✓" : ""}
              </button>
              <button type="button" className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => { setLocale("bn"); setMenu(null); }}>
                বাংলা {locale === "bn" ? "✓" : ""}
              </button>
            </div>
          ) : null}
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setMenu(menu === "user" ? null : "user")}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>
          </Button>
          {menu === "user" ? (
            <div className="absolute right-0 mt-2 w-52 rounded-md border bg-popover p-1 shadow-md">
              <div className="px-2 py-2 text-xs text-muted-foreground">{userName ?? "Signed in"}</div>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenu(null);
                  onSignOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
