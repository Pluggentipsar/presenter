"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";

interface BotnetRevealProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Path till video som visas i höger panel. */
  video: string;
  /** Tre rader: `Titel · Beskrivning`. Den tredje får alert-färg. */
  steps: string;
  /** Payoff längst ner. */
  bottomLine?: string;
}

interface StepDef {
  title: string;
  description: string;
  dots: number;
  alert: boolean;
}

function parseSteps(raw: string): StepDef[] {
  const lines = raw
    .split(/\s*\|\s*/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line, i) => {
    const [t, d] = line.split(/\s*·\s*/);
    return {
      title: (t ?? "").trim(),
      description: (d ?? "").trim(),
      dots: i === 0 ? 3 : i === 1 ? 24 : 96,
      alert: i === lines.length - 1,
    };
  });
}

/**
 * Visualiserar hur ett fåtal aktörer förstärks till en folkmassa via botnät.
 * Tre staged-reveal kort till vänster med dot-clusters som växer — en
 * prominent video till höger som visar verkligt exempel. Payoff längst ner.
 */
export function BotnetReveal({
  kicker,
  chapter,
  title,
  subtitle,
  video,
  steps,
  bottomLine,
}: BotnetRevealProps) {
  const stepDefs = parseSteps(steps);
  const accent = "var(--accent)";
  const alertColor = "var(--accent-alert, #ff5c7a)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(2.2rem, 3.8vw, 3.6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.2rem, 2.2vh, 2rem)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "2rem",
          }}
        >
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 500,
              }}
            >
              {kicker}
            </motion.div>
          ) : <span />}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {chapter}
            </motion.div>
          ) : null}
        </div>

        {/* Title-block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: "32em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 3.5vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.98rem, 1.15vw, 1.18rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.75rem 0 0 0",
                maxWidth: "32em",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        {/* Main split */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
            gap: "clamp(1.5rem, 2.5vw, 2.5rem)",
            minHeight: 0,
          }}
        >
          {/* Vänster: stegvisa kort */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.7rem, 1.1vh, 1rem)",
              justifyContent: "center",
            }}
          >
            {stepDefs.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 26,
                  delay: 0.4 + i * 0.55,
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(110px, 22%) 1fr",
                  alignItems: "center",
                  gap: "clamp(0.85rem, 1.4vw, 1.3rem)",
                  padding: "clamp(0.9rem, 1.4vw, 1.3rem)",
                  borderRadius: "1rem",
                  background: step.alert
                    ? `linear-gradient(135deg, ${withAlpha(alertColor, 0.16)} 0%, ${withAlpha(alertColor, 0.04)} 100%)`
                    : "var(--bg-surface)",
                  border: step.alert
                    ? `1.5px solid ${withAlpha(alertColor, 0.55)}`
                    : "1px solid rgba(0,0,0,0.1)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: step.alert
                    ? `0 14px 38px -10px ${withAlpha(alertColor, 0.4)}, inset 0 1px 0 ${withAlpha(alertColor, 0.3)}`
                    : "0 10px 28px -10px rgba(0,0,0,0.18)",
                }}
              >
                <DotCluster
                  count={step.dots}
                  color={step.alert ? alertColor : accent}
                  delay={0.6 + i * 0.55}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
                      fontWeight: 500,
                      letterSpacing: "-0.018em",
                      lineHeight: 1.2,
                      color: step.alert ? alertColor : "var(--text)",
                    }}
                  >
                    {step.title}
                  </div>
                  {step.description ? (
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.85rem, 1vw, 1rem)",
                        lineHeight: 1.45,
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Höger: video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              borderRadius: "1.25rem",
              overflow: "hidden",
              background: "var(--bg-elevated, var(--bg-surface))",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow:
                "0 32px 64px -16px rgba(0,0,0,0.32), 0 14px 32px -10px var(--accent-glow, rgba(0,0,0,0.25))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "clamp(0.6rem, 0.9vw, 1rem)",
            }}
          >
            <AutoVideo src={video} />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse at 50% 100%, var(--accent-dim, rgba(255,255,255,0.04)) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />
          </motion.div>
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2.2 }}
            style={{
              borderTop: "1px solid rgba(0,0,0,0.1)",
              paddingTop: "clamp(0.9rem, 1.4vh, 1.2rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.05rem, 1.35vw, 1.35rem)",
              color: "var(--text)",
              lineHeight: 1.4,
              maxWidth: "62em",
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function DotCluster({
  count,
  color,
  delay,
}: {
  count: number;
  color: string;
  delay: number;
}) {
  const size = count <= 5 ? 12 : count <= 30 ? 7 : 4;
  const gap = count <= 5 ? 8 : count <= 30 ? 5 : 3;
  const cols = Math.ceil(Math.sqrt(count));

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${size}px)`,
        gap: `${gap}px`,
        justifyContent: "center",
        alignContent: "center",
        padding: "0.4rem",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 22,
            delay: delay + (i / count) * 0.5,
          }}
          style={{
            width: size,
            height: size,
            borderRadius: "9999px",
            background: color,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

function AutoVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => setNeedsTap(true));
      }
    };
    tryPlay();
  }, []);

  return (
    <>
      <video
        ref={ref}
        src={src}
        playsInline
        loop
        muted
        autoPlay
        preload="metadata"
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) v.play();
          else v.pause();
          setNeedsTap(false);
        }}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          borderRadius: "0.8rem",
          cursor: "pointer",
          display: "block",
        }}
      />
      {needsTap ? (
        <button
          type="button"
          onClick={() => {
            const v = ref.current;
            if (!v) return;
            v.play();
            setNeedsTap(false);
          }}
          aria-label="Spela upp"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: "clamp(60px, 7vw, 90px)",
              height: "clamp(60px, 7vw, 90px)",
              borderRadius: "9999px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 28px var(--accent-glow, rgba(0,0,0,0.4))",
            }}
          >
            <svg width="38%" height="42%" viewBox="0 0 24 24" fill="rgba(245,246,250,0.92)">
              <path d="M6 4 L20 12 L6 20 Z" />
            </svg>
          </span>
        </button>
      ) : null}
    </>
  );
}
