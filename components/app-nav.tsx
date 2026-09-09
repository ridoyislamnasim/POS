"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { usePOSStore } from "@/lib/pos-store";
import { dict } from "@/lib/i18n";

export function AppNav({ canUsers }: { canUsers: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const locale = usePOSStore((s) => s.locale);
  const setLocale = usePOSStore((s) => s.setLocale);
  const t = dict[locale];
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm ${path === href ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-3">
      <nav className="flex items-center gap-1">
        {link("/pos", t.pos)}
        {link("/sales", t.sales)}
        {canUsers ? link("/users", t.users) : null}
      </nav>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{t.online}</span>
        <button className="h-9 rounded-lg border px-2 text-xs" onClick={() => setLocale(locale === "en" ? "bn" : "en")}>
          {locale === "en" ? "বাংলা" : "EN"}
        </button>
        <button
          className="h-9 rounded-lg px-2 text-xs text-zinc-500"
          onClick={async () => {
            await api("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
            router.push("/login");
          }}
        >
          Out
        </button>
      </div>
    </header>
  );
}
