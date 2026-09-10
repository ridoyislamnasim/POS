"use client";

import { ResourcePage, statusBadge } from "@/components/erp-page";

export default function BranchesPage() {
  return (
    <ResourcePage
      title="Branches"
      description="Outlets with their own inventory, users, and sales."
      path="/api/v1/org/branches"
      queryKey="branches"
      searchPlaceholder="Search branch"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "code", label: "Code", required: true, createOnly: true },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "operationalStatus", label: "Status", render: (r) => statusBadge((r as { operationalStatus: string }).operationalStatus) },
      ]}
    />
  );
}
