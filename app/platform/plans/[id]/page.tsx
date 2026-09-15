"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Layers, Pencil, ToggleLeft, X, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/auth";
import { toastError, toastSuccess } from "@/lib/toast";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Button, Panel, inputClass } from "@/components/ui";
import { LimitEditor } from "@/components/plan/limit-editor";
import { FeatureToggle } from "@/components/plan/feature-toggle";

type PlanDetail = {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: string;
  yearlyPrice: string | null;
  interval: string;
  active: boolean;
  displayOrder: number;
  planLimits: { resource: string; limitValue: number | null; unlimited: boolean; disabled: boolean }[];
  planFeatures: { feature: string; enabled: boolean }[];
};

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"limits" | "features">("limits");
  const [editing, setEditing] = useState(false);

  const plan = useQuery({
    queryKey: ["platform-plan", id],
    queryFn: () => api<PlanDetail>(`/api/v1/platform/plans/${id}`),
    enabled: Boolean(me?.isPlatform && id),
  });

  const data = plan.data;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");
  const [interval, setInterval] = useState("MONTHLY");
  const [active, setActive] = useState(true);

  function startEdit() {
    if (!data) return;
    setName(data.name);
    setCode(data.code);
    setDescription(data.description ?? "");
    setPrice(data.price);
    setYearlyPrice(data.yearlyPrice ?? "");
    setInterval(data.interval);
    setActive(data.active);
    setEditing(true);
  }

  const update = useMutation({
    mutationFn: () =>
      api(`/api/v1/platform/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          code,
          description,
          price: Number(price) || 0,
          yearlyPrice: yearlyPrice ? Number(yearlyPrice) : null,
          interval,
          active,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Plan updated");
      qc.invalidateQueries({ queryKey: ["platform-plan", id] });
      qc.invalidateQueries({ queryKey: ["platform-plans-comparison"] });
      setEditing(false);
    },
    onError: (e) => toastError(e, "Could not update plan"),
  });

  return (
    <AppShell>
      <PageHeader title={data?.name ?? "Plan"} description={data?.code}>
        <Link href="/platform/plans">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Button>
        </Link>
      </PageHeader>

      {data && (
        <Panel className="mb-4">
          {editing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Edit Plan</h3>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => update.mutate()} disabled={update.isPending}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    {update.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Code</label>
                  <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                  <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                  <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Monthly Price</label>
                  <input className={inputClass} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Yearly Price</label>
                  <input className={inputClass} type="number" value={yearlyPrice} onChange={(e) => setYearlyPrice(e.target.value)} placeholder="Optional" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Interval</label>
                  <select className={inputClass} value={interval} onChange={(e) => setInterval(e.target.value)}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Code</span>
                    <p className="font-medium">{data.code}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Name</span>
                    <p className="font-medium">{data.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Price</span>
                    <p className="font-medium">৳ {Number(data.price).toLocaleString()}/{data.interval === "YEARLY" ? "yr" : "mo"}</p>
                  </div>
                  {data.description && (
                    <div>
                      <span className="text-xs text-muted-foreground">Description</span>
                      <p className="font-medium">{data.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <p className="font-medium">{data.active ? "Active" : "Inactive"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      <div className="mb-4 flex gap-1 rounded-lg border bg-muted p-1 text-sm">
        <button
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${tab === "limits" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("limits")}
        >
          <Layers className="mr-1 inline h-3.5 w-3.5" />
          Limits
        </button>
        <button
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${tab === "features" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("features")}
        >
          <ToggleLeft className="mr-1 inline h-3.5 w-3.5" />
          Features
        </button>
      </div>

      {tab === "limits" && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Resource Limits</h3>
          </div>
          <LimitEditor planId={id} limits={data?.planLimits ?? []} />
        </Panel>
      )}

      {tab === "features" && (
        <Panel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Feature Access</h3>
          </div>
          <FeatureToggle planId={id} features={data?.planFeatures ?? []} />
        </Panel>
      )}
    </AppShell>
  );
}
