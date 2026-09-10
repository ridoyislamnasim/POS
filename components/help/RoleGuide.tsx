"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CircleHelp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_GUIDES, guidesForRoles, type RoleGuide } from "@/lib/help";

function Card({
  guide,
  current,
  onTour,
}: {
  guide: RoleGuide;
  current: boolean;
  onTour?: (id: string) => void;
}) {
  return (
    <section className={`rounded-lg border bg-card p-4 ${current ? "ring-1 ring-orange-400" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{guide.title}</h2>
          {current ? <div className="text-[11px] font-medium text-orange-600">Your login</div> : null}
        </div>
        {guide.tourId && onTour ? (
          <Button type="button" variant="outline" size="xs" onClick={() => onTour(guide.tourId!)}>
            <Play className="mr-1 h-3 w-3" />
            Tour
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{guide.blurb}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Can</div>
          <ul className="mt-1 list-disc pl-4 text-sm">
            {guide.canDo.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">Cannot</div>
          <ul className="mt-1 list-disc pl-4 text-sm">
            {guide.cannot.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
      <Link href={guide.startHref} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Go to {guide.startHref} →
      </Link>
    </section>
  );
}

export function RoleGuideView({
  roles,
  permissions,
  can,
  onTour,
}: {
  roles: string[];
  permissions: string[];
  can: (p: string) => boolean;
  onTour?: (id: string) => void;
}) {
  const mine = guidesForRoles(roles);
  const fallback = useMemo(() => {
    if (mine.length) return null;
    const pages = [
      can("sale.create") && "Sell on POS",
      can("catalog.manage") && "Edit the catalogue",
      can("purchase.manage") && "Receive purchases",
      can("report.view") && "Open the dashboard",
      can("user.manage") && "Invite staff",
    ].filter(Boolean) as string[];
    return {
      roleKey: "CUSTOM",
      title: "Your access",
      blurb: "This login is not a seeded role. These items match the permission keys you have.",
      canDo: pages.length ? pages : ["Open any menu your keys allow"],
      cannot: ["Keys you do not have stay hidden in the sidebar"],
      startHref: can("report.view") ? "/dashboard" : "/pos",
    } satisfies RoleGuide;
  }, [mine.length, can]);

  const extras = ROLE_GUIDES.filter((g) => !roles.includes(g.roleKey));

  return (
    <div className="space-y-3">
      {mine.map((g) => (
        <Card key={g.roleKey} guide={g} current onTour={onTour} />
      ))}
      {fallback ? <Card guide={fallback} current onTour={onTour} /> : null}
      {extras.length ? (
        <details className="rounded-lg border bg-card p-3">
          <summary className="cursor-pointer text-sm font-medium">Other roles</summary>
          <div className="mt-3 space-y-3">
            {extras.map((g) => (
              <Card key={g.roleKey} guide={g} current={false} />
            ))}
          </div>
        </details>
      ) : null}
      <p className="text-xs text-muted-foreground">{permissions.length} permission keys on this session.</p>
    </div>
  );
}

export function RoleGuideEmpty() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CircleHelp className="h-4 w-4" />
      Sign in to see what this login can do.
    </div>
  );
}
