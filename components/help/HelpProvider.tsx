"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { usePOSStore } from "@/lib/pos-store";
import {
  helpForPath,
  helpNavHref,
  helpSeen,
  markHelpSeen,
  taskById,
  tourById,
  tourForRoles,
  type HelpHit,
} from "@/lib/help";
import { HelpPanel } from "@/components/help/HelpPanel";
import { HelpSearchDialog } from "@/components/help/HelpSearchDialog";
import { GuidedTour } from "@/components/help/GuidedTour";

type View =
  | { type: "none" }
  | { type: "page" }
  | { type: "search" }
  | { type: "task"; id: string }
  | { type: "tour"; id: string; step: number };

type HelpApi = {
  openPageHelp: () => void;
  openSearch: () => void;
  openTask: (id: string) => void;
  startTour: (id: string) => void;
  close: () => void;
};

const HelpCtx = createContext<HelpApi | null>(null);

export function useHelp() {
  const ctx = useContext(HelpCtx);
  if (!ctx) throw new Error("useHelp must be used inside HelpProvider");
  return ctx;
}

export function useHelpOptional() {
  return useContext(HelpCtx);
}

function typingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function stripQuery(names: string[]) {
  const url = new URL(window.location.href);
  let changed = false;
  for (const n of names) {
    if (url.searchParams.has(n)) {
      url.searchParams.delete(n);
      changed = true;
    }
  }
  if (changed) window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, can } = useMe();
  const [view, setView] = useState<View>({ type: "none" });
  const [query, setQuery] = useState("");

  const close = useCallback(() => setView({ type: "none" }), []);
  const openPageHelp = useCallback(() => setView({ type: "page" }), []);
  const openSearch = useCallback(() => {
    setQuery("");
    setView({ type: "search" });
  }, []);
  const openTask = useCallback((id: string) => setView({ type: "task", id }), []);
  const startTour = useCallback((id: string) => setView({ type: "tour", id, step: 0 }), []);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        openSearch();
        return;
      }
      if (typingTarget(e.target)) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        openPageHelp();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPageHelp, openSearch]);

  useEffect(() => {
    if (!me) return;
    const sp = new URLSearchParams(window.location.search);
    const tourQ = sp.get("tour");
    const taskQ = sp.get("task");
    if (tourQ && tourById(tourQ)) {
      startTour(tourQ);
      stripQuery(["tour", "welcome"]);
      return;
    }
    if (taskQ && taskById(taskQ)) {
      openTask(taskQ);
      stripQuery(["task", "welcome"]);
      return;
    }
    if (sp.get("welcome") === "1") stripQuery(["welcome"]);
    if (helpSeen(me.id, "onboarding")) return;

    const timer = window.setTimeout(() => {
      if (helpSeen(me.id, "onboarding")) return;
      const here = window.location.pathname;
      const cart = usePOSStore.getState().cart.length;
      if (here === "/pos" && cart > 0) {
        markHelpSeen(me.id, "onboarding");
        return;
      }
      const tour = tourForRoles(me.roles);
      markHelpSeen(me.id, "onboarding");
      if (tour) startTour(tour.id);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [me, startTour, openTask]);

  useEffect(() => {
    if (view.type !== "tour") return;
    const tour = tourById(view.id);
    const step = tour?.steps[view.step];
    if (!step?.href) return;
    const target = step.href.split("?")[0];
    if (path !== target) router.push(step.href);
  }, [view, path, router]);

  const onPick = useCallback(
    (hit: HelpHit) => {
      if (hit.kind === "task") {
        openTask(hit.id);
        return;
      }
      if (hit.kind === "tour") {
        startTour(hit.id);
        return;
      }
      go(hit.href);
    },
    [go, openTask, startTour],
  );

  const api = useMemo<HelpApi>(
    () => ({ openPageHelp, openSearch, openTask, startTour, close }),
    [openPageHelp, openSearch, openTask, startTour, close],
  );

  const task = view.type === "task" ? taskById(view.id) : undefined;
  const tour = view.type === "tour" ? tourById(view.id) : undefined;
  const roles = me?.roles ?? [];

  return (
    <HelpCtx.Provider value={api}>
      {children}
      {view.type === "page" ? (
        <Dialog
          open
          title={helpTitle(path)}
          description="This screen"
          onClose={close}
          size="sm"
          zIndex={90}
        >
          <HelpPanel path={path} can={can} onNavigate={go} onOpenTask={openTask} onStartTour={startTour} />
        </Dialog>
      ) : null}
      <HelpSearchDialog
        open={view.type === "search"}
        query={query}
        onQuery={setQuery}
        can={can}
        roles={roles}
        onClose={close}
        onPick={onPick}
      />
      {task ? (
        <Dialog open title={task.title} description={task.blurb} onClose={close} size="md" zIndex={90}>
          <ol className="space-y-3">
            {task.steps
              .filter((s) => !s.permission || can(s.permission))
              .map((s, i) => (
                <li key={s.title} className="rounded-md border p-3">
                  <div className="text-xs font-semibold text-muted-foreground">Step {i + 1}</div>
                  <div className="font-medium">{s.title}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                  {s.href ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="mt-2"
                      onClick={() => go(helpNavHref(s.href!, s.action, s.tourId))}
                    >
                      Open
                    </Button>
                  ) : null}
                </li>
              ))}
          </ol>
        </Dialog>
      ) : null}
      {tour && view.type === "tour" ? (
        <GuidedTour
          tour={tour}
          stepIndex={view.step}
          onBack={() => setView({ type: "tour", id: tour.id, step: Math.max(0, view.step - 1) })}
          onNext={() => setView({ type: "tour", id: tour.id, step: view.step + 1 })}
          onClose={() => {
            if (me) markHelpSeen(me.id, tour.id);
            close();
          }}
        />
      ) : null}
    </HelpCtx.Provider>
  );
}

function helpTitle(path: string) {
  return helpForPath(path)?.title ?? "This page";
}
