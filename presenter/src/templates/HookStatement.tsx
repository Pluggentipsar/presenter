"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { extractText } from "@/lib/extract-text";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";

interface HookStatementProps {
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Accentfärg för emfaserade ord (**fet**). Default orange. */
  accent?: string;
  /** Mörk overlay på bakgrunden (0-1). Default 0.7 för dramatik. */
  overlay?: number | string;
  /** Paus efter sista ord innan publik kan gå vidare. Default 2400ms. */
  pauseAfter?: number;
  /** Chapter-markör uppe till höger. */
  chapter?: string;
  /**
   * Sätt true för att rita en box-breathing-ram runt texten.
   * Glödande dot vandrar längs kanten i 4-taktscykel (4s per sida = 16s loop):
   * In → Håll → Ut → Håll. Tänkt som visuellt skämt eller andnings­paus.
   */
  boxBreath?: boolean;
  /**
   * Andra påståendet — visas först på NÄSTA klick, medan huvudtexten
   * tonas ned. Utan denna prop har sliden inga steg alls och beter sig
   * exakt som förut.
   *
   * Stödjer samma `**fet**` / `*kursiv*` som children.
   */
  reveal?: string;
  /**
   * Texten som ska renderas ord-för-ord.
   * `**ord**` → accent-färg + större scale + längre delay efter.
   * `*ord*` → italic.
   */
  children?: ReactNode;
}

interface HookWord {
  text: string;
  emphasis: "none" | "em" | "strong";
  /** Extra delay efter detta ord — längre för emphasis och punctuation. */
  postDelay: number;
}

function parseHookWords(text: string): HookWord[] {
  const out: HookWord[] = [];
  // Split på space men behåll ** och * markeringar
  const chunks = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\s+)/g).filter((s) => s.length > 0);
  for (const chunk of chunks) {
    if (/^\s+$/.test(chunk)) continue; // hoppa mellanrum

    let emphasis: HookWord["emphasis"] = "none";
    let clean = chunk;
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      emphasis = "strong";
      clean = chunk.slice(2, -2);
    } else if (chunk.startsWith("*") && chunk.endsWith("*")) {
      emphasis = "em";
      clean = chunk.slice(1, -1);
    }

    // Om clean innehåller flera ord (efter ** stripping) — splitta
    const words = clean.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isLast = i === words.length - 1;
      // Punktuation i slutet → längre paus
      const endsWithPunct = /[.!?—]$/.test(word);
      let postDelay = 0.08; // default space-delay
      if (endsWithPunct) postDelay += 0.35;
      if (emphasis === "strong" && isLast) postDelay += 0.4; // extra andning efter betonat slutord
      out.push({ text: word, emphasis, postDelay });
    }
  }
  return out;
}

/**
 * Kumulativ delay per ord. Varje ord väntar ut föregående ords varaktighet
 * plus dess postDelay, så betonade ord och skiljetecken ger andrum.
 */
function computeTimings(
  words: HookWord[],
  startDelay: number,
): Array<{ word: HookWord; delay: number }> {
  return words.reduce<Array<{ word: HookWord; delay: number }>>((acc, w) => {
    const prev = acc[acc.length - 1];
    const prevDelay = prev?.delay ?? startDelay;
    const prevWord = prev?.word;
    const prevDuration = prevWord
      ? 0.35 + (prevWord.emphasis !== "none" ? 0.15 : 0)
      : 0;
    const prevPostDelay = prevWord ? prevWord.postDelay : 0;
    const delay = prev ? prevDelay + prevPostDelay + prevDuration * 0.4 : startDelay;
    return [...acc, { word: w, delay }];
  }, []);
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.7;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.1)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * HookStatement — en provokativ öppnings-mening som reveals ord-för-ord
 * med programmerad pacing. Betonade ord (`**ord**`) får längre paus efter
 * och orange glow. Efter sista ordet fryser slidan en paus-tid (pauseAfter)
 * innan nästa navigation känns naturlig.
 *
 * Use case: dramatiska öppningar som "Det finns ingen uppgift på gymnasienivå
 * som en chattbot inte löser med gott resultat."
 *
 * Med `reveal` blir sliden tvåstegs: huvudtexten spelar ord-för-ord som
 * vanligt, och på nästa klick tonas den ned medan andra påståendet kommer
 * fram under en accent-linje. Används för briefens "på nästa klick"-vändningar.
 */
