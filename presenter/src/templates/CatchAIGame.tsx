"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";

interface CatchAIGameProps {
  /** Eyebrow uppe i hörnet, t.ex. "§ A · Krok · Spelet". */
  eyebrow?: string;
  /** Ord som INNEHÅLLER AI — comma-separerad lista. */
  aiWords?: string;
  /** Ord som INTE innehåller AI — comma-separerad lista. */
  nonAiWords?: string;
  /** Rundans längd i sekunder. Default 40. */
  duration?: number;
  /** Hur fort orden faller (px/sek). Default 200. */
  fallSpeed?: number;
  /** Hur ofta nya ord dyker upp (ms). Default 1200. */
  spawnInterval?: number;
  /** AI-detection-radius runt fingerspetsen (px). Default 90. */
  catchRadius?: number;
}



const DEFAULT_AI_WORDS =
  "TikTok, YouTube-rec, Instagram-rullar, Snap-filter, Snap My AI, ChatGPT, Gemini, Google Translate, Siri, Alexa, Roblox-fiende, Counter-Strike-bot, Spotify, Netflix-rec, Tesla autopilot, Bing-sök, Face ID, Auto-correct, Photos-ansikten, Discord-modering";
const DEFAULT_NON_AI_WORDS =
  "Penna, Bok, Sten, Blomma, Fotboll, Glass, Lampa, Cykel, Äpple, Nyckel, Spegel, Kossa, Hammare, Sko, Stol, Tröja, Banan, Cykelhjälm";

const MEDIAPIPE_WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type Phase = "idle" | "loading" | "playing" | "ended";
type Controller = "hand" | "mouse";

interface Word {
  id: number;
  text: string;
  isAI: boolean;
  xPct: number;
  y: number;
  vy: number;
  state: "falling" | "caught" | "missed";
  caughtAt: number;
}

interface GameState {
  phase: Phase;
  controller: Controller | null;
  words: Word[];
  score: number;
  hits: number;
  wrongs: number;
  totalAI: number;
  timeLeft: number;
  loadError: string | null;
}

type Action =
  | { type: "start"; controller: Controller }
  | { type: "set-loading" }
  | { type: "set-error"; message: string }
  | { type: "tick"; words: Word[]; timeLeft: number }
  | { type: "catch"; wordId: number; isAI: boolean }
  | { type: "spawn"; word: Word }
  | { type: "end" }
  | { type: "reset" };

const INITIAL_STATE: GameState = {
  phase: "idle",
  controller: null,
  words: [],
  score: 0,
  hits: 0,
  wrongs: 0,
  totalAI: 0,
  timeLeft: 0,
  loadError: null,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return {
        ...INITIAL_STATE,
        phase: "playing",
        controller: action.controller,
        timeLeft: state.timeLeft,
      };
    case "set-loading":
      return { ...state, phase: "loading", loadError: null };
    case "set-error":
      return { ...state, phase: "idle", loadError: action.message };
    case "tick":
      return { ...state, words: action.words, timeLeft: action.timeLeft };
    case "spawn":
      return {
        ...state,
        words: [...state.words, action.word],
        totalAI: action.word.isAI ? state.totalAI + 1 : state.totalAI,
      };
    case "catch": {
      const words = state.words.map((w) =>
        w.id === action.wordId
          ? { ...w, state: "caught" as const, caughtAt: performance.now() }
          : w
      );
      const isAI = action.isAI;
      return {
        ...state,
        words,
        score: state.score + (isAI ? 1 : -1),
        hits: state.hits + (isAI ? 1 : 0),
        wrongs: state.wrongs + (isAI ? 0 : 1),
      };
    }
    case "end":
      return { ...state, phase: "ended" };
    case "reset":
      return INITIAL_STATE;
    default:
      return state;
  }
}

