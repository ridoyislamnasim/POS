"use client";

import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { filterLinks, helpForPath, helpNavHref, taskById, visibleTasks } from "@/lib/help";
import { cn } from "@/lib/cn";

export function HelpPanel({
  path,
  can,
  onNavigate,
  onOpenTask,
  onStartTour,
  className,
}: {
  path: string;
  can: (p: string) => boolean;
  onNavigate: (href: string) => void;
  onOpenTask?: (id: string) => void;
  onStartTour?: (id: string) => void;
  className?: string;
}) {
  const page = helpForPath(path);
  const next = page ? filterLinks(page.next, can) : [];
  const tasks = (page?.tasks ?? []).map(taskById).filter((t) => t && (!t.permission || can(t.permission)));

  if (!page) {
    return (
      <div className={cn("space-y-2 text-sm", className)}>
        <p className="text-muted-foreground">No extra notes for this screen. Search Help for a task.</p>
        <Link href="/help" className="text-sm font-medium text-primary hover:underline" onClick={() => onNavigate("/help")}>
          Open Help Center
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <p className="text-muted-foreground">{page.blurb}</p>
      {page.canDo.length ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What you can do</div>
          <ul className="list-disc space-y-0.5 pl-4">
            {page.canDo.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {next.length ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where next</div>
          <div className="flex flex-col gap-1">
            {next.map((l) => (
              <button
                key={l.href + l.label}
                type="button"
                className="text-left text-sm font-medium text-primary hover:underline"
                onClick={() => onNavigate(helpNavHref(l.href, l.action))}
              >
                {l.label} →
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {tasks.length ? (
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Tasks</div>
          <div className="flex flex-col gap-1">
            {tasks.map((t) =>
              t ? (
                <button
                  key={t.id}
                  type="button"
                  className="text-left text-sm font-medium text-primary hover:underline"
                  onClick={() => onOpenTask?.(t.id)}
                >
                  {t.title}
                </button>
              ) : null,
            )}
          </div>
        </div>
      ) : null}
      {visibleTasks(can).some((t) => t.id === "first-sale") && path === "/pos" && onStartTour ? (
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onStartTour("cashier-pos")}>
          <CircleHelp className="mr-1.5 h-3.5 w-3.5" />
          Replay register tour
        </Button>
      ) : null}
      <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => onNavigate("/help")}>
        Search all help
      </button>
    </div>
  );
}
