"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PatternField — språkmodellen som sannolikhetsfält, inte som textanimation.
 *
 * Kandidat-tokens ligger utspridda i ett fält där **avståndet till mitten och
 * punktens storlek bär sannolikheten**: ju troligare fortsättning, desto
 * närmare centrum och desto tydligare. Fältet driver långsamt hela tiden.
 * Vid varje klick låser den valda token fast, vandrar ner i den växande
 * meningen, och ett nytt fält av sannolikheter faller fram.
 *
 * Poängen bilden ska bära: modellen letar inte efter det sanna, den letar
 * efter en fortsättning som passar mönstret.
 *
 * Positionerna är hash-baserade och därmed identiska på server och klient —
 * ingen `Math.random()`, ingen hydration-mismatch, ingen flimrande omritning.
 *
 * ```mdx
 * <PatternField
 *   chapter="§ 1 · Oraklet"
 *   statement="AI söker inte efter **sanningen**. Den söker efter en fortsättning som **passar**."
 *   subline="Ett ord i taget. Miljarder gånger."
 *   seed="Källkritik betyder att"
 * >
 * - granska:0.42 · ifrågasätta:0.23 · kolla:0.15 · värdera:0.11 · lita:0.05 · tänka:0.04
 * - källor:0.61 · påståenden:0.20 · information:0.12 · fakta:0.07
 * </PatternField>
 * ```
 *
 * Per rad: en omgång kandidater, `token:sannolikhet` separerade med ` · `.
 * Den token med högst sannolikhet är den som väljs.
 */

interface PatternFieldProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Påståendet som ligger över fältet. `**fet**` blir accent. */
  statement?: string;
  /** Underrad längst ned — landar på sista steget. */
  subline?: string;
  /** Ingångstexten som fortsättningarna byggs på. */
  seed?: string;
  children?: ReactNode;
}

