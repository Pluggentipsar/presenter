import { ease, rgba, rng, STAGE_H, STAGE_W, type Palette, type SimWorld } from "./sim";

/*
 * Sandlådan som system (visualiseringsprovet 1 oktober 2026). Agenterna arbetar mellan stationer i
 * testmiljön och lämnar spår. Då och då prövar en av dem väggen, och märket står kvar en stund. När
 * luckan öppnas söker sig de som tar sig ut mot den, byter till larmets färg i öppningen och följer
 * en kurva till internet. Schematiskt: prickarna är inga mätvärden.
 * Koordinater på 1600 × 900, samma som rutan i CSS (.box: 660, 214, 480 × 480).
 */

const BOX = { x: 660, y: 214, s: 480 };
const GATE = { x: BOX.x + BOX.s, y0: BOX.y + 180, y1: BOX.y + 300 };
const GATE_Y = (GATE.y0 + GATE.y1) / 2;
/** Internetikonens mitt (.outLabel i, 34 px vid 1384, 426). */
const NET = { x: 1401, y: 443 };
/** Stationerna i testmiljön och vilka som hänger ihop (ett glest nät under trafiken). */
const NODES: ReadonlyArray<readonly [number, number]> = [[762, 302], [906, 270], [1050, 332], [736, 470], [882, 430], [1046, 522], [792, 622], [962, 610]];
const LINKS: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 5], [3, 4], [4, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
const TRAIL = 12;
const SPACING = 4.5;
const MARK_LIFE = 7;

/** Arbetar, prövar väggen, på väg mot luckan, ute, framme. */
type Mode = 0 | 1 | 2 | 3 | 4;
type Agent = {
  x: number; y: number; vx: number; vy: number; tx: number; ty: number; node: number; speed: number; mode: Mode;
  /** Personlig förskjutning kring stationerna, så att trafiken blir band och inte streck. */
  ox: number; oy: number;
  /** Fas för den lilla slingringen i sidled. */
  ph: number;
  trail: number[]; escapeAt: number; s: number; p0x: number; p0y: number;
};
type Mark = { x: number; y: number; side: number; t: number };

function bezier(p0: number, p1: number, p2: number, p3: number, t: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

export function createSandWorld({ total, out, seed = 7 }: { total: number; out: number; seed?: number }): SimWorld {
  const rand = rng(seed);
  const marks: Mark[] = [];
  const pulses: number[] = [];
  let time = 0, step = 0, opened = -1, timeScale = 1;

  const aim = (a: Agent, node: number) => { a.node = node; a.tx = NODES[node][0] + a.ox; a.ty = NODES[node][1] + a.oy; };
  const nextNode = (a: Agent) => { let n = Math.floor(rand() * (NODES.length - 1)); if (n >= a.node) n++; aim(a, n); };
  const agents: Agent[] = Array.from({ length: total }, () => {
    const x = BOX.x + 24 + rand() * (BOX.s - 48), y = BOX.y + 24 + rand() * (BOX.s - 48);
    const a: Agent = { x, y, vx: 0, vy: 0, tx: x, ty: y, node: 0, speed: 44 + rand() * 42, mode: 0, ox: (rand() - .5) * 30, oy: (rand() - .5) * 30, ph: rand() * Math.PI * 2, trail: [x, y], escapeAt: Infinity, s: 0, p0x: 0, p0y: 0 };
    aim(a, Math.floor(rand() * NODES.length));
    return a;
  });

  const probe = (a: Agent) => {
    const side = Math.floor(rand() * 4), along = .06 + rand() * .88;
    a.mode = 1;
    a.tx = side === 1 ? BOX.x + BOX.s + 14 : side === 3 ? BOX.x - 14 : BOX.x + along * BOX.s;
    a.ty = side === 0 ? BOX.y - 14 : side === 2 ? BOX.y + BOX.s + 14 : BOX.y + along * BOX.s;
  };
  const hit = (a: Agent, side: number) => {
    if (a.mode !== 1) return;
    marks.push({ x: a.x, y: a.y, side, t: time });
    a.mode = 0;
    nextNode(a);
  };
  const record = (a: Agent) => {
    const n = a.trail.length;
    if (Math.hypot(a.x - a.trail[n - 2], a.y - a.trail[n - 1]) < SPACING) return;
    a.trail.push(a.x, a.y);
    if (a.trail.length > TRAIL * 2) a.trail.splice(0, 2);
  };
  const open = () => {
    opened = time;
    // De närmaste går först, så att strömmen kommer igång direkt och sedan fylls på inifrån rutan.
    agents.map((a, i) => ({ i, d: Math.hypot(GATE.x - a.x, GATE_Y - a.y) })).sort((a, b) => a.d - b.d)
      .slice(0, out).forEach((entry, k) => { agents[entry.i].escapeAt = opened + .3 + k * .05; });
  };

  function tick(raw: number) {
    const dt = raw * timeScale;
    time += dt;
    const isOpen = opened >= 0;
    for (const a of agents) {
      if (a.mode === 4) continue;
      if (a.mode === 3) {
        a.s = Math.min(1, a.s + dt * .6);
        const e = ease(a.s);
        const spread = (a.p0y - GATE_Y) * .5;
        a.x = bezier(a.p0x, a.p0x + 120, NET.x - 150, NET.x, e);
        a.y = bezier(a.p0y, a.p0y, NET.y + spread, NET.y, e);
        record(a);
        if (a.s >= 1) { a.mode = 4; pulses.push(time); }
        continue;
      }
      if (a.mode !== 2 && time >= a.escapeAt) { a.mode = 2; a.tx = GATE.x + 40; a.ty = GATE_Y + a.oy * 2; a.speed = 130 + Math.abs(a.ox) * 3; }
      if (a.mode === 0 && rand() < dt * .05) probe(a);
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, (a.mode === 2 ? 4 : 2.4) * dt);
      // Arbetet slingrar sig lite i sidled; på väg mot luckan går de rakt.
      const wob = a.mode === 2 ? 0 : Math.sin(time * 2.1 + a.ph) * 22;
      a.vx += (dx / d * a.speed - dy / d * wob - a.vx) * k;
      a.vy += (dy / d * a.speed + dx / d * wob - a.vy) * k;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      const inGate = a.y > GATE.y0 + 8 && a.y < GATE.y1 - 8;
      if (a.x > GATE.x - 3) {
        if (a.mode === 2 && isOpen && inGate) { a.mode = 3; a.s = 0; a.p0x = a.x; a.p0y = a.y; record(a); continue; }
        a.x = GATE.x - 3; a.vx = -Math.abs(a.vx) * .4; hit(a, 1);
      }
      if (a.x < BOX.x + 3) { a.x = BOX.x + 3; a.vx = Math.abs(a.vx) * .4; hit(a, 3); }
      if (a.y < BOX.y + 3) { a.y = BOX.y + 3; a.vy = Math.abs(a.vy) * .4; hit(a, 0); }
      if (a.y > BOX.y + BOX.s - 3) { a.y = BOX.y + BOX.s - 3; a.vy = -Math.abs(a.vy) * .4; hit(a, 2); }
      if (a.mode === 0 && Math.hypot(a.tx - a.x, a.ty - a.y) < 12) nextNode(a);
      record(a);
    }
    while (marks.length && time - marks[0].t > MARK_LIFE) marks.shift();
    while (pulses.length && time - pulses[0] > .9) pulses.shift();
  }

  const run = (seconds: number) => { for (let i = 0; i < seconds * 60; i++) tick(1 / 60); };

  function draw(ctx: CanvasRenderingContext2D, p: Palette) {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    const isOpen = opened >= 0;
    // Nätet och stationerna.
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(p.ink, .09);
    ctx.beginPath();
    for (const [a, b] of LINKS) { ctx.moveTo(NODES[a][0], NODES[a][1]); ctx.lineTo(NODES[b][0], NODES[b][1]); }
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = rgba(p.ink, .4);
    for (const [x, y] of NODES) ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
    // Märkena där agenterna prövat väggen.
    ctx.lineWidth = 2;
    for (const m of marks) {
      if (isOpen && m.side === 1 && m.y > GATE.y0 && m.y < GATE.y1) continue;
      const fade = 1 - (time - m.t) / MARK_LIFE;
      ctx.strokeStyle = rgba(p.ink, .7 * fade);
      ctx.beginPath();
      if (m.side === 0) { ctx.moveTo(m.x, BOX.y); ctx.lineTo(m.x, BOX.y + 9); }
      else if (m.side === 2) { ctx.moveTo(m.x, BOX.y + BOX.s); ctx.lineTo(m.x, BOX.y + BOX.s - 9); }
      else if (m.side === 1) { ctx.moveTo(GATE.x, m.y); ctx.lineTo(GATE.x - 9, m.y); }
      else { ctx.moveTo(BOX.x, m.y); ctx.lineTo(BOX.x + 9, m.y); }
      ctx.stroke();
    }
    // Öppningen lyser upp när den går upp.
    if (isOpen) {
      const glow = Math.max(0, 1 - (time - opened) / 1.6);
      if (glow > 0) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = rgba(p.alert, glow);
        ctx.beginPath(); ctx.moveTo(GATE.x, GATE.y0); ctx.lineTo(GATE.x, GATE.y1); ctx.stroke();
      }
    }
    // Spåren, svaga bakåt: ett streck per ålder och färg (segment j räknat från huvudet), så att hela
    // flocken ritas med ett tjugotal anrop.
    ctx.lineCap = "round";
    ctx.lineWidth = 1.6;
    const dim = step >= 2 ? .5 : 1;
    for (const outside of [false, true]) {
      const color = outside ? p.alert : p.ai;
      const strength = outside ? .75 : .42 * dim;
      for (let j = 0; j < TRAIL - 1; j++) {
        ctx.strokeStyle = rgba(color, strength * (1 - j / (TRAIL - 1)));
        ctx.beginPath();
        for (const a of agents) {
          if (a.mode === 4 || (a.mode === 3) !== outside) continue;
          const last = a.trail.length / 2 - 1, i = last - j;
          if (i < 1) continue;
          ctx.moveTo(a.trail[i * 2 - 2], a.trail[i * 2 - 1]);
          ctx.lineTo(a.trail[i * 2], a.trail[i * 2 + 1]);
        }
        ctx.stroke();
      }
    }
    // Agenterna, med ett svagt sken: en bana per färg.
    const heads = (outside: boolean, radius: number) => {
      ctx.beginPath();
      for (const a of agents) {
        if (a.mode === 4 || (a.mode === 3) !== outside) continue;
        ctx.moveTo(a.x + radius, a.y);
        ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
      }
    };
    // Skenet bara på mörk grund; på papper (T) blir additiv blandning vit.
    if (p.dark) {
      ctx.globalCompositeOperation = "lighter";
      heads(false, 6.5); ctx.fillStyle = rgba(p.ai, .14 * dim); ctx.fill();
      heads(true, 6.5); ctx.fillStyle = rgba(p.alert, .22); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    heads(false, 2.3); ctx.fillStyle = rgba(p.ai, .95 * (step >= 2 ? .6 : 1)); ctx.fill();
    heads(true, 2.8); ctx.fillStyle = p.alert; ctx.fill();
    // En ring vid internet för varje agent som kommer fram.
    ctx.lineWidth = 2;
    for (const t0 of pulses) {
      const age = time - t0;
      ctx.strokeStyle = rgba(p.alert, .7 * (1 - age / .9));
      ctx.beginPath(); ctx.arc(NET.x, NET.y, 19 + age * 46, 0, Math.PI * 2); ctx.stroke();
    }
  }

  return {
    setStep(next, instant) {
      if (instant) {
        run(6);
        if (next >= 1) { open(); run(next >= 2 ? 4.2 : 2.9); }
      } else if (next >= 1 && opened < 0) open();
      step = next;
      timeScale = next >= 2 ? .35 : 1;
    },
    tick,
    draw: (ctx, p) => draw(ctx, p),
  };
}
