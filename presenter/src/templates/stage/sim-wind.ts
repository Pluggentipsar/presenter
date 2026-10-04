import { clamp, rgba, rng, smooth, STAGE_H, STAGE_W, type Palette, type SimWorld } from "./sim";

/*
 * Vinden på planeten (visualiseringsprovet 1 oktober 2026, skalstegens första exempel). Ett vindfält
 * projicerat på klotet: passadvindar, västvindbältet och polarvindarna, vågor i västvindarna och tre
 * lågtryck, varav en tropisk cyklon med en prognoskon. Strecken följer fältet och tonar bort mot
 * kortets text till vänster. En illustration av vad en prognosmodell räknar på, inte en verklig prognos.
 * Planeten står där bilden skala-p7 har den på 1600 × 900: mitt (1155, 453), radie 344.
 */

const PLANET = { x: 1155, y: 453, r: 344 };
const DEG = Math.PI / 180;
/** Vinden syns till höger om kortets text, som slutar vid x ≈ 1080. */
const SHOW_FROM = 1050, SHOW_FULL = 1185;
/** Skärmpixlar per sekund och vindenhet. */
const K = 4.4;
const COUNT = 2200;
const CYCLONES = [
  { lat: -18, lon: 47, R: 6, S: 32 },
  { lat: -59, lon: 26, R: 12, S: 17 },
  { lat: 52, lon: 42, R: 11, S: 15 },
].map(c => ({ lat: c.lat * DEG, lon: c.lon * DEG, R: c.R * DEG, S: c.S }));
/** Cyklonens prognosspår, ett läge per dygn (latitud, longitud i grader). */
const TRACK: ReadonlyArray<readonly [number, number]> = [[-18, 47], [-20.2, 42.2], [-23.4, 37.8], [-27.4, 34.8], [-31.8, 33.8], [-36.2, 35.4]];

function screen(lat: number, lon: number): [number, number] {
  return [PLANET.x + PLANET.r * Math.cos(lat) * Math.sin(lon), PLANET.y - PLANET.r * Math.sin(lat)];
}

/**
 * Cyklonens prognoskon som SVG-geometri (ritas ovanpå canvasen, så att den inte bleknar med strecken):
 * spåret med en prick per dygn och en kon som vidgas med osäkerheten.
 */
export const WIND_TRACK = (() => {
  const pts = TRACK.map(([lat, lon]) => screen(lat * DEG, lon * DEG));
  const left: string[] = [], right: string[] = [];
  pts.forEach(([sx, sy], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, w = 3 + i * 8;
    left.push(`${(sx - dy / d * w).toFixed(1)} ${(sy + dx / d * w).toFixed(1)}`);
    right.push(`${(sx + dy / d * w).toFixed(1)} ${(sy - dx / d * w).toFixed(1)}`);
  });
  return {
    cone: `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`,
    line: `M ${pts.map(([sx, sy]) => `${sx.toFixed(1)} ${sy.toFixed(1)}`).join(" L ")}`,
    days: pts.slice(1),
    eye: pts[0],
  };
})();

/** Vinden i en skärmpunkt, i skärmpixlar per sekund. Falskt utanför klotet. */
function wind(x: number, y: number, t: number, out: Float32Array): boolean {
  const nx = (x - PLANET.x) / PLANET.r, ny = (y - PLANET.y) / PLANET.r;
  if (nx * nx + ny * ny >= .994) return false;
  const lat = -Math.asin(ny);
  const cosL = Math.cos(lat), sinL = Math.sin(lat);
  const lon = Math.asin(clamp(nx / Math.max(.05, cosL), -1, 1));
  // Östlig passad vid ekvatorn, västvindar kring 30–60 grader, östliga polarvindar; vågor i fälten.
  let u = -9 * Math.cos(6 * lat) + 3 * Math.sin(2.3 * lon + 4 * lat + .07 * t);
  let v = 3.6 * Math.sin(3 * lon - 2.2 * lat + .05 * t) * cosL;
  for (const c of CYCLONES) {
    const de = (lon - c.lon) * Math.cos(c.lat), dn = lat - c.lat;
    const d = Math.hypot(de, dn);
    if (d < 1e-4 || d > c.R * 5) continue;
    const q = d / c.R;
    const vt = c.S * 2 * q / (1 + q * q) * Math.exp(-(q * q) / 9);
    // Moturs på norra halvklotet, medurs på södra; lite inflöde mot centrum.
    const spin = c.lat >= 0 ? 1 : -1;
    u += (-dn / d) * vt * spin - (de / d) * vt * .28;
    v += (de / d) * vt * spin - (dn / d) * vt * .28;
  }
  out[0] = K * (u * Math.cos(lon) - v * sinL * Math.sin(lon));
  out[1] = -K * v * cosL;
  return true;
}

/** Hur mycket som syns i en punkt: bort mot texten och svagare mot klotets kant. */
function visibility(x: number, y: number) {
  const rho = Math.hypot(x - PLANET.x, y - PLANET.y) / PLANET.r;
  return smooth(SHOW_FROM, SHOW_FULL, x) * (1 - smooth(.86, .99, rho));
}

