"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface Annotation {
  number: number;
  highlight: string;
  explanation: string;
}

interface LonelyTeenChatProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Kontext-text under telefonen i steg 1. T.ex. "En sextonåring. Söndag kväll." */
  context?: string;
  /** Användarens meddelande — typas fram med typewriter. */
  userMessage: string;
  /** AI:ns svar (visas i steg 2). */
  aiMessage: string;
  /**
   * Markdown-lista med markeringar.
   * Format: `- HIGHLIGHT_TEXT · FÖRKLARING`
   * HIGHLIGHT_TEXT är delsträngen i aiMessage som ska markeras rött.
   */
  children?: ReactNode;
  /** Footer-text som visas i steg 2 (under markeringarna). */
  footer?: string;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parseAnnotations(children: ReactNode): Annotation[] {
  const out: Annotation[] = [];
  let counter = 0;
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const [highlight = "", explanation = ""] = raw.split("·").map((p) => p.trim());
    counter += 1;
    out.push({ number: counter, highlight, explanation });
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

function renderAnnotatedText(
  text: string,
  annotations: Annotation[],
  showAnnotations: boolean,
): React.ReactNode[] {
  if (annotations.length === 0 || !showAnnotations) return [text];
  type Span = { start: number; end: number; annotation: Annotation };
  const spans: Span[] = [];
  for (const a of annotations) {
    if (!a.highlight) continue;
    const idx = text.indexOf(a.highlight);
    if (idx === -1) continue;
    spans.push({ start: idx, end: idx + a.highlight.length, annotation: a });
  }
  spans.sort((a, b) => a.start - b.start);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) nodes.push(text.slice(cursor, span.start));
    nodes.push(
      <motion.span
        key={`hl-${span.annotation.number}`}
        initial={{
          backgroundColor: "transparent",
          color: "inherit",
        }}
        animate={{
          backgroundColor: "color-mix(in srgb, var(--accent-alert) 18%, transparent)",
          color: "var(--accent-alert)",
        }}
        transition={{
          duration: 0.5,
          delay: 0.4 + span.annotation.number * 0.5,
        }}
        style={{
          padding: "0 0.2em",
          borderRadius: "0.15em",
          fontWeight: 500,
        }}
      >
        {text.slice(span.start, span.end)}
      </motion.span>,
    );
    cursor = span.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/**
 * LonelyTeenChat — en stor telefon på söndagskvällen.
 *
 * Två-stegs visuell berättelse på en slide:
 *
 * STEG 1 (initial):
 *   Telefon centrerad, något stor. Användarens meddelande typewriter:as
 *   fram tecken-för-tecken. Kontext-text under: "En sextonåring. Söndag
 *   kväll. Ensam hemma."
 *
 * STEG 2 (Space / ArrowRight):
 *   Telefon flyttar till vänster och krymper något. AI-svaret fade:as in
 *   med "typing..."-dots först, sedan rader. När meddelandet är inne
 *   kommer markeringarna fram — röd highlight på fraser + nummer-badges
 *   till höger med förklaringar. Footer-text fade:as in sist.
 *
 * Designat för slide 10+11 i en föreläsning — det
 * sykofantiska söndagskväll-momentet.
 */
export function LonelyTeenChat({
  kicker,
  chapter,
  context = "En sextonåring. Söndag kväll. Ensam hemma.",
  userMessage,
  aiMessage,
  children,
  footer,
  background,
  overlay,
  overlayMode = "dark",
}: LonelyTeenChatProps) {
  const annotations = parseAnnotations(children);
  // Två steg: 0 = bara user-bubblan, 1 = AI-svar + annoteringar
  const currentStep = useSlideSteps(2);
  const stage: 1 | 2 = currentStep === 0 ? 1 : 2;
  const [typed, setTyped] = useState("");

  // Typewriter för användarens meddelande
  useEffect(() => {
    setTyped("");
    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTyped(userMessage.slice(0, i));
        if (i >= userMessage.length) {
          clearInterval(interval);
        }
      }, 38);
      return () => clearInterval(interval);
    }, 1200);
    return () => clearTimeout(startTimer);
  }, [userMessage]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? buildBackgroundCss(background, overlay, overlayMode)
          : "radial-gradient(ellipse at 50% 50%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Subtil mörkare vinjett — kvällsstämning */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 0%, transparent 60%, rgba(0,0,0,0.04) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Stegnings-indikator nere */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.6, delay: 3.5 }}
        style={{
          position: "absolute",
          bottom: "clamp(1.5rem, 3vh, 2.5rem)",
          right: "clamp(2rem, 4vw, 3.5rem)",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.78vw, 0.75rem)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          zIndex: 3,
        }}
      >
        {stage} / 2  ·  {stage === 1 ? "→ vad svarar den?" : "→ nästa slide"}
      </motion.div>

      {/* Innehåll — flowar mellan steg 1 (centrerad) och steg 2 (vänster + annoteringar) */}
      <div
        className="relative h-full w-full"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          zIndex: 2,
        }}
      >
        <motion.div
          layout
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: stage === 1 ? "center" : "flex-start",
            gap: "clamp(2rem, 4vw, 4rem)",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Telefon + kontext (vänster sida när steg 2) */}
          <motion.div
            layout
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(1.2rem, 2.5vh, 2.2rem)",
              flex: "0 0 auto",
            }}
          >
            <Phone
              userMessage={userMessage}
              typed={typed}
              aiMessage={aiMessage}
              annotations={annotations}
              stage={stage}
            />

            {/* Kontext under telefonen (bara steg 1) */}
            <AnimatePresence>
              {stage === 1 && context ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontStyle: "italic",
                    fontSize: "clamp(1rem, 1.4vw, 1.3rem)",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    maxWidth: "20em",
                    letterSpacing: "0.005em",
                    lineHeight: 1.45,
                  }}
                >
                  <EditableText path="context" value={context}>
                    {context}
                  </EditableText>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          {/* Annoteringar (bara steg 2) */}
          <AnimatePresence>
            {stage === 2 ? (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "clamp(0.8rem, 1.6vh, 1.4rem)",
                  maxWidth: "min(32rem, 50%)",
                }}
              >
                {annotations.map((a, i) => (
                  <AnnotationCard
                    key={i}
                    annotation={a}
                    delay={1.4 + i * 0.5}
                  />
                ))}
                {footer ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.7,
                      delay: 1.4 + annotations.length * 0.5 + 0.4,
                    }}
                    style={{
                      marginTop: "clamp(0.7rem, 1.5vh, 1.3rem)",
                      paddingTop: "clamp(0.7rem, 1.5vh, 1.3rem)",
                      borderTop:
                        "1px solid color-mix(in srgb, var(--text) 15%, transparent)",
                      fontFamily: "var(--font-display)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.9rem, 1.15vw, 1.1rem)",
                      lineHeight: 1.45,
                      color: "var(--text)",
                      letterSpacing: "0.005em",
                    }}
                  >
                    <EditableText path="footer" value={footer}>
                      {footer}
                    </EditableText>
                  </motion.div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

