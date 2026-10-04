"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * JagAIJagTriptych — tre hantverk (linjer), var och en som en Jag → AI → Jag-
 * rörelse. Människan *öppnar* (Jag · innan) och *stänger* (Jag · ditt omdöme) —
 * glödande accent-block; AI vidgar i mitten (bredd & motstånd) — dämpat block
 * med en utfläkt av riktningar bakom texten. Stegvis: en linje i taget vecklas
 * ut, så ytan andas och ingen drunknar i text.
 *
 * Den konkreta, yrkesnära tillämpningen av Jag-AI-Jag-modellen — människan är
 * protagonisten i båda ändar, AI förstärkaren i mitten. Förebådar
 * `JagAIJagCircles`.
 *
 * MDX-format — varje rad en linje, fyra delar separerade med ` :: `:
 *   `- Linje :: Jag innan :: AI bredd :: Jag ansvar`
 *
 * ```mdx
 * <JagAIJagTriptych
 *   kicker="§ Designa med AI · era linjer"
 *   title="Samma rörelse — ert hantverk."
 *   subtitle="Du öppnar med din avsikt. AI vidgar. Du stänger med ditt omdöme."
 * >
 * - Journalistik :: Du bär tesen och storyn :: tre motvinklar + de hårdaste invändningarna :: du avgör vilken som är ärlig — och står för varför
 * - Musik :: Du har känslan, en hook, en rad :: tjugo arrangemang runt den :: du hör vad som bär — och bygger det till ditt
 * - Grafisk form :: Du kommer med konceptet och ett varför :: tjugo riktningar på en minut :: du kuraterar, motiverar, försvarar valet
 * </JagAIJagTriptych>
 * ```
 */

interface JagAIJagTriptychProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Fas-tagg för människo-blocken. Default "Jag". */
  jagLabel?: string;
  /** Fas-tagg för mitten-blocket. Default "AI". */
  aiLabel?: string;
  /** Sub-not under första Jaget. Default "innan". */
  beforeNote?: string;
  /** Sub-not under AI-blocket. Default "bredd & motstånd". */
  aiNote?: string;
  /** Sub-not under sista Jaget. Default "ditt omdöme". */
  afterNote?: string;
  accent?: string;
  background?: string;
  /** Stegvis reveal — en linje per steg. Default true. */
  stepped?: boolean;
  children?: ReactNode;
}

