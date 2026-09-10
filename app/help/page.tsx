"use client";

import { AppShell } from "@/components/app-shell";
import { HelpCenter } from "@/components/help/HelpCenter";
import { PageHeader } from "@/components/ui";

export default function HelpPage() {
  return (
    <AppShell>
      <PageHeader title="Help Center" description="Search pages and step-by-step tasks for your role." />
      <HelpCenter />
    </AppShell>
  );
}
