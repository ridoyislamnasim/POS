export type HelpLink = {
  href: string;
  label: string;
  permission?: string;
  action?: "open-create" | "start-tour";
};

export type HelpPage = {
  href: string;
  group: string;
  permission: string | null;
  title: string;
  blurb: string;
  canDo: string[];
  next: HelpLink[];
  tasks: string[];
  emptyHint?: string;
  keywords: string[];
};

export type TaskStep = {
  title: string;
  body: string;
  href?: string;
  permission?: string;
  action?: "open-create" | "start-tour";
  tourId?: string;
};

export type TaskGuide = {
  id: string;
  title: string;
  blurb: string;
  permission?: string;
  steps: TaskStep[];
  keywords: string[];
};

export type TourStep = {
  selector?: string;
  title: string;
  body: string;
  href?: string;
  placement?: "top" | "bottom" | "left" | "right";
};

export type HelpTour = {
  id: string;
  title: string;
  roles: string[];
  steps: TourStep[];
};

export type RoleGuide = {
  roleKey: string;
  title: string;
  blurb: string;
  canDo: string[];
  cannot: string[];
  startHref: string;
  tourId?: string;
};

export type HelpHit = {
  kind: "page" | "task" | "tour";
  id: string;
  title: string;
  blurb: string;
  href: string;
  permission?: string | null;
};
