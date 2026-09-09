"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Sparkles, Store, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { filterNavGroups, type NavGroup, type NavItem, type NavTone } from "@/lib/nav-config";
import { Button } from "@/components/ui/button";
import { SidebarTooltip } from "@/components/ui/sidebar-tooltip";

const OPEN_KEY = "pos_nav_open";

const TONES: Record<
  NavTone,
  {
    chip: string;
    active: string;
    bar: string;
    child: string;
    childOn: string;
    childChip: string;
    childChipOn: string;
    tip: string;
    line: string;
  }
> = {
  sky: {
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    active: "bg-sky-600 text-white shadow-sm shadow-sky-200 ring-1 ring-sky-600",
    bar: "bg-sky-600",
    child: "hover:bg-sky-50 hover:text-sky-800",
    childOn: "bg-sky-50 font-medium text-sky-900",
    childChip: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    childChipOn: "bg-sky-600 text-white ring-1 ring-sky-600",
    tip: "from-sky-500 to-blue-600",
    line: "border-sky-200",
  },
  emerald: {
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    active: "bg-emerald-600 text-white shadow-sm shadow-emerald-200 ring-1 ring-emerald-600",
    bar: "bg-emerald-600",
    child: "hover:bg-emerald-50 hover:text-emerald-800",
    childOn: "bg-emerald-50 font-medium text-emerald-900",
    childChip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    childChipOn: "bg-emerald-600 text-white ring-1 ring-emerald-600",
    tip: "from-emerald-500 to-teal-600",
    line: "border-emerald-200",
  },
  amber: {
    chip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    active: "bg-amber-500 text-amber-950 shadow-sm shadow-amber-200 ring-1 ring-amber-500",
    bar: "bg-amber-500",
    child: "hover:bg-amber-50 hover:text-amber-900",
    childOn: "bg-amber-50 font-medium text-amber-950",
    childChip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    childChipOn: "bg-amber-500 text-amber-950 ring-1 ring-amber-500",
    tip: "from-amber-500 to-orange-600",
    line: "border-amber-200",
  },
  rose: {
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    active: "bg-rose-600 text-white shadow-sm shadow-rose-200 ring-1 ring-rose-600",
    bar: "bg-rose-600",
    child: "hover:bg-rose-50 hover:text-rose-800",
    childOn: "bg-rose-50 font-medium text-rose-900",
    childChip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    childChipOn: "bg-rose-600 text-white ring-1 ring-rose-600",
    tip: "from-rose-500 to-pink-600",
    line: "border-rose-200",
  },
  violet: {
    chip: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    active: "bg-violet-600 text-white shadow-sm shadow-violet-200 ring-1 ring-violet-600",
    bar: "bg-violet-600",
    child: "hover:bg-violet-50 hover:text-violet-800",
    childOn: "bg-violet-50 font-medium text-violet-900",
    childChip: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    childChipOn: "bg-violet-600 text-white ring-1 ring-violet-600",
    tip: "from-violet-500 to-purple-600",
    line: "border-violet-200",
  },
  teal: {
    chip: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    active: "bg-teal-600 text-white shadow-sm shadow-teal-200 ring-1 ring-teal-600",
    bar: "bg-teal-600",
    child: "hover:bg-teal-50 hover:text-teal-800",
    childOn: "bg-teal-50 font-medium text-teal-900",
    childChip: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    childChipOn: "bg-teal-600 text-white ring-1 ring-teal-600",
    tip: "from-teal-500 to-cyan-600",
    line: "border-teal-200",
  },
  orange: {
    chip: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    active: "bg-orange-600 text-white shadow-sm shadow-orange-200 ring-1 ring-orange-600",
    bar: "bg-orange-600",
    child: "hover:bg-orange-50 hover:text-orange-800",
    childOn: "bg-orange-50 font-medium text-orange-900",
    childChip: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    childChipOn: "bg-orange-600 text-white ring-1 ring-orange-600",
    tip: "from-orange-500 to-amber-600",
    line: "border-orange-200",
  },
  indigo: {
    chip: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    active: "bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-1 ring-indigo-600",
    bar: "bg-indigo-600",
    child: "hover:bg-indigo-50 hover:text-indigo-800",
    childOn: "bg-indigo-50 font-medium text-indigo-900",
    childChip: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    childChipOn: "bg-indigo-600 text-white ring-1 ring-indigo-600",
    tip: "from-indigo-500 to-violet-600",
    line: "border-indigo-200",
  },
  cyan: {
    chip: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200",
    active: "bg-cyan-600 text-white shadow-sm shadow-cyan-200 ring-1 ring-cyan-600",
    bar: "bg-cyan-600",
    child: "hover:bg-cyan-50 hover:text-cyan-900",
    childOn: "bg-cyan-50 font-medium text-cyan-950",
    childChip: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200",
    childChipOn: "bg-cyan-600 text-white ring-1 ring-cyan-600",
    tip: "from-cyan-500 to-sky-600",
    line: "border-cyan-200",
  },
  blue: {
    chip: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    active: "bg-blue-600 text-white shadow-sm shadow-blue-200 ring-1 ring-blue-600",
    bar: "bg-blue-600",
    child: "hover:bg-blue-50 hover:text-blue-800",
    childOn: "bg-blue-50 font-medium text-blue-900",
    childChip: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    childChipOn: "bg-blue-600 text-white ring-1 ring-blue-600",
    tip: "from-blue-500 to-indigo-600",
    line: "border-blue-200",
  },
  fuchsia: {
    chip: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
    active: "bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-200 ring-1 ring-fuchsia-600",
    bar: "bg-fuchsia-600",
    child: "hover:bg-fuchsia-50 hover:text-fuchsia-800",
    childOn: "bg-fuchsia-50 font-medium text-fuchsia-900",
    childChip: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
    childChipOn: "bg-fuchsia-600 text-white ring-1 ring-fuchsia-600",
    tip: "from-fuchsia-500 to-pink-600",
    line: "border-fuchsia-200",
  },
};

