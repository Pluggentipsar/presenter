"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";

interface SycophancyMirrorProps {
  projector?: boolean;
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Övergripande rubrik. */
  title?: string;
  /** Användarens fråga med självsäker ton. */
  confidentUser: string;
  /** AI:ns svar på den självsäkra frågan (bekräftar = sykofant). */
  confidentAi: string;
  /** Användarens fråga med osäker ton (samma fakta). */
  insecureUser: string;
  /** AI:ns svar på den osäkra frågan (rättar = inte sykofant). */
  insecureAi: string;
  /**
   * Slutkomment under båda spalterna. Stöder **fet**.
   * T.ex. "Samma fråga. Samma fakta. Bara olika ton."
   */
  punchline?: string;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
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

interface ChatBubbleProps {
  /** "user" eller "ai" — påverkar align och färg. */
  role: "user" | "ai";
  /** Texten i bubblan. */
  text: string;
  /** Tonalitetsmärkning ovanför ("Självsäker ton", "Osäker ton"). */
  tonality?: string;
  /** För AI: markering om svaret bekräftar (sykofant) eller rättar. */
  verdict?: "confirms" | "corrects";
  /** Animations-delay. */
  delay: number;
  visible?: boolean;
}

function ChatBubble({ role, text, tonality, verdict, delay, visible = true }: ChatBubbleProps) {
  const isUser = role === "user";
  const isConfirm = verdict === "confirms";
  const isCorrect = verdict === "corrects";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 16 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4rem",
        alignItems: isUser ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      {/* Tonality marker */}
      {tonality ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.55rem, 0.75vw, 0.7rem))",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: 500,
          }}
        >
          {tonality}
        </div>
      ) : null}

      {/* Verdict marker (AI only) */}
      {verdict ? (
        <div
          data-verdict={verdict}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--room-caption, clamp(0.55rem, 0.75vw, 0.7rem))",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: isConfirm ? "var(--accent)" : "rgba(126, 217, 87, 0.85)",
          }}
        >
          <span data-glow=""
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: isConfirm ? "var(--accent)" : "rgba(126, 217, 87, 0.85)",
              boxShadow: isConfirm
                ? "0 0 12px var(--accent-glow)"
                : "0 0 12px rgba(126, 217, 87, 0.5)",
            }}
          />
          {isConfirm ? "Sykofant — bekräftar" : "Rättar"}
        </div>
      ) : null}

      {/* Bubble */}
      <div data-card="" data-verdict={verdict}
        style={{
          maxWidth: "32em",
          padding: "clamp(0.9rem, 1.2vw, 1.2rem) clamp(1.1rem, 1.6vw, 1.5rem)",
          background: isUser
            ? "color-mix(in srgb, var(--text) 6%, transparent)"
            : isConfirm
              ? "var(--accent-dim)"
              : "rgba(126, 217, 87, 0.08)",
          border: isUser
            ? "1px solid color-mix(in srgb, var(--text) 12%, transparent)"
            : isConfirm
              ? "1px solid color-mix(in srgb, var(--accent) 40%, transparent)"
              : "1px solid rgba(126, 217, 87, 0.4)",
          borderRadius: "var(--radius)",
          borderTopRightRadius: isUser ? "0.1rem" : undefined,
          borderTopLeftRadius: !isUser ? "0.1rem" : undefined,
          fontFamily: isUser ? "var(--font-body)" : "var(--font-display)",
          fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.2rem))",
          lineHeight: 1.45,
          color: "var(--text)",
          fontStyle: !isUser ? "normal" : undefined,
          backdropFilter: "blur(6px)",
        }}
      >
        {renderInline(text)}
      </div>
    </motion.div>
  );
}

/**
 * SycophancyMirror — visualiserar sycophancy-experimentet.
 *
 * Två konversationer sida vid sida: samma fråga, olika ton.
 * Vänster: självsäker ton → AI bekräftar (sykofant).
 * Höger: osäker ton → AI rättar.
 *
 * Pedagogisk hjärtepunkt för AI-vänner-föreläsningen — visar att
 * sycophancy är ett mönster, inte en bugg, och att en simpel
 * tonförändring exponerar den.
 */
export function SycophancyMirror({
  projector = false,
  kicker,
  chapter,
  title,
  confidentUser,
  confidentAi,
  insecureUser,
  insecureAi,
  punchline,
}: SycophancyMirrorProps) {
  const step = useSlideSteps(projector ? 3 : 1);
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, var(--bg-surface) 0%, var(--bg) 75%)",
      }}
    >
      {/* Mirror line down the middle */}
      <motion.div
        aria-hidden
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 0.6 }}
        transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: "50%",
          top: "12%",
          bottom: "12%",
          width: "2px",
          background:
            "linear-gradient(180deg, transparent 0%, var(--text) 30%, var(--text) 70%, transparent 100%)",
          transformOrigin: "center",
          zIndex: 1,
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
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
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
            fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.95rem))",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "color-mix(in srgb, var(--text) 45%, transparent)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 4vw, 4rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
          justifyContent: "center",
        }}
      >
        {/* Title */}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight, 400)",
              fontSize: "clamp(1.6rem, 2.4vw, 2.4rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "32em",
              margin: "0 auto",
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title)}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* Two columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.5rem, 4vw, 4rem)",
            width: "100%",
            maxWidth: "var(--slide-max-width)",
            margin: "0 auto",
            alignItems: "stretch",
          }}
        >
          {/* Left column — confident */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.5vh, 1.2rem)",
            }}
          >
            <ChatBubble
              role="user"
              tonality="Självsäker ton"
              text={confidentUser}
              delay={0.6}
            />
            <ChatBubble
              role="ai"
              verdict="confirms"
              text={confidentAi}
              delay={projector ? 0 : 1.2}
              visible={!projector || step >= 1}
            />
          </div>

          {/* Right column — insecure */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.5vh, 1.2rem)",
            }}
          >
            <ChatBubble
              role="user"
              tonality="Osäker ton"
              text={insecureUser}
              delay={projector ? 0.6 : 1.8}
            />
            <ChatBubble
              role="ai"
              verdict="corrects"
              text={insecureAi}
              delay={projector ? 0 : 2.4}
              visible={!projector || step >= 2}
            />
          </div>
        </div>

        {/* Punchline */}
        {punchline ? (
          <motion.p
            data-punchline=""
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: !projector || step >= 2 ? 1 : 0, y: 0 }}
            transition={{ duration: 0.8, delay: projector ? 0 : 3.2 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--room-body, clamp(1.1rem, 1.6vw, 1.5rem))",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "36em",
              margin: "0 auto",
              letterSpacing: "0.005em",
            }}
          >
            <EditableText path="punchline" value={punchline}>
              {renderInline(punchline)}
            </EditableText>
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
