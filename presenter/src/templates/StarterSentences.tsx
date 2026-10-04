"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface StarterSentencesProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /** ms per tecken när startmeningen typas fram. Default 35 (lugnt). */
  typeSpeed?: number;
  /**
   * Markdown-lista: `- Kategori · Startmening`.
   * Visas en i taget med typewriter. Stegas via space/pil.
   */
  children?: ReactNode;
}

interface Starter {
  category: string;
  sentence: string;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.55), rgba(10,9,8,0.72)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * När ett eget `background` skickas in (foto med mörk scrim eller en
 * författar-bestämd backdrop) kan vi inte längre lita på tema-token för
 * text — den blir near-black mot en mörk yta på ljust tema. Då fixerar vi
 * ljus text. Utan `background` följer texten temat (var(--text)).
 */
const FIXED_LIGHT_TEXT = "rgba(245,246,250,0.92)";
const FIXED_LIGHT_MUTED = "rgba(245,246,250,0.6)";

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

function parseStarters(children: ReactNode): Starter[] {
  const out: Starter[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length >= 2) {
      out.push({
        category: parts[0].trim(),
        sentence: parts.slice(1).join(" · ").trim(),
      });
    }
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return out;
}

function TypewriterSentence({
  text,
  typeSpeed,
  startDelay,
  accent,
  textColor,
}: {
  text: string;
  typeSpeed: number;
  startDelay: number;
  accent: string;
  textColor: string;
}) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTyped("");
    setDone(false);
    let i = 0;
    const initial = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        if (i > text.length) {
          clearInterval(interval);
          setDone(true);
          return;
        }
        setTyped(text.slice(0, i));
      }, typeSpeed);
    }, startDelay);
    return () => {
      clearTimeout(initial);
    };
  }, [text, typeSpeed, startDelay]);

  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontWeight: 400,
        color: textColor,
        lineHeight: 1.2,
        textAlign: "center",
        letterSpacing: "-0.01em",
      }}
    >
      {typed}
      {!done ? (
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse" }}
          style={{
            display: "inline-block",
            width: "0.08em",
            height: "0.9em",
            background: accent,
            marginLeft: "0.08em",
            verticalAlign: "baseline",
            borderRadius: "1px",
            boxShadow: `0 0 10px ${withAlpha(accent, 0.5)}`,
          }}
        />
      ) : (
        <motion.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            display: "inline-block",
            marginLeft: "0.15em",
            color: accent,
            fontSize: "0.5em",
            verticalAlign: "middle",
          }}
        >
          ✎
        </motion.span>
      )}
    </span>
  );
}

/**
 * Startmeningar — en cinematic stegvis reveal av meningar som AI kan
 * föreslå för att scaffolda elevers skrivande. Varje mening typas fram
 * tecken för tecken, med kategori-label ovanför och progress-indikator
 * längst ner.
 */
export function StarterSentences({
  kicker,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  typeSpeed = 35,
  children,
}: StarterSentencesProps) {
  const starters = parseStarters(children);
  const activeStep = useSlideSteps(Math.max(starters.length, 1));
  const current = starters[activeStep];

  // Eget background => mörk yta (foto-scrim eller författar-backdrop) på
  // alla teman. Fixera ljus text. Annars: följ temat.
  const onDarkSurface = Boolean(background);
  const textColor = onDarkSurface ? FIXED_LIGHT_TEXT : "var(--text)";
  const mutedColor = onDarkSurface ? FIXED_LIGHT_MUTED : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      {/* Ambient glow bakom texten */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 45% 35% at 50% 55%, ${withAlpha(accent, 0.09)} 0%, transparent 70%)`,
        }}
      />

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(3rem, 5vw, 5rem)",
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div
          className="flex flex-col gap-2"
          style={{ maxWidth: "38em", flexShrink: 0 }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.5rem, 2.8vw, 2.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: textColor,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                color: mutedColor,
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Centered sentence stage */}
        <div
          className="flex-1 flex flex-col items-center justify-center"
          style={{ gap: "clamp(2rem, 4vh, 3.5rem)", position: "relative" }}
        >
          {/* Stora citationstecken bakom meningen */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.08 }}
            transition={{ duration: 1.5, delay: 0.4 }}
            style={{
              position: "absolute",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(20rem, 40vw, 48rem)",
              color: accent,
              lineHeight: 0.5,
              letterSpacing: "-0.1em",
              zIndex: 0,
              top: "20%",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            “
          </motion.div>

          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(1.5rem, 3vh, 2.5rem)",
                  zIndex: 1,
                  maxWidth: "24em",
                  textAlign: "center",
                }}
              >
                {/* Kategori-label */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      width: "2.5rem",
                      height: "1px",
                      background: accent,
                      opacity: 0.7,
                    }}
                    aria-hidden
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
                      letterSpacing: "0.32em",
                      textTransform: "uppercase",
                      color: accent,
                      fontWeight: 600,
                    }}
                  >
                    {current.category}
                  </span>
                  <div
                    style={{
                      width: "2.5rem",
                      height: "1px",
                      background: accent,
                      opacity: 0.7,
                    }}
                    aria-hidden
                  />
                </motion.div>

                {/* Själva startmeningen — typewriter */}
                <div
                  style={{
                    fontSize: "clamp(2rem, 4.5vw, 4.5rem)",
                    lineHeight: 1.15,
                    minHeight: "2em",
                  }}
                >
                  <TypewriterSentence
                    text={current.sentence}
                    typeSpeed={typeSpeed}
                    startDelay={700}
                    accent={accent}
                    textColor={textColor}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Progress-indikator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "auto",
          }}
        >
          {starters.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                background:
                  i === activeStep
                    ? accent
                    : i < activeStep
                      ? `${withAlpha(accent, 0.38)}`
                      : onDarkSurface
                        ? "rgba(245,246,250,0.18)"
                        : "rgba(0,0,0,0.12)",
                width: i === activeStep ? "2rem" : "0.5rem",
              }}
              transition={{ duration: 0.4 }}
              style={{
                height: "2px",
                borderRadius: "1px",
              }}
            />
          ))}
          <span
            style={{
              marginLeft: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: mutedColor,
            }}
          >
            {String(activeStep + 1).padStart(2, "0")} / {String(starters.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}