type Props = {
  open: boolean;
  collapsed: boolean;
  can: (p: string) => boolean;
  loading?: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && href !== "/reports" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function groupActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isActive(pathname, item.href) || pathname === item.href);
}

function readOpen(): string[] | null {
  try {
    const raw = window.localStorage.getItem(OPEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

export function AppSidebar({ open, collapsed, can, loading, onCloseMobile, onToggleCollapse }: Props) {
  const pathname = usePathname();
  const groups = useMemo(() => filterNavGroups(can), [can]);
  const groupKey = groups.map((g) => g.title).join("|");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readOpen() ?? [];
    const active = groups.filter((g) => groupActive(pathname, g)).map((g) => g.title);
    const next = [...new Set([...saved, ...active])];
    if (!next.length && groups[0]) next.push(groups[0].title);
    setOpenIds(next);
    setReady(true);
    // hydrate once from storage + current route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    setOpenIds((cur) => {
      const extra = groups.filter((g) => groupActive(pathname, g)).map((g) => g.title).filter((t) => !cur.includes(t));
      return extra.length ? [...cur, ...extra] : cur;
    });
    // only follow route / permission changes — never undo a click on the same page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, ready, groupKey]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(OPEN_KEY, JSON.stringify(openIds));
  }, [openIds, ready]);

  function toggle(title: string) {
    setOpenIds((cur) => (cur.includes(title) ? cur.filter((t) => t !== title) : [...cur, title]));
  }

  return (
    <>
      <div className={cn("fixed inset-0 z-40 bg-black/50 lg:hidden", open ? "block" : "hidden")} onClick={onCloseMobile} />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col text-slate-700 shadow-sm transition-all duration-300 ease-in-out",
          "border-r border-slate-200 bg-gradient-to-b from-slate-50 via-white to-indigo-50",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "lg:w-16" : "lg:w-72",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(125,211,252,0.28),transparent_38%),radial-gradient(circle_at_90%_100%,rgba(244,114,182,0.18),transparent_36%)]" />
        <div className="relative flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/60 px-3 backdrop-blur-sm">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-violet-400 to-fuchsia-400 shadow-md shadow-violet-200">
              <Store className="h-5 w-5 text-white" />
            </span>
            <span className={cn("truncate bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-lg text-transparent", collapsed && "lg:hidden")}>
              Universal POS
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onCloseMobile} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("hidden text-slate-600 hover:bg-violet-50 hover:text-violet-700 lg:inline-flex", collapsed && "lg:hidden")}
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="sidebar-scroll relative flex-1 overflow-y-scroll py-2">
          {loading ? (
            <div className="mx-3 space-y-2">
              <div className="h-9 animate-pulse rounded-md bg-slate-200/70" />
              <div className="h-9 animate-pulse rounded-md bg-slate-200/70" />
              <div className="h-9 animate-pulse rounded-md bg-slate-200/70" />
            </div>
          ) : (
            groups.map((group) => (
              <NavBranch
                key={group.title}
                group={group}
                pathname={pathname}
                collapsed={collapsed}
                expanded={openIds.includes(group.title)}
                onToggle={() => toggle(group.title)}
                onNavigate={onCloseMobile}
              />
            ))
          )}
        </nav>
        <div className="relative hidden border-t border-slate-200 bg-white/50 p-2 lg:block">
          <SidebarTooltip
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            description={collapsed ? "Show names and child menus" : "Icon-only compact mode"}
            toneClass="from-violet-400 to-fuchsia-500"
            disabled={!collapsed}
          >
            <Button
              variant="ghost"
              className="w-full justify-center gap-2 text-slate-600 hover:bg-violet-50 hover:text-violet-700"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              {!collapsed ? (
                <span className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3 text-violet-500" />
                  Collapse
                </span>
              ) : null}
            </Button>
          </SidebarTooltip>
        </div>
      </aside>
    </>
  );
}

