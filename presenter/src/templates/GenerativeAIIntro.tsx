"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";
import { unwrapLazy } from "@/lib/extract-text";

interface MusicTrack {
  src: string;
  title: string;
}

interface OutputItem {
  /** Bild-URL. Default-renderingen om inget annat anges. */
  src?: string;
  /** Video-URL. Renderas som auto-loopande, ljudlös video. Vinner över src. */
  videoSrc?: string;
  /** Sätt till "music" för att rendera en interaktiv musikspelare med tracks. */
  kind?: "music";
  /** Låtar (krävs när kind === "music"). */
  tracks?: MusicTrack[];
  /** Etikett, t.ex. "Bild" / "Låt" / "Video" / "Kod". */
  label: string;
  /** Fallback-emoji om varken src, videoSrc eller tracks finns. */
  emoji?: string;
  /**
   * Egen prompt för denna output. Om minst en output har en prompt går
   * sliden i "cycling-mode" — prompten typas om för varje step (space) och
   * matchande output highlightas.
   */
  prompt?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

/**
 * Parsar MDX-list-children till OutputItem[]. Format per rad:
 *
 *   image · /path/to.png · Bild
 *   video · /path/to.mp4 · Video
 *   music · /a.mp3=Låt 1; /b.mp3=Låt 2; /c.mp3=Låt 3 · Låt
 *   emoji · 🤖 · Kod
 *
 * Format: kind · data · label
 * För music delas data:n med ; och varje låt med = (src=title).
 */
function parseChildrenItems(children: ReactNode): OutputItem[] {
  const out: OutputItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      const liEl = li as ReactElement<{ children?: ReactNode }>;
      const text = extractText(liEl.props.children).trim();
      if (!text) return;
      const parts = text.split("·").map((s) => s.trim());
      if (parts.length < 3) return;
      const [kind, data, label, ...rest] = parts;
      // Optional 4:e segment (eller fler, joinas) = prompt för denna output
      const promptText = rest.length > 0 ? rest.join(" · ").trim() : undefined;
      const k = kind.toLowerCase();
      if (k === "music") {
        const tracks = data
          .split(";")
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => {
            const [src, title] = t.split("=").map((s) => s.trim());
            return { src, title: title ?? src };
          });
        out.push({ kind: "music", tracks, label, prompt: promptText });
      } else if (k === "video") {
        out.push({ videoSrc: data, label, prompt: promptText });
      } else if (k === "image" || k === "bild") {
        out.push({ src: data, label, prompt: promptText });
      } else if (k === "emoji") {
        out.push({ emoji: data, label, prompt: promptText });
      }
    });
  });
  return out;
}

interface GenerativeAIIntroProps {
  title?: string;
  subtitle?: string;
  prompt?: string;
  /**
   * 4 output-rutor. Föredra children-baserad list-syntax i MDX (se nedan)
   * eftersom MDX-parsern inte hanterar komplexa array-prop:ar bra.
   */
  outputs?: OutputItem[];
  /**
   * MDX list-children — alternativ till outputs-prop:en. Format per rad:
   *
   *   - image · /path/to.png · Bild
   *   - video · /path/to.mp4 · Video
   *   - music · /a.mp3=Låt 1; /b.mp3=Låt 2 · Låt
   *   - emoji · 🤖 · Kod
   */
  children?: ReactNode;
  bottomLine?: string;
  /** Skriv-hastighet för prompt-text (ms per tecken). */
  typingSpeed?: number;
  /** Sender-namn över pratbubblan. Default "Du". */
  sender?: string;
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
}

const DEFAULT_OUTPUTS: OutputItem[] = [
  { label: "Bild", emoji: "🖼️" },
  { label: "Låt", emoji: "🎵" },
  { label: "Video", emoji: "🎬" },
  { label: "Kod", emoji: "</>" },
];

/**
 * Begreppsslide: vad är generativ AI?
 *
 * Visuella effekter (offset-skuggor, chunky borders, riso-noise, ornament)
 * styrs via temat. På memphis_riso blir det fullt utbyggt; på andra teman
 * (konjak, minimal etc.) faller alla dekorationer bort
 * automatiskt — också vid M-knapp-byte under en presentation.
 */
