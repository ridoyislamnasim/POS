"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui";

const FEATURES = [
  { key: "POS", label: "POS", category: "Core" },
  { key: "INVENTORY", label: "Inventory", category: "Core" },
  { key: "CUSTOMERS", label: "Customers", category: "Core" },
  { key: "SUPPLIERS", label: "Suppliers", category: "Core" },
  { key: "PURCHASES", label: "Purchases", category: "Core" },
  { key: "SALES", label: "Sales", category: "Core" },
  { key: "RETURNS", label: "Returns", category: "Core" },
  { key: "BASIC_REPORTS", label: "Basic Reports", category: "Core" },
  { key: "MULTI_BRANCH", label: "Multi Branch", category: "Growth" },
  { key: "MULTI_WAREHOUSE", label: "Multi Warehouse", category: "Growth" },
  { key: "LOYALTY", label: "Loyalty", category: "Growth" },
  { key: "ECOMMERCE", label: "E-commerce", category: "Growth" },
  { key: "ADVANCED_REPORTS", label: "Advanced Reports", category: "Growth" },
  { key: "ANALYTICS", label: "Analytics", category: "Growth" },
  { key: "WHATSAPP", label: "WhatsApp", category: "Growth" },
  { key: "ADVANCED_ROLES", label: "Advanced Roles", category: "Growth" },
  { key: "API", label: "API", category: "Enterprise" },
  { key: "INTEGRATIONS", label: "Integrations", category: "Enterprise" },
  { key: "AUDIT_LOGS", label: "Audit Logs", category: "Enterprise" },
  { key: "PRIORITY_SUPPORT", label: "Priority Support", category: "Enterprise" },
];

type Feature = {
  feature: string;
  enabled: boolean;
};

type Props = {
  planId: string;
  features: Feature[];
  onClose: () => void;
};

export function FeatureToggle({ planId, features, onClose }: Props) {
  const qc = useQueryClient();
  const [localFeatures, setLocalFeatures] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const f of FEATURES) {
      const existing = features.find((ef) => ef.feature === f.key);
      map[f.key] = existing?.enabled ?? false;
    }
    return map;
  });

  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform/plans/${planId}/features`, {
        method: "PATCH",
        body: JSON.stringify({
          features: FEATURES.map((f) => ({ feature: f.key, enabled: localFeatures[f.key] })),
        }),
      }),
    onSuccess: () => {
      toastSuccess("Features saved");
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
      onClose();
    },
    onError: (e) => toastError(e, "Could not save features"),
  });

  const categories = [...new Set(FEATURES.map((f) => f.category))];

  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{cat}</h4>
          <div className="space-y-1">
            {FEATURES.filter((f) => f.category === cat).map((f) => (
              <label key={f.key} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={localFeatures[f.key]}
                  onChange={(e) => setLocalFeatures((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                  className="h-4 w-4"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
