import { clamp, rgba, rng, smooth, STAGE_H, STAGE_W, type Palette, type SimWorld } from "./sim";

/*
 * Varningen före vattnet (skalstegens tredje exempel, 10⁵ m). En flod med biflöden rinner söderut i
 * bildens högra tredjedel, där ingen text ligger. Två vågor går nedströms: först AI:s varning, snabbt,
 * och byarna tänds; sedan vattnet, långsamt. Avståndet mellan vågorna är framförhållningen, som
 * tidslinjen (stege-vis.tsx) visar som fem dygn. En illustration, inte verklig data.
 *
 * Läge 0: inget syns (lagret är av). Läge 1 framåt: förloppet. Läge 1 stilla: allt varnat, vattnet framme.
 */

/** Förloppets tider i sekunder; tidslinjen i stege-vis.module.css använder samma. */
export const FLOOD_TIMING = { warn: .9, warnFor: 1.3, water: 2.6, waterFor: 4.2 };

type Seg = { x0: number; y0: number; x1: number; y1: number; depth: number; down: number; up: number };
type Village = { x: number; y: number; dist: number };

/**
 * Nätet: en huvudfåra från norr till söder (mynningen nederst) och biflöden som växer uppströms från
 * den, åt båda håll men inte in över kortets text. down/up är avståndet längs vattnet till mynningen.
 */
const NET = (() => {
  const rand = rng(23);
  const segs: Seg[] = [];
  const LEFT = 1150, RIGHT = STAGE_W - 12, TOP = 250, BOTTOM = STAGE_H - 14;
  const grow = (x: number, y: number, a: number, len: number, depth: number, dist: number) => {
    if (depth > 5) return;
    const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
    if (nx < LEFT || nx > RIGHT || ny < TOP || ny > BOTTOM) return;
    segs.push({ x0: x, y0: y, x1: nx, y1: ny, depth, down: dist, up: dist + len });
    const branches = rand() < .5 ? 2 : 1;
    for (let k = 0; k < branches; k++) {
      const spread = branches === 2 ? (k ? 1 : -1) * (.32 + rand() * .3) : (rand() - .5) * .45;
      grow(nx, ny, a + spread, len * (.78 + rand() * .14), depth + 1, dist + len);
    }
  };
  // Huvudfåran, nedifrån och upp, i mjuka slingor.
  const trunk: [number, number, number][] = [];
  let x = 1300, y = BOTTOM, dist = 0;
  trunk.push([x, y, 0]);
  while (y > TOP + 20) {
    const ny = y - 34, nx = 1330 + Math.sin(ny / 95) * 46 + (rand() - .5) * 10;
    dist += Math.hypot(nx - x, ny - y);
    segs.push({ x0: x, y0: y, x1: nx, y1: ny, depth: 0, down: dist - Math.hypot(nx - x, ny - y), up: dist });
    x = nx; y = ny;
    trunk.push([x, y, dist]);
  }
  // Biflöden från huvudfåran, växelvis österut och västerut, uppströms (norrut).
  trunk.forEach(([tx, ty, td], i) => {
    if (i % 3 !== 1) return;
    const east = (i / 3) % 2 < 1;
    grow(tx, ty, east ? -.55 - rand() * .4 : Math.PI + .55 + rand() * .4, 46 + rand() * 18, 1, td);
  });
  const max = Math.max(...segs.map(seg => seg.up));
  // Byar vid vattnet: längs huvudfåran och där biflöden delar sig.
  const villages: Village[] = [
    ...trunk.filter((_, i) => i % 6 === 3).map(([vx, vy, vd]) => ({ x: vx + 14, y: vy, dist: vd })),
    ...segs.filter(seg => seg.depth === 2 && rand() < .35).slice(0, 5).map(seg => ({ x: seg.x1, y: seg.y1, dist: seg.up })),
  ];
  return { segs, max, villages };
})();

