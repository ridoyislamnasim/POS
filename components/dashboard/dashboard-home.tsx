"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button, PageHeader, Skeleton } from "@/components/ui";
import { usePOSStore } from "@/lib/pos-store";
import { PERIODS } from "@/components/dashboard/format";
import type { DashPeriod } from "@/components/dashboard/types";
import { DashQueryProvider } from "@/components/dashboard/use-dash-query";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import {
  ActivityWidget,
  CashiersWidget,
  CustomersWidget,
  HourlyWidget,
  InventoryWidget,
  PaymentsWidget,
  RecentSalesWidget,
  SalesTrendWidget,
  TopProductsWidget,
} from "@/components/dashboard/widgets";

function DashboardWidgets({ period, branchId }: { period: DashPeriod; branchId: string | null }) {
  return (
    <div className="space-y-3">
      <KpiGrid period={period} branchId={branchId} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <SalesTrendWidget className="lg:col-span-2" period={period} branchId={branchId} />
        <PaymentsWidget period={period} branchId={branchId} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <HourlyWidget className="lg:col-span-2" period={period} branchId={branchId} />
        <InventoryWidget branchId={branchId} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <TopProductsWidget period={period} branchId={branchId} />
        <CustomersWidget period={period} branchId={branchId} />
        <CashiersWidget period={period} branchId={branchId} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <RecentSalesWidget className="lg:col-span-2" branchId={branchId} />
        <ActivityWidget branchId={branchId} />
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [period, setPeriod] = useState<DashPeriod>("today");
  const [mounted, setMounted] = useState(false);
  const branchId = usePOSStore((s) => s.branchId);
  const reduce = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      className="min-w-0 overflow-x-hidden"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <PageHeader title="Dashboard" description="Live sales, stock, and register performance.">
        <div className="inline-flex max-w-full flex-wrap rounded-md border bg-background p-0.5" data-help="dash-period">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="xs"
              variant={period === p.id ? "warning" : "ghost"}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </PageHeader>

      {mounted ? (
        <DashQueryProvider>
          <DashboardWidgets period={period} branchId={branchId} />
        </DashQueryProvider>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <Skeleton rows={8} />
        </div>
      )}
    </motion.div>
  );
}
