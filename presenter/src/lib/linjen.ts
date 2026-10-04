import type { SlideMeta } from "./extract-slide-types";

/**
 * Linjen (linjen): dygnet går akt för akt. Nattbussen i början,
 * skolan i dagsljus, kvällen när det handlar om relationer och framtiden i
 * gryning. `dygn="…"` på en slide byter himmel från och med den sliden; tidigare
 * slides utan värde åker i natt. Himlen är genomskinliga gradienter som
 * scenfamiljerna lägger över temats natt (`var(--linjen-sky)` i deras CSS).
 */
export type LinjenDygn = NonNullable<SlideMeta["dygn"]>;

export const LINJEN_SKY: Record<LinjenDygn, string> = {
  natt:
    "radial-gradient(ellipse at 88% -12%,rgba(52,86,150,.34),transparent 56%)," +
    "radial-gradient(ellipse at 6% 118%,rgba(255,179,33,.13),transparent 54%)",
  dag:
    "radial-gradient(ellipse at 50% -38%,rgba(128,178,240,.36),transparent 66%)," +
    "radial-gradient(ellipse at 100% 0%,rgba(159,211,255,.12),transparent 46%)",
  kvall:
    "radial-gradient(ellipse at 84% -14%,rgba(122,92,210,.32),transparent 56%)," +
    "radial-gradient(ellipse at 28% 128%,rgba(255,112,64,.18),transparent 58%)",
  gryning:
    "linear-gradient(0deg,rgba(255,176,128,.62) 0%,rgba(255,128,128,.3) 9%,rgba(170,120,230,.16) 24%,rgba(90,110,210,.08) 40%,transparent 60%)," +
    "radial-gradient(ellipse at 50% 118%,rgba(255,196,140,.34),transparent 44%)",
};

export function linjenDygn(metas: SlideMeta[], index: number): LinjenDygn {
  for (let i = Math.min(index, metas.length - 1); i >= 0; i--) {
    const d = metas[i]?.dygn;
    if (d) return d;
  }
  return "natt";
}

export function linjenSky(metas: SlideMeta[], index: number): string {
  return LINJEN_SKY[linjenDygn(metas, index)];
}
