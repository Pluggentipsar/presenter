"use client";

import { useEffect, useRef } from "react";

/**
 * ParticleText — text som materialiseras ur ett partikelmoln.
 *
 * Målordens form läses ur en offscreen-canvas: texten ritas, pixlarna
 * samplas, och varje träffad pixel blir en målpunkt. Partiklarna föds
 * utspridda i en ring (där de tidigare orden stod) och flyger in mot sina
 * målpunkter med individuell fördröjning, så bokstäverna växer fram i
 * stället för att tändas på en gång.
 *
 * Effekten finns för att en övergång mellan två påståenden ska kännas som
 * att det ena BLIR det andra — inte som att det ena tar slut och det andra
 * börjar. Därför spawnar partiklarna på den radie där föregående slide-steg
 * hade sina ord.
 *
 * Canvas, inte DOM: en formulering på trettio tecken ger några tusen
 * partiklar, och lika många absolutpositionerade element hade lagt sig som
 * en våt filt över bildrutan.
 */

interface ParticleTextProps {
  /** Texten som ska formas. Radbrytning med \n. */
  text: string;
  /** Startar formationen. Falskt = ingenting ritas. */
  active: boolean;
  /** Partikelfärg. Accepterar CSS-färg; löses ut mot temat vid uppstart. */
  color?: string;
  /** Andel av bredden som texten får ta. Default 0.78. */
  widthRatio?: number;
  /** Radie i px där partiklarna föds — matcha föregående stegs orbital. */
  spawnRadius?: number;
  /** Sekunder innan formationen börjar, så upplösningen hinner läsas först. */
  delay?: number;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Egen fördröjning i sekunder — ger texten ett växande förlopp. */
  delay: number;
  /** Individuell insvängningshastighet. */
  ease: number;
  size: number;
  alpha: number;
  /** Fas för den lilla andningsrörelsen efter landning. */
  phase: number;
}

/**
 * Samplingstäthet. Var tredje pixel ger runt 12 000 partiklar på en
 * payoff-mening. Uppmätt kostnad för att rita dem: ~3 ms per bildruta av
 * en budget på 16,7 — tätheten är alltså gratis, och tätare bokstäver
 * läses bättre på avstånd i en sal.
 */
const SAMPLE_STEP = 3;
/** Under det här alfat räknas pixeln som tom. */
const ALPHA_CUTOFF = 128;
/** Fler rader än så gör en payoff-mening till ett stycke. */
const MAX_LINES = 3;
const LINE_HEIGHT = 1.16;

/**
 * Bryt texten och välj den största typgrad som ryms.
 *
 * Radbrytningen är automatisk med flit. Presentationerna passerar
 * parseMdx → serializeComponent innan MDX kompilerar dem, och parsern
 * avescapar bara \" — ett \n i en prop överlever alltså inte som radbrytning
 * utan som två synliga tecken. I stället för att be Joel hålla reda på det
 * provar vi en, två och tre rader och behåller den som ger störst text.
 */
function layoutLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  maxWidth: number,
  maxHeight: number,
): { lines: string[]; fontSize: number } {
  // Explicita radbrytningar respekteras — även om de kom fram som "\n".
  const explicit = text.split(/\r?\n|\\n/).map((s) => s.trim()).filter(Boolean);
  const words = explicit.join(" ").split(/\s+/);

  const REF = 100;
  ctx.font = `700 ${REF}px ${family}`;
  const widthOf = (s: string) => ctx.measureText(s).width;

  const candidates: Array<{ lines: string[]; fontSize: number }> = [];

  const evaluate = (lines: string[]) => {
    const widest = Math.max(...lines.map(widthOf));
    if (widest <= 0) return;
    const byWidth = (maxWidth / widest) * REF;
    const byHeight = maxHeight / (lines.length * LINE_HEIGHT);
    candidates.push({ lines, fontSize: Math.min(byWidth, byHeight) });
  };

  if (explicit.length > 1) {
    evaluate(explicit);
  } else {
    for (let n = 1; n <= Math.min(MAX_LINES, words.length); n++) {
      // Balanserad brytning: sikta på lika breda rader i stället för att
      // fylla uppifrån, annars blir sista raden ett ensamt ord.
      const target = widthOf(words.join(" ")) / n;
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        const roomLeft = n - lines.length > 1;
        if (current && roomLeft && widthOf(next) > target * 1.06) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      }
      if (current) lines.push(current);
      if (lines.length === n) evaluate(lines);
    }
  }

  if (candidates.length === 0) return { lines: words, fontSize: 48 };
  return candidates.reduce((best, c) => (c.fontSize > best.fontSize ? c : best));
}

