import type { CSSProperties } from "react";
import s from "./voice-wave.module.css";

/**
 * Maskinens röst: en liten vågform i mint bredvid ett AI-svar. Syns bara när
 * aktivt tema har signaturen "voice" (rost); annars döljs den helt.
 * Den ”talar” en kort stund när svaret visas och står sedan stilla, så att den
 * inte stör läsningen. Reducerad rörelse ger en stilla våg.
 */
const heights = Array.from({ length: 26 }, (_, i) => {
  const v = Math.abs(Math.sin(i * .9) * .55 + Math.sin(i * .37 + 1.1) * .3 + Math.sin(i * 2.1) * .15);
  return Math.max(.18, Math.min(1, v * 1.25));
});

export function VoiceWave({ className = "" }: { className?: string }) {
  return <span className={`${s.wave} ${className}`} aria-hidden>
    {heights.map((h, i) => <i key={i} style={{ "--h": h, "--d": (i % 7) * .06 } as CSSProperties} />)}
  </span>;
}