const QUIET: ReadonlyArray<readonly [number, number, number, number, number]> = [[80, 60, 960, 190, .4], [80, 220, 440, 760, .45], [470, 230, 1220, 760, .38]];
function quiet(x: number, y: number) {
  let f = 1;
  for (const [x0, y0, x1, y1, level] of QUIET) f = Math.min(f, level + (1 - level) * smooth(0, 36, Math.max(x0 - x, x - x1, y0 - y, y - y1)));
  return f;
}

/** När en våg som startar vid start och korsar hela nätet på dur sekunder når avståndet d från mynningen. */
const arrival = (start: number, dur: number, d: number) => start + (NET.max - d) / NET.max * dur;

export function createFloodWorld(): SimWorld {
  let time = 0, step = 0;

  function strokeWave(ctx: CanvasRenderingContext2D, start: number, dur: number, widthOf: (depth: number) => number, color: string, alphaOf: (s: Seg) => number) {
    // Delvis täckta grenar ritas från uppströmsänden (x1, y1) mot mynningen (x0, y0).
    const LEVELS = 4;
    for (let level = 1; level <= LEVELS; level++) {
      for (let depth = 0; depth <= 5; depth++) {
        ctx.beginPath();
        let any = false;
        for (const s of NET.segs) {
          if (s.depth !== depth) continue;
          const a = Math.ceil(clamp(alphaOf(s)) * LEVELS);
          if (a !== level) continue;
          const t0 = arrival(start, dur, s.up), t1 = arrival(start, dur, s.down);
          const k = clamp((time - t0) / Math.max(.001, t1 - t0));
          if (k <= 0) continue;
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x1 + (s.x0 - s.x1) * k, s.y1 + (s.y0 - s.y1) * k);
          any = true;
        }
        if (!any) continue;
        ctx.lineWidth = widthOf(depth);
        ctx.strokeStyle = rgba(color, level / LEVELS);
        ctx.stroke();
      }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, p: Palette) {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    if (step < 1) return;
    const T = FLOOD_TIMING;
    const intro = clamp(time / .8);
    ctx.lineCap = "round";
    // Nätet, svagt.
    for (let depth = 0; depth <= 5; depth++) {
      ctx.lineWidth = 1 + 2.8 * (1 - depth / 5);
      for (const level of [1, 2, 3]) {
        ctx.beginPath();
        for (const s of NET.segs) {
          if (s.depth !== depth || Math.ceil(quiet(s.x1, s.y1) * 3) !== level) continue;
          ctx.moveTo(s.x0, s.y0);
          ctx.lineTo(s.x1, s.y1);
        }
        ctx.strokeStyle = rgba(p.ink, .3 * intro * level / 3);
        ctx.stroke();
      }
    }
    // Vattnet: tjockt och ljust, långsamt nedströms.
    strokeWave(ctx, T.water, T.waterFor, depth => 4 + 7 * (1 - depth / 5), p.ink, s => .5 * quiet(s.x1, s.y1));
    // Varningen: AI:s färg, snabbt nedströms.
    strokeWave(ctx, T.warn, T.warnFor, depth => 1.6 + 3 * (1 - depth / 5), p.ai, s => quiet(s.x1, s.y1));
    // Byarna: tänds när varningen når dem, med en ring.
    for (const v of NET.villages) {
      const warned = time - arrival(T.warn, T.warnFor, v.dist);
      const seen = quiet(v.x, v.y) * intro;
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(p.human, seen);
      ctx.fillStyle = rgba(p.human, warned > 0 ? seen : 0);
      ctx.beginPath(); ctx.rect(v.x - 5.5, v.y - 5.5, 11, 11); ctx.fill(); ctx.stroke();
      if (warned > 0 && warned < 1) {
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = rgba(p.ai, .8 * (1 - warned) * seen);
        ctx.beginPath(); ctx.arc(v.x, v.y, 9 + warned * 22, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  return {
    setStep(next, instant) {
      step = next;
      time = next >= 1 && instant ? 99 : 0;
    },
    tick: dt => { time += dt; },
    draw: (ctx, p) => draw(ctx, p),
  };
}
