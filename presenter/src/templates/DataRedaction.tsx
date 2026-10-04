"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * DataRedaction — visar VAD som ska/inte ska skickas in i extern AI.
 *
 * Pedagogiskt grepp: formen ÄR innehållet. Vi ser en faktisk prompt med
 * elevdata. Klick för klick slår "censur-tejp" ner över riskorden, och
 * "vaxsigill" tänds i rött för varje kategori. Slutligen ersätts allt
 * av den anonymiserade OK-versionen med GODKÄND-stämpel.
 *
 * Stegsystem:
 * - Steg 0: Originalprompten visas, sigillen är dim
 * - Steg 1..N: Sigill N tänds + tillhörande redaktioner appears (tejp slår ner)
 * - Steg N+1: Redaktionerna ersätts av OK-versionen, GODKÄND-stämpel + tumregel
 *
 * Markup i prompt: `{N:text}` = text ska redactas i kategori N (1-indexerat).
 */

type CategoryTuple = [string, string]; // [label, description]

interface DataRedactionProps {
  chapter?: string;
  /** Stor titel ovanför dokumentet (t.ex. "Innan du klistrar in…") */
  title?: string;
  /** Originalprompten med {N:text}-markup */
  prompt: string;
  /** Kategorier — 1-indexerade i prompten. Ordningen styr stegen. */
  categories?: CategoryTuple[];
  /** Anonymiserad version som visas på sista steget */
  safePrompt: string;
  /** Tumregel som visas i slutet */
  tumregel?: string;
  /** Text på den slutliga gröna stämpeln */
  okLabel?: string;
  background?: string;
  overlay?: number;
  accent?: string;
}

interface PromptPart {
  text: string;
  category: number | null;
}

const REDACT_RE = /\{(\d+):([^}]+)\}/g;

function parsePrompt(prompt: string): PromptPart[] {
  const parts: PromptPart[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  REDACT_RE.lastIndex = 0;
  while ((m = REDACT_RE.exec(prompt)) !== null) {
    if (m.index > last) {
      parts.push({ text: prompt.slice(last, m.index), category: null });
    }
    parts.push({ text: m[2], category: parseInt(m[1], 10) });
    last = REDACT_RE.lastIndex;
  }
  if (last < prompt.length) {
    parts.push({ text: prompt.slice(last), category: null });
  }
  return parts;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) {
    // Följer temat (mörkt på mörka teman, ljust på ljusa)
    return "var(--slide-base, var(--bg))";
  }
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(
      1,
      a + 0.18
    )})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

const RED = "#E15B4F";
const RED_GLOW = "rgba(225,91,79,0.5)";
const GREEN = "#67D49A";
const GREEN_GLOW = "rgba(103,212,154,0.45)";

