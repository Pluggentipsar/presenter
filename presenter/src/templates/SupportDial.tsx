"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * SupportDial — stödnivån som en ratt eleven vrider, visad som chatt.
 *
 * Poängen är inte att fyra nivåer finns. Poängen är att det är EN mening
 * eleven lägger till som ändrar allt — samma fråga, fyra helt olika svar.
 * Därför står elevens fråga stilla i chatten medan tillägget och AI-svaret
 * byts ut när man stegar.
 *
 * Mellanslag stegar Mild → Extra stark. Nivåerna är också klickbara: ropar
 * någon i publiken "visa Stark!" går det att hoppa dit och sedan fortsätta
 * stega, precis som i `RoleSelector`.
 *
 * ```mdx
 * <SupportDial
 *   kicker="§ 2 · Välj stödnivå"
 *   title="Eleven väljer hur mycket hjälp AI får ge."
 *   question="Jag ska skriva en argumenterande text om skoluniform. Jag fastnar."
 *   bottomLine="Differentiering handlar också om hur mycket hjälp eleven får."
 * >
 * - Mild · Förklara och visa exempel. · Ett argument har tre delar …
 * - Medium · Ge ledtrådar. · Du har tre påståenden men bara ett skäl …
 * </SupportDial>
 * ```
 *
 * Per rad: `Nivå · Elevens tillägg · AI:ns svar`. Antalet rader styr både
 * stegen och hur många segment styrkemätaren har.
 */

interface SupportDialProps {
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Rubrik ovanför kolumnerna. */
  title?: string;
  /** Elevens fråga — står kvar oförändrad genom alla nivåer. */
  question?: string;
  /** Namn över elevens bubblor. */
  userLabel?: string;
  /** Namn över AI:ns bubbla. */
  aiLabel?: string;
  /** Etikett över nivålistan. */
  levelLabel?: string;
  /** Slutrad under kolumnerna. */
  bottomLine?: string;
  /** Hur länge skrivindikatorn visas innan svaret byts, i ms. */
  typingMs?: number;
  children?: ReactNode;
}

interface Level {
  /** Nivåns namn — "Mild", "Stark" … */
  name: string;
  /** Meningen eleven lägger till sin fråga. */
  ask: string;
  /** AI:ns svar på den nivån. */
  reply: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parseLevels(children: ReactNode): Level[] {
  const out: Level[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      name: (parts[0] ?? "").trim(),
      ask: (parts[1] ?? "").trim(),
      // Allt efter andra separatorn hör till svaret — så att AI-svaret själv
      // får innehålla ett · utan att raden faller isär.
      reply: parts.slice(2).join(" · ").trim(),
    });
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

/** Styrkemätaren: ett segment per nivå, ifyllda upp till och med `filled`. */
function StrengthMeter({
  total,
  filled,
  active,
}: {
  total: number;
  filled: number;
  active: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: "0.22rem", alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: "clamp(0.7rem, 1.1vw, 1.05rem)",
            height: "clamp(0.34rem, 0.5vh, 0.46rem)",
            // Temats radie i stället för hårdkodad pill: 0 i kobolt (en
            // mätare, inte prickar), kapsel i glasteman där en radie större
            // än halva höjden klipps till rundade ändar.
            borderRadius: "var(--radius)",
            background:
              i < filled
                ? active
                  ? "var(--accent)"
                  : "color-mix(in srgb, var(--accent) 38%, transparent)"
                : "color-mix(in srgb, var(--text) 12%, transparent)",
            transition: "background 0.35s",
          }}
        />
      ))}
    </div>
  );
}

/** Tre pulserande punkter — AI:n "skriver" innan svaret byts. */
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "0.3rem", padding: "0.2rem 0" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
          style={{
            width: "0.42rem",
            height: "0.42rem",
            borderRadius: "var(--radius)",
            // Skrivindikatorn är gränssnitt, inte blottläggning — därför
            // dämpad text i stället för accent.
            background: "var(--text-muted)",
          }}
        />
      ))}
    </div>
  );
}

