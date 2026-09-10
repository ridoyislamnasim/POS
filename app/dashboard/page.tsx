"use client";

import { AppShell } from "@/components/app-shell";
import DashboardHome from "@/components/dashboard/dashboard-home";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardHome />
    </AppShell>
  );
}
