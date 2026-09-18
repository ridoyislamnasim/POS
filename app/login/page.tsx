"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, Eye, EyeOff, ShoppingCart, Store } from "lucide-react";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { ActionTooltip, Button, inputClass } from "@/components/ui";
import { getApiErrorMessage, toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/cn";

const fieldClass = cn(
  inputClass,
  "mt-1 border-orange-200/80 focus-visible:ring-orange-500 dark:border-orange-900",
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@nokshi.local");
  const [password, setPassword] = useState("Owner123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ user: { roles?: string[]; isPlatform?: boolean } }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      toastSuccess("Signed in");
      const me = await api<{ permissions: string[]; isPlatform?: boolean }>("/api/v1/auth/me").catch(() => null);
      const roles = data.user?.roles ?? [];
      if (me?.isPlatform || data.user?.isPlatform || roles.includes("PLATFORM_SUPER_ADMIN")) {
        router.push("/platform/tenants?welcome=1");
      } else if (me?.permissions.includes("report.view") || roles.includes("TENANT_OWNER")) {
        router.push("/dashboard?welcome=1");
      } else {
        router.push("/pos?welcome=1");
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, "Sign in failed");
      setError(msg);
      toastError(err, "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-orange-950/30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(249,115,22,0.22),transparent_38%),radial-gradient(circle_at_88%_92%,rgba(245,158,11,0.2),transparent_36%)] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(249,115,22,0.12),transparent_38%),radial-gradient(circle_at_88%_92%,rgba(245,158,11,0.12),transparent_36%)]" />

      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-orange-700 via-orange-600 to-amber-500 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(255,255,255,0.22),transparent_32%),radial-gradient(circle_at_8%_88%,rgba(245,158,11,0.4),transparent_40%)]" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/20 shadow-sm ring-1 ring-white/30">
            <Store className="h-5 w-5" />
          </span>
          Universal POS
        </div>
        <div className="relative">
          <div className="mb-4 flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/18 px-3 py-1 text-xs font-semibold ring-1 ring-white/30">
              <ShoppingCart className="h-3.5 w-3.5" />
              Sell
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/25 px-3 py-1 text-xs font-semibold ring-1 ring-amber-200/40">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Buy
            </span>
          </div>
          <p className="text-2xl font-bold leading-tight">Buy stock in. Sell it out. One register.</p>
          <p className="mt-2 max-w-md text-sm text-white/85">
            Purchases, POS, and sales share the same live backend — orange for the brand, amber for the numbers that need attention.
          </p>
        </div>
        <p className="relative text-xs text-white/70">Tenant admin &amp; cashier access</p>
      </div>

      <div className="relative flex items-center justify-center p-6">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm rounded-lg border border-orange-200/70 bg-white/90 p-6 text-card-foreground shadow-sm shadow-orange-100/80 ring-1 ring-amber-200/40 dark:border-orange-900 dark:bg-slate-950/80 dark:shadow-none dark:ring-amber-900/40"
        >
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm shadow-orange-200 dark:shadow-none">
                <Store className="h-4 w-4 text-white" />
              </span>
              <div>
                <h1 className="bg-gradient-to-r from-orange-700 to-amber-600 bg-clip-text text-xl font-semibold tracking-tight text-transparent dark:from-orange-300 dark:to-amber-300">
                  Sign in
                </h1>
                <p className="text-sm text-muted-foreground">Buy &amp; sell workspace</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <div className="mb-3 flex gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-800">
              <ShoppingCart className="h-3 w-3" />
              Sell
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-200 dark:ring-amber-800">
              <ArrowDownLeft className="h-3 w-3" />
              Buy
            </span>
          </div>
          <label className="mt-2 block text-sm text-muted-foreground" htmlFor="login-email">Email</label>
          <input id="login-email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <label className="mt-3 block text-sm text-muted-foreground" htmlFor="login-password">Password</label>
          <div className="relative mt-1">
            <input
              id="login-password"
              className={cn(fieldClass, "mt-0 pr-10")}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ActionTooltip label={showPassword ? "Hide password" : "Show password"} side="top">
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button> 
              </ActionTooltip>
            </div>
          </div>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <Button
            className="mt-4 w-full bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-700 hover:to-amber-600"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}
