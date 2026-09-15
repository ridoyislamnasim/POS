"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui";

const RESOURCES = [
  { key: "BRANCH", label: "Branches" },
  { key: "WAREHOUSE", label: "Warehouses" },
  { key: "USER", label: "Users" },
  { key: "PRODUCT", label: "Products" },
  { key: "CUSTOMER", label: "Customers" },
  { key: "SUPPLIER", label: "Suppliers" },
  { key: "MONTHLY_SALE", label: "Monthly Sales" },
  { key: "MONTHLY_PURCHASE_ORDER", label: "Monthly Purchase Orders" },
];

type Limit = {
  resource: string;
  limitValue: number | null;
  unlimited: boolean;
  disabled: boolean;
};

type Props = {
  planId: string;
  limits: Limit[];
};

export function LimitEditor({ planId, limits }: Props) {
  const qc = useQueryClient();
  const [localLimits, setLocalLimits] = useState<Record<string, { limitValue: string; unlimited: boolean; disabled: boolean }>>(() => {
    const map: Record<string, { limitValue: string; unlimited: boolean; disabled: boolean }> = {};
    for (const r of RESOURCES) {
      const existing = limits.find((l) => l.resource === r.key);
      map[r.key] = {
        limitValue: existing?.limitValue != null ? String(existing.limitValue) : "",
        unlimited: existing?.unlimited ?? false,
        disabled: existing?.disabled ?? false,
      };
    }
    return map;
  });

  useEffect(() => {
    setLocalLimits((prev) => {
      const next = { ...prev };
      for (const r of RESOURCES) {
        const existing = limits.find((l) => l.resource === r.key);
        if (existing) {
          next[r.key] = {
            limitValue: existing.limitValue != null ? String(existing.limitValue) : "",
            unlimited: existing.unlimited,
            disabled: existing.disabled,
          };
        }
      }
      return next;
    });
  }, [limits]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform/plans/${planId}/limits`, {
        method: "PATCH",
        body: JSON.stringify({
          limits: RESOURCES.map((r) => ({
            resource: r.key,
            limitValue: localLimits[r.key].unlimited || localLimits[r.key].disabled ? null : (localLimits[r.key].limitValue === "" ? null : Number(localLimits[r.key].limitValue)),
            unlimited: localLimits[r.key].unlimited,
            disabled: localLimits[r.key].disabled,
          })),
        }),
      }),
    onSuccess: () => {
      toastSuccess("Limits saved");
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
    },
    onError: (e) => toastError(e, "Could not save limits"),
  });

  function updateLimit(resource: string, field: string, value: unknown) {
    setLocalLimits((prev) => ({
      ...prev,
      [resource]: { ...prev[resource], [field]: value },
    }));
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium text-muted-foreground">
              <th className="pb-2 pr-4">Resource</th>
              <th className="pb-2 pr-4">Limit</th>
              <th className="pb-2 pr-4">Unlimited</th>
              <th className="pb-2">Disabled</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCES.map((r) => (
              <tr key={r.key} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{r.label}</td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    className="h-7 w-24 rounded border bg-transparent px-2 text-sm"
                    value={localLimits[r.key].limitValue}
                    placeholder="0"
                    onChange={(e) => updateLimit(r.key, "limitValue", e.target.value)}
                    disabled={localLimits[r.key].unlimited || localLimits[r.key].disabled}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="checkbox"
                    checked={localLimits[r.key].unlimited}
                    onChange={(e) => updateLimit(r.key, "unlimited", e.target.checked)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={localLimits[r.key].disabled}
                    onChange={(e) => updateLimit(r.key, "disabled", e.target.checked)}
                    className="h-4 w-4"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
