"use client";

import { motion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { TypingDots } from "./LiquidChat";
import {
  AmbientBackdrop,
  glassCardStyle,
} from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * EssayFlood — "150 → 600"-sliden: ett lärarcitat står kvar till vänster
 * medan en hel elevuppsats FORSAR fram i chattrutan till höger, tecken för
 * tecken med auto-scroll. Under citatet tickar en levande ORDRÄKNARE som
 * räknar den faktiskt typade texten — när uppsatsen är klar landar den på
 * textens verkliga ordantal. Räknaren ÄR budskapet: prestation utan
 * progression, visualiserad i realtid.
 *
 * Steg: 0 = prompten skickad, AI:n "tänker" · 1 = uppsatsen börjar typas
 * (~25 s — prata över den) · 2 = hoppa direkt till slutet.
 *
 * Uppsatsen skrivs som vanliga stycken i MDX-barnen (blankrad = nytt stycke).
 */

interface EssayFloodProps {
  /** Mono-kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Statement-raden — `**ord**` lyfts i accent. */
  statement?: string;
  /** Kort rad under statementet, t.ex. "Med AI." */
  statementSub?: string;
  /** App-namn i chattens header. */
  app?: string;
  /** Status i chattens header. Default "Online". */
  status?: string;
  /** Elevens prompt (user-bubblan). */
  prompt?: string;
  /** Etikett under räknaren. Default "ord". */
  counterLabel?: string;
  /** ms per tick vid typning. Default 12. */
  typeSpeed?: number;
  /** Tecken per tick. Default 2 (~25 s för 600 ord). */
  charsPerTick?: number;
  /** Apple Messages-blå för user-bubblan. */
  userColor?: string;
  children?: ReactNode;
}

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

/** Plockar ut styckena ur MDX-barnen och limmar ihop till uppsatstext. */
function parseEssay(children: ReactNode): string {
  const parts: string[] = [];
  Children.forEach(children, (child) => {
    const text = extractText(child).trim();
    if (text) parts.push(text);
  });
  return parts.join("\n\n");
}

/** Renderar `**ord**` i accent + tyngd. */
function renderEmphasis(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={i} style={{ color: "var(--accent)", fontWeight: 650 }}>
          {m[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function EssayFlood({
  kicker,
  chapter,
  statement,
  statementSub,
  app = "ChatGPT",
  status = "Online",
  prompt,
  counterLabel = "ord",
  typeSpeed = 12,
  charsPerTick = 2,
  userColor = "linear-gradient(180deg, #5B9DFF 0%, #2C7BFF 100%)",
  children,
}: EssayFloodProps) {
  const essay = useMemo(() => parseEssay(children), [children]);
  // Steg: 0 = väntar · 1 = typar · 2 = klart direkt.
  const step = useSlideSteps(2);
  const [typedCount, setTypedCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (step >= 2) {
      setTypedCount(essay.length);
      return;
    }
    if (step === 1) {
      const iv = setInterval(() => {
        setTypedCount((prev) => {
          const next = prev + charsPerTick;
          if (next >= essay.length) {
            clearInterval(iv);
            return essay.length;
          }
          return next;
        });
      }, typeSpeed);
      return () => clearInterval(iv);
    }
  }, [step, essay, typeSpeed, charsPerTick]);

  const typedText = essay.slice(0, typedCount);
  const typing = step >= 1 && typedCount < essay.length;
  const done = typedCount >= essay.length && essay.length > 0;
  const wordCount = typedText.trim()
    ? typedText.trim().split(/\s+/).length
    : 0;

  // Auto-scroll: håll det senaste i vy medan floden pågår.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [typedCount]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--bg, #06070c)" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.5rem, 4vw, 4rem)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.05fr)",
          gap: "clamp(2rem, 4vw, 4.5rem)",
          alignItems: "stretch",
        }}
      >
        {/* Vänster: citatet + räknaren */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vh, 1.5rem)",
            minWidth: 0,
            paddingBottom: "clamp(0.5rem, 1.5vh, 1rem)",
          }}
        >
          {(kicker || chapter) ? (
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              {kicker ? (
                <span style={{ color: "var(--accent)", fontWeight: 500 }}>
                  {kicker}
                </span>
              ) : null}
              {chapter ? (
                <span style={{ color: "var(--text-muted)" }}>{chapter}</span>
              ) : null}
            </div>
          ) : null}

          {statement ? (
            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 3.6vw, 3.4rem)",
                fontWeight: 500,
                letterSpacing: "-0.025em",
                lineHeight: 1.12,
                color: "var(--text)",
                margin: 0,
                maxWidth: "13em",
              }}
            >
              {renderEmphasis(statement)}
            </motion.h1>
          ) : null}

          {statementSub ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.3rem, 2vw, 2rem)",
                fontWeight: 450,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {statementSub}
            </motion.p>
          ) : null}

          {/* Ordräknaren */}
          <div style={{ marginTop: "auto" }}>
            <motion.div
              key={done ? "done" : "counting"}
              animate={done ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.9rem",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(3.4rem, 7vw, 6.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  color: done
                    ? "var(--accent)"
                    : wordCount > 0
                      ? "var(--text)"
                      : "var(--text-muted)",
                  transition: "color 0.5s ease",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {wordCount}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.8rem, 1vw, 1rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {counterLabel}
              </span>
            </motion.div>
            <div
              aria-hidden
              style={{
                marginTop: "0.9rem",
                height: "3px",
                width: "min(100%, 18rem)",
                borderRadius: "9999px",
                background: "var(--accent-dim)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${essay.length ? Math.round((typedCount / essay.length) * 100) : 0}%`,
                  borderRadius: "9999px",
                  background:
                    "linear-gradient(90deg, var(--accent) 0%, var(--accent-bright, var(--accent)) 100%)",
                  transition: "width 0.2s linear",
                }}
              />
            </div>
          </div>
        </div>

        {/* Höger: chatten där uppsatsen forsar fram */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          style={{
            ...glassCardStyle({
              radius: "1.5rem",
              blur: 26,
              padding: "0",
            }),
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.95rem 1.3rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              borderBottom:
                "1px solid var(--glass-border, rgba(255,255,255,0.08))",
              flexShrink: 0,
            }}
          >
            <motion.span
              aria-hidden
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                display: "inline-block",
                width: "0.45rem",
                height: "0.45rem",
                borderRadius: "50%",
                background: "#4ADE80",
                boxShadow: "0 0 8px rgba(74,222,128,0.6)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.92rem",
                fontWeight: 600,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              {app}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: "0.66rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                opacity: 0.8,
              }}
            >
              {typing ? "skriver …" : status}
            </span>
          </div>

          {/* Meddelanden */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              padding: "1.2rem 1.2rem 1.4rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.8rem",
              overflowY: "auto",
            }}
          >
            {prompt ? (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "88%",
                  padding: "0.7rem 1rem",
                  borderRadius: "1.2rem 1.2rem 0.4rem 1.2rem",
                  background: userColor,
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow:
                    "0 6px 20px rgba(44,123,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.92rem, 1.05vw, 1.05rem)",
                  lineHeight: 1.45,
                  flexShrink: 0,
                }}
              >
                {prompt}
              </div>
            ) : null}

            {typedCount === 0 ? (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "var(--bg-elevated, rgba(255,255,255,0.06))",
                  border:
                    "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                  borderRadius: "1.2rem 1.2rem 1.2rem 0.4rem",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                }}
              >
                <TypingDots color="var(--text-muted)" />
              </div>
            ) : (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "94%",
                  padding: "0.9rem 1.1rem",
                  borderRadius: "1.2rem 1.2rem 1.2rem 0.4rem",
                  background: "var(--bg-elevated, rgba(255,255,255,0.06))",
                  border:
                    "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                  color: "var(--text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.88rem, 1vw, 1rem)",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {typedText}
                {typing ? (
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    style={{ color: "var(--accent)" }}
                  >
                    ▍
                  </motion.span>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
