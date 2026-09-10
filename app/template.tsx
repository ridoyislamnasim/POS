"use client";

import { QueryProvider } from "@/components/query-provider";

export default function Template({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