export function createWindWorld({ seed = 3 }: { seed?: number } = {}): SimWorld {
  const rand = rng(seed);
  const x = new Float32Array(COUNT), y = new Float32Array(COUNT), px = new Float32Array(COUNT), py = new Float32Array(COUNT);
  const age = new Float32Array(COUNT), life = new Float32Array(COUNT);
  const bucket = new Uint8Array(COUNT);
  const v = new Float32Array(2);
  let time = 0;

  const spawn = (i: number) => {
    let sx = 0, sy = 0;
    for (let tries = 0; tries < 30; tries++) {
      sx = PLANET.x + (rand() * 2 - 1) * PLANET.r;
      sy = PLANET.y + (rand() * 2 - 1) * PLANET.r;
      if (sx > SHOW_FROM - 40 && Math.hypot(sx - PLANET.x, sy - PLANET.y) < PLANET.r * .97) break;
    }
    x[i] = px[i] = sx; y[i] = py[i] = sy;
    age[i] = 0; life[i] = 1.4 + rand() * 2.6;
  };
  for (let i = 0; i < COUNT; i++) { spawn(i); age[i] = rand() * life[i]; }

  function tick(dt: number) {
    time += dt;
    for (let i = 0; i < COUNT; i++) {
      px[i] = x[i]; py[i] = y[i];
      age[i] += dt;
      if (age[i] > life[i] || !wind(x[i], y[i], time, v)) { spawn(i); continue; }
      x[i] += v[0] * dt; y[i] += v[1] * dt;
    }
  }

  function strokeBuckets(ctx: CanvasRenderingContext2D, color: string, levels: number, alphaOf: (level: number) => number, path: (level: number) => void) {
    for (let level = 1; level < levels; level++) {
      ctx.strokeStyle = rgba(color, alphaOf(level));
      ctx.beginPath();
      path(level);
      ctx.stroke();
    }
  }

  /** Stillbilden: korta strömlinjer från ett jämnt utspritt urval, ljusast i rörelsens riktning. */
  function drawStreamlines(ctx: CanvasRenderingContext2D, p: Palette) {
    const seedRand = rng(seed + 101);
    const STEPS = 15, H = .06;
    const lines: Float32Array[] = [];
    for (let i = 0; i < 1500; i++) {
      let sx = 0, sy = 0, ok = false;
      for (let tries = 0; tries < 30 && !ok; tries++) {
        sx = PLANET.x + (seedRand() * 2 - 1) * PLANET.r;
        sy = PLANET.y + (seedRand() * 2 - 1) * PLANET.r;
        ok = sx > SHOW_FROM - 30 && Math.hypot(sx - PLANET.x, sy - PLANET.y) < PLANET.r * .97;
      }
      if (!ok) continue;
      const line = new Float32Array((STEPS + 1) * 2);
      line[0] = sx; line[1] = sy;
      let n = 1;
      for (; n <= STEPS; n++) {
        if (!wind(sx, sy, time, v)) break;
        sx += v[0] * H; sy += v[1] * H;
        line[n * 2] = sx; line[n * 2 + 1] = sy;
      }
      if (n > 3) lines.push(line.subarray(0, n * 2));
    }
    ctx.lineWidth = 1.1;
    const gain = p.dark ? 1 : 1.7;
    strokeBuckets(ctx, p.ai, STEPS + 1, level => Math.min(1, .5 * gain * level / STEPS), level => {
      for (const line of lines) {
        if (line.length / 2 <= level) continue;
        const ax = line[level * 2 - 2], ay = line[level * 2 - 1], bx = line[level * 2], by = line[level * 2 + 1];
        const seen = visibility(bx, by);
        if (seen < .08) continue;
        ctx.moveTo(ax + (bx - ax) * (1 - seen), ay + (by - ay) * (1 - seen));
        ctx.lineTo(bx, by);
      }
    });
  }

  function draw(ctx: CanvasRenderingContext2D, p: Palette, frame: { live: boolean; full: boolean }) {
    // Additivt sken på mörk grund; på papper (T) ritas strecken vanligt och lite tätare.
    const blend: GlobalCompositeOperation = p.dark ? "lighter" : "source-over";
    if (!frame.live || frame.full) {
      ctx.clearRect(0, 0, STAGE_W, STAGE_H);
      ctx.globalCompositeOperation = blend;
      drawStreamlines(ctx, p);
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    // Rörelsen: förra bilden bleknar (mot genomskinligt, så att planeten syns), nya streck läggs på.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0, 0, 0, .085)";
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
    ctx.globalCompositeOperation = blend;
    ctx.lineWidth = 1.15;
    ctx.lineCap = "round";
    const LEVELS = 7;
    for (let i = 0; i < COUNT; i++) {
      const fade = Math.min(1, age[i] / .35, (life[i] - age[i]) / .5);
      bucket[i] = Math.round(clamp(fade * visibility(x[i], y[i])) * (LEVELS - 1));
    }
    const gain = p.dark ? 1 : 1.5;
    strokeBuckets(ctx, p.ai, LEVELS, level => Math.min(1, .62 * gain * level / (LEVELS - 1)), level => {
      for (let i = 0; i < COUNT; i++) {
        if (bucket[i] !== level) continue;
        ctx.moveTo(px[i], py[i]);
        ctx.lineTo(x[i], y[i]);
      }
    });
    ctx.globalCompositeOperation = "source-over";
  }

  return {
    setStep(_step, instant) {
      if (instant) for (let i = 0; i < 90; i++) tick(1 / 60);
    },
    tick,
    draw,
  };
}