function parseWordList(s: string | undefined, fallback: string): string[] {
  return (s ?? fallback)
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fånga-AI-spelet. Webbkamera + hand-tracking via MediaPipe; ord regnar ner
 * från toppen och spelaren rör handen för att fånga de som innehåller AI.
 *
 * Fallback: mus-styrning om kameran nekas eller MediaPipe inte kan ladda.
 *
 * Användning:
 * ```mdx
 * <CatchAIGame
 *   eyebrow="§ A · Krok · Spelet"
 *   duration={40}
 * />
 * ```
 *
 * Sätt `aiWords` och `nonAiWords` om du vill anpassa orden.
 */
export function CatchAIGame({
  eyebrow,
  aiWords,
  nonAiWords,
  duration = 40,
  fallSpeed = 200,
  spawnInterval = 1200,
  catchRadius = 130,
}: CatchAIGameProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    timeLeft: duration,
  });

  // Stabila refs så game-loopens useEffect inte rivs/byggs på varje render
  // (vilket nollställde spawn-timern och ledde till att inga ord ramlade).
  const aiPool = useMemo(
    () => parseWordList(aiWords, DEFAULT_AI_WORDS),
    [aiWords]
  );
  const nonAiPool = useMemo(
    () => parseWordList(nonAiWords, DEFAULT_NON_AI_WORDS),
    [nonAiWords]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const wordsRef = useRef<Word[]>([]);
  const timeStartRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const wordIdRef = useRef<number>(1);
  const phaseRef = useRef<Phase>("idle");

  // Sync phase to ref för läsning i RAF-loopen
  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);
  useEffect(() => {
    wordsRef.current = state.words;
  }, [state.words]);

  const stopGame = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch {}
      landmarkerRef.current = null;
    }
  }, []);

  // Cleanup vid unmount
  useEffect(() => {
    return () => stopGame();
  }, [stopGame]);

  // Mouse-tracking (alltid på under playing — stör inte hand-mode för det
  // skriver bara över pointer när hand inte är detekterad)
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (state.controller !== "mouse") return;
    const handler = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY, active: true };
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [state.phase, state.controller]);

  // Game loop
  useEffect(() => {
    if (state.phase !== "playing") return;

    timeStartRef.current = performance.now();
    lastSpawnRef.current = performance.now();
    wordIdRef.current = 1;
    let lastFrame = performance.now();
    // MediaPipe-inferens är dyr (10-50 ms, ibland >100 ms på enkla GPU:er)
    // och blockar main thread. Om vi kör den på varje RAF tappar word-
    // movementen frames — vilket visuellt ser ut som att orden blinkar.
    // Vi throttlar till ~25fps och backar av extra om förra inferensen var
    // ovanligt långsam.
    let lastInfer = 0;
    let lastInferDur = 0;

    const tick = async () => {
      const now = performance.now();
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;

      // Hand-tracking inferens — throttlad
      if (
        state.controller === "hand" &&
        landmarkerRef.current &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        const minGap = Math.max(40, lastInferDur * 1.5);
        if (now - lastInfer >= minGap) {
          const t0 = performance.now();
          try {
            const result = landmarkerRef.current.detectForVideo(
              videoRef.current,
              now
            );
            const container = containerRef.current;
            if (
              result.landmarks &&
              result.landmarks.length > 0 &&
              container
            ) {
              // Använd indexfinger-tippen (landmark 8) för båda händer; ta den
              // som är högst upp (mest "intentionell pekning").
              let best = result.landmarks[0][8];
              for (const hand of result.landmarks) {
                if (hand[8].y < best.y) best = hand[8];
              }
              const rect = container.getBoundingClientRect();
              // Spegla x eftersom videon är mirrored
              const x = rect.left + (1 - best.x) * rect.width;
              const y = rect.top + best.y * rect.height;
              pointerRef.current = { x, y, active: true };
            } else {
              pointerRef.current.active = false;
            }
          } catch {
            // Tysta fel — inferens kan ibland strula vid första frames
          }
          lastInferDur = performance.now() - t0;
          lastInfer = now;
        }
      }

      // Spawning
      if (now - lastSpawnRef.current >= spawnInterval) {
        lastSpawnRef.current = now;
        const isAI = Math.random() < 0.6; // 60% AI-ord (matar igen biaset)
        const text = pickRandom(isAI ? aiPool : nonAiPool);
        const newWord: Word = {
          id: wordIdRef.current++,
          text,
          isAI,
          xPct: 8 + Math.random() * 84,
          y: -60,
          vy: fallSpeed * (0.85 + Math.random() * 0.4),
          state: "falling",
          caughtAt: 0,
        };
        wordsRef.current = [...wordsRef.current, newWord];
        dispatch({ type: "spawn", word: newWord });
      }

      // Update word positions + collision
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const ptr = pointerRef.current;
        const updated: Word[] = [];

        for (const w of wordsRef.current) {
          if (w.state === "caught") {
            // Rensa caught efter 600ms
            if (now - w.caughtAt > 700) continue;
            updated.push(w);
            continue;
          }
          const ny = w.y + w.vy * dt;
          if (ny > rect.height + 80) {
            // missed - droppa från listan
            continue;
          }
          // Kollisionscheck
          let caught = false;
          if (ptr.active) {
            const wx = rect.left + (w.xPct / 100) * rect.width;
            const wy = rect.top + ny;
            const dx = ptr.x - wx;
            const dy = ptr.y - wy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < catchRadius) caught = true;
          }
          if (caught) {
            updated.push({
              ...w,
              y: ny,
              state: "caught",
              caughtAt: now,
            });
            dispatch({ type: "catch", wordId: w.id, isAI: w.isAI });
          } else {
            updated.push({ ...w, y: ny });
          }
        }
        wordsRef.current = updated;
      }

      // Tidskontroll
      const elapsed = (now - timeStartRef.current) / 1000;
      const left = Math.max(0, duration - elapsed);

      dispatch({ type: "tick", words: wordsRef.current, timeLeft: left });

      if (left <= 0) {
        dispatch({ type: "end" });
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    state.phase,
    state.controller,
    aiPool,
    nonAiPool,
    duration,
    fallSpeed,
    spawnInterval,
    catchRadius,
  ]);

  const startWithCamera = useCallback(async () => {
    dispatch({ type: "set-loading" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const { FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2,
      });
      landmarkerRef.current = handLandmarker;
      dispatch({ type: "start", controller: "hand" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch({
        type: "set-error",
        message: `Kunde inte starta kameran (${msg}). Du kan starta i mus-läge istället.`,
      });
    }
  }, []);

  const startWithMouse = useCallback(() => {
    dispatch({ type: "start", controller: "mouse" });
  }, []);

  const restart = useCallback(() => {
    stopGame();
    dispatch({ type: "reset" });
  }, [stopGame]);

  const totalAI = state.totalAI;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Webbkamera-bakgrund */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full"
        style={{
          objectFit: "cover",
          transform: "scaleX(-1)",
          opacity: state.controller === "hand" && state.phase !== "idle" ? 0.55 : 0,
          transition: "opacity 0.4s",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            state.controller === "hand"
              ? "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.65) 100%)"
              : "radial-gradient(ellipse at center, rgba(20,20,30,0.7) 0%, rgba(0,0,0,0.95) 80%)",
        }}
      />

      {/* Top HUD */}
      {state.phase === "playing" && (
        <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between p-8">
          <div className="flex flex-col">
            {eyebrow ? (
              <div
                className="text-xs uppercase"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.3em",
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <div
              className="mt-1 flex items-center gap-2"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: "white",
                lineHeight: 1,
              }}
            >
              <span style={{ color: "var(--accent)" }}>{state.score}</span>
              <span style={{ opacity: 0.55, fontSize: "0.55em" }}>poäng</span>
            </div>
            <div
              className="mt-1 text-sm"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              ✓ {state.hits} AI · ✗ {state.wrongs} fel
            </div>
          </div>

          <div
            className="flex flex-col items-end"
            style={{
              fontFamily: "var(--font-display)",
              color: "white",
            }}
          >
            <div
              className="text-xs uppercase"
              style={{
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.3em",
              }}
            >
              Tid kvar
            </div>
            <div
              style={{
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                color: state.timeLeft < 10 ? "var(--accent)" : "white",
                lineHeight: 1,
              }}
            >
              {Math.ceil(state.timeLeft)}s
            </div>
          </div>
        </div>
      )}

      {/* Hint längst ner när man spelar */}
      {state.phase === "playing" && (
        <div
          className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-xs uppercase"
          style={{
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.3em",
          }}
        >
          {state.controller === "hand"
            ? "Sträck handen mot ord med AI"
            : "Rör musen mot ord med AI"}
        </div>
      )}

      {/* Falling words */}
      {state.phase === "playing" &&
        state.words.map((word) => (
          <FallingWord key={word.id} word={word} />
        ))}

      {/* Pointer (visuell handposition) */}
      {state.phase === "playing" && (
        <PointerCursor pointerRef={pointerRef} />
      )}

      {/* Idle / start-skärm */}
      <AnimatePresence>
        {state.phase === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8 p-12 text-center"
          >
            {eyebrow ? (
              <div
                className="text-xs uppercase"
                style={{
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.3em",
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <h1
              className="max-w-3xl"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                lineHeight: 1.05,
                color: "white",
                margin: 0,
              }}
            >
              Fånga <span style={{ color: "var(--accent)" }}>AI</span> med händerna.
            </h1>
            <p
              className="max-w-2xl"
              style={{
                fontSize: "clamp(1.05rem, 1.6vw, 1.4rem)",
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.5,
              }}
            >
              Ord regnar ner från toppen. Sträck handen mot orden som har AI inuti
              — och låt resten falla. {duration} sekunder. Klar?
            </p>

            {state.loadError ? (
              <div
                className="max-w-xl rounded-lg p-4 text-sm"
                style={{
                  background: "rgba(220, 80, 80, 0.18)",
                  color: "rgba(255,200,200,0.95)",
                  border: "1px solid rgba(220, 80, 80, 0.3)",
                }}
              >
                {state.loadError}
              </div>
            ) : null}

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startWithCamera}
                style={{
                  background: "var(--accent)",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "calc(var(--radius) * 1.5)",
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)",
                  letterSpacing: "0.02em",
                  boxShadow: "0 12px 32px var(--accent-glow)",
                  cursor: "pointer",
                }}
              >
                Starta med kameran
              </button>
              <button
                type="button"
                onClick={startWithMouse}
                style={{
                  background: "transparent",
                  color: "rgba(255,255,255,0.85)",
                  padding: "1rem 2rem",
                  borderRadius: "calc(var(--radius) * 1.5)",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  cursor: "pointer",
                }}
              >
                Eller med musen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading-skärm */}
      <AnimatePresence>
        {state.phase === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 p-12 text-center"
          >
            <Spinner />
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(1.5rem, 2.6vw, 2rem)",
                color: "white",
              }}
            >
              Laddar AI-tracker…
            </div>
            <div
              className="max-w-md text-sm"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Tillåt kameran om datorn frågar. Modellen laddas från
              molnet — kan ta ett par sekunder.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-skärm */}
      <AnimatePresence>
        {state.phase === "ended" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 p-12 text-center"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(20,20,30,0.92) 0%, rgba(0,0,0,0.98) 80%)",
            }}
          >
            <div
              className="text-xs uppercase"
              style={{
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.3em",
              }}
            >
              Slutresultat
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(4rem, 12vw, 9rem)",
                color: "var(--accent)",
                lineHeight: 1,
              }}
            >
              {state.hits}
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.5em" }}>
                /{totalAI}
              </span>
            </div>
            <div
              className="max-w-2xl"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                color: "white",
                lineHeight: 1.2,
              }}
            >
              {scoreVerdict(state.hits, totalAI, state.wrongs)}
            </div>
            <div
              style={{
                fontSize: "clamp(0.9rem, 1.3vw, 1.1rem)",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              ✓ {state.hits} AI-saker fångade · ✗ {state.wrongs} fel-fångster ·
              Slutpoäng {state.score}
            </div>
            <button
              type="button"
              onClick={restart}
              style={{
                background: "var(--accent)",
                color: "white",
                padding: "0.85rem 1.8rem",
                borderRadius: "calc(var(--radius) * 1.5)",
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(1rem, 1.4vw, 1.2rem)",
                cursor: "pointer",
              }}
            >
              En till runda
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function scoreVerdict(hits: number, totalAI: number, wrongs: number): string {
  const ratio = totalAI > 0 ? hits / totalAI : 0;
  if (ratio >= 0.85 && wrongs <= 2) return "Du är en AI-detektiv!";
  if (ratio >= 0.65) return "Snyggt — du kan redan upptäcka AI.";
  if (ratio >= 0.4) return "Inte illa! Vi kör en till runda?";
  return "Tricky! Det kommer du klara nästa gång.";
}

function FallingWord({ word }: { word: Word }) {
  const isCaught = word.state === "caught";
  // Vid catch: AI = grön (rätt!), icke-AI = röd (fel!). Visuellt extra
  // tydligt för klassrumspublik — feedback syns från fonden.
  const caughtBg = word.isAI ? "#22C55E" : "#EF4444";
  const caughtShadow = word.isAI
    ? "0 0 40px rgba(34, 197, 94, 0.85), 0 12px 30px rgba(34,197,94,0.55)"
    : "0 0 40px rgba(239, 68, 68, 0.85), 0 12px 30px rgba(239,68,68,0.55)";

  // Memoiserade animate/transition — utan detta skapar object-literalen
  // ny referens vid varje re-render (60 ggr/sek) och Framer Motion
  // re-startar transitionen vilket ger flicker på orden.
  const animate = useMemo(
    () =>
      isCaught
        ? { scale: [1, 1.8, 0], opacity: [1, 1, 0] }
        : { scale: 1, opacity: 1 },
    [isCaught],
  );
  const transition = useMemo(
    () => ({ duration: isCaught ? 0.65 : 0.18, ease: "easeOut" as const }),
    [isCaught],
  );

  // OBS: Centrerings-transformen (translateX -50%) MÅSTE ligga på en yttre
  // div som Framer Motion inte rör. Annars skriver Framer över transformen
  // när scale/opacity animeras → ordet hoppar -50% ↔ 0 flera ggr/sek
  // (synligt främst på långa AI-ord som "Counter-Strike-bot").
  return (
    <div
      className="absolute z-10 select-none"
      style={{
        left: `${word.xPct}%`,
        top: `${word.y}px`,
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }}
    >
      <motion.div animate={animate} transition={transition}>
        <div
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "9999px",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
            letterSpacing: "var(--heading-tracking)",
            background: isCaught
              ? caughtBg
              : word.isAI
                ? "rgba(255, 79, 139, 0.92)"
                : "rgba(255,255,255,0.92)",
            color: isCaught ? "white" : word.isAI ? "white" : "#1a1a1a",
            boxShadow: isCaught
              ? caughtShadow
              : word.isAI
                ? "0 8px 28px rgba(255, 79, 139, 0.45)"
                : "0 6px 20px rgba(0,0,0,0.35)",
            whiteSpace: "nowrap",
          }}
        >
          {word.isAI && isCaught ? "✓ " : !word.isAI && isCaught ? "✗ " : ""}
          {word.text}
        </div>
      </motion.div>
    </div>
  );
}

function PointerCursor({
  pointerRef,
}: {
  pointerRef: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
}) {
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const ring = ringRef.current;
      if (ring) {
        const { x, y, active } = pointerRef.current;
        ring.style.transform = `translate(${x - 50}px, ${y - 50}px) scale(${
          active ? 1 : 0.4
        })`;
        ring.style.opacity = active ? "1" : "0.3";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pointerRef]);

  return (
    <div
      ref={ringRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-30"
      style={{
        width: "100px",
        height: "100px",
        borderRadius: "9999px",
        // Distinkt cyan-cirkel — INTE samma färg som AI-orden (rosa), så
        // eleverna ser både ordet och cursor:n samtidigt.
        border: "4px solid #22D3EE",
        boxShadow:
          "0 0 28px rgba(34, 211, 238, 0.65), inset 0 0 18px rgba(34, 211, 238, 0.35)",
        transition: "transform 0.08s linear, opacity 0.2s",
        background:
          "radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)",
      }}
    />
  );
}

function Spinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "9999px",
        border: "3px solid rgba(255,255,255,0.2)",
        borderTopColor: "var(--accent)",
      }}
    />
  );
}
