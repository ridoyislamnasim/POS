"use client";

import { ResourcePage, statusBadge } from "@/components/erp-page";
import { useMe } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function AttendancePage() {
  const { me } = useMe();
  const users = useQuery({ queryKey: ["users-lookup"], queryFn: () => api<{ id: string; name: string }[]>("/api/v1/users?limit=100") });
  return (
    <ResourcePage
      title="Attendance"
      description="Check-in / check-out for cashiers and staff."
      path="/api/v1/staff/attendance"
      queryKey="attendance"
      canEdit={false}
      searchPlaceholder="Search employee"
      dateFilter
      statusOptions={["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY"].map((v) => ({ value: v, label: v }))}
      fields={[
        { key: "userId", label: "Employee", type: "select", required: true, options: (users.data ?? []).map((u) => ({ value: u.id, label: u.name })) },
        { key: "branchId", label: "Branch", type: "select", required: true, options: (me?.branches ?? []).map((b) => ({ value: b.id, label: b.name })) },
        { key: "status", label: "Status", type: "select", options: ["PRESENT", "ABSENT", "LATE", "LEAVE", "HALF_DAY"].map((v) => ({ value: v, label: v })) },
        { key: "notes", label: "Notes" },
      ]}
      columns={[
        { key: "user", label: "Employee", render: (r: { user?: { name: string } }) => r.user?.name ?? "—" },
        { key: "branch", label: "Branch", render: (r: { branch?: { name: string } }) => r.branch?.name ?? "—" },
        { key: "status", label: "Status", render: (r) => statusBadge((r as { status: string }).status) },
        { key: "checkIn", label: "In", render: (r) => (r as { checkIn?: string }).checkIn ? new Date((r as { checkIn: string }).checkIn).toLocaleString() : "—" },
      ]}
    />
  );
}
