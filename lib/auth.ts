"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export type Me = {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  roles: string[];
  tenantId: string | null;
  allBranches: boolean;
  isPlatform: boolean;
  apiAccessEnabled?: boolean;
  lockMessage?: string | null;
  branches: {
    id: string;
    name: string;
    locationId: string;
    registers: { id: string; name: string; devices: { hardwareId: string }[] }[];
  }[];
};

export function useMe() {
  const router = useRouter();
  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/api/v1/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (q.error && (q.error as Error & { status?: number }).status === 401) {
      router.replace("/login");
    }
  }, [q.error, router]);

  const can = useCallback(
    (key: string) => {
      if (!q.data) return false;
      if (q.data.isPlatform || q.data.roles.includes("TENANT_OWNER")) return true;
      return q.data.permissions.includes(key);
    },
    [q.data],
  );
  return { ...q, can, me: q.data };
}
