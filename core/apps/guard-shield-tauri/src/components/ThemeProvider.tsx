import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type AccentColor = "default" | "cyber-green" | "neon-purple" | "crimson-red" | "amber";

type ThemeProviderState = {
  theme: Theme;
  accentColor: AccentColor;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: "system",
  accentColor: "default",
  resolvedTheme: "light",
  setTheme: () => null,
  setAccentColor: () => null,
});

const STORAGE_KEY = "guard-shield-theme";
const ACCENT_STORAGE_KEY = "guard-shield-accent";

const ACCENT_COLORS = {
  "cyber-green": {
    light: { primary: "142.1 76.2% 36.3%", foreground: "355.7 100% 97.3%" },
    dark: { primary: "142.1 70.6% 45.3%", foreground: "144.9 80.4% 10%" }
  },
  "neon-purple": {
    light: { primary: "262.1 83.3% 57.8%", foreground: "210 40% 98%" },
    dark: { primary: "263.4 70% 50.4%", foreground: "210 40% 98%" }
  },
  "crimson-red": {
    light: { primary: "346.8 77.2% 49.8%", foreground: "355.7 100% 97.3%" },
    dark: { primary: "346.8 77.2% 49.8%", foreground: "355.7 100% 97.3%" }
  },
  "amber": {
    light: { primary: "37.7 92.1% 50.2%", foreground: "48 96% 89%" },
    dark: { primary: "37.7 92.1% 50.2%", foreground: "48 96% 89%" }
  }
};

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme, accentColor: AccentColor) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");

  const resolved = theme === "system" ? getSystemTheme() : theme;
  root.classList.add(resolved);
  
  if (accentColor === "default") {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
  } else {
    const colorValues = ACCENT_COLORS[accentColor][resolved];
    root.style.setProperty("--primary", colorValues.primary);
    root.style.setProperty("--primary-foreground", colorValues.foreground);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored || "system";
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor | null;
    return stored || "default";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => 
    theme === "system" ? getSystemTheme() : theme
  );

  useEffect(() => {
    applyTheme(theme, accentColor);
    setResolvedTheme(theme === "system" ? getSystemTheme() : theme);
    
    const root = window.document.documentElement;
    if (localStorage.getItem("guard_shield_reduce_motion") === "true") {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }, [theme, accentColor]);

  // Listen for OS theme changes when in "system" mode
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        applyTheme("system", accentColor);
        setResolvedTheme(getSystemTheme());
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme, accentColor]);

  const value = {
    theme,
    accentColor,
    resolvedTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(STORAGE_KEY, theme);
      setTheme(theme);
    },
    setAccentColor: (color: AccentColor) => {
      localStorage.setItem(ACCENT_STORAGE_KEY, color);
      setAccentColor(color);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
