"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * LobbyScreen — väntskärmen som ligger på medan salen sätter sig.
 *
 * Skiljer sig från alla andra templates på en punkt: den lyssnar inte på
 * piltangenter. Den ska klara tjugo minuter utan att någon rör tangentbordet,
 * och sedan klickas bort på första trycket.
 *
 * Frågorna roterar av sig själva, en i taget, stort. De som redan varit uppe
 * blir kvar som ett svagt dis i kanterna — sitter man länge ser man ett helt
 * rum av frågor byggas upp. Det är hela poängen: publiken ska känna igen sina
 * egna funderingar på duken innan föreläsaren sagt ett ord.
 *
 * ```mdx
 * <LobbyScreen
 *   eyebrow="Gymnasiet · Aulan"
 *   meta="Staden · 20 augusti 2026"
 *   presenter="Joel Rangsjö"
 *   startsAt="08.30"
 * >
 * - Vad gör de egentligen på telefonen?
 * - Ska jag stoppa det — eller lära dem?
 * </LobbyScreen>
 * ```
 *
 * `**fet**` i en fråga renderas i accentfärg.
 */

interface LobbyScreenProps {
  /** Liten etikett överst — plats eller tillfälle. */
  eyebrow?: string;
  /** Rad nere till vänster — datum, ort. */
  meta?: string;
  /** Föreläsarens namn, nere till vänster. */
  presenter?: string;
  /** Starttid, "08.30". Ger nedräkning när mindre än en timme återstår. */
  startsAt?: string;
  /** Sekunder per fråga. Default 8. */
  interval?: number;
  /** Bakgrundsbild som ambient-lagret tonar. */
  background?: string;
  /** Bakgrundsvideo — loopar tyst. Vinner över `background`. */
  video?: string;
  /** Hur hårt bakgrunden tonas ned, 0–1. Default 0.72. */
  overlay?: number;
  /** Sekundär ambient-accent. */
  accent2?: string;
  /** Markdown-lista med frågor. */
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

/**
 * Fasta lägen för de frågor som redan varit uppe. Deterministiska — inget
 * Math.random(), som skulle ge hydreringsfel. Alla ligger i topp- eller
 * bottenbandet så att den aktiva frågan får mitten helt för sig själv.
 */
const GHOST_SLOTS = [
  { top: "11%", left: "4%", rotate: -2.4, scale: 0.40 },
  { top: "79%", left: "54%", rotate: 1.8, scale: 0.36 },
  { top: "16%", left: "57%", rotate: 2.1, scale: 0.31 },
  { top: "84%", left: "6%", rotate: -1.3, scale: 0.37 },
  { top: "73%", left: "29%", rotate: 0.9, scale: 0.28 },
  { top: "7%", left: "31%", rotate: -1.7, scale: 0.30 },
];

const MAX_GHOSTS = 5;

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseQuestions(children: ReactNode): string[] {
  const out: string[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

/** `**fet**` → accentfärgad span. */
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** "08.30" / "08:30" → minuter efter midnatt. null om obegripligt. */
function parseClock(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Nedräkning till starttiden. Renderas först efter mount — klockan finns inte
 * på servern, och skulle den renderas där blir det hydreringsfel.
 */
function StartCountdown({ startsAt }: { startsAt: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const target = parseClock(startsAt);
    if (target == null) return;

    const tick = () => {
      const now = new Date();
      const minutesLeft = target - (now.getHours() * 60 + now.getMinutes());
      if (minutesLeft > 60 || minutesLeft < -30) setLabel(null);
      else if (minutesLeft > 1) setLabel(`om ${minutesLeft} min`);
      else if (minutesLeft === 1) setLabel("om en minut");
      else setLabel("strax");
    };

    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, [startsAt]);

  return (
    <span
      style={{
        fontFamily: '"SF Mono", "JetBrains Mono", monospace',
        fontSize: "clamp(0.72rem, 0.85vw, 0.9rem)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6rem",
      }}
    >
      <motion.span
        aria-hidden
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "0.4rem",
          height: "0.4rem",
          borderRadius: "9999px",
          background: "var(--accent)",
          flexShrink: 0,
        }}
      />
      Vi börjar {startsAt}
      {label ? ` · ${label}` : ""}
    </span>
  );
}

export function LobbyScreen({
  eyebrow,
  meta,
  presenter,
  startsAt,
  interval = 8,
  background,
  video,
  overlay = 0.72,
  accent2,
  children,
}: LobbyScreenProps) {
  const questions = parseQuestions(children);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (questions.length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => i + 1),
      Math.max(2, interval) * 1000,
    );
    return () => window.clearInterval(id);
  }, [questions.length, interval]);

  const active = questions.length ? questions[index % questions.length] : "";

  // De senast visade frågorna, nyast först — lägger sig i kanterna som ett dis.
  const ghosts = Array.from({ length: Math.min(MAX_GHOSTS, index) }, (_, i) => {
    const at = index - 1 - i;
    return {
      text: questions[at % questions.length],
      slot: GHOST_SLOTS[at % GHOST_SLOTS.length],
      key: at,
      depth: i,
    };
  });

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        color: "var(--text)",
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      {video ? (
        <>
          <video
            src={video}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ zIndex: 0 }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              background: `linear-gradient(rgba(var(--ambient-overlay, 6,7,12),${overlay}), rgba(var(--ambient-overlay, 6,7,12),${Math.min(1, overlay + 0.12)}))`,
            }}
          />
        </>
      ) : (
        <AmbientBackdrop
          background={background}
          overlay={overlay}
          accent2={accent2}
        />
      )}

      {/* Långsam ljussvep över hela ytan — gör att skärmen andas under tjugo
          minuters väntan i stället för att stelna till en stillbild. */}
      <motion.div
        aria-hidden
        animate={{ x: ["-35%", "135%"] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: "40%",
          zIndex: 1,
          pointerEvents: "none",
          background:
            "linear-gradient(105deg, transparent 0%, var(--accent-dim, rgba(255,255,255,0.05)) 50%, transparent 100%)",
        }}
      />

      {/* Diset av frågor som redan varit uppe.
          Medvetet UTAN AnimatePresence: den djupaste ghosten ligger på ~0.06
          opacity när den ramlar ur listan, så ingen exit-animation behövs — och
          utan exit kan inget ackumuleras om animationerna störs. Det spelar roll
          här: skärmen roterar över hundra gånger under en väntan. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {ghosts.map((g) => (
          <motion.div
            key={g.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 - g.depth * 0.025 }}
            transition={{ duration: 1.6, ease: EASE }}
            style={{
              position: "absolute",
              top: g.slot.top,
              left: g.slot.left,
              maxWidth: "38%",
              transform: `rotate(${g.slot.rotate}deg)`,
              fontFamily:
                '"SF Pro Display", "Inter Display", -apple-system, system-ui, sans-serif',
              fontWeight: 500,
              fontSize: `clamp(0.85rem, ${1.4 + g.slot.scale * 2.6}vw, 2rem)`,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            {g.text?.replace(/\*\*/g, "")}
          </motion.div>
        ))}
      </div>

      {/* Innehåll */}
      <div
        className="relative h-full"
        style={{
          zIndex: 4,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          padding:
            "clamp(2.25rem, 4vw, 3.75rem) clamp(2.5rem, 5vw, 5rem) clamp(1.75rem, 3vh, 2.5rem)",
        }}
      >
        {eyebrow ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              fontFamily: '"SF Mono", "JetBrains Mono", monospace',
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--accent)",
              fontWeight: 500,
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: "2.5rem",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent 0%, var(--accent) 100%)",
              }}
            />
            {eyebrow}
          </motion.div>
        ) : (
          <div />
        )}

        {/* Den aktiva frågan. Korsfade, inte mode="wait" — den nya frågan tonar
            in medan den gamla tonar ut. Mjukare, och en avbruten övergång kan
            inte låsa rotationen, vilket spelar roll för en skärm som ska stå
            och gå i tjugo minuter utan tillsyn. */}
        <div
          style={{
            position: "relative",
            display: "grid",
            placeItems: "center",
            minHeight: 0,
            padding: "0 clamp(0rem, 4vw, 5rem)",
          }}
        >
          <AnimatePresence initial={false}>
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 26, filter: "blur(14px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -22, filter: "blur(10px)" }}
              transition={{ duration: 1.3, ease: EASE }}
              style={{
                gridArea: "1 / 1",
                fontFamily:
                  '"SF Pro Display", "Inter Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                fontWeight: 500,
                fontSize: "clamp(2rem, 5.2vw, 5.25rem)",
                lineHeight: 1.06,
                letterSpacing: "-0.035em",
                textAlign: "center",
                textWrap: "balance",
                color: "var(--text)",
                margin: 0,
                maxWidth: "20em",
              }}
            >
              {renderInline(active)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Förankring — vem, var, när */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.3rem",
              minWidth: 0,
            }}
          >
            {presenter ? (
              <span
                style={{
                  fontFamily:
                    '"SF Pro Display", "Inter Display", -apple-system, system-ui, sans-serif',
                  fontSize: "clamp(1rem, 1.3vw, 1.35rem)",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: "var(--text)",
                }}
              >
                {presenter}
              </span>
            ) : null}
            {meta ? (
              <span
                style={{
                  fontFamily: '"SF Mono", "JetBrains Mono", monospace',
                  fontSize: "clamp(0.72rem, 0.85vw, 0.9rem)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {meta}
              </span>
            ) : null}
          </div>

          {startsAt ? <StartCountdown startsAt={startsAt} /> : null}
        </motion.div>
      </div>
    </div>
  );
}
