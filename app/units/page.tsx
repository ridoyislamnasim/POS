"use client";

import { useState } from "react";
import { ListPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { ResourcePage } from "@/components/erp-page";
import { CommonUnitsDialog } from "./common-units-modal";

const UNITS_PATH = "/api/v1/catalog/units";
const UNITS_QUERY_KEY = "units";

export default function UnitsPage() {
  const [commonOpen, setCommonOpen] = useState(false);

  return (
    <>
      <ResourcePage
        title="Units"
        description="Piece, kg, liter, meter, pair, custom units — not hard-coded to pcs."
        path={UNITS_PATH}
        queryKey={UNITS_QUERY_KEY}
        searchPlaceholder="Search unit"
        entityName="unit"
        headerActions={
          <Button type="button" variant="outline" onClick={() => setCommonOpen(true)}>
            <ListPlus className="mr-2 h-4 w-4" />
            Add Common Units
          </Button>
        }
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
      <CommonUnitsDialog
        open={commonOpen}
        path={UNITS_PATH}
        queryKey={UNITS_QUERY_KEY}
        onClose={() => setCommonOpen(false)}
      />
    </>
  );
}
