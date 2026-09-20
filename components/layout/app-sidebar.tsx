"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Sparkles, Store, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { filterNavGroups, type NavGroup, type NavItem, type NavTone } from "@/lib/nav-config";
import { groupBlurb, helpBlurbFor } from "@/lib/help";
import {
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
  SIDEBAR_WIDTH_MOBILE_PX,
  sidebarHover,
  sidebarTransition,
} from "@/lib/sidebar-layout";
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
  emerald: {
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-800",
    active: "bg-emerald-600 text-white shadow-sm shadow-emerald-200 ring-1 ring-emerald-600 dark:shadow-none dark:bg-emerald-500",
    bar: "bg-emerald-600 dark:bg-emerald-400",
    child: "hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-200",
    childOn: "bg-emerald-50 font-medium text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-100",
    childChip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-800",
    childChipOn: "bg-emerald-600 text-white ring-1 ring-emerald-600",
    tip: "from-emerald-500 to-teal-600",
    line: "border-emerald-200 dark:border-emerald-800",
  },
  amber: {
    chip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800",
    active: "bg-amber-500 text-amber-950 shadow-sm shadow-amber-200 ring-1 ring-amber-500 dark:shadow-none dark:text-amber-950",
    bar: "bg-amber-500",
    child: "hover:bg-amber-50 hover:text-amber-900 dark:hover:bg-amber-950/60 dark:hover:text-amber-100",
    childOn: "bg-amber-50 font-medium text-amber-950 dark:bg-amber-950/80 dark:text-amber-100",
    childChip: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800",
    childChipOn: "bg-amber-500 text-amber-950 ring-1 ring-amber-500",
    tip: "from-amber-500 to-orange-600",
    line: "border-amber-200 dark:border-amber-800",
  },
  rose: {
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800",
    active: "bg-rose-600 text-white shadow-sm shadow-rose-200 ring-1 ring-rose-600 dark:shadow-none dark:bg-rose-500",
    bar: "bg-rose-600 dark:bg-rose-400",
    child: "hover:bg-rose-50 hover:text-rose-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-200",
    childOn: "bg-rose-50 font-medium text-rose-900 dark:bg-rose-950/80 dark:text-rose-100",
    childChip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-800",
    childChipOn: "bg-rose-600 text-white ring-1 ring-rose-600",
    tip: "from-rose-500 to-pink-600",
    line: "border-rose-200 dark:border-rose-800",
  },
  teal: {
    chip: "bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:ring-teal-800",
    active: "bg-teal-600 text-white shadow-sm shadow-teal-200 ring-1 ring-teal-600 dark:shadow-none dark:bg-teal-500",
    bar: "bg-teal-600 dark:bg-teal-400",
    child: "hover:bg-teal-50 hover:text-teal-800 dark:hover:bg-teal-950/60 dark:hover:text-teal-200",
    childOn: "bg-teal-50 font-medium text-teal-900 dark:bg-teal-950/80 dark:text-teal-100",
    childChip: "bg-teal-50 text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:ring-teal-800",
    childChipOn: "bg-teal-600 text-white ring-1 ring-teal-600",
    tip: "from-teal-500 to-emerald-600",
    line: "border-teal-200 dark:border-teal-800",
  },
  orange: {
    chip: "bg-orange-50 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:ring-orange-800",
    active: "bg-orange-600 text-white shadow-sm shadow-orange-200 ring-1 ring-orange-600 dark:shadow-none dark:bg-orange-500",
    bar: "bg-orange-600 dark:bg-orange-400",
    child: "hover:bg-orange-50 hover:text-orange-900 dark:hover:bg-orange-950/60 dark:hover:text-orange-100",
    childOn: "bg-orange-50 font-medium text-orange-950 dark:bg-orange-950/80 dark:text-orange-100",
    childChip: "bg-orange-50 text-orange-800 ring-1 ring-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:ring-orange-800",
    childChipOn: "bg-orange-600 text-white ring-1 ring-orange-600",
    tip: "from-orange-500 to-amber-500",
    line: "border-orange-200 dark:border-orange-800",
  },
  lime: {
    chip: "bg-lime-50 text-lime-800 ring-1 ring-lime-200 dark:bg-lime-950/70 dark:text-lime-300 dark:ring-lime-800",
    active: "bg-lime-600 text-white shadow-sm shadow-lime-200 ring-1 ring-lime-600 dark:shadow-none dark:bg-lime-500",
    bar: "bg-lime-600 dark:bg-lime-400",
    child: "hover:bg-lime-50 hover:text-lime-900 dark:hover:bg-lime-950/60 dark:hover:text-lime-100",
    childOn: "bg-lime-50 font-medium text-lime-950 dark:bg-lime-950/80 dark:text-lime-100",
    childChip: "bg-lime-50 text-lime-800 ring-1 ring-lime-200 dark:bg-lime-950/70 dark:text-lime-300 dark:ring-lime-800",
    childChipOn: "bg-lime-600 text-white ring-1 ring-lime-600",
    tip: "from-lime-500 to-emerald-600",
    line: "border-lime-200 dark:border-lime-800",
  },
  yellow: {
    chip: "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-950/70 dark:text-yellow-200 dark:ring-yellow-800",
    active: "bg-yellow-500 text-yellow-950 shadow-sm shadow-yellow-200 ring-1 ring-yellow-500 dark:shadow-none",
    bar: "bg-yellow-500",
    child: "hover:bg-yellow-50 hover:text-yellow-900 dark:hover:bg-yellow-950/60 dark:hover:text-yellow-100",
    childOn: "bg-yellow-50 font-medium text-yellow-950 dark:bg-yellow-950/80 dark:text-yellow-100",
    childChip: "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200 dark:bg-yellow-950/70 dark:text-yellow-200 dark:ring-yellow-800",
    childChipOn: "bg-yellow-500 text-yellow-950 ring-1 ring-yellow-500",
    tip: "from-yellow-400 to-amber-500",
    line: "border-yellow-200 dark:border-yellow-800",
  },
  stone: {
    chip: "bg-stone-100 text-stone-700 ring-1 ring-stone-200 dark:bg-stone-900/80 dark:text-stone-300 dark:ring-stone-700",
    active: "bg-stone-800 text-white shadow-sm shadow-stone-200 ring-1 ring-stone-800 dark:shadow-none dark:bg-stone-600",
    bar: "bg-stone-700 dark:bg-stone-400",
    child: "hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-900/70 dark:hover:text-stone-100",
    childOn: "bg-stone-100 font-medium text-stone-900 dark:bg-stone-900/80 dark:text-stone-100",
    childChip: "bg-stone-100 text-stone-700 ring-1 ring-stone-200 dark:bg-stone-900/80 dark:text-stone-300 dark:ring-stone-700",
    childChipOn: "bg-stone-800 text-white ring-1 ring-stone-800 dark:bg-stone-600",
    tip: "from-stone-600 to-stone-800",
    line: "border-stone-200 dark:border-stone-700",
  },
  fuchsia: {
    chip: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 dark:ring-fuchsia-800",
    active: "bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-200 ring-1 ring-fuchsia-600 dark:shadow-none dark:bg-fuchsia-500",
    bar: "bg-fuchsia-600 dark:bg-fuchsia-400",
    child: "hover:bg-fuchsia-50 hover:text-fuchsia-800 dark:hover:bg-fuchsia-950/60 dark:hover:text-fuchsia-200",
    childOn: "bg-fuchsia-50 font-medium text-fuchsia-900 dark:bg-fuchsia-950/80 dark:text-fuchsia-100",
    childChip: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 dark:ring-fuchsia-800",
    childChipOn: "bg-fuchsia-600 text-white ring-1 ring-fuchsia-600",
    tip: "from-fuchsia-500 to-pink-600",
    line: "border-fuchsia-200 dark:border-fuchsia-800",
  },
};

