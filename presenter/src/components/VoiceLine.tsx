"use client";

import { useMemo, type CSSProperties } from "react";
import s from "./voice-line.module.css";

/**
 * Röstlinjen i temat Rösten: en tunn vågform längs slidens nederkant som ligger
 * kvar över slidebytena. Vid varje byte ”säger” den något nytt (staplarna
 * glider till en ny form) och står sedan still. Före vändpunkten (voiceTurn)
 * talar den med maskinens röst i mint, därefter med människans i bärnsten.
 * Utan vändpunkt skiftar den vid halva föreläsningen. Titelsliden är tyst:
 * rösten vaknar när föreläsningen börjar. Dold i andra teman.
 */
const COUNT = 120;

function pattern(index: number, human: boolean): number[] {
  const seed = index * 1.37 + 0.4;
  return Array.from({ length: COUNT }, (_, i) => {
    const x = i / COUNT;
    const env = Math.sin(Math.PI * x) ** 0.5;
    const v = human
      ? Math.abs(Math.sin(i * 0.83 + seed) * 0.5 + Math.sin(i * 0.27 + seed * 1.7) * 0.32 + Math.sin(i * 2.1 + seed * 0.5) * 0.18)
      : 0.35 + 0.4 * Math.abs(Math.sin(i * 0.19 + seed));
    return Math.max(0.1, Math.min(1, v * env * 1.2));
  });
}

export function VoiceLine({ index, total, turn }: { index: number; total: number; turn: number }) {
  const human = turn >= 0 ? index >= turn : index >= Math.floor(total / 2);
  const heights = useMemo(() => (index === 0 ? Array<number>(COUNT).fill(0) : pattern(index, human)), [index, human]);
  return <div className={s.line} data-tone={human ? "human" : "ai"} aria-hidden>
    {heights.map((h, i) => <i key={i} style={{ "--h": h, "--d": (i / COUNT) * 0.35 } as CSSProperties} />)}
  </div>;
}
