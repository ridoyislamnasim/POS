import { visibleHelpPages } from "./catalog";
import { visibleTasks } from "./tasks";
import { HELP_TOURS } from "./tours";
import type { HelpHit } from "./types";

function hay(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function searchHelp(query: string, can: (p: string) => boolean, roles: string[] = []): HelpHit[] {
  const q = query.trim().toLowerCase();
  const pages = visibleHelpPages(can);
  const tasks = visibleTasks(can);
  const roleSet = new Set(roles);
  const tours = HELP_TOURS.filter((t) => t.roles.length === 0 || t.roles.some((r) => roleSet.has(r)));

  const pageHits = (list: typeof pages): HelpHit[] =>
    list.map((p) => ({
      kind: "page" as const,
      id: p.href,
      title: p.title,
      blurb: p.blurb,
      href: p.href,
      permission: p.permission,
    }));

  if (!q) return pageHits(pages.slice(0, 8));

  const hits: HelpHit[] = [];

  for (const p of pages) {
    if (hay([p.title, p.blurb, p.group, ...p.canDo, ...p.keywords, p.href]).includes(q)) {
      hits.push({ kind: "page", id: p.href, title: p.title, blurb: p.blurb, href: p.href, permission: p.permission });
    }
  }
  for (const t of tasks) {
    if (hay([t.title, t.blurb, ...t.keywords, ...t.steps.map((s) => s.title)]).includes(q)) {
      hits.push({ kind: "task", id: t.id, title: t.title, blurb: t.blurb, href: `/help?task=${t.id}` });
    }
  }
  for (const t of tours) {
    if (hay([t.title, t.id, ...t.roles]).includes(q)) {
      hits.push({ kind: "tour", id: t.id, title: t.title, blurb: "Replay this guided tour", href: `?tour=${t.id}` });
    }
  }
  return hits.slice(0, 20);
}