export function ParticleText({
  text,
  active,
  color = "var(--accent)",
  widthRatio = 0.78,
  spawnRadius = 440,
  delay = 0.55,
}: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const activeRef = useRef(active);

  // Ritloopen lever i en effekt och får inte startas om när `active` växlar —
  // partiklarnas positioner skulle nollställas mitt i formationen. Därför
  // läses flaggan genom en ref, som synkas här i stället för under render.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let cancelled = false;

    const build = () => {
      if (cancelled) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // Färgen och typsnittet bor i CSS-variabler på temat. Vi läser ut de
      // uträknade värdena från wrappern i stället för att duplicera dem här.
      const cs = getComputedStyle(wrap);
      const resolvedColor = cs.color;
      const family = cs.fontFamily || "serif";

      // Rita målordet i en offscreen-canvas och läs ut var bläcket hamnade.
      const off = document.createElement("canvas");
      off.width = Math.round(rect.width);
      off.height = Math.round(rect.height);
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;

      const maxWidth = rect.width * widthRatio;
      const maxHeight = rect.height * 0.62;
      const { lines, fontSize } = layoutLines(octx, text, family, maxWidth, maxHeight);

      octx.clearRect(0, 0, off.width, off.height);
      octx.fillStyle = "#fff";
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.font = `700 ${fontSize}px ${family}`;
      const lineHeight = fontSize * LINE_HEIGHT;
      const blockTop = rect.height / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        octx.fillText(line, rect.width / 2, blockTop + i * lineHeight);
      });

      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const targets: Array<[number, number]> = [];
      for (let y = 0; y < off.height; y += SAMPLE_STEP) {
        for (let x = 0; x < off.width; x += SAMPLE_STEP) {
          if (data[(y * off.width + x) * 4 + 3] > ALPHA_CUTOFF) targets.push([x, y]);
        }
      }

      const cx = rect.width / 2;
      const cy = rect.height / 2;
      // Deterministisk pseudoslump: samma uppställning varje gång sliden
      // visas, så en repeterad genomgång ser likadan ut.
      const rnd = (n: number) => {
        const s = Math.sin(n * 12.9898) * 43758.5453;
        return s - Math.floor(s);
      };

      particlesRef.current = targets.map(([tx, ty], i) => {
        // Föds på ringen där föregående stegs ord stod — plus en del i
        // mitten, där det stora ordet satt.
        const fromCenter = rnd(i * 3.1) < 0.22;
        const angle = rnd(i) * Math.PI * 2;
        const radius = fromCenter
          ? rnd(i * 7.7) * spawnRadius * 0.22
          : spawnRadius * (0.72 + rnd(i * 5.3) * 0.5);
        return {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius * 0.72,
          tx,
          ty,
          // Fördröjningen följer x-led, så texten skrivs fram från vänster.
          delay: (tx / rect.width) * 0.5 + rnd(i * 2.7) * 0.35,
          ease: 0.045 + rnd(i * 1.9) * 0.05,
          size: 1.1 + rnd(i * 4.4) * 1.1,
          alpha: 0,
          phase: rnd(i * 8.1) * Math.PI * 2,
        };
      });

      ctx.clearRect(0, 0, rect.width, rect.height);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const draw = (ts: number) => {
        if (cancelled) return;
        if (!activeRef.current) {
          ctx.clearRect(0, 0, rect.width, rect.height);
          startRef.current = null;
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
        if (startRef.current == null) startRef.current = ts;
        const t = (ts - startRef.current) / 1000 - delay;

        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = resolvedColor;

        for (const p of particlesRef.current) {
          const local = t - p.delay;
          if (local <= 0 && !reduced) continue;

          if (reduced) {
            p.x = p.tx;
            p.y = p.ty;
            p.alpha = 1;
          } else {
            p.alpha = Math.min(1, p.alpha + 0.06);
            p.x += (p.tx - p.x) * p.ease;
            p.y += (p.ty - p.y) * p.ease;
            // Landade partiklar andas svagt, annars ser texten död ut.
            const settled = Math.abs(p.tx - p.x) < 1 && Math.abs(p.ty - p.y) < 1;
            if (settled) {
              p.x = p.tx + Math.sin(ts / 900 + p.phase) * 0.7;
              p.y = p.ty + Math.cos(ts / 1100 + p.phase) * 0.7;
            }
          }

          // fillRect, inte arc+fill. Skillnaden är liten (uppmätt 1,1x), men
          // gratis: vid två till fyra pixlar går en fyrkant inte att skilja
          // från en cirkel.
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }
        ctx.globalAlpha = 1;
        rafRef.current = requestAnimationFrame(draw);
      };

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    // Typsnittet måste vara laddat innan vi mäter, annars samplar vi
    // fallback-fontens form och bokstäverna hoppar när det riktiga kommer.
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();

    const ro = new ResizeObserver(build);
    ro.observe(wrap);

    return () => {
      cancelled = true;
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [text, widthRatio, spawnRadius, delay]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "absolute",
        inset: 0,
        color,
        fontFamily: "var(--font-display)",
        pointerEvents: "none",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
      {/* Texten finns i DOM:en också — för skärmläsare, miniatyrer och sök. */}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
        }}
      >
        {text.replace(/\r?\n|\\n/g, " ")}
      </span>
    </div>
  );
}
