"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useServerList } from "@/lib/use-list-state";
import { AppShell } from "@/components/app-shell";
import { ListFrame } from "@/components/ui/list-frame";
import { Badge, Button, PageHeader, ShellCard, CardHeader, CardTitle, CardContent, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, StatusBadge } from "@/components/ui";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toastError, toastSuccess } from "@/lib/toast";

type Attempt = { id: string; email: string; success: boolean; ip?: string; createdAt: string };
type Session = { id: string; createdAt: string; expiresAt: string; revokedAt?: string; ip?: string; userAgent?: string; user: { name: string; email: string } };

export default function SecurityPage() {
  const logins = useServerList<Attempt>("logins", "/api/v1/staff/security/logins", { namespace: "lg" });
  const sessions = useServerList<Session>("sessions", "/api/v1/staff/security/sessions", { namespace: "ss" });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/v1/staff/security/sessions/${id}/revoke`, { method: "POST" }),
    onSuccess: () => {
      toastSuccess("Session revoked", pending?.user?.email);
      setPending(null);
      sessions.refetch();
    },
    onError: (e) => toastError(e, "Could not revoke session"),
  });
  const [pending, setPending] = useState<Session | null>(null);
  return (
    <AppShell>
      <PageHeader title="Login Security" description="Failed attempts, lockouts, and active sessions." />
      <div className="grid gap-6 lg:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>Login attempts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ListFrame list={logins} searchPlaceholder="Search email" dateFilter columnCount={3} emptyTitle="No records found">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logins.rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.email}</TableCell>
                      <TableCell>
                        <Badge variant={a.success ? "success" : "destructive"}>{a.success ? "OK" : "FAIL"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(a.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ListFrame>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>Sessions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ListFrame list={sessions} searchPlaceholder="Search user" dateFilter columnCount={3} emptyTitle="No records found">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.user?.name}<div className="text-xs text-muted-foreground">{s.user?.email}</div></TableCell>
                      <TableCell>{s.ip ?? "—"}</TableCell>
                      <TableCell>
                        {s.revokedAt ? (
                          <StatusBadge value="Revoked" />
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setPending(s)}>
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ListFrame>
          </CardContent>
        </ShellCard>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Revoke session?"
        description={
          pending
            ? `${pending.user?.name ?? "This user"} will be signed out immediately.`
            : "This user will be signed out immediately."
        }
        confirmLabel="Revoke"
        loading={revoke.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && revoke.mutate(pending.id)}
      />
    </AppShell>
  );
}