type Props = {
  open: boolean;
  collapsed: boolean;
  isDesktop: boolean;
  can: (p: string) => boolean;
  isPlatform?: boolean;
  isOwner?: boolean;
  roles?: string[];
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

export function AppSidebar({ open, collapsed, isDesktop, can, isPlatform, isOwner, roles, loading, onCloseMobile, onToggleCollapse }: Props) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const groups = useMemo(() => filterNavGroups(can, { isPlatform, isOwner, roles }), [can, isPlatform, isOwner, roles]);
  const motionT = reduceMotion ? { duration: 0 } : sidebarTransition;
  const sidebarWidth = isDesktop
    ? collapsed
      ? SIDEBAR_WIDTH_COLLAPSED_PX
      : SIDEBAR_WIDTH_EXPANDED_PX
    : SIDEBAR_WIDTH_MOBILE_PX;
  const iconOnly = collapsed && isDesktop;
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
      <AnimatePresence>
        {open && !isDesktop ? (
          <motion.button
            key="sidebar-overlay"
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionT}
            onClick={onCloseMobile}
          />
        ) : null}
      </AnimatePresence>
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden text-slate-700 shadow-sm dark:text-slate-200",
          "border-r border-slate-200 bg-gradient-to-b from-slate-50 via-white to-orange-50/80",
          "dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-orange-950/40 dark:shadow-none",
        )}
        initial={false}
        animate={{
          width: sidebarWidth,
          x: isDesktop || open ? 0 : -sidebarWidth,
        }}
        transition={motionT}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(251,146,60,0.22),transparent_38%),radial-gradient(circle_at_90%_100%,rgba(245,158,11,0.16),transparent_36%)] dark:bg-[radial-gradient(circle_at_15%_0%,rgba(249,115,22,0.14),transparent_38%),radial-gradient(circle_at_90%_100%,rgba(245,158,11,0.1),transparent_36%)]" />
        <div
          className={cn(
            "relative flex h-sidebar-header min-h-sidebar-header items-center border-b border-slate-200/80 bg-white/60 px-1.5 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70",
            iconOnly ? "justify-center" : "justify-between gap-1",
          )}
        >
          <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-1 font-semibold", iconOnly && "justify-center")}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 via-amber-400 to-orange-600 shadow-sm shadow-orange-200 dark:shadow-none">
              <Store className="h-3.5 w-3.5 text-white" />
            </span>
            <motion.span
              initial={false}
              animate={{ opacity: iconOnly ? 0 : 1, width: iconOnly ? 0 : "auto" }}
              transition={motionT}
              className="overflow-hidden whitespace-nowrap bg-gradient-to-r from-orange-700 via-amber-600 to-orange-500 bg-clip-text text-[13px] leading-tight text-transparent dark:from-orange-300 dark:via-amber-300 dark:to-orange-200"
            >
              Universal POS
            </motion.span>
          </Link>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden" onClick={onCloseMobile} aria-label="Close sidebar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="sidebar-scroll relative flex-1 overflow-y-scroll py-1">
          {loading ? (
            <div className="mx-1.5 space-y-1">
              <div className="h-7 animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800" />
              <div className="h-7 animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800" />
              <div className="h-7 animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800" />
            </div>
          ) : (
            groups.map((group) => (
              <NavBranch
                key={group.title}
                group={group}
                pathname={pathname}
                collapsed={collapsed}
                isDesktop={isDesktop}
                expanded={openIds.includes(group.title)}
                onToggle={() => toggle(group.title)}
                onNavigate={onCloseMobile}
              />
            ))
          )}
        </nav>
        <div className="relative hidden border-t border-slate-200 bg-white/50 p-1 dark:border-slate-800 dark:bg-slate-950/60 lg:block">
          <SidebarTooltip
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            description={collapsed ? "Show names and child menus" : "Icon-only compact mode"}
            toneClass="from-orange-400 to-amber-500"
            disabled={!collapsed}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center gap-1 text-slate-600 hover:bg-orange-50 hover:text-orange-800 dark:text-slate-300 dark:hover:bg-orange-950/50 dark:hover:text-orange-200"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              {!collapsed ? (
                <span className="flex items-center gap-0.5 text-[11px]">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Collapse
                </span>
              ) : null}
            </Button>
          </SidebarTooltip>
        </div>
      </motion.aside>
    </>
  );
}