function NavBranch({
  group,
  pathname,
  collapsed,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const tone = TONES[group.tone];
  const ParentIcon = group.icon;
  const parentOn = groupActive(pathname, group);
  const leafOnly = group.items.length === 1;
  const leaf = group.items[0];

  const iconBox = (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
        parentOn ? tone.active : tone.chip,
      )}
    >
      <ParentIcon className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );

  const childPanel = !leafOnly ? (
    <div className="mt-2 space-y-0.5 border-t border-white/20 pt-2">
      {group.items.map((item) => {
        const Icon = item.icon;
        const on = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/90 transition hover:bg-white/15",
              on && "bg-white/20 font-medium text-white",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-white">
              <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </div>
  ) : null;

  if (leafOnly) {
    const link = (
      <Link
        href={leaf.href}
        onClick={onNavigate}
        className={cn(
          "relative flex h-10 w-full items-center gap-2 rounded-xl px-2 text-sm font-semibold transition",
          parentOn ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        {parentOn ? <span className={cn("absolute left-0 top-2 h-6 w-1 rounded-r-full", tone.bar)} /> : null}
        {iconBox}
        <span className={cn("truncate", collapsed && "lg:hidden")}>{leaf.title}</span>
      </Link>
    );
    return (
      <div className="px-2 py-0.5">
        {collapsed ? (
          <SidebarTooltip label={group.title} description={leaf.title} toneClass={tone.tip}>
            {link}
          </SidebarTooltip>
        ) : (
          link
        )}
      </div>
    );
  }

  const parentBtn = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "relative flex h-10 w-full items-center gap-2 rounded-xl px-2 text-sm font-semibold transition",
        parentOn ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-700 hover:bg-white/80 hover:text-slate-900",
        collapsed && "lg:justify-center lg:px-0",
      )}
    >
      {parentOn ? <span className={cn("absolute left-0 top-2 h-6 w-1 rounded-r-full", tone.bar)} /> : null}
      {iconBox}
      <span className={cn("min-w-0 flex-1 truncate text-left", collapsed && "lg:hidden")}>{group.title}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-slate-400 transition-transform",
          expanded ? "rotate-0" : "-rotate-90",
          collapsed && "lg:hidden",
        )}
      />
    </button>
  );

  return (
    <div className="px-2 py-0.5">
      {collapsed ? (
        <SidebarTooltip
          label={group.title}
          description={`${group.items.length} pages`}
          toneClass={tone.tip}
          panel={childPanel}
        >
          {parentBtn}
        </SidebarTooltip>
      ) : (
        parentBtn
      )}
      {!collapsed && expanded ? (
        <div className={cn("relative ml-5 mt-1 space-y-0.5 border-l py-1 pl-3", tone.line)}>
          {group.items.map((item) => (
            <ChildLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} tone={tone} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChildLink({
  item,
  pathname,
  onNavigate,
  tone,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  tone: (typeof TONES)[NavTone];
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition",
        tone.child,
        active && tone.childOn,
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          active ? tone.childChipOn : tone.childChip,
        )}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      </span>
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
