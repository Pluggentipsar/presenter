import type { CSSProperties } from "react";
import s from "./voice-band.module.css";

/**
 * En bred vågform för temat Rösten: maskinens röst (”ai”) är jämn och mint,
 * människans röst (”human”) ojämn och bärnsten. Byter man ton mellan klicklägen
 * glider staplarna över i den nya rösten. Dold i alla andra teman.
 */
const COUNT = 88;
const shape = (tone: "ai" | "human") => Array.from({ length: COUNT }, (_, i) => {
  if (tone === "ai") return .28 + .5 * Math.abs(Math.sin(i * .21)) * (.75 + .25 * Math.sin(i * .05));
  const v = Math.abs(Math.sin(i * .9) * .5 + Math.sin(i * .31 + 1.4) * .32 + Math.sin(i * 2.3 + .2) * .18);
  return Math.max(.12, Math.min(1, v * 1.3));
});
const shapes = { ai: shape("ai"), human: shape("human") };

export function VoiceBand({ tone, className = "" }: { tone: "ai" | "human"; className?: string }) {
  return <div className={`${s.band} ${className}`} data-tone={tone} aria-hidden>
    {shapes[tone].map((h, i) => <i key={i} style={{ "--h": h, "--d": (i / COUNT) * .5 } as CSSProperties} />)}
  </div>;
}
