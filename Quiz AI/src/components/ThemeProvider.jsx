// src/components/ThemeProvider.jsx

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  themes = ["light", "dark"],
}) => {
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem(storageKey);
    return themes.includes(storedTheme) ? storedTheme : defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(...themes);

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey, themes]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        setTheme("system"); // This will trigger the effect above
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (newTheme) => {
        if (themes.includes(newTheme) || newTheme === "system") {
          setTheme(newTheme);
        } else {
          console.warn(`Invalid theme: ${newTheme}. Using default theme.`);
          setTheme(defaultTheme);
        }
      },
      themes,
    }),
    [theme, themes, defaultTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
