import { clamp, rgba, rng, smooth, STAGE_H, STAGE_W, type Palette, type SimWorld } from "./sim";
import { isSea, seaCell } from "./sim-sea";

/*
 * De osynliga båtarna (skalstegens andra exempel, 10⁶ m). Fiskebåtar ligger bara där bilden visar hav
 * (sim-sea.ts), tätast längs kusterna och på några bankar, så att båtarna själva ritar haven. Var fjärde
 * syns från början, som de som sänder sin position i de offentliga systemen. Ett satellitsvep går över
 * bilden och tänder resten i AI:s färg. En illustration av fyndet, inte verklig data.
 *
 * Läge 0: inget syns (lagret är av). Läge 1 framåt: de synliga tonar in, svepet går efter två sekunder.
 * Läge 1 stilla: alla syns.
 */

const COUNT = 1100;
const SWEEP_START = 2.2;
const SWEEP_SPEED = 520;
/** Fiskebankar i öppet hav, där båtarna samlas tätare. */
const BANKS: ReadonlyArray<readonly [number, number, number]> = [[190, 300, 90], [330, 620, 80], [1340, 110, 110], [1500, 330, 90], [130, 760, 70], [1060, 60, 80]];
/** Där texten ligger tystnar båtarna nästan helt, så att den förblir läsbar (rubrik, stegen, kortet). */
const QUIET: ReadonlyArray<readonly [number, number, number, number, number]> = [[70, 50, 970, 200, .06], [70, 210, 450, 770, .08], [460, 220, 1230, 770, .07]];

type Boat = { x: number; y: number; h: number; speed: number; turn: number; tracked: boolean; reveal: number };

function coastal(col: number, row: number) {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!seaCell(col + dx, row + dy)) return true;
  return false;
}

function quiet(x: number, y: number) {
  let f = 1;
  for (const [x0, y0, x1, y1, level] of QUIET) {
    const out = Math.max(x0 - x, x - x1, y0 - y, y - y1);
    f = Math.min(f, level + (1 - level) * smooth(0, 40, out));
  }
  return f;
}

export function createBoatsWorld({ seed = 11 }: { seed?: number } = {}): SimWorld {
  const rand = rng(seed);
  const boats: Boat[] = [];
  let guard = 0;
  while (boats.length < COUNT && guard++ < COUNT * 60) {
    const x = rand() * STAGE_W, y = rand() * STAGE_H;
    if (!isSea(x, y)) continue;
    const col = Math.floor(x / 10), row = Math.floor(y / 10);
    let weight = coastal(col, row) ? .95 : .1;
    for (const [bx, by, r] of BANKS) weight += .8 * Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (r * r));
    if (rand() > Math.min(1, weight)) continue;
    const tracked = boats.length % 4 === 0;
    boats.push({ x, y, h: rand() * Math.PI * 2, speed: 2 + rand() * 6, turn: (rand() - .5) * .9, tracked, reveal: Infinity });
  }
  let time = 0, step = 0, sweeping = false;

  function tick(dt: number) {
    time += dt;
    for (const b of boats) {
      b.h += b.turn * dt;
      const nx = b.x + Math.cos(b.h) * b.speed * dt, ny = b.y + Math.sin(b.h) * b.speed * dt;
      if (isSea(nx, ny)) { b.x = nx; b.y = ny; } else b.h += Math.PI * (.6 + rand() * .8);
      if (sweeping && !b.tracked && b.reveal === Infinity && b.x <= (time - SWEEP_START) * SWEEP_SPEED) b.reveal = time;
    }
  }

  function draw(ctx: CanvasRenderingContext2D, p: Palette) {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    if (step < 1) return;
    const fadeIn = sweeping ? clamp(time / .8) : 1;
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    // Båtarna som prickar med ett kort kölvatten bakåt, i omgångar per färg och styrka.
    const LEVELS = 5;
    for (const dark of [false, true]) {
      const color = dark ? p.ai : p.ink;
      for (let level = 1; level <= LEVELS; level++) {
        const strength = (dark ? .95 : .8) * level / LEVELS;
        const pick = (b: Boat) => {
          if (b.tracked === dark) return false;
          const shown = b.tracked ? fadeIn : clamp((time - b.reveal) / .4);
          return shown > 0 && Math.ceil(clamp(shown * quiet(b.x, b.y)) * LEVELS) === level;
        };
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = rgba(color, strength * .4);
        ctx.beginPath();
        for (const b of boats) {
          if (!pick(b)) continue;
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - Math.cos(b.h) * 9, b.y - Math.sin(b.h) * 9);
        }
        ctx.stroke();
        ctx.fillStyle = rgba(color, strength);
        ctx.beginPath();
        for (const b of boats) {
          if (!pick(b)) continue;
          ctx.moveTo(b.x + 1.8, b.y);
          ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
    if (!sweeping) return;
    // En ring där en dold båt just tänts.
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(p.ai, .32);
    ctx.beginPath();
    for (const b of boats) {
      const age = time - b.reveal;
      if (age < 0 || age > .5 || quiet(b.x, b.y) < .6) continue;
      const r = 2.5 + age * 12;
      ctx.moveTo(b.x + r, b.y);
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    }
    ctx.stroke();
    // Svepet: en ljus linje med ett svagt sken efter sig.
    const sx = (time - SWEEP_START) * SWEEP_SPEED;
    if (sx > -20 && sx < STAGE_W + 200) {
      const trail = ctx.createLinearGradient(sx - 220, 0, sx, 0);
      trail.addColorStop(0, rgba(p.ai, 0));
      trail.addColorStop(1, rgba(p.ai, p.dark ? .16 : .1));
      ctx.fillStyle = trail;
      ctx.fillRect(sx - 220, 0, 220, STAGE_H);
      ctx.fillStyle = rgba(p.ai, .9);
      ctx.fillRect(sx - 1, 0, 2, STAGE_H);
    }
  }

  return {
    setStep(next, instant) {
      step = next;
      if (next < 1) { sweeping = false; return; }
      if (instant) {
        sweeping = false;
        for (const b of boats) b.reveal = -10;
        for (let i = 0; i < 60; i++) tick(1 / 60);
      } else {
        time = 0;
        sweeping = true;
        for (const b of boats) b.reveal = Infinity;
      }
    },
    tick,
    draw: (ctx, p) => draw(ctx, p),
  };
}
