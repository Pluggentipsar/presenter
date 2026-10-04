"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

/**
 * InboxContrast — två mejl-mockups sida vid sida.
 *
 * Bygger spännvidden i en målgrupp genom att visa två faktiska
 * förfrågningar Joel fått: en hopplöst-efter och en redan-på-väg.
 * Mejlen renderas som realistiska inbox-kort (avsändare, datum,
 * ärenderad, kropp) med en badge överst. Landings-mening under båda.
 *
 * MDX-format:
 *
 * ```mdx
 * <InboxContrast
 *   chapter="§ Spännvidden"
 *   leftBadge="Förfrågan A"
 *   leftFrom="Mellanstadielärare"
 *   leftDate="14 mars · 21:43"
 *   leftSubject="Behöver hjälp"
 *   leftBody="Hej Joel, vi vill att du kommer..."
 *   rightBadge="Förfrågan B"
 *   rightFrom="Skolchef, gymnasium"
 *   rightDate="14 mars · 09:17"
 *   rightSubject="Kan du komma och prata?"
 *   rightBody="Hej Joel, vi har ändå kommit en bit..."
 *   landing="Det ser, helt enkelt, extremt olika ut."
 * />
 * ```
 */

interface InboxContrastProps {
  kicker?: string;
  chapter?: string;
  title?: string;

  leftBadge?: string;
  leftFrom: string;
  leftDate?: string;
  leftSubject: string;
  leftBody: string;
  leftAccent?: string;

  rightBadge?: string;
  rightFrom: string;
  rightDate?: string;
  rightSubject: string;
  rightBody: string;
  rightAccent?: string;

  landing?: string;
}

function EmailCard({
  badge,
  from,
  date,
  subject,
  body,
  accent,
  delay,
  tilt,
}: {
  badge?: string;
  from: string;
  date?: string;
  subject: string;
  body: string;
  accent: string;
  delay: number;
  tilt: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: tilt * 1.4 }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        borderRadius: "clamp(0.4rem, 0.7vw, 0.75rem)",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.18), 0 0 0 1px color-mix(in srgb, var(--text) 8%, transparent)",
        padding: "clamp(1.2rem, 2vw, 2rem)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.8rem, 1.4vh, 1.2rem)",
        maxWidth: "26rem",
      }}
    >
      {badge ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(-0.9rem, -1.4vh, -1.2rem)",
            left: "clamp(1rem, 1.6vw, 1.4rem)",
            background: accent,
            color: "#0c0c10",
            padding: "0.35em 0.9em",
            borderRadius: "9999px",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {badge}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "1rem",
          paddingBottom: "clamp(0.6rem, 1vh, 0.9rem)",
          borderBottom:
            "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.5rem, 1vw, 0.8rem)",
          }}
        >
          <div
            aria-hidden
            style={{
              width: "clamp(2rem, 2.6vw, 2.4rem)",
              height: "clamp(2rem, 2.6vw, 2.4rem)",
              borderRadius: "9999px",
              background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 50%, #000) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0c0c10",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)",
              flexShrink: 0,
            }}
          >
            {from.slice(0, 1)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.85rem, 1.15vw, 1.05rem)",
              color: "var(--text)",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            {from}
          </div>
        </div>
        {date ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {date}
          </div>
        ) : null}
      </div>

      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.05rem, 1.5vw, 1.45rem)",
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
        }}
      >
        {subject}
      </div>

      <div
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.9rem, 1.1vw, 1.05rem)",
          color: "var(--text-muted)",
          lineHeight: 1.55,
          fontStyle: "italic",
        }}
      >
        "{body}"
      </div>
    </motion.div>
  );
}

export function InboxContrast({
  kicker,
  chapter,
  title,
  leftBadge = "Förfrågan A",
  leftFrom,
  leftDate,
  leftSubject,
  leftBody,
  leftAccent = "#C77352",
  rightBadge = "Förfrågan B",
  rightFrom,
  rightDate,
  rightSubject,
  rightBody,
  rightAccent = "#5DBE7B",
  landing,
}: InboxContrastProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
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

      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 9vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
        }}
      >
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.6rem, 2.8vw, 2.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              textAlign: "center",
              margin: 0,
              maxWidth: "30em",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.5rem, 3vw, 3rem)",
            width: "100%",
            maxWidth: "62rem",
            alignItems: "stretch",
          }}
        >
          <EmailCard
            badge={leftBadge}
            from={leftFrom}
            date={leftDate}
            subject={leftSubject}
            body={leftBody}
            accent={leftAccent}
            delay={0.6}
            tilt={-1.5}
          />
          <EmailCard
            badge={rightBadge}
            from={rightFrom}
            date={rightDate}
            subject={rightSubject}
            body={rightBody}
            accent={rightAccent}
            delay={0.9}
            tilt={1.5}
          />
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: "clamp(0.5rem, 1.5vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.7vw, 1.7rem)",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "30em",
              lineHeight: 1.4,
              letterSpacing: "-0.005em",
            }}
          >
            <EditableText path="landing" value={landing}>
              {landing}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
