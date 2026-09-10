export type { HelpHit, HelpLink, HelpPage, HelpTour, RoleGuide, TaskGuide, TourStep } from "./types";
export {
  HELP_PAGES,
  GROUP_BLURBS,
  helpForPath,
  helpBlurbFor,
  groupBlurb,
  emptyHintFor,
  visibleHelpPages,
  canOpenHref,
  filterLinks,
} from "./catalog";
export { HELP_TASKS, taskById, visibleTasks } from "./tasks";
export { HELP_TOURS, tourById, tourForRoles } from "./tours";
export { ROLE_GUIDES, guidesForRoles } from "./roles";
export { searchHelp } from "./search";
export { helpSeen, markHelpSeen, clearHelpSeen } from "./storage";
export { useHelpCreateAction } from "./use-help-create-action";

export function helpNavHref(href: string, action?: "open-create" | "start-tour", tourId?: string) {
  const qIndex = href.indexOf("?");
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href;
  const sp = new URLSearchParams(qIndex >= 0 ? href.slice(qIndex + 1) : "");
  if (action === "open-create") sp.set("helpAction", "create");
  if (action === "start-tour" && tourId) sp.set("tour", tourId);
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}
