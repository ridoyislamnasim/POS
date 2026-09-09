"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  applyTheme,
  persistTheme,
  readThemePreference,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeCtx = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeCtx>({
  preference: "system",
  resolved: "light",
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const pref = readThemePreference();
    setPref(pref);
    applyTheme(pref);
    setResolved(resolveTheme(pref));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = readThemePreference();
      if (current === "system") {
        applyTheme("system");
        setResolved(resolveTheme("system"));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference: (p: ThemePreference) => {
        setPref(p);
        persistTheme(p);
        setResolved(resolveTheme(p));
      },
    }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
