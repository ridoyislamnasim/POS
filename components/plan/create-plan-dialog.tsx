"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button, Dialog, Field, inputClass } from "@/components/ui";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreatePlanDialog({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");
  const [interval, setInterval] = useState("MONTHLY");

  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/platform/plans", {
        method: "POST",
        body: JSON.stringify({
          code,
          name,
          description,
          price: Number(price) || 0,
          yearlyPrice: yearlyPrice ? Number(yearlyPrice) : null,
          interval,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Plan created");
      qc.invalidateQueries({ queryKey: ["platform-plans"] });
      onClose();
      setCode("");
      setName("");
      setDescription("");
      setPrice("");
      setYearlyPrice("");
    },
    onError: (e) => toastError(e, "Could not create plan"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Create Plan">
      <div className="space-y-3">
        <Field label="Code">
          <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. STARTER" />
        </Field>
        <Field label="Name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starter" />
        </Field>
        <Field label="Description">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
        </Field>
        <Field label="Monthly Price">
          <input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
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
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending || !code || !name}>
            {create.isPending ? "Creating..." : "Create Plan"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
