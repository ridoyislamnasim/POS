"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type Props = {
  resource: string;
  current: number;
  limit: number | null;
  planName: string;
};

export function UpgradePrompt({ resource, current, limit, planName }: Props) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        You&apos;ve reached your {resource} limit.
      </p>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
        {planName} allows {limit?.toLocaleString() ?? 0} {resource.toLowerCase()}.
        You currently have {current}.
      </p>
      <div className="mt-3 flex gap-2">
        <Link href="/subscription">
          <Button size="sm" variant="outline" className="h-7 text-xs">
            View Plans
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </Link>
        <Link href="/subscription/requests/new">
          <Button size="sm" className="h-7 text-xs">
            Request Increase
          </Button>
        </Link>
      </div>
    </div>
  );
}