interface Token {
  word: string;
  p: number;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Stabil sträng-hash — samma värde på server och klient. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseRounds(children: ReactNode): Token[][] {
  const out: Token[][] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const tokens: Token[] = [];
    for (const chunk of raw.split(/\s*[·,]\s*/)) {
      const m = chunk.trim().match(/^(.+?)\s*:\s*([0-9]*\.?[0-9]+)$/);
      if (!m) continue;
      tokens.push({ word: m[1].trim(), p: parseFloat(m[2]) });
    }
    if (tokens.length > 0) {
      out.push(tokens.sort((a, b) => b.p - a.p));
    }
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

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/**
 * Placering i fältet. Sannolikheten styr radien: p=1 hamnar i mitten,
 * låg sannolikhet långt ut. Vinkeln kommer ur ordets hash så fältet ser
 * organiskt utspritt ut men aldrig ritas om mellan renders.
 */
function place(token: Token, index: number, roundKey: string) {
  // Gyllene vinkeln per index ger jämn spridning runt mitten. Hash-baserad
  // vinkel lät flera tokens hamna åt samma håll och lägga sig på varandra;
  // omgångens hash roterar bara hela fältet så rundorna ser olika ut.
  const angle = index * 2.39996323 + hash(roundKey) * Math.PI * 2;
  // Radien bär sannolikheten — hög sannolikhet nära mitten. Spannet är valt
  // så att ytterkanten landar innanför duken utan att klämmas.
  const radius = 9 + (1 - Math.min(token.p, 1)) * 17;
  const wobble = hash(`${token.word}:w`) * 4 - 2;
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  return {
    x: clamp(50 + Math.cos(angle) * radius * 1.55 + wobble, 8, 92),
    y: clamp(50 + Math.sin(angle) * radius + wobble * 0.5, 14, 86),
    drift: 2.5 + hash(`${token.word}:d`) * 3.5,
    delay: hash(`${token.word}:t`) * 1.6,
  };
}

export function PatternField({
  chapter,
  kicker,
  statement,
  subline,
  seed,
  children,
}: PatternFieldProps) {
  const rounds = useMemo(() => parseRounds(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  // Ett steg per omgång, plus ett avslutande steg för underraden.
  const step = useSlideSteps(rounds.length + 1);
  const roundIndex = Math.min(step, Math.max(rounds.length - 1, 0));
  const finished = step >= rounds.length;
  const current = rounds[roundIndex] ?? [];

  // Alla tokens som redan valts bygger den växande meningen.
  const chosen = rounds.slice(0, step).map((r) => r[0]?.word ?? "");

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 5,
          }}
        >
          {kicker ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--accent)",
              }}
            >
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </span>
          ) : null}
          {chapter ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "color-mix(in srgb, var(--text) 45%, transparent)",
                marginLeft: "auto",
              }}
            >
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            </span>
          ) : null}
        </div>
      ) : null}

      {/* ————— Sannolikhetsfältet ————— */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
        }}
      >
        {current.map((token, i) => {
          const pos = place(token, i, `r${roundIndex}`);
          const isTop = i === 0;
          // Storlek och tydlighet bär sannolikheten.
          const scale = 0.72 + Math.min(token.p, 1) * 0.9;
          return (
            // Centreringen i ett OANIMERAT omslag: driften animerar x och y,
            // så de kan inte bära translate — och CSS-transform på själva
            // motion-elementet skriver framer-motion över.
            <div
              key={`${roundIndex}-${token.word}`}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{
                opacity: finished && !isTop ? 0.12 : 0.28 + token.p * 0.62,
                scale: 1,
                y: reduceMotion ? 0 : [0, -pos.drift, 0, pos.drift, 0],
                x: reduceMotion ? 0 : [0, pos.drift * 0.5, 0, -pos.drift * 0.5, 0],
              }}
              transition={{
                opacity: { duration: 0.6, ease: EASE },
                scale: { duration: 0.7, ease: EASE },
                y: {
                  duration: 11 + pos.drift,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: pos.delay,
                },
                x: {
                  duration: 14 + pos.drift,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: pos.delay,
                },
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.42em",
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${0.3 + token.p * 0.5}rem`,
                  height: `${0.3 + token.p * 0.5}rem`,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: isTop ? "0 0 16px var(--accent-glow)" : "none",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: `calc(clamp(0.7rem, 1vw, 1rem) * ${scale})`,
                  letterSpacing: "0.04em",
                  color: isTop ? "var(--accent)" : "var(--text)",
                  fontWeight: isTop ? 700 : 500,
                }}
              >
                {token.word}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.55rem, 0.72vw, 0.72rem)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                }}
              >
                {token.p.toFixed(2)}
              </span>
            </motion.div>
            </div>
          );
        })}
      </div>

      {/* ————— Påståendet ————— */}
      {statement ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(3rem, 7vw, 7rem)",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.9, delay: 0.25, ease: EASE }}
            style={{
              maxWidth: "18em",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.6rem, 3.1vw, 3rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              // Läsbarhetsscrim i temats egen bakgrundsfärg — håller texten
              // ren mot fältet utan att göra en mörk platta på ljust tema.
              padding: "clamp(1.2rem, 2.5vw, 2.2rem)",
              background:
                "radial-gradient(ellipse at 50% 50%, var(--bg) 42%, transparent 76%)",
              pointerEvents: "auto",
            }}
          >
            <EditableText path="statement" value={statement}>
              {renderInline(statement)}
            </EditableText>
          </motion.div>
        </div>
      ) : null}

      {/* ————— Den växande meningen ————— */}
      {seed ? (
        <div
          style={{
            position: "absolute",
            bottom: subline ? "clamp(4.2rem, 9vh, 6rem)" : "clamp(2rem, 4.5vh, 3.4rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "0.42em",
            zIndex: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.85rem, 1.2vw, 1.2rem)",
              color: "var(--text-muted)",
              letterSpacing: "0.02em",
            }}
          >
            <EditableText path="seed" value={seed}>
              {seed}
            </EditableText>
          </span>
          {chosen.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -14, scale: 1.25 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: reduceMotion ? "tween" : "spring",
                stiffness: 260,
                damping: 22,
                duration: reduceMotion ? 0 : undefined,
              }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.85rem, 1.2vw, 1.2rem)",
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: "0.02em",
              }}
            >
              {w}
            </motion.span>
          ))}
          {/* Markör som visar att fältet väntar på nästa val */}
          {!finished ? (
            <motion.span
              aria-hidden
              animate={reduceMotion ? undefined : { opacity: [1, 0.15, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display: "inline-block",
                width: "0.55em",
                height: "1.05em",
                background: "var(--accent)",
                transform: "translateY(0.12em)",
              }}
            />
          ) : null}
        </div>
      ) : null}

      {/* ————— Underrad ————— */}
      {subline ? (
        <motion.div
          initial={false}
          animate={{ opacity: finished ? 1 : 0, y: finished ? 0 : 10 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4.5vh, 3.4rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.95rem, 1.35vw, 1.35rem)",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          <EditableText path="subline" value={subline}>
            {subline}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
