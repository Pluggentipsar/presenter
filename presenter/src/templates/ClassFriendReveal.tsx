"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

interface ClassFriendRevealProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Setup-mening — Joels förstahandsobservation. */
  context?: string;
  /** Stora påståendet. */
  title: string;
  /** Antal elever i klassrutnätet. Default 24. */
  classSize?: number | string;
  /** Etikett för den breda gruppen (~2/3). */
  friendLabel?: string;
  /** Bråktal för den breda gruppen. */
  friendFraction?: string;
  /** Etikett för den intensiva delmängden (~1/3). */
  nearLabel?: string;
  /** Bråktal för delmängden. */
  nearFraction?: string;
  /** Avslutande mening — morgondetaljen. */
  closing?: string;
}

function PersonIcon({ fill }: { fill: string }) {
  return (
    <svg
      viewBox="0 0 24 30"
      width="100%"
      height="100%"
      style={{ display: "block" }}
      aria-hidden
    >
      <circle cx="12" cy="7" r="5.4" fill={fill} />
      <path
        d="M12 14.4c-6.1 0-8.6 5.1-8.6 11.4 0 0.7 0.6 1.2 1.3 1.2h14.6c0.7 0 1.3-0.5 1.3-1.2 0-6.3-2.5-11.4-8.6-11.4z"
        fill={fill}
      />
    </svg>
  );
}

function LegendRow({
  swatch,
  fraction,
  label,
  delay,
}: {
  swatch: string;
  fraction: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: "clamp(0.6rem, 1.1vw, 1rem)",
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: "0.95rem",
          height: "0.95rem",
          borderRadius: "0.2rem",
          background: swatch,
          alignSelf: "center",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(1.3rem, 2.1vw, 2rem)",
          color: "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {fraction}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontStyle: "italic",
          fontSize: "clamp(0.9rem, 1.15vw, 1.1rem)",
          color: "var(--text-muted)",
          lineHeight: 1.35,
          maxWidth: "13em",
        }}
      >
        {label}
      </span>
    </motion.div>
  );
}

/**
 * ClassFriendReveal — "AI är elevernas vän", visualiserat som ett klassrum.
 *
 * Ett rutnät av elevfigurer fylls i: ~1/3 djup accent (nära vän), ~1/3
 * tonad accent (vän), resten dämpad (ingen relation). Bygger Joels
 * förstahandsobservation till en visuell gut-punch — publiken ser hur
 * stor del av ett klassrum det handlar om innan han säger siffran.
 *
 * Tema-agnostisk — enbart CSS-variabler.
 */
export function ClassFriendReveal({
  kicker,
  chapter,
  context,
  title,
  classSize = 24,
  friendLabel = "räckte upp handen: AI är en vän",
  friendFraction = "2 av 3",
  nearLabel = "av dem: en nära vän",
  nearFraction = "1 av 3",
  closing,
}: ClassFriendRevealProps) {
  const total = Math.max(
    3,
    typeof classSize === "string" ? parseInt(classSize, 10) || 24 : classSize,
  );
  const nearCount = Math.round(total / 3);
  const friendCount = Math.round((total * 2) / 3);
  const columns = Math.min(8, Math.ceil(Math.sqrt(total * 1.8)));

  const figures = Array.from({ length: total }, (_, i) => {
    if (i < nearCount) return "near" as const;
    if (i < friendCount) return "friend" as const;
    return "none" as const;
  });

  const colorFor = (k: "near" | "friend" | "none") =>
    k === "near"
      ? "var(--accent)"
      : k === "friend"
        ? "color-mix(in srgb, var(--accent) 40%, var(--bg-surface))"
        : "color-mix(in srgb, var(--text) 15%, transparent)";

  const gridDoneDelay = 0.9 + total * 0.035;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 80%)",
      }}
    >
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

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(2.5rem, 5vw, 5.5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.1rem, 2.4vh, 2rem)",
          zIndex: 2,
        }}
      >
        {/* Setup */}
        {context ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.3vw, 1.25rem)",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "30em",
              lineHeight: 1.4,
            }}
          >
            <EditableText path="context" value={context}>
              {context}
            </EditableText>
          </motion.div>
        ) : null}

        {/* Rubrik */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(2.1rem, 4vw, 3.7rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: "var(--text)",
            textAlign: "center",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>

        {/* Rutnät + teckenförklaring */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(1.5rem, 4vw, 4rem)",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "clamp(0.3rem, 1vh, 1rem)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: "clamp(0.3rem, 0.7vw, 0.6rem)",
            }}
          >
            {figures.map((k, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.9 + i * 0.035,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  width: "clamp(1.6rem, 2.6vw, 2.5rem)",
                  height: "clamp(2rem, 3.2vw, 3.1rem)",
                }}
              >
                <PersonIcon fill={colorFor(k)} />
              </motion.div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.9rem, 2vh, 1.6rem)",
            }}
          >
            <LegendRow
              swatch="var(--accent)"
              fraction={nearFraction}
              label={nearLabel}
              delay={gridDoneDelay + 0.2}
            />
            <LegendRow
              swatch="color-mix(in srgb, var(--accent) 40%, var(--bg-surface))"
              fraction={friendFraction}
              label={friendLabel}
              delay={gridDoneDelay + 0.5}
            />
          </div>
        </div>

        {/* Avslutning */}
        {closing ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: gridDoneDelay + 1.1 }}
            style={{
              marginTop: "clamp(0.3rem, 1vh, 0.9rem)",
              paddingTop: "clamp(0.7rem, 1.5vh, 1.2rem)",
              borderTop:
                "1px solid color-mix(in srgb, var(--text) 14%, transparent)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              color: "var(--text)",
              textAlign: "center",
              maxWidth: "34em",
              lineHeight: 1.45,
              letterSpacing: "0.005em",
            }}
          >
            <EditableText path="closing" value={closing}>
              {closing}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