export function SupportDial({
  kicker,
  chapter,
  title,
  question,
  userLabel = "Eleven",
  aiLabel = "AI:n",
  levelLabel = "Stödnivå",
  bottomLine,
  typingMs = 420,
  children,
}: SupportDialProps) {
  const levels = useMemo(() => parseLevels(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(levels.length);
  // Klick vinner tills stegordningen rör sig igen — samma mönster som
  // RoleSelector, så att ett publikinitierat hopp inte låser stegningen.
  const [picked, setPicked] = useState<{ atStep: number; index: number } | null>(
    null,
  );

  const stepIndex = Math.min(step, Math.max(levels.length - 1, 0));
  const active = picked && picked.atStep === step ? picked.index : stepIndex;
  const current = levels[active];

  // Skrivindikator vid varje nivåbyte. Utan den byts svaret så abrupt att det
  // läser som en textväxling istället för ett nytt svar.
  //
  // `typing` HÄRLEDS ur vilken nivå som hunnit skrivas färdigt, i stället för
  // att sättas i effekten. Då slipper vi setState i effekt-kroppen, och en
  // nivåväxling slår igenom direkt i samma render i stället för efter en extra.
  const [typedFor, setTypedFor] = useState<number | null>(null);
  const typing = !reduceMotion && typedFor !== active;
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(() => setTypedFor(active), typingMs);
    return () => clearTimeout(timer);
  }, [active, reduceMotion, typingMs]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-ambient-bg=""
      style={{
        // Glasteman behåller vinjetten. I kobolt plattas den till
        // var(--slide-base, var(--bg)) av [data-ambient-bg] i globals.css, så
        // sliden får samma rena papper som grannarna.
        background:
          "radial-gradient(ellipse at 50% 15%, var(--bg-surface) 0%, var(--bg) 70%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(0.9rem, 2.4vh, 1.7rem)",
          padding: "clamp(2rem, 4.2vw, 4.2rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
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

        {title ? (
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.35rem, 2.3vw, 2.2rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.12,
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        ) : null}

        {/* ————— Ratten + chatten ————— */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(1rem, 2.4vw, 2.2rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {/* Nivåerna */}
          <div
            style={{
              flex: "1 1 15rem",
              minWidth: "13rem",
              maxWidth: "22rem",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.35rem, 0.9vh, 0.6rem)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.55rem, 0.72vw, 0.72rem)",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "0.2rem",
              }}
            >
              <EditableText path="levelLabel" value={levelLabel}>
                {levelLabel}
              </EditableText>
            </span>

            {levels.map((level, i) => {
              const isActive = i === active;
              const reached = i <= Math.max(stepIndex, active);
              return (
                <motion.button
                  key={i}
                  type="button"
                  data-card="flat"
                  onClick={() => setPicked({ atStep: step, index: i })}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: reached ? 1 : 0.34, x: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.45,
                    delay: reduceMotion ? 0 : 0.08 + i * 0.07,
                    ease: EASE,
                  }}
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    padding:
                      "clamp(0.5rem, 1.1vh, 0.8rem) clamp(0.7rem, 1.3vw, 1.1rem)",
                    borderRadius: "var(--radius)",
                    // Kanten nedan gäller glasteman. I kobolt tvingar
                    // [data-card] 2 px bläck på ALLA knappar — då bär
                    // fyllningen, accentetiketten och vikten 700 vilken nivå
                    // eleven valt. Det är data, inte dekoration.
                    border: `1.5px solid ${
                      isActive
                        ? "var(--accent)"
                        : "color-mix(in srgb, var(--text) 12%, transparent)"
                    }`,
                    background: isActive
                      ? "color-mix(in srgb, var(--accent) 10%, var(--bg-elevated))"
                      : "color-mix(in srgb, var(--text) 3%, transparent)",
                    // Accentglowen släcks av [data-card="flat"] i joelsai.
                    boxShadow: isActive
                      ? "0 14px 34px -22px var(--accent-glow)"
                      : "none",
                    transition: reduceMotion
                      ? "none"
                      : "background 0.35s, border-color 0.35s, box-shadow 0.35s",
                  }}
                >
                  <StrengthMeter
                    total={levels.length}
                    filled={i + 1}
                    active={isActive}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "clamp(0.95rem, 1.35vw, 1.3rem)",
                      letterSpacing: "-0.015em",
                      color: isActive ? "var(--accent)" : "var(--text)",
                      transition: reduceMotion ? "none" : "color 0.35s",
                    }}
                  >
                    {level.name}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Chatten */}
          <div
            data-card=""
            style={{
              flex: "2 1 24rem",
              minWidth: "19rem",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.4rem, 1vh, 0.7rem)",
              background: "var(--bg-elevated)",
              // Kant, radie och skugga nedan gäller glasteman. I kobolt
              // ersätter [data-card] dem med 2 px bläck, rak kant och hård
              // offsetskugga — !important i globals.css vinner över inline.
              border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
              borderRadius: "var(--radius)",
              padding: "clamp(0.9rem, 1.9vw, 1.6rem)",
              boxShadow:
                "0 28px 65px -42px color-mix(in srgb, var(--accent) 40%, transparent)",
            }}
          >
            {/* Elevens fråga — konstanten */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.52rem, 0.68vw, 0.68rem)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                alignSelf: "flex-end",
                marginRight: "0.3rem",
              }}
            >
              <EditableText path="userLabel" value={userLabel}>
                {userLabel}
              </EditableText>
            </span>

            {question ? (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "86%",
                  padding: "0.6rem 0.95rem",
                  // Temats radie i stället för hårdkodad bubbla: rak kant i
                  // kobolt, rundad i glasteman. Chattsvansen skalas med
                  // radien och försvinner därmed av sig själv i joelsai.
                  borderRadius: "var(--radius)",
                  borderBottomRightRadius: "calc(var(--radius) / 4)",
                  // Eleven är bläck, inte signalfärg — rött är blottläggning.
                  background: "var(--text)",
                  color: "var(--bg)",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                  lineHeight: 1.45,
                }}
              >
                <EditableText path="question" value={question}>
                  {question}
                </EditableText>
              </div>
            ) : null}

            {/* Meningen eleven lägger till — det som faktiskt ändrar svaret */}
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "86%",
                minHeight: "clamp(2.1rem, 5vh, 2.8rem)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              {/* Keyad på `active` istället för AnimatePresence: nyckelbytet
                  monterar om noden, så entrén spelas utan att innehållet är
                  beroende av att en exit-animation hinner bli klar. */}
              <motion.div
                key={active}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.34, ease: EASE }}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: "var(--radius)",
                  borderBottomRightRadius: "calc(var(--radius) / 4)",
                  // Den enda accentfärgen som får stå kvar i chatten: det här
                  // är meningen som faktiskt ändrar svaret.
                  border: "1.5px solid var(--accent)",
                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  color: "var(--text)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: "clamp(0.82rem, 1vw, 1rem)",
                  lineHeight: 1.4,
                }}
              >
                {current?.ask}
              </motion.div>
            </div>

            {/* AI:ns svar */}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.52rem, 0.68vw, 0.68rem)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginLeft: "0.3rem",
                marginTop: "0.2rem",
              }}
            >
              <EditableText path="aiLabel" value={aiLabel}>
                {aiLabel}
              </EditableText>
            </span>

            <div
              style={{
                flex: 1,
                minHeight: "clamp(5rem, 15vh, 9rem)",
                display: "flex",
                alignItems: "flex-start",
              }}
            >
              {/* Bubblan är alltid monterad — bara innehållet växlar från
                  punkter till svar. Svaret får därmed aldrig hänga på att en
                  exit-animation blir klar. */}
              <motion.div
                key={active}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.38, ease: EASE }}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "94%",
                  padding: typing ? "0.55rem 0.95rem" : "0.7rem 1rem",
                  borderRadius: "var(--radius)",
                  borderBottomLeftRadius: "calc(var(--radius) / 4)",
                  background: "color-mix(in srgb, var(--text) 5%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
                  color: "var(--text)",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.84rem, 1.02vw, 1.02rem)",
                  lineHeight: 1.5,
                }}
              >
                <motion.span
                  key={typing ? "dots" : "reply"}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22 }}
                  style={{ display: "block" }}
                >
                  {typing ? <TypingDots /> : current?.reply}
                </motion.span>
              </motion.div>
            </div>
          </div>
        </div>

        {bottomLine ? (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.88rem, 1.2vw, 1.2rem)",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {bottomLine}
            </EditableText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
