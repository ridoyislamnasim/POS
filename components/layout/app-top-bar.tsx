"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CircleHelp, Globe, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Store } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePOSStore } from "@/lib/pos-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/nav-config";
import { useHelpOptional } from "@/components/help/HelpProvider";

type Note = {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
};
type BranchOpt = { id: string; name: string; locationId: string; registers: { id: string; name: string; devices: { hardwareId: string }[] }[] };

function relativeTime(iso: string) {
  const delta = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export function AppTopBar({
  path,
  userName,
  branches,
  canNotify,
  collapsed,
  onMenu,
  onToggleCollapse,
  onSignOut,
}: {
  path: string;
  userName?: string;
  branches?: BranchOpt[];
  canNotify?: boolean;
  collapsed?: boolean;
  onMenu: () => void;
  onToggleCollapse?: () => void;
  onSignOut: () => void;
}) {
  const router = useRouter();
  const locale = usePOSStore((s) => s.locale);
  const setLocale = usePOSStore((s) => s.setLocale);
  const branchId = usePOSStore((s) => s.branchId);
  const setStation = usePOSStore((s) => s.setStation);
  const help = useHelpOptional();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<"user" | "lang" | "note" | null>(null);
  const [visible, setVisible] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    function onVis() {
      setVisible(document.visibilityState === "visible");
    }
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!menu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-header-menu]")) return;
      setMenu(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [menu]);
  const initials = (userName ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const unread = useQuery({
    queryKey: ["notif-unread"],
    queryFn: () => api<{ count: number }>("/api/v1/extras/notifications/unread-count"),
    enabled: !!canNotify,
    refetchInterval: visible ? 30_000 : false,
  });
  const recent = useQuery({
    queryKey: ["notif-recent"],
    queryFn: () => api<Note[]>("/api/v1/extras/notifications/recent"),
    enabled: !!canNotify,
    refetchInterval: visible ? 30_000 : false,
  });
  const notes = recent.data ?? [];
  const unreadCount = unread.data?.count ?? 0;
  const markRead = useMutation({
    mutationFn: (id: string) => api(`/api/v1/extras/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notif-unread"] });
      void qc.invalidateQueries({ queryKey: ["notif-recent"] });
      void qc.invalidateQueries({ queryKey: ["notifs"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => api("/api/v1/extras/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notif-unread"] });
      void qc.invalidateQueries({ queryKey: ["notif-recent"] });
      void qc.invalidateQueries({ queryKey: ["notifs"] });
    },
  });

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
    <header className="flex h-12 min-h-12 w-full shrink-0 items-center justify-between gap-2 border-b border-orange-100/80 bg-header/95 px-3 backdrop-blur-sm md:px-4 dark:border-orange-950/50">
      <div className="flex h-8 min-w-0 items-center gap-2">
        <ActionTooltip label="Open sidebar" side="bottom">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 lg:hidden" onClick={onMenu} aria-label="Open sidebar">
            <Menu className="h-4 w-4" aria-hidden />
          </Button>
        </ActionTooltip>
        {onToggleCollapse ? (
          <ActionTooltip label={collapsed ? "Expand sidebar" : "Collapse sidebar"} description={collapsed ? "Show names and menus" : "Compact icon-only mode"} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 lg:inline-flex"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
            </Button>
          </ActionTooltip>
        ) : null}
        <div className="hidden min-w-0 leading-tight sm:block">
          <div className="truncate text-[11px] text-muted-foreground">{crumb}</div>
          <div className="truncate text-sm font-semibold">{title}</div>
        </div>
        <form onSubmit={onSearch} className="relative hidden h-8 md:block md:w-[280px] lg:w-[350px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={path === "/pos" ? "Use the scan box (F2)" : "Search products, SKU, barcode"}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
            disabled={path === "/pos"}
            aria-label="Search products"
          />
        </form>
      </div>
      <div className="flex h-8 items-center gap-1 md:gap-2">
        {branches && branches.length > 0 ? (
          <label className="hidden h-8 items-center gap-1 sm:flex">
            <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              className="h-8 max-w-[180px] rounded-md border border-input bg-background px-2 text-sm"
              value={branchId ?? branches[0]?.id ?? ""}
              onChange={(e) => {
                const b = branches.find((x) => x.id === e.target.value);
                const r = b?.registers[0];
                if (!b || !r) return;
                setStation(b.id, r.id, r.devices[0]?.hardwareId ?? `REG-${r.id}`);
              }}
              aria-label="Active branch"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <ThemeToggle />
        {help ? (
          <ActionTooltip label="Help" description="Search pages and tasks" shortcut="Ctrl+K" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={help.openSearch}
              aria-label="Open help (Ctrl+K)"
            >
              <CircleHelp className="h-4 w-4 text-primary" aria-hidden />
            </Button>
          </ActionTooltip>
        ) : null}
        <div className="relative" data-header-menu>
          <ActionTooltip label="Notifications" description={unreadCount > 0 ? `${unreadCount} unread` : "No unread alerts"} side="bottom" variant={unreadCount > 0 ? "warning" : "default"}>
            <Button
              className="relative h-8 w-8 rounded-full bg-primary/10 p-2 hover:bg-primary/5"
              onClick={() => setMenu(menu === "note" ? null : "note")}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              aria-expanded={menu === "note"}
              aria-haspopup="true"
            >
              <Bell className="h-4 w-4 text-primary" aria-hidden />
              {unreadCount > 0 ? (
                <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]" variant="destructive">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              ) : null}
            </Button>
          </ActionTooltip>
          {menu === "note" ? (
            <div className="absolute right-0 mt-2 w-80 rounded-md border bg-popover p-2 text-sm shadow-md">
              <div className="flex items-center justify-between px-2 py-1">
                <div className="text-xs font-semibold">Notifications</div>
                {unreadCount > 0 ? (
                  <button type="button" className="text-[11px] text-primary hover:underline" onClick={() => markAll.mutate()}>
                    Mark all as read
                  </button>
                ) : null}
              </div>
              {notes.length === 0 ? <div className="px-2 py-3 text-muted-foreground">No notifications</div> : null}
              {notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`block w-full rounded px-2 py-1.5 text-left hover:bg-accent ${n.isRead ? "" : "bg-highlight/10"}`}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate(n.id);
                    setMenu(null);
                    if (n.actionUrl && n.actionUrl.startsWith("/")) router.push(n.actionUrl);
                    else router.push("/notifications");
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`leading-tight ${n.isRead ? "font-normal" : "font-medium"}`}>{n.title}</div>
                    {n.priority === "CRITICAL" || n.priority === "HIGH" ? (
                      <span className="text-[10px] text-destructive">{n.priority}</span>
                    ) : null}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{n.message}</div>
                  <ActionTooltip label={new Date(n.createdAt).toLocaleString()} side="top">
                    <span className="inline-block text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </ActionTooltip>
                </button>
              ))}
              <button
                type="button"
                className="mt-1 block w-full rounded px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-accent"
                onClick={() => {
                  setMenu(null);
                  router.push("/notifications");
                }}
              >
                View all notifications
              </button>
            </div>
          ) : null}
        </div>
        <div className="relative" data-header-menu>
          <ActionTooltip label="Language" description={locale === "bn" ? "বাংলা active" : "English active"} side="bottom">
            <Button
              className="h-8 w-8 rounded-full bg-primary/10 p-2 hover:bg-primary/5"
              onClick={() => setMenu(menu === "lang" ? null : "lang")}
              aria-label="Change language"
              aria-expanded={menu === "lang"}
              aria-haspopup="true"
            >
              <Globe className="h-4 w-4 text-primary" aria-hidden />
            </Button>
          </ActionTooltip>
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
        <div className="relative" data-header-menu>
          <ActionTooltip label="Account" description={userName ?? "Signed in"} side="bottom">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setMenu(menu === "user" ? null : "user")}
              aria-label={userName ? `Account menu for ${userName}` : "Account menu"}
              aria-expanded={menu === "user"}
              aria-haspopup="true"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden>
                {initials}
              </span>
            </Button>
          </ActionTooltip>
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
