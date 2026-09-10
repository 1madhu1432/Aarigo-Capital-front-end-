import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Appearance = "light" | "dark" | "night" | "system";

const STORAGE_KEY = "loanflow.appearance";

type ThemeContextValue = {
  appearance: Appearance;
  resolved: "light" | "dark" | "night";
  setAppearance: (a: Appearance) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(resolved: "light" | "dark" | "night") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "night");
  if (resolved !== "light") root.classList.add(resolved);
  root.style.colorScheme = resolved === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Appearance | null;
    const initial = stored ?? "light";
    setAppearanceState(initial);
    apply(initial === "system" ? systemPref() : initial);
  }, []);

  useEffect(() => {
    if (appearance !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => apply(systemPref());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [appearance]);

  const setAppearance = useCallback((a: Appearance) => {
    setAppearanceState(a);
    window.localStorage.setItem(STORAGE_KEY, a);
    apply(a === "system" ? systemPref() : a);
  }, []);

  const resolved = appearance === "system" ? systemPref() : appearance;

  return (
    <ThemeContext.Provider value={{ appearance, resolved, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
