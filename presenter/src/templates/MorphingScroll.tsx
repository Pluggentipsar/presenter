"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { ReactElement } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface MorphingScrollProps {
  /** Pipe- eller komma-separerad lista av meningar att rotera mellan. */
  texts: string;
  /** Sekunder per text-instans innan morphning till nästa. Default 8. */
  secondsPerText?: number | string;
  /** Sekunder per scroll-passage. Default 14. */
  secondsPerInstance?: number | string;
  /** Andel av skärmhöjden texten tar (0-1). Default 0.45. */
  heightRatio?: number | string;
  /** Outline istället för fylld text. Default true. */
  outline?: boolean;
  /** Accent-färg. */
  accent?: string;
  /** Payoff-text under scrollet. **bold** för accent-ord. */
  payoff?: string;
  /** När payoff fadar in (sek från start). Default = secondsPerText (efter första byte). */
  payoffDelay?: number;
  /** Bakgrund. */
  background?: string;
  chapter?: string;
  children?: ReactNode;
}

function extractTextWithMarkup(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextWithMarkup).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractTextWithMarkup(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    if (t === "p") return inner + "\n";
    return inner;
  }
  return "";
}

function renderInline(s: string, accent: string): ReactNode {
  const out: ReactNode[] = [];
  const parts = s.split(/(\*\*[^*]+\*\*)/);
  parts.forEach((p, i) => {
    const m = /^\*\*(.+)\*\*$/.exec(p);
    if (m) {
      out.push(
        <span
          key={i}
          style={{
            color: accent,
            textShadow: `0 0 24px ${withAlpha(accent, 0.5)}`,
          }}
        >
          {m[1]}
        </span>,
      );
    } else if (p) {
      out.push(<span key={i}>{p}</span>);
    }
  });
  return out;
}

export function MorphingScroll({
  texts,
  secondsPerText = 8,
  secondsPerInstance = 14,
  heightRatio = 0.45,
  outline = true,
  accent = "var(--accent)",
  payoff,
  payoffDelay,
  background,
  chapter,
  children,
}: MorphingScrollProps) {
  const textList = useMemo(
    () => texts.split(/[|,]/).map((s) => s.trim()).filter(Boolean),
    [texts],
  );
  const sptNum =
    typeof secondsPerText === "string" ? parseFloat(secondsPerText) : secondsPerText;
  const spiNum =
    typeof secondsPerInstance === "string"
      ? parseFloat(secondsPerInstance)
      : secondsPerInstance;
  const heightNum =
    typeof heightRatio === "string" ? parseFloat(heightRatio) : heightRatio;

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (textList.length <= 1) return;
    const t = setInterval(() => {
      setActiveIdx((i) => (i + 1) % textList.length);
    }, sptNum * 1000);
    return () => clearInterval(t);
  }, [textList.length, sptNum]);

  const activeText = textList[activeIdx] ?? "";
  const REPEAT_COUNT = 4;

  const payoffSource =
    payoff ??
    (children ? extractTextWithMarkup(children).trim() : undefined);
  const computedDelay = payoffDelay ?? sptNum;

  const isPhotoBg =
    !!background &&
    (background.startsWith("/") || background.startsWith("http"));
  const bg = background
    ? isPhotoBg
      ? `linear-gradient(rgba(10,9,8,0.6), rgba(10,9,8,0.8)), url('${background}') center/cover no-repeat`
      : background
    : undefined;

  // På en mörkt nedtonad foto-bakgrund måste texten vara fast ljus oavsett
  // tema; annars följer den temats tokens (mörk på ljust tema, ljus på mörkt).
  const textColor = isPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = isPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      {/* Accent radial-glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 35%, ${withAlpha(accent, 0.1)}, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 5,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Scrolling layer — placerad i övre halvan */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: 0,
          right: 0,
          height: `${heightNum * 100}vh`,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIdx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              whiteSpace: "nowrap",
              width: "max-content",
            }}
          >
            <motion.div
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                duration: spiNum * REPEAT_COUNT,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                display: "flex",
                whiteSpace: "nowrap",
              }}
            >
              {Array.from({ length: REPEAT_COUNT * 2 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: `${heightNum * 100}vh`,
                    lineHeight: 1,
                    fontWeight: outline ? 700 : 800,
                    letterSpacing: "-0.04em",
                    color: outline ? "transparent" : accent,
                    WebkitTextStroke: outline ? `2px ${accent}` : undefined,
                    paddingRight: "0.6em",
                    textShadow: outline
                      ? undefined
                      : `0 0 60px ${withAlpha(accent, 0.4)}`,
                  }}
                >
                  {activeText}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Payoff under scrolling */}
      {payoffSource ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 1.0,
            delay: computedDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            bottom: "clamp(4rem, 9vh, 7rem)",
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "min(48em, 88%)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.4rem, 2.4vw, 2.3rem)",
            fontWeight: 500,
            lineHeight: 1.3,
            color: textColor,
            letterSpacing: "-0.012em",
            zIndex: 3,
          }}
        >
          {payoffSource
            .split(/\n\n+/)
            .map((para, pi) => (
              <p key={pi} style={{ margin: pi > 0 ? "0.7em 0 0 0" : 0 }}>
                {renderInline(para, accent)}
              </p>
            ))}
        </motion.div>
      ) : null}
    </div>
  );
}
