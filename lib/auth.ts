"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  imageUrl?: string | null;
  branches: {
    id: string;
    name: string;
    locationId: string;
    registers: { id: string; name: string; devices: { hardwareId: string }[] }[];
  }[];
};

export type ProfileData = {
  id: string;
  name: string;
  email: string;
  locale: string;
  imageUrl: string | null;
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

export function useProfile() {
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: () => api<ProfileData>("/api/v1/auth/profile"),
    retry: false,
  });
  return q;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; imageUrl?: string | null }) =>
      api("/api/v1/auth/profile", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["me"] });
      router.replace("/login");
    },
  });
}