export function GenerativeAIIntro({
  title = "Generativ AI",
  subtitle = "Den nya sortens AI som skapar.",
  prompt = "rita en T-rex som åker skate på månen",
  outputs,
  children,
  bottomLine = "Förr: man fick koda. Nu: man pratar.",
  typingSpeed = 38,
  sender = "Du",
  background,
  overlay,
  overlayMode = "light",
}: GenerativeAIIntroProps) {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState("");

  // Bygg outputs i ordning: explicit prop → children-list → defaults.
  // MDX hanterar inte komplexa array-prop:ar bra, så children är den
  // primära vägen i MDX-filer.
  let outs: OutputItem[];
  if (Array.isArray(outputs) && outputs.length > 0) {
    outs = [...outputs];
  } else {
    const fromChildren = parseChildrenItems(children);
    outs = fromChildren.length > 0 ? fromChildren : [...DEFAULT_OUTPUTS];
  }
  while (outs.length < 4) outs.push(DEFAULT_OUTPUTS[outs.length]);
  const visibleOuts = outs.slice(0, 4);

  // Cycling-mode aktiveras om någon output har en prompt-string. Då byts
  // prompt-bubblan vid varje space-tryck, och matchande output highlightas.
  const promptsPerStep = visibleOuts
    .map((o) => o.prompt)
    .filter((p): p is string => Boolean(p));
  const isCycling = promptsPerStep.length > 0;
  const stepCount = isCycling ? promptsPerStep.length : 1;
  const step = useSlideSteps(stepCount);
  const activePromptIdx = isCycling
    ? Math.min(step, promptsPerStep.length - 1)
    : -1;
  const activePrompt = isCycling ? promptsPerStep[activePromptIdx] : prompt;

  // Vilken output:s prompt motsvarar aktivt steg? Beräkna originalindex.
  let activeOutputIdx = -1;
  if (isCycling) {
    let count = 0;
    for (let i = 0; i < visibleOuts.length; i++) {
      if (visibleOuts[i].prompt) {
        if (count === activePromptIdx) {
          activeOutputIdx = i;
          break;
        }
        count++;
      }
    }
  }

  useEffect(() => {
    if (reduce) {
      setTyped(activePrompt);
      return;
    }
    setTyped("");
    let i = 0;
    const t = setInterval(() => {
      if (i >= activePrompt.length) {
        clearInterval(t);
        return;
      }
      i++;
      setTyped(activePrompt.slice(0, i));
    }, typingSpeed);
    return () => clearInterval(t);
  }, [activePrompt, typingSpeed, reduce]);

  const promptDoneAt = (activePrompt.length * typingSpeed) / 1000;

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="card" />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-14">
        <div className="mb-6 lg:mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            className="leading-[0.92] tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(3rem, 7.5vw, 7.5rem)",
              color: "var(--text)",
              textShadow: "var(--title-shadow, none)",
            }}
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-3"
            style={{
              fontSize: "clamp(1.1rem, 1.8vw, 1.6rem)",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {subtitle}
          </motion.p>
        </div>

        <div className="grid flex-1 grid-cols-12 items-center gap-6 lg:gap-10">
          <div className="col-span-5 flex flex-col items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-3 inline-flex items-center gap-2 px-3 py-1"
              style={{ color: "var(--text-muted)" }}
            >
              <span
                className="text-[clamp(0.7rem,0.95vw,1rem)] font-mono uppercase tracking-[0.2em]"
              >
                {sender}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className="relative"
              style={{
                background: "var(--bg-surface)",
                border: "var(--card-border, 1px solid var(--text-muted))",
                borderRadius: "var(--radius)",
                padding: "clamp(1.2rem, 2vw, 2rem)",
                boxShadow: "var(--card-shadow, 0 4px 16px rgba(0,0,0,0.08))",
                fontSize: "clamp(1.05rem, 1.9vw, 1.85rem)",
                fontWeight: 500,
                lineHeight: 1.35,
                color: "var(--text)",
                width: "100%",
              }}
            >
              <span>&quot;{typed}</span>
              {!reduce && typed.length < activePrompt.length && (
                <motion.span
                  className="ml-[2px] inline-block"
                  style={{
                    width: "0.55em",
                    height: "1.05em",
                    background: "var(--text)",
                    verticalAlign: "text-bottom",
                  }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}
              {typed.length >= activePrompt.length && <span>&quot;</span>}

              {/* Pratbubble-tail — synlig bara på memphis_riso (gated via class) */}
              <svg
                className="memphis-bubble-tail absolute"
                style={{ left: "1.5rem", bottom: "-18px" }}
                width="32"
                height="20"
                viewBox="0 0 32 20"
                aria-hidden
              >
                <path
                  d="M 4 0 L 28 0 L 8 18 Z"
                  fill="var(--bg-surface)"
                  stroke="var(--text)"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </div>

          <div className="col-span-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: promptDoneAt + 0.1 }}
              style={{ color: "var(--text)" }}
            >
              <svg
                width="80"
                height="40"
                viewBox="0 0 80 40"
                style={{ width: "clamp(40px, 5vw, 80px)" }}
                aria-hidden
              >
                <motion.line
                  x1="4"
                  y1="20"
                  x2="60"
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: promptDoneAt + 0.15 }}
                />
                <motion.polyline
                  points="50,8 70,20 50,32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: promptDoneAt + 0.5 }}
                />
              </svg>
            </motion.div>
          </div>

          <div className="col-span-6 grid grid-cols-2 gap-4 lg:gap-6">
            {visibleOuts.map((item, i) => (
              <OutputBox
                key={i}
                item={item}
                index={i}
                delay={promptDoneAt + 0.6 + i * 0.18}
                reduce={!!reduce}
                active={!isCycling || activeOutputIdx === i}
              />
            ))}
          </div>
        </div>

        {bottomLine && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: promptDoneAt + 1.5,
              ease: "easeOut",
            }}
            className="mt-8 flex items-center justify-center"
          >
            <div
              className="px-6 py-3"
              style={{
                fontSize: "clamp(1.1rem, 1.7vw, 1.6rem)",
                fontWeight: 600,
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function OutputBox({
  item,
  index,
  delay,
  reduce,
  active = true,
}: {
  item: OutputItem;
  index: number;
  delay: number;
  reduce: boolean;
  active?: boolean;
}) {
  const shadowVar = index % 2 === 0 ? "--card-shadow" : "--card-shadow-alt";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotate: -3 }}
      animate={{
        opacity: active ? 1 : 0.32,
        scale: active ? 1 : 0.94,
        rotate: 0,
        filter: active ? "saturate(1)" : "saturate(0.4)",
      }}
      transition={{
        duration: 0.55,
        delay: reduce ? 0 : delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="relative aspect-[4/3] overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "var(--card-border, 1px solid var(--text-muted))",
        borderRadius: "var(--radius)",
        boxShadow: `var(${shadowVar}, 0 4px 16px rgba(0,0,0,0.08))`,
      }}
    >
      {/* Inre content beroende på typ */}
      {item.kind === "music" && item.tracks && item.tracks.length > 0 ? (
        <MusicPlayer tracks={item.tracks} />
      ) : item.videoSrc ? (
        <video
          src={item.videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : item.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.label}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="select-none"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              filter: "saturate(1.1)",
              fontFamily: 'var(--font-display)',
            }}
          >
            {item.emoji ?? "?"}
          </span>
        </div>
      )}

      {/* Etikett-pill nere vänster */}
      <div
        className="absolute left-2 bottom-2 z-10"
        style={{
          background: "var(--text)",
          color: "var(--bg)",
          padding: "0.3rem 0.7rem",
          borderRadius: "999px",
          fontSize: "clamp(0.7rem, 0.95vw, 1rem)",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {item.label}
      </div>
    </motion.div>
  );
}