export function DataRedaction({
  chapter,
  title,
  prompt,
  categories = [],
  safePrompt,
  tumregel,
  okLabel = "Godkänd",
  background,
  overlay = 0.6,
  accent = "var(--accent, #B4763A)",
}: DataRedactionProps) {
  const parts = useMemo(() => parsePrompt(prompt), [prompt]);
  const totalSteps = categories.length + 2;
  const step = useSlideSteps(totalSteps);

  const revealedCount = Math.min(step, categories.length);
  const isFinal = step >= categories.length + 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Atmosfär */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: isFinal
            ? `
              radial-gradient(ellipse 70% 55% at 50% 50%, rgba(103,212,154,0.18) 0%, transparent 70%),
              radial-gradient(ellipse 50% 30% at 50% 5%, ${withAlpha(accent, 0.1)} 0%, transparent 70%)
            `
            : `
              radial-gradient(ellipse 70% 50% at 50% 50%, rgba(225,91,79,0.10) 0%, transparent 70%),
              radial-gradient(ellipse 50% 30% at 50% 5%, ${withAlpha(accent, 0.1)} 0%, transparent 70%)
            `,
          pointerEvents: "none",
          transition: "background 0.8s ease",
        }}
      />

      {/* Subtilt grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(247,241,230,0.025) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(1.75rem, 3.5vw, 3rem)",
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Title */}
      {title ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(3.5rem, 7vh, 5.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(92%, 64rem)",
            textAlign: "center",
            zIndex: 5,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontWeight: 500,
              fontSize: "clamp(1.4rem, 2.4vw, 2.4rem)",
              letterSpacing: "-0.02em",
              color: "var(--text)",
              lineHeight: 1.2,
              margin: 0,
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h1>
        </div>
      ) : null}

      {/* Centerblock: dokument + sigill + tumregel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(7rem, 14vh, 10rem) clamp(2rem, 4vw, 4rem) clamp(2rem, 4vh, 3rem)",
          gap: "clamp(1.25rem, 2.5vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* Document */}
        <DocumentCard
          parts={parts}
          revealedCount={revealedCount}
          isFinal={isFinal}
          safePrompt={safePrompt}
          okLabel={okLabel}
          accent={accent}
        />

        {/* Sigill-rad */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "clamp(0.5rem, 1.5vw, 1.5rem)",
            flexWrap: "wrap",
            maxWidth: "60rem",
          }}
        >
          {categories.map(([label, description], i) => (
            <CategorySeal
              key={i}
              label={label}
              description={description}
              isLit={revealedCount > i}
              isDone={isFinal}
              index={i}
            />
          ))}
        </div>

        {/* Tumregel */}
        <div
          style={{
            minHeight: "3rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AnimatePresence>
            {isFinal && tumregel ? (
              <motion.div
                key="tumregel"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: 0.7 }}
                style={{
                  fontFamily: "var(--font-display, Fraunces, serif)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.95rem, 1.4vw, 1.4rem)",
                  color: "var(--text-muted)",
                  textAlign: "center",
                  maxWidth: "48rem",
                  lineHeight: 1.4,
                }}
              >
                <EditableText path="tumregel" value={tumregel}>
                  {tumregel}
                </EditableText>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ---------- Document card ----------

function DocumentCard({
  parts,
  revealedCount,
  isFinal,
  safePrompt,
  okLabel,
  accent,
}: {
  parts: PromptPart[];
  revealedCount: number;
  isFinal: boolean;
  safePrompt: string;
  okLabel: string;
  accent: string;
}) {
  // Utkastet kan vara kort ("Hej! Jag behöver hjälp…") eller en absurt lång
  // skräckexempel-prompt. Kortet har fast höjd och klipper överskott, så
  // typografin skalas ned med längden i stället — kvadratroten håller
  // nedskalningen mjuk, och golvet 0.52 gör att texten aldrig blir oläslig
  // längst bak i salen. Korta prompter (<= ~650 tecken) rör vi inte.
  const draftLength = parts.reduce((n, p) => n + p.text.length, 0);
  const draftScale = Math.min(
    1,
    Math.max(0.52, Math.sqrt(650 / Math.max(draftLength, 1))),
  );

  return (
    <motion.div
      animate={{
        rotateZ: isFinal ? 0 : -0.6,
        scale: isFinal ? 1 : 1,
      }}
      transition={{ duration: 0.6 }}
      style={{
        position: "relative",
        width: "min(90%, 56rem)",
        background: isFinal
          ? "linear-gradient(180deg, rgba(103,212,154,0.06), rgba(103,212,154,0.02))"
          : "var(--bg-elevated)",
        border: isFinal
          ? `1.5px solid ${GREEN}66`
          : "1px solid rgba(128,128,128,0.22)",
        borderRadius: "1rem",
        padding: "clamp(1.25rem, 2.5vw, 2rem)",
        boxShadow: isFinal
          ? `0 0 80px ${GREEN_GLOW}, 0 12px 50px rgba(0,0,0,0.5), inset 0 0 0 1px ${GREEN}33`
          : "0 12px 50px rgba(0,0,0,0.18), 0 0 0 1px rgba(128,128,128,0.12)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        transition: "background 0.7s ease, border 0.7s ease, box-shadow 0.7s ease",
      }}
    >
      {/* Header: TILL: ChatGPT */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "0.95rem",
          paddingBottom: "0.85rem",
          borderBottom: "1px dashed rgba(128,128,128,0.3)",
          fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
          fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <motion.span
            aria-hidden
            animate={{
              background: isFinal ? GREEN : RED,
              boxShadow: isFinal
                ? `0 0 12px ${GREEN_GLOW}`
                : `0 0 10px ${RED_GLOW}`,
            }}
            transition={{ duration: 0.5 }}
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "999px",
              display: "inline-block",
            }}
          />
          <span>Till: ChatGPT.com</span>
        </span>
        <span style={{ opacity: 0.6 }}>{isFinal ? "Anonymiserad" : "Utkast"}</span>
      </div>

      {/* Prompt text */}
      <div
        style={{
          minHeight: "11rem",
          fontFamily: "var(--font-display, Fraunces, serif)",
          color: isFinal ? "var(--text)" : "var(--text)",
          letterSpacing: "-0.005em",
        }}
      >
        <AnimatePresence mode="wait">
          {isFinal ? (
            <motion.div
              key="safe"
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{ fontSize: "clamp(1rem, 1.4vw, 1.35rem)", lineHeight: 1.6 }}
            >
              <EditableText path="safePrompt" value={safePrompt}>
                {safePrompt}
              </EditableText>
            </motion.div>
          ) : (
            <motion.div
              key="redacted"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.4 } }}
              style={{
                fontSize: `clamp(${(1 * draftScale).toFixed(3)}rem, ${(
                  1.4 * draftScale
                ).toFixed(3)}vw, ${(1.35 * draftScale).toFixed(3)}rem)`,
                lineHeight: draftScale < 0.8 ? 1.45 : 1.6,
              }}
            >
              {parts.map((part, i) => (
                <PromptPartView
                  key={i}
                  part={part}
                  revealedCount={revealedCount}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer: Skicka-knapp + GODKÄND-stämpel */}
      <div
        style={{
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px dashed rgba(128,128,128,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <motion.div
          animate={{
            opacity: isFinal ? 0.5 : 0.7,
          }}
          style={{
            fontFamily: "var(--font-mono, JetBrains Mono, monospace)",
            fontSize: "clamp(0.75rem, 0.95vw, 0.95rem)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>{isFinal ? "→ Skicka" : "[ Skicka ]"}</span>
        </motion.div>

        <AnimatePresence>
          {isFinal ? <GodkändStamp label={okLabel} /> : null}
        </AnimatePresence>
      </div>

      {/* Stoppat-overlay-stämpel (visas under steg 1..N när minst en kategori är aktiv) */}
      <AnimatePresence>
        {!isFinal && revealedCount > 0 ? (
          <motion.div
            key="stop-stamp"
            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
            animate={{ opacity: 0.92, scale: 1, rotate: -8 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            style={{
              position: "absolute",
              top: "clamp(1.5rem, 3vh, 2.5rem)",
              right: "clamp(1.5rem, 3vw, 2.5rem)",
              fontFamily: "var(--font-display, Fraunces, serif)",
              fontWeight: 800,
              fontSize: "clamp(1rem, 1.5vw, 1.5rem)",
              color: RED,
              border: `2.5px solid ${RED}`,
              padding: "0.4rem 0.95rem",
              borderRadius: "0.35rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              background: "rgba(225,91,79,0.10)",
              boxShadow: `0 0 30px ${RED_GLOW}`,
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Stoppa
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function GodkändStamp({ label }: { label: string }) {
  return (
    <motion.div
      key="ok-stamp"
      initial={{ opacity: 0, scale: 0.5, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -5 }}
      exit={{ opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 280,
        damping: 14,
        delay: 0.55,
      }}
      style={{
        fontFamily: "var(--font-display, Fraunces, serif)",
        fontWeight: 800,
        fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
        color: GREEN,
        border: `2.5px solid ${GREEN}`,
        padding: "0.45rem 1.1rem",
        borderRadius: "0.4rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        background: "rgba(103,212,154,0.10)",
        boxShadow: `0 0 32px ${GREEN_GLOW}`,
        userSelect: "none",
      }}
    >
      <EditableText path="okLabel" value={label}>
        {label}
      </EditableText>
    </motion.div>
  );
}

// ---------- Prompt parts ----------

function PromptPartView({
  part,
  revealedCount,
}: {
  part: PromptPart;
  revealedCount: number;
}) {
  if (part.category === null) {
    return <span>{part.text}</span>;
  }
  const isRevealed = revealedCount >= part.category;
  if (!isRevealed) {
    return <span>{part.text}</span>;
  }
  return <RedactionTape text={part.text} category={part.category} />;
}

function RedactionTape({ text, category }: { text: string; category: number }) {
  // Tejp roterar lite — varje kategori en lite olika lutning för organisk känsla
  const rotations = [-1.4, 0.9, -0.7, 1.2, -1.1];
  const rotate = rotations[(category - 1) % rotations.length];

  return (
    <motion.span
      initial={{
        scaleX: 0,
        opacity: 0,
        rotate: rotate * 4,
      }}
      animate={{
        scaleX: 1,
        opacity: 1,
        rotate: rotate,
        x: [0, -4, 5, -2, 0],
      }}
      transition={{
        scaleX: { duration: 0.32, ease: [0.22, 1.4, 0.36, 1] },
        opacity: { duration: 0.18 },
        rotate: { duration: 0.32, ease: [0.22, 1.4, 0.36, 1] },
        x: { duration: 0.4, delay: 0.3, ease: "easeInOut" },
      }}
      style={{
        display: "inline-block",
        background: "linear-gradient(180deg, #1a1410 0%, #0a0908 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "transparent",
        padding: "0.05em 0.5em",
        margin: "0 0.08em",
        borderRadius: "0.18em",
        boxShadow:
          "0 4px 12px rgba(0,0,0,0.55), inset 0 -2px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        verticalAlign: "baseline",
        userSelect: "none",
        transformOrigin: "center",
        position: "relative",
      }}
    >
      <span style={{ visibility: "hidden" }}>{text}</span>
      {/* Diagonal-skugga som ger tejpkänsla */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "0.18em",
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.022) 0 6px, transparent 6px 12px)",
          pointerEvents: "none",
        }}
      />
    </motion.span>
  );
}

// ---------- Category seal (vaxsigill-aktig) ----------

function CategorySeal({
  label,
  description,
  isLit,
  isDone,
  index,
}: {
  label: string;
  description: string;
  isLit: boolean;
  isDone: boolean;
  index: number;
}) {
  // Subtil rotation så de inte ser stelt rakade ut
  const rotations = [-1.5, 1, -0.7, 1.4, -1.2, 0.6];
  const rotate = rotations[index % rotations.length];

  const color = isLit ? (isDone ? GREEN : RED) : "rgba(128,128,128,0.45)";
  const glow = isLit
    ? isDone
      ? GREEN_GLOW
      : RED_GLOW
    : "rgba(0,0,0,0)";

  return (
    <motion.div
      animate={{
        opacity: isLit ? 1 : 0.55,
        scale: isLit ? 1 : 0.92,
        rotate,
      }}
      transition={{ duration: 0.5, ease: [0.22, 1.2, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.35rem 0.5rem 0.6rem",
        flex: "0 0 auto",
        minWidth: "8rem",
      }}
    >
      <SealCircle isLit={isLit} isDone={isDone} color={color} glow={glow} />
      <div
        style={{
          textAlign: "center",
          lineHeight: 1.25,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display, Fraunces, serif)",
            fontWeight: 600,
            fontSize: "clamp(0.78rem, 1vw, 0.95rem)",
            color: isLit ? "var(--text)" : "var(--text-muted)",
            letterSpacing: "-0.005em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body, Inter, system-ui, sans-serif)",
            fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
            color: "var(--text-muted)",
            marginTop: "0.15rem",
            maxWidth: "10rem",
          }}
        >
          {description}
        </div>
      </div>
    </motion.div>
  );
}

function SealCircle({
  isLit,
  isDone,
  color,
  glow,
}: {
  isLit: boolean;
  isDone: boolean;
  color: string;
  glow: string;
}) {
  const size = "clamp(2.6rem, 4vw, 3.4rem)";
  return (
    <motion.div
      animate={{
        scale: isLit ? 1 : 0.85,
        boxShadow: isLit ? `0 0 24px ${glow}, 0 0 8px ${glow}` : "none",
      }}
      transition={{ type: "spring", stiffness: 280, damping: 16 }}
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        border: `2px solid ${color}`,
        background: isLit
          ? isDone
            ? `radial-gradient(circle at 30% 30%, rgba(103,212,154,0.32), rgba(103,212,154,0.08))`
            : `radial-gradient(circle at 30% 30%, rgba(225,91,79,0.4), rgba(225,91,79,0.1))`
          : "rgba(128,128,128,0.08)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AnimatePresence mode="wait">
        {isLit ? (
          isDone ? (
            <motion.svg
              key="check"
              width="55%"
              height="55%"
              viewBox="0 0 14 14"
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 14 }}
            >
              <path
                d="M2 7 L6 11 L12 3"
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="cross"
              width="42%"
              height="42%"
              viewBox="0 0 12 12"
              initial={{ scale: 0, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 14 }}
            >
              <path
                d="M2 2 L10 10 M10 2 L2 10"
                stroke={color}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </motion.svg>
          )
        ) : (
          <motion.span
            key="dot"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              width: "0.4rem",
              height: "0.4rem",
              borderRadius: "999px",
              background: "rgba(128,128,128,0.45)",
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
