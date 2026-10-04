"use client";

import { useEffect, useRef } from "react";

/**
 * Kunskapsbankens graf (2 oktober 2026): sidorna och föreläsningarna som ett nätverk, ritat på en
 * canvas med en egen kraftsimulering (samma modell som d3-force: fjädrar längs länkarna, repulsion
 * mellan alla noder, ett svagt drag mot mitten). Ingen extra paketberoende.
 *
 * Dra i bakgrunden för att panorera, rulla för att zooma, dra en nod för att flytta den, klicka för
 * att öppna. Dubbelklick på bakgrunden passar in hela grafen igen. Pekaren över en nod lyfter fram
 * dess grannar. I kompakt läge (grannskapet bredvid en sida) står sidan själv fast i mitten.
 */

export interface GraphNode {
  id: string;
  label: string;
  color: string;
  kind: "note" | "deck";
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  degree: number;
}

interface SimLink {
  s: number;
  t: number;
  strength: number;
  bias: number;
}

const PAPER = "#fbfaf6";
const INK = "#16150f";
const MUTED = "#6d695e";
const ACCENT = "#243cff";

class Engine {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private width = 1;
  private height = 1;
  private nodes: SimNode[] = [];
  private links: SimLink[] = [];
  private byId = new Map<string, number>();
  private neighbors: Set<number>[] = [];
  private view = { k: 1, x: 0, y: 0 };
  private alpha = 1;
  private alphaTarget = 0;
  private hover = -1;
  private focus = -1;
  private highlight: Set<number> | null = null;
  private drag: { index: number; startX: number; startY: number; moved: boolean } | null = null;
  private pan: { x: number; y: number } | null = null;
  private autoFit = true;
  private raf = 0;
  /** Ytor som täcks av annat (förklaringen) och som grafen ska passas in bredvid. */
  private inset = { left: 0, top: 0 };
  /** De största navens index: de får etikett även på avstånd. */
  private hubs = new Set<number>();
  private font = "sans-serif";
  private readonly reduced: boolean;

  constructor(
    private canvas: HTMLCanvasElement,
    private compact: boolean,
    private onOpen: (id: string) => void,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.font = getComputedStyle(canvas).fontFamily || "sans-serif";
  }

  setOpen(onOpen: (id: string) => void) {
    this.onOpen = onOpen;
  }

  /* ── Data ── */

