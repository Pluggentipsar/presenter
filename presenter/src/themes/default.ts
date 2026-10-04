import type { Theme } from "./types";

const defaultTheme: Theme = {
  name: "default",
  colors: {
    background: "#0a0a0f",
    text: "#e8e6e0",
    textMuted: "#8a8a8a",
    accent: "#06b6d4",
    accentGlow: "rgba(6, 182, 212, 0.25)",
    surface: "#151520",
  },
  fonts: {
    heading: "var(--font-heading)",
    body: "var(--font-body)",
    mono: "var(--font-mono)",
  },
  animation: {
    slideTransition: { type: "spring", stiffness: 260, damping: 30 },
  },
};

export default defaultTheme;