function NavBranch({
  group,
  pathname,
  collapsed,
  isDesktop,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  isDesktop: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const iconOnly = collapsed && isDesktop;
  const tone = TONES[group.tone];
  const ParentIcon = group.icon;
  const parentOn = groupActive(pathname, group);
  const leafOnly = group.items.length === 1;
  const leaf = group.items[0];

  const iconBox = (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
        parentOn ? tone.active : tone.chip,
      )}
    >
      <ParentIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );

  const childPanel = !leafOnly ? (
    <div className="mt-1.5 space-y-0.5 border-t border-white/20 pt-1.5">
      {group.items.map((item) => {
        const Icon = item.icon;
        const on = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-white/90 hover:bg-white/15",
              on && "bg-white/20 font-medium text-white",
            )}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20 text-white">
              <Icon className="h-3 w-3" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1 whitespace-normal leading-snug">{item.title}</span>
          </Link>
        );
      })}
    </div>
  ) : null;

  const rowClass = cn(
    "relative flex h-8 w-full items-center gap-1 rounded-md px-1 text-[12.5px] font-semibold leading-tight",
    parentOn
      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:text-slate-50 dark:ring-slate-700"
      : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white",
    iconOnly && "justify-center px-0",
  );

  if (leafOnly) {
    const link = (
      <motion.div className="w-full" whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} transition={sidebarHover}>
        <Link href={leaf.href} onClick={onNavigate} className={rowClass}>
          {parentOn ? (
            <motion.span layoutId={`nav-bar-${group.title}`} className={cn("absolute left-0 top-1.5 h-5 w-0.5 rounded-r-full", tone.bar)} />
          ) : null}
          {iconBox}
          <span className={cn("min-w-0 flex-1 whitespace-normal text-left", iconOnly && "sr-only")}>{leaf.title}</span>
        </Link>
      </motion.div>
    );
    return (
      <div className="px-sidebar-x py-sidebar-y">
        {iconOnly ? (
          <SidebarTooltip label={group.title} description={helpBlurbFor(leaf.href) ?? leaf.title} toneClass={tone.tip}>
            {link}
          </SidebarTooltip>
        ) : (
          link
        )}
      </div>
    );
  }

  const parentBtn = (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={rowClass}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={sidebarHover}
    >
      {parentOn ? (
        <motion.span layoutId={`nav-bar-${group.title}`} className={cn("absolute left-0 top-1.5 h-5 w-0.5 rounded-r-full", tone.bar)} />
      ) : null}
      {iconBox}
      <span className={cn("min-w-0 flex-1 whitespace-normal text-left", iconOnly && "sr-only")}>{group.title}</span>
      <ChevronDown
        className={cn(
          "h-3 w-3 shrink-0 text-slate-400 transition-transform duration-150 dark:text-slate-500",
          expanded ? "rotate-0" : "-rotate-90",
          iconOnly && "hidden",
        )}
      />
    </motion.button>
  );

  return (
    <div className="px-sidebar-x py-sidebar-y">
      {iconOnly ? (
        <SidebarTooltip
          label={group.title}
          description={groupBlurb(group.title) ?? `${group.items.length} pages`}
          toneClass={tone.tip}
          panel={childPanel}
        >
          {parentBtn}
        </SidebarTooltip>
      ) : (
        parentBtn
      )}
      <AnimatePresence initial={false}>
        {!iconOnly && expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={sidebarTransition}
            className="overflow-hidden"
          >
            <div className={cn("relative ml-3 mt-0.5 space-y-px border-l py-0.5 pl-1.5", tone.line)}>
              {group.items.map((item) => (
                <ChildLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} tone={tone} />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
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
    <motion.div whileHover={{ x: 1 }} transition={sidebarHover}>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-0.5 text-[12.5px] text-slate-600 dark:text-slate-300",
          tone.child,
          active && tone.childOn,
        )}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded",
            active ? tone.childChipOn : tone.childChip,
          )}
        >
          <Icon className="h-3 w-3" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1 whitespace-normal leading-snug">{item.title}</span>
      </Link>
    </motion.div>
  );
}