interface Lane {
  linje: string;
  before: string;
  ai: string;
  after: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
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

function parseLanes(children: ReactNode): Lane[] {
  const out: Lane[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*::\s*/);
    if (parts.length < 4) return;
    out.push({
      linje: parts[0].trim(),
      before: parts[1].trim(),
      ai: parts[2].trim(),
      after: parts.slice(3).join(" :: ").trim(),
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

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
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

function resolveBackground(bg: string | undefined): string {
  const fallback =
    "radial-gradient(ellipse 90% 70% at 50% -10%, var(--bg-surface) 0%, var(--bg) 72%)";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(6,7,12,0.6), rgba(6,7,12,0.82)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

export function JagAIJagTriptych({
  kicker,
  chapter,
  title,
  subtitle,
  jagLabel = "Jag",
  aiLabel = "AI",
  beforeNote = "innan",
  aiNote = "bredd & motstånd",
  afterNote = "ditt omdöme",
  accent = "var(--accent)",
  background,
  stepped = true,
  children,
}: JagAIJagTriptychProps) {
  const lanes = parseLanes(children);
  const activeStep = useSlideSteps(Math.max(1, lanes.length));
  const visibleCount = stepped ? activeStep + 1 : lanes.length;
  const cols = Math.max(1, lanes.length);

  // När en foto-/url-bakgrund skickas in lägger vi en mörk scrim över den (se
  // resolveBackground) — då måste texten vara fast ljus oavsett tema. Annars
  // följer texten temat (mörk på ljust tema, ljus på mörkt).
  const hasPhotoBg = !!background && (background.startsWith("/") || background.startsWith("http"));
  const primaryText = hasPhotoBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedText = hasPhotoBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{
        background: resolveBackground(background),
        color: primaryText,
        padding: "clamp(2.4rem, 4.2vw, 4.6rem)",
      }}
    >
      {/* chapter top-right */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.4rem)",
            right: "clamp(2rem, 4vw, 3.4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: mutedText,
            zIndex: 4,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* header */}
      <div
        style={{
          flexShrink: 0,
          marginBottom: "clamp(1.3rem, 2.6vh, 2.3rem)",
          maxWidth: "54rem",
          position: "relative",
          zIndex: 3,
        }}
      >
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.72rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: accent,
              marginBottom: "0.75rem",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </motion.div>
        ) : null}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.85rem, 3.3vw, 3rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: primaryText,
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.3vw, 1.3rem)",
              color: mutedText,
              margin: "0.7rem 0 0",
              lineHeight: 1.4,
              maxWidth: "42em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.p>
        ) : null}
      </div>

      {/* triptyk */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "clamp(1rem, 2.4vw, 2.3rem)",
          alignItems: "stretch",
          minHeight: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {lanes.map((lane, i) => (
          <LaneColumn
            key={i}
            lane={lane}
            visible={i < visibleCount}
            accent={accent}
            jagLabel={jagLabel}
            aiLabel={aiLabel}
            beforeNote={beforeNote}
            aiNote={aiNote}
            afterNote={afterNote}
            primaryText={primaryText}
            mutedText={mutedText}
            onPhotoBg={hasPhotoBg}
          />
        ))}
      </div>

      {/* progress */}
      {stepped && lanes.length > 1 ? (
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            justifyContent: "center",
            marginTop: "clamp(0.9rem, 1.8vh, 1.5rem)",
            flexShrink: 0,
          }}
        >
          {lanes.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                background:
                  i <= activeStep
                    ? accent
                    : hasPhotoBg
                      ? "rgba(255,255,255,0.28)"
                      : "var(--text-muted)",
                width: i === activeStep ? "1.8rem" : "0.45rem",
              }}
              transition={{ duration: 0.4 }}
              style={{ height: "2px", borderRadius: "1px" }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LaneColumn({
  lane,
  visible,
  accent,
  jagLabel,
  aiLabel,
  beforeNote,
  aiNote,
  afterNote,
  primaryText,
  mutedText,
  onPhotoBg,
}: {
  lane: Lane;
  visible: boolean;
  accent: string;
  jagLabel: string;
  aiLabel: string;
  beforeNote: string;
  aiNote: string;
  afterNote: string;
  primaryText: string;
  mutedText: string;
  onPhotoBg: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      {/* linje-namn */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(1.1rem, 1.65vw, 1.55rem)",
          letterSpacing: "-0.01em",
          color: primaryText,
          marginBottom: "clamp(0.7rem, 1.5vh, 1.15rem)",
          paddingBottom: "0.55rem",
          borderBottom: `1px solid ${withAlpha(accent, 0.32)}`,
        }}
      >
        {lane.linje}
      </div>

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <PhaseBlock
          variant="jag"
          label={jagLabel}
          note={beforeNote}
          text={lane.before}
          accent={accent}
          visible={visible}
          delay={0.14}
          primaryText={primaryText}
          mutedText={mutedText}
          onPhotoBg={onPhotoBg}
        />
        <Connector accent={accent} visible={visible} delay={0.28} />
        <PhaseBlock
          variant="ai"
          label={aiLabel}
          note={aiNote}
          text={lane.ai}
          accent={accent}
          visible={visible}
          delay={0.38}
          primaryText={primaryText}
          mutedText={mutedText}
          onPhotoBg={onPhotoBg}
        />
        <Connector accent={accent} visible={visible} delay={0.52} />
        <PhaseBlock
          variant="jagFinal"
          label={jagLabel}
          note={afterNote}
          text={lane.after}
          accent={accent}
          visible={visible}
          delay={0.62}
          primaryText={primaryText}
          mutedText={mutedText}
          onPhotoBg={onPhotoBg}
        />
      </div>
    </motion.div>
  );
}

