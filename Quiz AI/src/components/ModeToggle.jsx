import React, { useState, useEffect } from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./ThemeProvider";

export function ModeToggle() {
  const { setTheme, theme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(false);
  }, [theme]);

  const themes = ["light", "dark", "system"];
  const icons = {
    light: Sun,
    dark: Moon,
    system: Laptop,
  };

  const cycleTheme = () => {
    setIsAnimating(true);
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const Icon = icons[theme];

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      className="relative overflow-hidden"
    >
      <Icon
        className={`h-[1.2rem] w-[1.2rem] transition-all duration-500 ease-in-out
          ${isAnimating ? "animate-spin" : ""}`}
      />
      <span className="sr-only">Change theme</span>
    </Button>
  );
}
