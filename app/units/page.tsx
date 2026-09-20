"use client";

import { ResourcePage } from "@/components/erp-page";

export default function UnitsPage() {
  return (
    <ResourcePage
      title="Units"
      description="Piece, kg, liter, meter, pair, custom units — not hard-coded to pcs."
      path="/api/v1/catalog/units"
      queryKey="units"
      searchPlaceholder="Search unit"
      entityName="unit"
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "abbreviation", label: "Abbreviation", required: true },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "abbreviation", label: "Abbr." },
        { key: "status", label: "Status" },
      ]}
      statusOptions={[
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ]}
    />
  );
}