  setData(nodes: GraphNode[], edges: [string, string][], focus: string | null) {
    const old = new Map(this.nodes.map(node => [node.id, node]));
    const byId = new Map<string, number>();
    nodes.forEach((node, i) => byId.set(node.id, i));
    const degree = new Array<number>(nodes.length).fill(0);
    const pairs: [number, number][] = [];
    const seen = new Set<string>();
    for (const [a, b] of edges) {
      const s = byId.get(a), t = byId.get(b);
      if (s === undefined || t === undefined || s === t) continue;
      const key = s < t ? `${s}-${t}` : `${t}-${s}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([s, t]);
      degree[s]++;
      degree[t]++;
    }
    const neighbors = nodes.map(() => new Set<number>());
    for (const [s, t] of pairs) {
      neighbors[s].add(t);
      neighbors[t].add(s);
    }
    // Nya noder börjar bredvid en granne som redan har en plats, annars i en solrosspiral.
    const spiral = (i: number) => {
      const radius = 12 * Math.sqrt(0.5 + i), angle = i * Math.PI * (3 - Math.sqrt(5));
      return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
    };
    this.nodes = nodes.map((node, i) => {
      const before = old.get(node.id);
      if (before) return { ...node, x: before.x, y: before.y, vx: 0, vy: 0, fx: null, fy: null, degree: degree[i] };
      let start = spiral(i);
      for (const j of neighbors[i]) {
        const near = old.get(nodes[j].id);
        if (near) {
          start = { x: near.x + (Math.random() - 0.5) * 30, y: near.y + (Math.random() - 0.5) * 30 };
          break;
        }
      }
      return { ...node, ...start, vx: 0, vy: 0, fx: null, fy: null, degree: degree[i] };
    });
    this.links = pairs.map(([s, t]) => ({ s, t, strength: 1 / Math.min(degree[s], degree[t]), bias: degree[s] / (degree[s] + degree[t]) }));
    this.hubs = new Set(
      degree
        .map((value, i) => [value, i] as const)
        .filter(([value]) => value >= 8)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 10)
        .map(([, i]) => i),
    );
    this.byId = byId;
    this.neighbors = neighbors;
    this.focus = focus ? byId.get(focus) ?? -1 : -1;
    if (this.compact && this.focus >= 0) {
      const center = this.nodes[this.focus];
      center.x = center.fx = 0;
      center.y = center.fy = 0;
    }
    this.hover = -1;
    this.alpha = old.size ? Math.max(this.alpha, 0.5) : 1;
    // En varm start: de första stegen syns inte, så grafen inte exploderar fram.
    const warm = this.reduced ? 320 : old.size ? 0 : this.nodes.length > 400 ? 40 : 70;
    for (let i = 0; i < warm && this.alpha > 0.002; i++) this.tick();
    if (this.autoFit || !old.size) this.fit(true);
    this.start();
  }

  setInset(left: number, top: number) {
    this.inset = { left, top };
    if (this.autoFit) this.fit(true);
    this.draw();
  }

  setHighlight(ids: Set<string> | null) {
    this.highlight = ids ? new Set([...ids].map(id => this.byId.get(id)).filter((i): i is number => i !== undefined)) : null;
    this.draw();
  }

  /* ── Simuleringen ── */

  private tick() {
    const nodes = this.nodes, n = nodes.length, alpha = this.alpha;
    const charge = this.compact ? -170 : -95;
    const distance = this.compact ? 70 : 46;
    const centerStrength = this.compact ? 0.09 : 0.035;
    const maxDistance2 = this.compact ? Infinity : 700 * 700;
    for (const link of this.links) {
      const s = nodes[link.s], t = nodes[link.t];
      let x = t.x + t.vx - s.x - s.vx, y = t.y + t.vy - s.y - s.vy;
      let l = Math.sqrt(x * x + y * y) || 1e-6;
      l = ((l - distance) / l) * alpha * link.strength;
      x *= l;
      y *= l;
      t.vx -= x * link.bias;
      t.vy -= y * link.bias;
      s.vx += x * (1 - link.bias);
      s.vy += y * (1 - link.bias);
    }
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 > maxDistance2) continue;
        if (d2 < 1) {
          dx = (Math.random() - 0.5) * 1e-3;
          dy = (Math.random() - 0.5) * 1e-3;
          d2 = 1;
        }
        const w = (charge * alpha) / d2;
        a.vx += dx * w;
        a.vy += dy * w;
        b.vx -= dx * w;
        b.vy -= dy * w;
      }
    }
    for (const node of nodes) {
      node.vx -= node.x * centerStrength * alpha;
      node.vy -= node.y * centerStrength * alpha;
      if (node.fx !== null) {
        node.x = node.fx;
        node.vx = 0;
      } else {
        node.vx *= 0.58;
        node.x += node.vx;
      }
      if (node.fy !== null) {
        node.y = node.fy;
        node.vy = 0;
      } else {
        node.vy *= 0.58;
        node.y += node.vy;
      }
    }
    this.alpha += (this.alphaTarget - this.alpha) * 0.0228;
  }

  private start() {
    if (this.raf) return;
    const frame = () => {
      this.raf = 0;
      const running = this.alpha > 0.002 || this.alphaTarget > 0;
      if (running) {
        const steps = this.nodes.length > 600 ? 1 : 2;
        for (let i = 0; i < steps; i++) this.tick();
      }
      const fitting = this.autoFit ? this.fit(false) : false;
      this.draw();
      if (running || fitting) this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /* ── Vyn ── */

  resize(width: number, height: number) {
    this.dpr = window.devicePixelRatio || 1;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    if (this.autoFit) this.fit(true);
    this.draw();
  }

  /** Passa in grafen i ytan. Mjukt mot målet, eller direkt; svarar om vyn fortfarande rör sig. */
  private fit(now: boolean): boolean {
    if (!this.nodes.length) return false;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const node of this.nodes) {
      x0 = Math.min(x0, node.x);
      y0 = Math.min(y0, node.y);
      x1 = Math.max(x1, node.x);
      y1 = Math.max(y1, node.y);
    }
    const pad = this.compact ? 34 : 48;
    const width = this.width - this.inset.left, height = this.height - this.inset.top;
    const k = Math.min(this.compact ? 1.6 : 2.2, Math.max(0.04, Math.min((width - pad * 2) / Math.max(1, x1 - x0), (height - pad * 2) / Math.max(1, y1 - y0))));
    const target = { k, x: this.inset.left + width / 2 - ((x0 + x1) / 2) * k, y: this.inset.top + height / 2 - ((y0 + y1) / 2) * k };
    if (now || this.reduced) {
      this.view = target;
      return false;
    }
    const ease = 0.14;
    this.view = { k: this.view.k + (target.k - this.view.k) * ease, x: this.view.x + (target.x - this.view.x) * ease, y: this.view.y + (target.y - this.view.y) * ease };
    return Math.abs(target.k - this.view.k) / target.k > 0.002 || Math.abs(target.x - this.view.x) > 0.5 || Math.abs(target.y - this.view.y) > 0.5;
  }

  private radius(node: SimNode) {
    return (this.compact ? 4.5 : 3.2) + Math.sqrt(node.degree) * (this.compact ? 1.3 : 1.15) + (node.kind === "deck" ? 1.5 : 0);
  }

  private hit(sx: number, sy: number): number {
    const { k, x, y } = this.view;
    const wx = (sx - x) / k, wy = (sy - y) / k;
    let best = -1, bestDistance = Infinity;
    this.nodes.forEach((node, i) => {
      const r = Math.max(this.radius(node), 3 / k) + 4 / k;
      const d = Math.hypot(node.x - wx, node.y - wy);
      if (d <= r && d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    });
    return best;
  }

  /* ── Ritningen ── */

  draw() {
    const { ctx, dpr } = this;
    const { k, x, y } = this.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * x, dpr * y);

    // Det som lyfts fram: pekarens nod och grannar, annars sökträffarna.
    let active: Set<number> | null = null;
    if (this.hover >= 0) active = new Set([this.hover, ...this.neighbors[this.hover]]);
    else if (this.highlight && this.highlight.size) active = this.highlight;

    ctx.lineWidth = 0.9 / k;
    ctx.strokeStyle = INK;
    ctx.globalAlpha = active ? 0.05 : this.compact ? 0.22 : 0.13;
    ctx.beginPath();
    for (const link of this.links) {
      if (active && (active.has(link.s) && active.has(link.t)) && (this.hover < 0 || link.s === this.hover || link.t === this.hover)) continue;
      const s = this.nodes[link.s], t = this.nodes[link.t];
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
    }
    ctx.stroke();
    if (active) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = this.hover >= 0 ? ACCENT : INK;
      ctx.lineWidth = 1.3 / k;
      ctx.beginPath();
      for (const link of this.links) {
        if (!(active.has(link.s) && active.has(link.t))) continue;
        if (this.hover >= 0 && link.s !== this.hover && link.t !== this.hover) continue;
        const s = this.nodes[link.s], t = this.nodes[link.t];
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
      }
      ctx.stroke();
    }

    this.nodes.forEach((node, i) => {
      const r = Math.max(this.radius(node), 2.2 / k);
      ctx.globalAlpha = active && !active.has(i) ? 0.16 : 1;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      if (node.kind === "deck") ctx.rect(node.x - r, node.y - r, r * 2, r * 2);
      else ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (i === this.focus || i === this.hover) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = i === this.hover ? ACCENT : INK;
        ctx.lineWidth = 1.6 / k;
        ctx.beginPath();
        if (node.kind === "deck") ctx.rect(node.x - r - 3 / k, node.y - r - 3 / k, (r + 3 / k) * 2, (r + 3 / k) * 2);
        else ctx.arc(node.x, node.y, r + 3 / k, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    this.drawLabels(active);
  }

  private drawLabels(active: Set<number> | null) {
    const { ctx } = this;
    const { k, x, y } = this.view;
    const size = this.compact ? 11 : 12;
    // Vilka etiketter som får plats: viktigast först, inga överlapp på skärmen.
    const wanted: { i: number; priority: number }[] = [];
    this.nodes.forEach((node, i) => {
      const sx = node.x * k + x, sy = node.y * k + y;
      if (sx < -80 || sy < -20 || sx > this.width + 80 || sy > this.height + 30) return;
      let priority = -1;
      if (i === this.hover) priority = 1000;
      else if (i === this.focus) priority = 900;
      else if (active?.has(i)) priority = 500 + node.degree;
      else if (this.compact) priority = 100 + node.degree;
      else if (!active && (k >= 2.4 || (k >= 1.4 && node.degree >= 3) || (k >= 0.8 && node.degree >= 12) || (node.kind === "deck" && k >= 1))) priority = node.degree;
      else if (!active && this.hubs.has(i)) priority = 50 + node.degree;
      if (priority >= 0) wanted.push({ i, priority });
    });
    wanted.sort((a, b) => b.priority - a.priority);
    const placed: [number, number, number, number][] = [];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineJoin = "round";
    for (const { i } of wanted.slice(0, 160)) {
      const node = this.nodes[i];
      const bold = i === this.hover || i === this.focus || node.kind === "deck";
      ctx.font = `${bold ? 600 : 400} ${size}px ${this.font}`;
      const max = this.compact && i !== this.hover ? 30 : 44;
      const label = node.label.length > max ? `${node.label.slice(0, max - 2).trimEnd()}…` : node.label;
      const w = ctx.measureText(label).width;
      const sx = node.x * k + x, sy = node.y * k + y + Math.max(this.radius(node) * k, 2.2) + 3;
      const box: [number, number, number, number] = [sx - w / 2 - 2, sy - 1, sx + w / 2 + 2, sy + size + 2];
      if (i !== this.hover && placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      ctx.globalAlpha = active && !active.has(i) && i !== this.hover ? 0.35 : 1;
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 3.5;
      ctx.strokeText(label, sx, sy);
      ctx.fillStyle = i === this.hover ? ACCENT : bold ? INK : MUTED;
      ctx.fillText(label, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  /* ── Pekaren ── */

  private point(event: PointerEvent | WheelEvent | MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { sx: event.clientX - rect.left, sy: event.clientY - rect.top };
  }

  pointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    const { sx, sy } = this.point(event);
    const index = this.hit(sx, sy);
    this.canvas.setPointerCapture(event.pointerId);
    if (index >= 0) {
      const node = this.nodes[index];
      node.fx = node.x;
      node.fy = node.y;
      this.drag = { index, startX: sx, startY: sy, moved: false };
      this.alphaTarget = 0.25;
      this.start();
    } else {
      this.pan = { x: sx, y: sy };
      this.canvas.style.cursor = "grabbing";
    }
  }

  pointerMove(event: PointerEvent) {
    const { sx, sy } = this.point(event);
    if (this.drag) {
      if (Math.hypot(sx - this.drag.startX, sy - this.drag.startY) > 4) this.drag.moved = true;
      if (!this.drag.moved) return;
      const node = this.nodes[this.drag.index];
      node.fx = (sx - this.view.x) / this.view.k;
      node.fy = (sy - this.view.y) / this.view.k;
      this.autoFit = false;
      return;
    }
    if (this.pan) {
      this.view.x += sx - this.pan.x;
      this.view.y += sy - this.pan.y;
      this.pan = { x: sx, y: sy };
      this.autoFit = false;
      this.draw();
      return;
    }
    const index = this.hit(sx, sy);
    if (index !== this.hover) {
      this.hover = index;
      this.canvas.style.cursor = index >= 0 ? "pointer" : "grab";
      this.canvas.title = index >= 0 ? this.nodes[index].label : "";
      this.draw();
    }
  }

  pointerUp() {
    if (this.drag) {
      const { index, moved } = this.drag;
      const node = this.nodes[index];
      this.drag = null;
      this.alphaTarget = 0;
      if (!(this.compact && index === this.focus)) {
        node.fx = null;
        node.fy = null;
      }
      if (!moved) this.onOpen(node.id);
      return;
    }
    if (this.pan) {
      this.pan = null;
      this.canvas.style.cursor = this.hover >= 0 ? "pointer" : "grab";
    }
  }

  pointerLeave() {
    if (this.drag || this.pan) return;
    if (this.hover !== -1) {
      this.hover = -1;
      this.draw();
    }
  }

  wheel(event: WheelEvent) {
    event.preventDefault();
    const { sx, sy } = this.point(event);
    const { k, x, y } = this.view;
    const next = Math.min(8, Math.max(0.03, k * Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0016))));
    this.view = { k: next, x: sx - (sx - x) * (next / k), y: sy - (sy - y) * (next / k) };
    this.autoFit = false;
    this.draw();
  }

  refit() {
    this.autoFit = true;
    this.start();
  }
}

export function Graph({
  nodes,
  edges,
  focus = null,
  highlight = null,
  compact = false,
  insetLeft = 0,
  onOpen,
  className,
  label,
}: {
  nodes: GraphNode[];
  edges: [string, string][];
  focus?: string | null;
  /** Noder som ska lyftas fram (sökträffar); resten dämpas. */
  highlight?: Set<string> | null;
  compact?: boolean;
  /** Bildpunkter till vänster som täcks av något annat (förklaringen); grafen passas in bredvid. */
  insetLeft?: number;
  onOpen: (id: string) => void;
  className?: string;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const open = useRef(onOpen);

  useEffect(() => {
    open.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    const element = canvas.current!;
    const instance = new Engine(element, compact, id => open.current(id));
    engine.current = instance;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      instance.resize(rect.width, rect.height);
    });
    observer.observe(box.current!);
    const down = (event: PointerEvent) => instance.pointerDown(event);
    const move = (event: PointerEvent) => instance.pointerMove(event);
    const up = () => instance.pointerUp();
    const leave = () => instance.pointerLeave();
    const wheel = (event: WheelEvent) => instance.wheel(event);
    const dbl = () => instance.refit();
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("wheel", wheel, { passive: false });
    element.addEventListener("dblclick", dbl);
    return () => {
      observer.disconnect();
      instance.stop();
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("wheel", wheel);
      element.removeEventListener("dblclick", dbl);
      engine.current = null;
    };
  }, [compact]);

  useEffect(() => {
    engine.current?.setInset(insetLeft, 0);
  }, [insetLeft]);

  useEffect(() => {
    engine.current?.setData(nodes, edges, focus);
  }, [nodes, edges, focus]);

  useEffect(() => {
    engine.current?.setHighlight(highlight);
  }, [highlight]);

  return (
    // Ytan får sin plats och storlek av klassen (className); duken fyller den.
    <div ref={box} className={className} style={{ overflow: "hidden" }}>
      <canvas ref={canvas} role="img" aria-label={label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "grab", touchAction: "none" }} />
    </div>
  );
}
