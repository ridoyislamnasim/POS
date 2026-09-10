"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { searchHelp, tourForRoles, visibleHelpPages, visibleTasks } from "@/lib/help";
import { useHelpOptional } from "@/components/help/HelpProvider";

export function HelpCenter() {
  const { can, me } = useMe();
  const help = useHelpOptional();
  const [q, setQ] = useState("");
  const roles = me?.roles ?? [];
  const hits = useMemo(() => searchHelp(q, can, roles), [q, can, roles]);
  const pages = visibleHelpPages(can);
  const tasks = visibleTasks(can);
  const groups = useMemo(() => {
    const map = new Map<string, typeof pages>();
    for (const p of pages) {
      if (p.href.startsWith("/help")) continue;
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    }
    return [...map.entries()];
  }, [pages]);
  const tour = tourForRoles(roles);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/help/role" className="text-sm font-medium text-primary hover:underline">
          What can I do?
        </Link>
        {tour && help ? (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => help.startTour(tour.id)}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Replay {tour.title}
          </Button>
        ) : null}
      </div>
      <label className="relative block max-w-lg">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pages and tasks…"
          className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
        />
      </label>
      {q.trim() ? (
        <ul className="divide-y rounded-md border bg-card">
          {hits.length === 0 ? <li className="px-3 py-4 text-sm text-muted-foreground">Nothing matches.</li> : null}
          {hits.map((h) => (
            <li key={h.kind + h.id}>
              {h.kind === "page" ? (
                <Link href={h.href} className="block px-3 py-2 hover:bg-accent">
                  <div className="text-sm font-medium">{h.title}</div>
                  <div className="text-xs text-muted-foreground">{h.blurb}</div>
                </Link>
              ) : (
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-accent"
                  onClick={() => (h.kind === "task" ? help?.openTask(h.id) : help?.startTour(h.id))}
                >
                  <div className="text-sm font-medium">{h.title}</div>
                  <div className="text-xs text-muted-foreground">{h.blurb}</div>
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <>
          {tasks.length ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold">Common tasks</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {tasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="rounded-md border bg-card p-3 text-left hover:border-primary"
                    onClick={() => help?.openTask(t.id)}
                  >
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.blurb}</div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {groups.map(([group, list]) => (
            <section key={group}>
              <h2 className="mb-2 text-sm font-semibold">{group}</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((p) => (
                  <Link key={p.href} href={p.href} className="rounded-md border bg-card p-3 hover:border-primary">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.blurb}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
