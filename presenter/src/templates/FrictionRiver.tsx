"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface FrictionRiverProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  bottomLine?: string;
  /** Etikett vid flödets start. T.ex. "Uppgift". */
  flowStart?: string;
  /** Etikett vid flödets slut. T.ex. "Lärande". */
  flowEnd?: string;
  /**
   * Markdown-lista. Format: `- Titel · Beskrivning`. Varje item blir
   * en "friktionspunkt" längs floden.
   */
  children?: ReactNode;
}

interface FrictionPoint {
  title: string;
  description: string;
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

function parseItems(children: ReactNode): FrictionPoint[] {
  const out: FrictionPoint[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const parts = raw.split(/\s*·\s*/);
      out.push({
        title: parts[0] ?? "",
        description: parts.slice(1).join(" · "),
      });
    });
  });
  return out;
}

/**
 * Visualiserar friktion som "dammar" längs ett AI-flöde. En vågig
 * gradient-flod stretchar horisontellt; vid varje friktionspunkt
 * popas en glas-bumper upp som bromsar flödet — och därunder ett
 * stort kort med strategin. Staged reveal en strategi i taget.
 */
export function FrictionRiver({
  kicker,
  chapter,
  title,
  subtitle,
  bottomLine,
  flowStart = "AI-flöde",
  flowEnd = "Lärande",
  children,
}: FrictionRiverProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";
  const step = useSlideSteps(items.length);
  const visibleCount = Math.min(step + 1, items.length);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.8vw, 3.4rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 1.8vh, 1.6rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              {kicker}
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {chapter}
            </motion.div>
          ) : null}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: "42em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.6rem, 4.4vw, 4rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.55rem 0 0 0",
                maxWidth: "40em",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        {/* River + friktionspunkter */}
        <div
          style={{
            flex: 1,
            position: "relative",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Topplabel-rad: start / slut */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              padding: "0 clamp(0.5rem, 1vw, 1rem)",
              marginBottom: "0.6rem",
            }}
          >
            <span>← {flowStart}</span>
            <span>{flowEnd} →</span>
          </div>

          {/* Floden — SVG */}
          <div
            style={{
              position: "relative",
              height: "clamp(70px, 9vh, 100px)",
              flexShrink: 0,
            }}
          >
            <svg
              aria-hidden
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                overflow: "visible",
              }}
            >
              <defs>
                <linearGradient id="riverGrad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={withAlpha("var(--accent)", 0.55)} />
                  <stop offset="100%" stopColor={withAlpha("var(--accent)", 0.18)} />
                </linearGradient>
              </defs>
              <motion.path
                d="M 0 6 Q 12.5 1, 25 6 T 50 6 T 75 6 T 100 6"
                stroke="url(#riverGrad)"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, delay: 0.4 }}
              />
              <motion.path
                d="M 0 6 Q 12.5 1, 25 6 T 50 6 T 75 6 T 100 6"
                stroke={withAlpha("var(--accent)", 0.18)}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.6, delay: 0.4 }}
                style={{ filter: "blur(4px)" }}
              />
            </svg>

            {/* Friktionspunkter på floden */}
            {items.map((_, i) => {
              const x = ((i + 0.5) / items.length) * 100;
              const isVisible = i < visibleCount;
              return (
                <motion.div
                  key={`bump-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: isVisible ? 0.05 : 0,
                  }}
                  style={{
                    position: "absolute",
                    left: `${x}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "clamp(34px, 4vw, 56px)",
                    height: "clamp(34px, 4vw, 56px)",
                    borderRadius: "9999px",
                    background: `linear-gradient(135deg, ${withAlpha("var(--accent)", 0.6)} 0%, ${withAlpha("var(--accent)", 0.15)} 100%)`,
                    border: `1.5px solid ${accent}`,
                    boxShadow: `0 0 28px var(--accent-glow, rgba(0,0,0,0.4))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                    style={{
                      position: "absolute",
                      inset: -4,
                      borderRadius: "9999px",
                      border: `2px solid ${accent}`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.75rem, 1vw, 0.95rem)",
                      fontWeight: 700,
                      color: "var(--text)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Kort under floden */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
              gap: "clamp(0.8rem, 1.4vw, 1.4rem)",
              marginTop: "clamp(1rem, 1.8vh, 1.6rem)",
              minHeight: 0,
            }}
          >
            {items.map((item, i) => {
              const isVisible = i < visibleCount;
              return (
              <motion.div
                key={`card-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0.15, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 24,
                  delay: isVisible ? 0.2 : 0,
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "clamp(1rem, 1.4vw, 1.4rem)",
                  borderRadius: "1.1rem",
                  background: "var(--bg-elevated, var(--bg-surface))",
                  border: `1px solid ${withAlpha("var(--accent)", 0.14)}`,
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: "0 16px 36px -14px rgba(0,0,0,0.28)",
                  gap: "0.6rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.05rem, 1.4vw, 1.35rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.018em",
                    lineHeight: 1.2,
                    color: "var(--text)",
                  }}
                >
                  {item.title}
                </div>
                {item.description ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.82rem, 0.98vw, 0.98rem)",
                      lineHeight: 1.5,
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 3.4 }}
            style={{
              borderTop: `1px solid ${withAlpha("var(--accent)", 0.14)}`,
              paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.35vw, 1.35rem)",
              color: "var(--text)",
              lineHeight: 1.4,
              maxWidth: "62em",
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