export function HookStatement({
  background,
  accent = "var(--accent)",
  overlay = 0.7,
  // pauseAfter används mest som metadata — animation-delay räcker
  chapter,
  boxBreath = false,
  reveal,
  children,
}: HookStatementProps) {
  const raw = extractText(children).trim();
  const words = parseHookWords(raw);
  const revealWords = reveal ? parseHookWords(reveal.trim()) : [];

  // Utan reveal registreras noll steg — sliden beter sig precis som förut.
  const step = useSlideSteps(reveal ? 2 : 0);
  const revealed = Boolean(reveal) && step >= 1;

  // När bakgrunden är en bild lägger resolveBackground en mörk scrim ovanpå
  // (rgba(10,9,8,...)). Då måste texten vara fast ljus oavsett tema, annars
  // blir var(--text) nästan-svart text på mörk scrim osynlig på ljust tema.
  const hasImageScrim = !!background && (background.startsWith("/") || background.startsWith("http"));
  const textColor = hasImageScrim ? "rgba(245,246,250,0.92)" : "var(--text)";

  // Räkna kumulativ delay per ord (avancerar med varje words postDelay + wordDuration)
  const timings = computeTimings(words, 0.5);
  // Revealen spelar snabbare — publiken har redan läst in sig på rytmen.
  const revealTimings = computeTimings(revealWords, 0.15);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Subtil accent-glow uppe. Klassen ambient-accent låter tysta teman
          (kobolt: rent papper) släcka lagret — se globals.css. */}
      <div
        aria-hidden
        className="ambient-accent"
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${withAlpha(accent, 0.08)} 0%, transparent 70%)`,
        }}
      />

      {/* Chapter-markör */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: hasImageScrim ? "rgba(245,246,250,0.6)" : "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Centrerat textblock */}
      <div
        className={`relative flex h-full w-full items-center justify-center${
          reveal ? " flex-col" : ""
        }`}
        style={{
          padding: "clamp(3rem, 7vw, 8rem)",
          zIndex: 2,
          gap: reveal ? "clamp(1.4rem, 3.5vh, 2.6rem)" : undefined,
        }}
      >
        <motion.div
          // initial={false} — utan den skriver framer-motion inte ut opacity
          // i SSR-stilen men gör det på klienten, och hydreringen spricker.
          initial={false}
          animate={{ opacity: revealed ? 0.3 : 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            padding: boxBreath ? "clamp(2rem, 4vh, 3.5rem) clamp(2.5rem, 5vw, 4.5rem)" : undefined,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "calc(clamp(2rem, 3.8vw, 3.6rem) * var(--display-scale, 1))",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: textColor,
            textAlign: "center",
            maxWidth: "22em",
            textShadow: hasImageScrim ? "0 8px 40px rgba(0,0,0,0.6)" : "none",
          }}
        >
          {boxBreath ? (
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.8 }}
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                border: `1.5px solid ${withAlpha(accent, 0.33)}`,
                borderRadius: "0.4rem",
                boxShadow: `inset 0 0 60px ${withAlpha(accent, 0.06)}, 0 0 30px ${withAlpha(accent, 0.13)}`,
              }}
            >
              {/* Vandrande glödande dot */}
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "0.85rem",
                  height: "0.85rem",
                  marginTop: "-0.425rem",
                  marginLeft: "-0.425rem",
                  borderRadius: "50%",
                  background: accent,
                  boxShadow: `0 0 18px ${accent}, 0 0 36px ${withAlpha(accent, 0.53)}`,
                  animation: "box-breath-dot 16s linear infinite",
                }}
              />
              {/* Sid-etiketter */}
              {(["In", "Håll", "Ut", "Håll"] as const).map((label, i) => {
                const positions = [
                  { top: "-1.85rem", left: "50%", transform: "translateX(-50%)" },
                  { top: "50%", right: "-3.2rem", transform: "translateY(-50%)" },
                  { bottom: "-1.85rem", left: "50%", transform: "translateX(-50%)" },
                  { top: "50%", left: "-3.2rem", transform: "translateY(-50%)" },
                ];
                return (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      ...positions[i],
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.8vw, 0.85rem)",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      color: `${withAlpha(accent, 0.8)}`,
                      animation: `box-breath-label-${i} 16s linear infinite`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </motion.div>
          ) : null}

          {timings.map((t, i) => {
            const { word, delay } = t;
            const isStrong = word.emphasis === "strong";
            const isEm = word.emphasis === "em";
            return (
              <motion.span
                key={i}
                initial={{
                  opacity: 0,
                  y: 18,
                  filter: "blur(14px)",
                  scale: isStrong ? 0.85 : 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  scale: 1,
                }}
                transition={{
                  duration: isStrong ? 0.9 : 0.6,
                  delay,
                  ease: isStrong ? [0.22, 1.3, 0.36, 1] : [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "inline-block",
                  marginRight: "0.3em",
                  color: isStrong ? accent : undefined,
                  fontStyle: isEm ? "italic" : undefined,
                  fontWeight: isStrong ? 800 : undefined,
                  textShadow: isStrong
                    ? `0 8px 40px ${withAlpha(accent, 0.4)}, 0 0 80px ${withAlpha(accent, 0.2)}`
                    : undefined,
                }}
              >
                {word.text}
              </motion.span>
            );
          })}
        </motion.div>

        {/* Andra påståendet — eget klick-steg */}
        {reveal ? (
          <AnimatePresence>
            {revealed ? (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { duration: 0.25 } }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "clamp(1rem, 2.4vh, 1.8rem)",
                  // Ingen em-baserad bredd här: omslagets font-size är den
                  // ärvda 16px, så em skulle klämma texten till en smal spalt
                  // oavsett hur stor själva revealen är. Begränsningen sitter
                  // på textblocket i stället, där em räknas mot rätt storlek.
                  width: "100%",
                }}
              >
                {/* Accent-linje som ritas ut */}
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: "clamp(3rem, 7vw, 6rem)",
                    height: "2px",
                    background: accent,
                    transformOrigin: "center",
                    boxShadow: `0 0 20px ${withAlpha(accent, 0.6)}`,
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontStyle: "italic",
                    fontSize: "clamp(1.9rem, 3.9vw, 3.7rem)",
                    lineHeight: 1.18,
                    letterSpacing: "-0.025em",
                    color: accent,
                    textAlign: "center",
                    // em mot den EGNA storleken — här blir 18em ~900px, alltså
                    // gott om plats för en rad i stället för en smal spalt.
                    maxWidth: "18em",
                    textShadow: hasImageScrim
                      ? "0 8px 40px rgba(0,0,0,0.6)"
                      : `0 8px 50px ${withAlpha(accent, 0.28)}`,
                  }}
                >
                  <EditableText path="reveal" value={reveal}>
                    {revealTimings.map((t, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{
                          duration: 0.55,
                          delay: 0.35 + t.delay,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          display: "inline-block",
                          marginRight: "0.28em",
                          fontStyle: t.word.emphasis === "em" ? "italic" : undefined,
                          fontWeight: t.word.emphasis === "strong" ? 800 : undefined,
                        }}
                      >
                        {t.word.text}
                      </motion.span>
                    ))}
                  </EditableText>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        ) : null}
      </div>

      {boxBreath ? (
        <style>{`
          @keyframes box-breath-dot {
            0%   { top: 0;    left: 0;    }
            25%  { top: 0;    left: 100%; }
            50%  { top: 100%; left: 100%; }
            75%  { top: 100%; left: 0;    }
            100% { top: 0;    left: 0;    }
          }
          @keyframes box-breath-label-0 {
            0%, 22%, 78%, 100% { opacity: 1; }
            28%, 72%           { opacity: 0.25; }
          }
          @keyframes box-breath-label-1 {
            0%, 22%   { opacity: 0.25; }
            28%, 47%  { opacity: 1;    }
            53%, 100% { opacity: 0.25; }
          }
          @keyframes box-breath-label-2 {
            0%, 47%   { opacity: 0.25; }
            53%, 72%  { opacity: 1;    }
            78%, 100% { opacity: 0.25; }
          }
          @keyframes box-breath-label-3 {
            0%, 72%   { opacity: 0.25; }
            78%, 97%  { opacity: 1;    }
            100%      { opacity: 0.25; }
          }
        `}</style>
      ) : null}
    </div>
  );
}
