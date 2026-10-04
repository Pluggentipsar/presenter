"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface FeedbackSection {
  heading: string;
  body: string;
  exercises: string[];
}

interface VoiceFeedbackProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  /** Transkriberad talad prompt (det läraren säger in). */
  transcript?: string;
  background?: string;
  accent?: string;
  /** ms per tecken i typewriter. Default 14. */
  typeSpeed?: number;
  /**
   * Uppföljningsprompten i SAMMA chatt — steget som gör avlastningen till
   * elevens lärande ("Skapa nu tio övningar som tränar exakt det här…").
   * Renderas som en rad under sektionerna. Utelämnad → inget extra steg.
   */
  followUp?: string;
  /** Etikett för uppföljningsraden. Default "Samma chatt · nästa meddelande". */
  followUpLabel?: string;
  /** Resultat-chip efter uppföljningen, t.ex. "10 övningar · med facit". */
  resultBadge?: string;
  /**
   * Övningsbladet bakom chipen — "Övning 1 || Övning 2 || …". Anges den blir
   * resultBadge en KNAPP (mus, inte klicker): klick öppnar ett pappersark
   * där övningarna typas fram i två spalter. Klick utanför/X stänger.
   */
  sheetExercises?: string;
  /** Rubrik på övningsbladet. Default "Övningsblad". */
  sheetTitle?: string;
  /** Metarad under rubriken, t.ex. "Svenska · byggt på din egen text". */
  sheetMeta?: string;
  /**
   * Markdown-lista — varje rad är en feedback-sektion:
   *   - **Rubrik** · Kort beskrivning · Övning 1 | Övning 2 | Övning 3
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.78)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseSections(children: ReactNode): FeedbackSection[] {
  const out: FeedbackSection[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const headingRaw = parts[0].trim();
    const m = headingRaw.match(/^\*\*(.+?)\*\*$/);
    out.push({
      heading: m ? m[1] : headingRaw,
      body: parts[1]?.trim() ?? "",
      exercises: (parts[2] ?? "")
        .split("|")
        .map((e) => e.trim())
        .filter(Boolean),
    });
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

const DEFAULT_TRANSCRIPT =
  "eeh så… texten har ingen riktig röd tråd, det är svårt att följa. han hoppar mellan argument, det är oklart vad som är huvudtes. och så är det bland stycken där han bara… låter orden rulla typ. han har svårt att ta kritik… men jag behöver ändå säga vad som behöver förbättras. alltså röd tråd, kärnmeningar, inre länkning, slutsatsen, och hur han hanterar referaten. gör det uppmuntrande men rakt.";

const DEFAULT_SECTIONS: FeedbackSection[] = [
  {
    heading: "Röd tråd",
    body: "Din text rör sig tryggt mellan olika tankar — nu handlar det om att binda ihop dem så läsaren ser din väg.",
    exercises: [
      "Skriv en tesmening (1 mening) överst i varje stycke.",
      "Stryk en bisats i varje stycke och läs om — tydligare?",
    ],
  },
  {
    heading: "Kärnmeningar",
    body: "Några stycken bär sin egen sak men säger det först i mitten. Flytta upp.",
    exercises: [
      "Markera den meningen som säger mest i stycket. Börja stycket med den.",
    ],
  },
  {
    heading: "Inre länkning",
    body: "Dina tankar följer på varandra — men sambandsorden saknas. Läsaren får gissa.",
    exercises: [
      "Lägg in 'därför', 'trots att', 'till exempel' på minst tre ställen.",
      "Läs texten högt — hör du kopplingarna?",
    ],
  },
  {
    heading: "Slutsats och referat",
    body: "Slutsatsen finns men gömmer sig. Dessutom flyter referat och egen analys ihop.",
    exercises: [
      "Skriv om slutsatsen så den knyter tillbaka till din tes.",
      "Markera referat med 'Enligt X…' och egen analys separat.",
    ],
  },
];

function Waveform({ accent }: { accent: string }) {
  const bars = 42;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "3px",
        height: "3rem",
      }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const base = 0.3 + Math.sin(i * 0.3) * 0.25 + Math.random() * 0.3;
        return (
          <motion.div
            key={i}
            animate={{
              scaleY: [
                base,
                0.5 + Math.sin(i * 0.5) * 0.4,
                base,
                0.7 + Math.cos(i * 0.4) * 0.3,
                base,
              ],
            }}
            transition={{
              duration: 1.8 + Math.random() * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.03,
            }}
            style={{
              width: "3px",
              height: "100%",
              borderRadius: "2px",
              background: `linear-gradient(to top, ${accent}, ${withAlpha(accent, 0.67)})`,
              transformOrigin: "center",
            }}
          />
        );
      })}
    </div>
  );
}

function TypewriterText({ text, speed, delay }: { text: string; speed: number; delay: number }) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    setTyped("");
    const start = setTimeout(() => {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        if (i > text.length) {
          clearInterval(iv);
          return;
        }
        setTyped(text.slice(0, i));
      }, speed);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(start);
  }, [text, speed, delay]);
  return <>{typed}</>;
}

export function VoiceFeedback({
  kicker,
  title,
  subtitle,
  transcript = DEFAULT_TRANSCRIPT,
  background,
  accent = "var(--accent)",
  typeSpeed = 14,
  followUp,
  followUpLabel = "Samma chatt · nästa meddelande",
  resultBadge,
  sheetExercises,
  sheetTitle = "Övningsblad",
  sheetMeta,
  children,
}: VoiceFeedbackProps) {
  const sections = parseSections(children);
  const actualSections = sections.length > 0 ? sections : DEFAULT_SECTIONS;
  const sheetItems = (sheetExercises ?? "")
    .split("||")
    .map((s) => s.trim())
    .filter(Boolean);
  const [sheetOpen, setSheetOpen] = useState(false);

  // När ett foto/URL skickas in läggs en mörk scrim ovanpå slide-roten (se
  // resolveBackground). Headern sitter direkt på roten utan egen yta, så dess
  // text måste bli fast ljus över scrimmen — annars var(--text) som vanligt.
  const hasPhotoBg = !!background && (background.startsWith("/") || background.startsWith("http"));
  const titleColor = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const subtitleColor = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 3.5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.4rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1" style={{ flexShrink: 0 }}>
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
                fontWeight: 700,
                fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: titleColor,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.3vw, 1.35rem)",
                color: subtitleColor,
                margin: 0,
                lineHeight: 1.35,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Voice-transcript-bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "1.2rem",
            padding: "clamp(1rem, 1.4vw, 1.5rem) clamp(1.2rem, 1.7vw, 1.8rem)",
            borderRadius: "1rem",
            background: "var(--bg-elevated)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
            border: `1px solid ${withAlpha(accent, 0.21)}`,
            boxShadow: `0 18px 40px -12px rgba(0,0,0,0.5), 0 0 30px -15px ${withAlpha(accent, 0.25)}`,
            alignItems: "center",
          }}
        >
          {/* Mic + waveform */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              minWidth: "12rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <motion.div
                animate={{ boxShadow: [`0 0 0 0 ${withAlpha(accent, 0.5)}`, `0 0 0 12px ${withAlpha(accent, 0)}`] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                style={{
                  width: "2.3rem",
                  height: "2.3rem",
                  borderRadius: "50%",
                  background: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-hidden
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                    fill="rgba(245,246,250,0.92)"
                  />
                  <path
                    d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3M9 21h6"
                    stroke="rgba(245,246,250,0.92)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.68rem",
                  letterSpacing: "0.25em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 700,
                }}
              >
                Läraren talar
              </div>
            </div>
            <Waveform accent={accent} />
          </div>

          {/* Transkribering */}
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.2vw, 1.25rem)",
              lineHeight: 1.5,
              color: "var(--text)",
              paddingLeft: "1rem",
              borderLeft: `2px solid ${withAlpha(accent, 0.31)}`,
            }}
          >
            <EditableText path="transcript" value={transcript} label="Transkriberad röst-prompt">
              <TypewriterText text={transcript} speed={typeSpeed} delay={800} />
            </EditableText>
          </div>
        </motion.div>

        {/* AI strukturerat svar — 4 feedback-sektioner */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${actualSections.length}, 1fr)`,
            gap: "clamp(0.7rem, 1.1vw, 1.1rem)",
            minHeight: 0,
            alignItems: "stretch",
          }}
        >
          {actualSections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.7,
                delay: 4 + i * 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                padding: "clamp(0.9rem, 1.2vw, 1.2rem) clamp(1rem, 1.3vw, 1.3rem)",
                borderRadius: "0.65rem",
                background: "var(--bg-elevated)",
                backdropFilter: "blur(14px) saturate(140%)",
                WebkitBackdropFilter: "blur(14px) saturate(140%)",
                border: `1px solid ${withAlpha(accent, 0.21)}`,
                boxShadow:
                  "0 10px 24px -8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.62rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: accent,
                  fontWeight: 700,
                }}
              >
                0{i + 1}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(1.15rem, 1.5vw, 1.5rem)",
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {section.heading}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.9rem, 1.05vw, 1.1rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {section.body}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  marginTop: "0.3rem",
                  paddingTop: "0.5rem",
                  borderTop: "1px solid rgba(0,0,0,0.1)",
                }}
              >
                {section.exercises.map((ex, ei) => (
                  <div
                    key={ei}
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      alignItems: "flex-start",
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.88rem, 1vw, 1.05rem)",
                      color: "var(--text)",
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ color: accent, flexShrink: 0 }}>→</span>
                    <span>{ex}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Uppföljningen — avlastningen blir elevens lärande */}
        {followUp ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 5.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flexShrink: 0,
              display: "grid",
              gridTemplateColumns: resultBadge ? "auto 1fr auto" : "auto 1fr",
              gap: "clamp(0.9rem, 1.6vw, 1.5rem)",
              alignItems: "center",
              padding: "clamp(0.9rem, 1.3vw, 1.3rem) clamp(1.2rem, 1.7vw, 1.8rem)",
              borderRadius: "1rem",
              background: "var(--bg-elevated)",
              backdropFilter: "blur(18px) saturate(140%)",
              WebkitBackdropFilter: "blur(18px) saturate(140%)",
              border: `1.5px solid ${withAlpha(accent, 0.4)}`,
              boxShadow: `0 14px 34px -12px rgba(0,0,0,0.45), 0 0 26px -14px ${withAlpha(accent, 0.35)}`,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.75vw, 0.78rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 700,
                maxWidth: "9rem",
                lineHeight: 1.5,
              }}
            >
              {followUpLabel}
            </div>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.35vw, 1.4rem)",
                lineHeight: 1.4,
                color: "var(--text)",
                paddingLeft: "1rem",
                borderLeft: `2px solid ${withAlpha(accent, 0.35)}`,
              }}
            >
              <EditableText path="followUp" value={followUp} label="Uppföljningsprompt">
                {followUp}
              </EditableText>
            </div>
            {resultBadge ? (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 6.4, ease: [0.22, 1, 0.36, 1] }}
                whileHover={sheetItems.length > 0 ? { scale: 1.05 } : undefined}
                whileTap={sheetItems.length > 0 ? { scale: 0.97 } : undefined}
                onClick={() => sheetItems.length > 0 && setSheetOpen(true)}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.72rem, 0.95vw, 1rem)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--bg)",
                  background: accent,
                  padding: "0.55em 1em",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  border: "none",
                  cursor: sheetItems.length > 0 ? "pointer" : "default",
                  boxShadow: `0 6px 18px -6px ${withAlpha(accent, 0.55)}`,
                }}
                aria-haspopup={sheetItems.length > 0 ? "dialog" : undefined}
              >
                {resultBadge}
                {sheetItems.length > 0 ? "  ▸" : null}
              </motion.button>
            ) : null}
          </motion.div>
        ) : null}

        {/* Övningsbladet — pappersarket bakom chipen */}
        <AnimatePresence>
          {sheetOpen ? (
            <motion.div
              key="sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSheetOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "clamp(1.5rem, 3vh, 3rem)",
                background: "rgba(12, 16, 20, 0.55)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 34, rotate: -0.8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "relative",
                  width: "min(58rem, 94%)",
                  maxHeight: "100%",
                  overflowY: "auto",
                  background: "#FCFAF4",
                  color: "#26302E",
                  borderRadius: "0.5rem",
                  boxShadow: "0 40px 90px -30px rgba(0,0,0,0.65)",
                  padding: "clamp(1.6rem, 2.6vw, 2.8rem)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Stäng övningsbladet"
                  style={{
                    position: "absolute",
                    top: "0.9rem",
                    right: "1rem",
                    border: "none",
                    background: "transparent",
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.1rem",
                    color: "#9AA39E",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>

                {/* Dokumenthuvud */}
                <div style={{ borderBottom: "2.5px solid #26302E", paddingBottom: "0.8rem", marginBottom: "1.1rem" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: accent,
                      fontWeight: 700,
                      marginBottom: "0.35rem",
                    }}
                  >
                    Genererat ur din återkoppling · granskat av läraren
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "clamp(1.5rem, 2.2vw, 2.1rem)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {sheetTitle}
                    </h3>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)", color: "#6B756F" }}>
                      Namn: ______________ &nbsp; Datum: ________
                    </div>
                  </div>
                  {sheetMeta ? (
                    <div
                      style={{
                        marginTop: "0.3rem",
                        fontFamily: "var(--font-body)",
                        fontStyle: "italic",
                        fontSize: "clamp(0.85rem, 1vw, 1rem)",
                        color: "#6B756F",
                      }}
                    >
                      {sheetMeta}
                    </div>
                  ) : null}
                </div>

                {/* Övningarna — två spalter, typas fram */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "clamp(0.7rem, 1.2vw, 1.2rem) clamp(1.4rem, 2.2vw, 2.2rem)",
                  }}
                >
                  {sheetItems.map((ex, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.25 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
                      style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.65rem", alignItems: "start" }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 700,
                          fontSize: "clamp(1rem, 1.3vw, 1.25rem)",
                          color: accent,
                          lineHeight: 1.35,
                          minWidth: "1.6em",
                        }}
                      >
                        {i + 1}.
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
                          lineHeight: 1.45,
                        }}
                      >
                        {ex}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Dokumentfot */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.25 + sheetItems.length * 0.14 }}
                  style={{
                    marginTop: "1.3rem",
                    paddingTop: "0.7rem",
                    borderTop: "1px dashed #C6BFAE",
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
                    letterSpacing: "0.12em",
                    color: "#6B756F",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span>Facit på baksidan</span>
                  <span>Exemplen kommer ur din egen text</span>
                </motion.div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
