"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { searchHelp, type HelpHit } from "@/lib/help";

export function HelpSearchDialog({
  open,
  query,
  onQuery,
  can,
  roles,
  onClose,
  onPick,
}: {
  open: boolean;
  query: string;
  onQuery: (q: string) => void;
  can: (p: string) => boolean;
  roles: string[];
  onClose: () => void;
  onPick: (hit: HelpHit) => void;
}) {
  const [hits, setHits] = useState<HelpHit[]>([]);

  useEffect(() => {
    if (!open) return;
    setHits(searchHelp(query, can, roles));
  }, [open, query, can, roles]);

  return (
    <Dialog open={open} title="Help" description="Pages and tasks you can open." onClose={onClose} size="lg" zIndex={90}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search pages, tasks, tours…"
          className="h-10 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
          aria-label="Search help"
        />
      </label>
      <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {hits.length === 0 ? <li className="px-2 py-3 text-sm text-muted-foreground">Nothing matches.</li> : null}
        {hits.map((h) => (
          <li key={h.kind + h.id}>
            <button
              type="button"
              className="w-full rounded-md px-2 py-2 text-left hover:bg-accent"
              onClick={() => onPick(h)}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">{h.kind}</span>
                <span className="text-sm font-medium">{h.title}</span>
              </div>
              <div className="truncate text-xs text-muted-foreground">{h.blurb}</div>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">Ctrl+K search · ? this page · Esc close</p>
    </Dialog>
  );
}
