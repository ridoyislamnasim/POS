"use client";

import { AppShell } from "@/components/app-shell";
import { RoleGuideView } from "@/components/help/RoleGuide";
import { useHelpOptional } from "@/components/help/HelpProvider";
import { PageHeader } from "@/components/ui";
import { useMe } from "@/lib/auth";

export default function HelpRolePage() {
  const { me, can } = useMe();
  const help = useHelpOptional();
  return (
    <AppShell>
      <PageHeader title="What can I do?" description="Your role, in plain language — plus a tour if you want one." />
      {me ? (
        <RoleGuideView
          roles={me.roles}
          permissions={me.permissions}
          can={can}
          onTour={help?.startTour}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </AppShell>
  );
}