/**
 * Mini-musikspelare för "Låt"-rutan.
 *
 * - Play/pause-knapp i mitten
 * - Nästa/föregående mellan tracks
 * - Track-titel + nummer (1/3 etc.)
 * - 7 ljudvågsstaplar som reagerar på riktigt ljud via Web Audio API:s
 *   AnalyserNode (när användaren klickat på play).
 *
 * Audio-element är muterat tills användaren klickar — webbläsare blockerar
 * autoplay med ljud annars. Pausad = bars frusna; playande = bars pulserar.
 */
function MusicPlayer({ tracks }: { tracks: MusicTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bars, setBars] = useState<number[]>(() => Array(7).fill(0.15));

  const current = tracks[trackIdx];

  // Initiera Web Audio Analyser första gången användaren klickar på play
  function ensureAnalyser() {
    if (!audioRef.current) return;
    if (audioCtxRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const src = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = src;
    } catch {
      // Web Audio API saknas eller har redan setup:ats — kör vidare
      // utan reaktiva bars.
    }
  }

  // Animation-loop som läser frekvensdata från Analyser och uppdaterar bars
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Frys bars i lågt läge när pausad
      setBars((prev) => prev.map((v) => Math.max(0.1, v * 0.6)));
      return;
    }
    function tick() {
      const an = analyserRef.current;
      if (an) {
        const data = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(data);
        // Sampla 7 bins jämt fördelat
        const next = Array.from({ length: 7 }, (_, i) => {
          const idx = Math.floor(((i + 1) / 8) * data.length);
          return Math.max(0.12, Math.min(1, data[idx] / 220));
        });
        setBars(next);
      } else {
        // Fallback: pseudo-random pulserande
        setBars((prev) =>
          prev.map((_, i) => 0.2 + 0.7 * Math.abs(Math.sin(Date.now() / 220 + i)))
        );
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing]);

  // Stoppa Web Audio context när komponenten avmonteras
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      ensureAnalyser();
      audioCtxRef.current?.resume().catch(() => {});
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  function changeTrack(delta: number) {
    const next = (trackIdx + delta + tracks.length) % tracks.length;
    setTrackIdx(next);
    // Pausa under bytet; nästa play() startar nya tracken
    audioRef.current?.pause();
    setPlaying(false);
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between p-3"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg) 100%)",
      }}
    >
      <audio
        ref={audioRef}
        src={current.src}
        preload="metadata"
        onEnded={() => changeTrack(1)}
      />

      {/* Track-info uppe */}
      <div className="flex w-full items-center justify-between text-[clamp(0.6rem,0.85vw,0.85rem)]">
        <span
          className="font-mono uppercase tracking-[0.15em]"
          style={{ color: "var(--text-muted)" }}
        >
          {trackIdx + 1}/{tracks.length}
        </span>
        <span
          className="truncate text-right font-medium"
          style={{ color: "var(--text)", maxWidth: "70%" }}
        >
          {current.title}
        </span>
      </div>

      {/* Mitten: ljudvågor + play-knapp */}
      <div className="flex w-full flex-1 items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => changeTrack(-1)}
          aria-label="Föregående låt"
          className="flex shrink-0 items-center justify-center transition hover:scale-110"
          style={{
            width: "clamp(1.6rem, 2.4vw, 2.4rem)",
            aspectRatio: "1",
            background: "transparent",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M6 5h2v14H6zM10 12l9-7v14z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pausa" : "Spela"}
          className="flex shrink-0 items-center justify-center transition active:scale-95"
          style={{
            width: "clamp(2.4rem, 3.6vw, 3.6rem)",
            aspectRatio: "1",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "var(--bg-surface)",
            border: "var(--card-border, 2px solid var(--text))",
            boxShadow: "var(--card-shadow, 0 3px 10px rgba(0,0,0,0.15))",
            cursor: "pointer",
          }}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="40%" height="40%">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              width="42%"
              height="42%"
              style={{ marginLeft: "8%" }}
            >
              <path d="M6 4l14 8-14 8z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => changeTrack(1)}
          aria-label="Nästa låt"
          className="flex shrink-0 items-center justify-center transition hover:scale-110"
          style={{
            width: "clamp(1.6rem, 2.4vw, 2.4rem)",
            aspectRatio: "1",
            background: "transparent",
            border: "none",
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
            <path d="M16 5h2v14h-2zM5 5l9 7-9 7z" />
          </svg>
        </button>
      </div>

      {/* Audio-bars nere */}
      <div
        className="flex w-full items-end justify-center gap-[3px]"
        style={{ height: "clamp(18px, 2.6vw, 32px)" }}
        aria-hidden
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              width: "clamp(3px, 0.5vw, 6px)",
              height: `${Math.max(8, h * 100)}%`,
              background: i % 2 === 0 ? "var(--accent)" : "var(--ornament-color)",
              borderRadius: "2px",
              transition: "height 90ms ease-out",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default GenerativeAIIntro;