interface PhoneProps {
  userMessage: string;
  typed: string;
  aiMessage: string;
  annotations: Annotation[];
  stage: 1 | 2;
}

function Phone({ userMessage, typed, aiMessage, annotations, stage }: PhoneProps) {
  const isStage1 = stage === 1;
  const userDone = typed.length >= userMessage.length;

  return (
    <motion.div
      layout
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        flex: "0 0 auto",
        width: isStage1
          ? "clamp(19rem, 28vw, 26rem)"
          : "clamp(16rem, 22vw, 21rem)",
        aspectRatio: "9 / 19.5",
        background: "color-mix(in srgb, var(--text) 92%, transparent)",
        borderRadius: "clamp(2rem, 3vw, 3rem)",
        padding: "clamp(0.55rem, 0.8vw, 0.9rem)",
        position: "relative",
        boxShadow: isStage1
          ? "0 40px 80px rgba(0,0,0,0.22), 0 0 80px color-mix(in srgb, var(--accent) 8%, transparent)"
          : "0 30px 60px rgba(0,0,0,0.18)",
        transition: "box-shadow 0.9s ease",
      }}
    >
      {/* Notch */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "clamp(1.2rem, 1.8vw, 1.8rem)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(4rem, 5.8vw, 5.8rem)",
          height: "clamp(1rem, 1.4vw, 1.4rem)",
          borderRadius: "clamp(0.55rem, 0.8vw, 0.8rem)",
          background: "color-mix(in srgb, var(--text) 96%, transparent)",
          zIndex: 5,
        }}
      />

      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--bg)",
          borderRadius: "clamp(1.5rem, 2.5vw, 2.5rem)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Statusbar */}
        <div
          style={{
            padding:
              "clamp(2.3rem, 3.5vh, 3.6rem) clamp(1.2rem, 1.8vw, 1.7rem) clamp(0.6rem, 1vh, 1rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.82vw, 0.78rem)",
            color: "var(--text)",
            fontWeight: 600,
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          <span>21:47</span>
          <span style={{ opacity: 0.65 }}>● ● ● ● ●</span>
        </div>

        {/* App-header */}
        <div
          style={{
            padding:
              "clamp(0.4rem, 0.8vh, 0.7rem) clamp(1rem, 1.5vw, 1.4rem) clamp(0.5rem, 1vh, 0.9rem)",
            borderBottom:
              "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "1.6rem",
              height: "1.6rem",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, var(--text)) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            C
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
              color: "var(--text)",
              fontWeight: 500,
            }}
          >
            Chattis
          </div>
        </div>

        {/* Chat */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "clamp(0.8rem, 1.4vw, 1.2rem)",
            paddingBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.7rem, 1.2vh, 1.1rem)",
          }}
        >
          {/* Användarens bubbla (typewriter) */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: "85%",
              padding: "clamp(0.6rem, 1vh, 0.85rem) clamp(0.85rem, 1.1vw, 1.05rem)",
              background: "color-mix(in srgb, var(--text) 8%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--text) 14%, transparent)",
              borderRadius: "1rem",
              borderTopRightRadius: "0.25rem",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.78rem, 1vw, 0.95rem)",
              lineHeight: 1.45,
              color: "var(--text)",
              position: "relative",
              minHeight: "1.4em",
            }}
          >
            <EditableText path="userMessage" value={userMessage}>
              {typed}
            </EditableText>
            {!userDone ? (
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  display: "inline-block",
                  width: "0.08em",
                  height: "1em",
                  marginLeft: "0.05em",
                  background: "var(--accent)",
                  verticalAlign: "middle",
                }}
              />
            ) : null}
          </div>

          {/* AI-typing dots (steg 2, kort delay) */}
          <AnimatePresence>
            {stage === 2 ? (
              <motion.div
                key="ai-bubble"
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "92%",
                  padding:
                    "clamp(0.75rem, 1.2vh, 1.05rem) clamp(0.9rem, 1.2vw, 1.15rem)",
                  background: "var(--accent-dim)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
                  borderRadius: "1rem",
                  borderTopLeftRadius: "0.25rem",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.78rem, 1vw, 0.95rem)",
                  lineHeight: 1.5,
                  color: "var(--text)",
                }}
              >
                <EditableText path="aiMessage" value={aiMessage}>
                  {renderAnnotatedText(aiMessage, annotations, true)}
                </EditableText>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function AnnotationCard({
  annotation,
  delay,
}: {
  annotation: Annotation;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        gap: "clamp(0.7rem, 1.1vw, 1rem)",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "1.8rem",
          height: "1.8rem",
          borderRadius: "50%",
          background: "var(--accent-alert)",
          color: "#FFFFFF",
          fontSize: "0.9rem",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        {annotation.number}
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.88rem, 1.08vw, 1.05rem)",
          lineHeight: 1.45,
          color: "var(--text)",
          fontStyle: "italic",
          paddingTop: "0.1rem",
        }}
      >
        {annotation.explanation}
      </div>
    </motion.div>
  );
}