function PhaseBlock({
  variant,
  label,
  note,
  text,
  accent,
  visible,
  delay,
  primaryText,
  mutedText,
  onPhotoBg,
}: {
  variant: "jag" | "ai" | "jagFinal";
  label: string;
  note: string;
  text: string;
  accent: string;
  visible: boolean;
  delay: number;
  primaryText: string;
  mutedText: string;
  onPhotoBg: boolean;
}) {
  const isAi = variant === "ai";
  const isFinal = variant === "jagFinal";

  // AI-blocket är ett neutralt "dämpat" kort. På foto-bakgrund hålls det ljust-
  // transparent (scrim är mörk); annars följer det temat via bg-surface så det
  // syns på både mörkt och ljust tema.
  const aiBg = onPhotoBg ? "rgba(255,255,255,0.05)" : "var(--bg-surface)";
  const aiBorder = onPhotoBg
    ? "1px solid rgba(255,255,255,0.14)"
    : "1px solid rgba(0,0,0,0.1)";

  const bg = isAi
    ? aiBg
    : isFinal
      ? `linear-gradient(135deg, ${withAlpha(accent, 0.17)}, ${withAlpha(accent, 0.05)})`
      : `linear-gradient(135deg, ${withAlpha(accent, 0.09)}, ${withAlpha(accent, 0.02)})`;
  const border = isAi
    ? aiBorder
    : isFinal
      ? `1px solid ${withAlpha(accent, 0.62)}`
      : `1px solid ${withAlpha(accent, 0.32)}`;
  const boxShadow = isFinal
    ? `0 16px 40px -14px ${withAlpha(accent, 0.42)}, inset 0 1px 0 rgba(255,255,255,0.07)`
    : "none";
  const tagColor = isAi ? mutedText : accent;
  const textColor = isAi ? mutedText : primaryText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={
        visible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 12, scale: 0.98 }
      }
      transition={{
        duration: 0.55,
        delay: visible ? delay : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        position: "relative",
        borderRadius: "0.7rem",
        background: bg,
        border,
        boxShadow,
        padding:
          "clamp(0.62rem, 1vw, 0.95rem) clamp(0.8rem, 1.15vw, 1.05rem) clamp(0.62rem, 1vw, 0.95rem) clamp(1rem, 1.4vw, 1.3rem)",
        overflow: "hidden",
      }}
    >
      {isAi ? <BreadthFan accent={accent} /> : null}
      {!isAi ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "3px",
            background: isFinal ? accent : withAlpha(accent, 0.55),
            boxShadow: isFinal ? `0 0 12px ${withAlpha(accent, 0.7)}` : "none",
          }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
          marginBottom: "0.3rem",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.78vw, 0.78rem)",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: tagColor,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.55rem, 0.66vw, 0.66rem)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: mutedText,
          }}
        >
          · {note}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.88rem, 1.1vw, 1.1rem)",
          lineHeight: 1.32,
          color: textColor,
          fontWeight: isFinal ? 600 : 400,
        }}
      >
        {renderInline(text, accent)}
      </div>
    </motion.div>
  );
}

/** AI-blockets "vidgning" — riktningar som fläks ut från en punkt. */
function BreadthFan({ accent }: { accent: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.55,
        color: withAlpha(accent, 0.45),
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {[-34, -17, 0, 17, 34].map((dx, i) => (
        <line
          key={i}
          x1="50"
          y1="4"
          x2={50 + dx}
          y2="58"
          stroke="currentColor"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}

/** Vertikal flödeslinje + chevron mellan faserna. */
function Connector({
  accent,
  visible,
  delay,
}: {
  accent: string;
  visible: boolean;
  delay: number;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, delay: visible ? delay : 0 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "clamp(0.85rem, 1.7vh, 1.4rem)",
        color: withAlpha(accent, 0.6),
      }}
    >
      <div
        style={{
          width: "1px",
          flex: 1,
          background: `linear-gradient(to bottom, ${withAlpha(accent, 0.5)}, ${withAlpha(accent, 0.18)})`,
        }}
      />
      <svg width="11" height="6" viewBox="0 0 11 6" style={{ marginTop: "-1px" }}>
        <path
          d="M1 1 L5.5 5 L10 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
