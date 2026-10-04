"use client";

import { useId } from "react";
import styles from "./horizon-wave.module.css";

/** Vättern + AI. Bakgrund, ingen slide och inga egna clickersteg. */
export function HorizonWave({ mode = "water", paused = false, digital = true }: {
  mode?: "water" | "shared";
  paused?: boolean;
  digital?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const shape = "M630 780 C1010 805 920 215 1320 160 L1700 105 L1700 570 C1270 495 1190 843 630 780Z";
  return <svg className={styles.wave} data-mode={mode} data-paused={paused} viewBox="0 0 1600 900" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-fill`} x1="0" y1="1" x2="1" y2="0">
        <stop stopColor="var(--bg)" /><stop offset=".43" stopColor="var(--wave-primary)" /><stop offset=".79" stopColor="var(--wave-secondary)" /><stop offset="1" stopColor="var(--text)" />
      </linearGradient>
      <linearGradient id={`${id}-line`}><stop stopColor="var(--wave-primary)" stopOpacity="0" /><stop offset=".55" stopColor="var(--text)" stopOpacity=".4" /><stop offset="1" stopColor="var(--text)" /></linearGradient>
      <clipPath id={`${id}-clip`}><path className={styles.surface} d={shape} /></clipPath>
    </defs>
    <path className={`${styles.surface} ${styles.halo}`} d={shape} fill={`url(#${id}-fill)`} />
    <path className={styles.surface} d={shape} fill={`url(#${id}-fill)`} />
    <g clipPath={`url(#${id}-clip)`}>
      {Array.from({ length: 10 }, (_, i) => <path key={i} className={styles.contour} style={{ animationDelay: `${-i * .55}s` }} d={`M${650 + i * 18} 795 C${1090 + i * 10} ${780 - i * 9} ${915 + i * 29} ${225 + i * 32} ${1300 + i * 11} ${190 + i * 39} L1700 ${150 + i * 45}`} stroke={`url(#${id}-line)`} strokeWidth={i === 0 ? 2 : .8} fill="none" />)}
      {digital && <g className={styles.digital}>
        {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${950 + i * 49} 140 L${630 + i * 65} 835`} stroke="var(--text)" strokeOpacity=".08" fill="none" />)}
        {Array.from({ length: 8 }, (_, i) => <rect key={i} className={styles.packet} x={1060 + (i % 4) * 135} y={230 + Math.floor(i / 4) * 235} width={i % 3 === 0 ? 8 : 4} height={i % 3 === 0 ? 8 : 4} rx="1" fill="var(--text)" style={{ animationDelay: `${-i * 1.9}s` }} />)}
      </g>}
    </g>
  </svg>;
}
