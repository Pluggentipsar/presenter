export interface Theme {
  name: string;
  colors: {
    background: string;
    text: string;
    textMuted: string;
    accent: string;
    accentGlow: string;
    surface: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  animation: {
    slideTransition: { type: string; stiffness: number; damping: number };
  };
}
