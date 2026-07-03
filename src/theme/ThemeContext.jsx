import { createContext, useContext, useEffect, useState, useSyncExternalStore, useCallback } from "react";
import { themes } from "./tokens";

const STORAGE_KEY = "pb:themePref";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext(null);

function subscribeSystem(callback) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function systemIsDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  });

  const systemDark = useSyncExternalStore(subscribeSystem, systemIsDark);

  const mode = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  const T = themes[mode];

  const setPreference = useCallback((pref) => {
    setPreferenceState(pref);
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  }, []);

  // Keep the document chrome (body bg, PWA theme-color) in sync with the theme.
  useEffect(() => {
    document.body.style.background = T.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", T.bg);
  }, [T.bg]);

  return (
    <ThemeContext.Provider value={{ T, mode, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
