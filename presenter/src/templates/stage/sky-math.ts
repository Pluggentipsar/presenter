import type { CSSProperties } from "react";

/** Samma pseudoslump varje gång: positionerna står still mellan renderingar och lägen. */
export const seeded = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Referenshorisonten (.72). Allt ritas mot den och flyttas sedan med --hz2-h. */
export const H0 = 648;

/** En del som ligger k av horisontens förflyttning under/över referensen. */
export const follow = (k: number, delay?: string): CSSProperties => ({ translate: `0 calc((var(--hz2-h) - ${H0}px) * ${k.toFixed(4)})`, animationDelay: delay });
