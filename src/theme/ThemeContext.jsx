import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, useCallback } from "react";
import { themes } from "./tokens";

const STORAGE_KEY = "pb:themePref";
const PALETTE_KEY = "pb:palette";
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

// Overrides are stored per mode: { light: {token: hex}, dark: {...} }.
function loadPalette() {
  try {
    const p = JSON.parse(localStorage.getItem(PALETTE_KEY));
    return { light: p?.light || {}, dark: p?.dark || {} };
  } catch {
    return { light: {}, dark: {} };
  }
}

// Merge a mode's overrides onto its base tokens, keeping derived tokens (the
// alpha-tinted backgrounds and the first chart-series colour) in sync.
function buildPalette(base, overrides) {
  const T = { ...base, ...overrides };
  if (overrides.accent) {
    T.accentBg = overrides.accent + "1A";
    T.chartSeries = [overrides.accent, ...base.chartSeries.slice(1)];
  }
  if (overrides.green) T.greenBg = overrides.green + "1A";
  if (overrides.red) T.redBg = overrides.red + "1A";
  return T;
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  });
  const [palette, setPalette] = useState(loadPalette);

  const systemDark = useSyncExternalStore(subscribeSystem, systemIsDark);

  const mode = preference === "system" ? (systemDark ? "dark" : "light") : preference;
  const T = useMemo(() => buildPalette(themes[mode], palette[mode]), [mode, palette]);

  const setPreference = useCallback((pref) => {
    setPreferenceState(pref);
    if (pref === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  }, []);

  // Override / reset a single token for the currently active mode.
  const setColor = useCallback((key, value) => {
    setPalette(p => {
      const next = { ...p, [mode]: { ...p[mode], [key]: value } };
      localStorage.setItem(PALETTE_KEY, JSON.stringify(next));
      return next;
    });
  }, [mode]);

  const resetPalette = useCallback(() => {
    setPalette(p => {
      const next = { ...p, [mode]: {} };
      localStorage.setItem(PALETTE_KEY, JSON.stringify(next));
      return next;
    });
  }, [mode]);

  const customized = Object.keys(palette[mode]).length > 0;

  // Keep the document chrome (body bg, PWA theme-color) in sync with the theme.
  useEffect(() => {
    document.body.style.background = T.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", T.bg);
  }, [T.bg]);

  return (
    <ThemeContext.Provider value={{ T, mode, preference, setPreference, setColor, resetPalette, customized }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook and provider belong together
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
