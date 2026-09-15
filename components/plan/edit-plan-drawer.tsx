"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button, Field, inputClass } from "@/components/ui";

type Plan = {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: string;
  yearlyPrice: string | null;
  interval: string;
  active: boolean;
  displayOrder: number;
};

type Props = {
  plan: Plan;
  onClose: () => void;
};

export function EditPlanDrawer({ plan, onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [price, setPrice] = useState(plan.price);
  const [yearlyPrice, setYearlyPrice] = useState(plan.yearlyPrice ?? "");
  const [interval, setInterval] = useState(plan.interval);
  const [active, setActive] = useState(plan.active);
  const [displayOrder, setDisplayOrder] = useState(String(plan.displayOrder));

  const update = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description,
          price: Number(price) || 0,
          yearlyPrice: yearlyPrice ? Number(yearlyPrice) : null,
          interval,
          active,
          displayOrder: Number(displayOrder) || 0,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Plan updated");
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
      qc.invalidateQueries({ queryKey: ["platform-plan", plan.id] });
      onClose();
    },
    onError: (e) => toastError(e, "Could not update plan"),
  });

  return (
    <div className="space-y-3">
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description">
        <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Monthly Price">
        <input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label="Yearly Price">
        <input className={inputClass} type="number" value={yearlyPrice} onChange={(e) => setYearlyPrice(e.target.value)} placeholder="Optional" />
      </Field>
      <Field label="Interval">
        <select className={inputClass} value={interval} onChange={(e) => setInterval(e.target.value)}>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>
      </Field>
      <Field label="Display Order">
        <input className={inputClass} type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
      </Field>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        <label htmlFor="active" className="text-sm">Active</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={() => update.mutate()} disabled={update.isPending}>
          {update.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
