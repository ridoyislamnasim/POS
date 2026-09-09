"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, inputClass } from "@/components/ui";
import { getApiErrorMessage, toastError, toastSuccess } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@nokshi.local");
  const [password, setPassword] = useState("Owner123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ user: { roles?: string[] } }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      toastSuccess("Signed in");
      const me = await api<{ permissions: string[] }>("/api/v1/auth/me").catch(() => null);
      const roles = data.user?.roles ?? [];
      if (me?.permissions.includes("report.view") || roles.includes("TENANT_OWNER")) router.push("/dashboard");
      else router.push("/pos");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Sign in failed");
      setError(msg);
      toastError(err, "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Store className="h-7 w-7" />
          Universal POS
        </div>
        <div>
          <p className="text-2xl font-bold leading-tight">Retail operations, one dashboard.</p>
          <p className="mt-2 max-w-md text-sm text-primary-foreground/80">
            Sales, stock, and registers connected to your live backend — not demo cargo data.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">Tenant admin &amp; cashier access</p>
      </div>
      <div className="flex items-center justify-center bg-background p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">Universal POS</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <label className="mt-2 block text-sm text-muted-foreground">Email</label>
        <input className={inputClass + " mt-1"} value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mt-3 block text-sm text-muted-foreground">Password</label>
        <input className={inputClass + " mt-1"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <Button className="mt-4 w-full" type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      </div>
    </main>
  );
}
