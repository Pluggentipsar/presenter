"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ConceptCloudProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  caveat?: string;
  accent?: string;
  background?: string;
  /** Sekunder mellan varje ord-reveal. Default 0.45. */
  staggerSeconds?: number;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseTerms(children: ReactNode): string[] {
  const out: string[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          const text = extractText(
            (li as ReactElement<{ children?: ReactNode }>).props.children,
          ).trim();
          if (text) out.push(text);
        }
      });
    }
  });
  return out;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CloudPosition {
  x: number;
  y: number;
  fontSize: number;
  opacity: number;
  initialAngle: number;
  rotation: number;
}

function computeCloudPositions(count: number, seed: number): CloudPosition[] {
  const rng = mulberry32(seed);
  const positions: CloudPosition[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.5;
    const radius = 22 + rng() * 18;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * (radius * 0.62);
    const fontSize = 1.4 + rng() * 1.4;
    const opacity = 0.62 + rng() * 0.38;
    const initialAngle = rng() * Math.PI * 2;
    const rotation = (rng() - 0.5) * 6;
    positions.push({ x, y, fontSize, opacity, initialAngle, rotation });
  }
  return positions;
}

interface ParticleSpec {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

function generateParticles(count: number, seed: number): ParticleSpec[] {
  const rng = mulberry32(seed);
  const out: ParticleSpec[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rng() * 100,
      y: rng() * 100,
      size: 1 + rng() * 2.5,
      duration: 4 + rng() * 6,
      delay: rng() * 4,
      opacity: 0.1 + rng() * 0.25,
    });
  }
  return out;
}

export function ConceptCloud({
  kicker,
  chapter,
  title,
  subtitle,
  caveat,
  accent = "var(--accent)",
  background,
  staggerSeconds = 0.45,
  children,
}: ConceptCloudProps) {
  const terms = parseTerms(children);
  const positions = useMemo(
    () => computeCloudPositions(terms.length, terms.length * 7919),
    [terms.length],
  );
  const particles = useMemo(() => generateParticles(36, 1337), []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [diag, setDiag] = useState(900);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDiag(Math.sqrt(r.width * r.width + r.height * r.height));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // En foto-bakgrund får en mörk scrim för läsbarhet — då stannar texten
  // ljus oavsett tema. Utan foto följer slide-roten temats --bg och texten
  // temats tokens (mörk text på ljust tema).
  const hasPhoto = !!background && (background.startsWith("/") || background.startsWith("http"));
  const onDarkScrim = hasPhoto;
  const bg = background
    ? hasPhoto
      ? `linear-gradient(rgba(10,9,8,0.75), rgba(10,9,8,0.85)), url('${background}') center/cover no-repeat`
      : background
    : "var(--slide-base, var(--bg))";

  // Textfärger: på mörk foto-scrim fixeras ljusa nyanser, annars temats tokens.
  const textColor = onDarkScrim ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onDarkScrim ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: bg }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${withAlpha(accent, 0.08)}, transparent 60%)`,
          pointerEvents: "none",
        }}
      />

      {/* Particle field */}
      <div
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {particles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, p.opacity, p.opacity, 0],
              y: [0, -20, -40, -60],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background: accent,
              filter: "blur(0.5px)",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "clamp(2rem, 4vh, 3.5rem)",
          left: "clamp(2rem, 4vw, 3.5rem)",
          right: "clamp(2rem, 4vw, 3.5rem)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: mutedColor,
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {kicker ? <span style={{ color: accent }}>{kicker}</span> : <span />}
        {chapter ? <span>{chapter}</span> : null}
      </div>

      {/* Title centered uppe */}
      {(title || subtitle) ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "clamp(5rem, 12vh, 9rem)",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            maxWidth: "min(48em, 88%)",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          {title ? (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.7rem, 3vw, 2.8rem)",
                lineHeight: 1.08,
                letterSpacing: "-0.022em",
                color: textColor,
                margin: 0,
              }}
            >
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
                lineHeight: 1.45,
                color: mutedColor,
                margin: "0.6rem 0 0 0",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>
      ) : null}

      {/* Cloud */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {terms.map((term, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const startX = Math.cos(pos.initialAngle) * diag;
          const startY = Math.sin(pos.initialAngle) * diag;
          return (
            <motion.div
              key={term + i}
              initial={{
                opacity: 0,
                x: startX,
                y: startY,
                scale: 0.5,
                rotate: pos.rotation * 4,
              }}
              animate={{
                opacity: pos.opacity,
                x: 0,
                y: 0,
                scale: 1,
                rotate: pos.rotation,
              }}
              transition={{
                duration: 1.2,
                delay: 0.6 + i * staggerSeconds,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                translate: "-50% -50%",
                fontFamily: "var(--font-display)",
                fontWeight: 500 + Math.round(pos.fontSize * 80),
                fontSize: `${pos.fontSize}rem`,
                color: i % 5 === 0 ? accent : textColor,
                letterSpacing: "-0.015em",
                whiteSpace: "nowrap",
                textShadow:
                  i % 5 === 0
                    ? `0 0 28px ${withAlpha(accent, 0.45)}`
                    : onDarkScrim
                      ? "0 2px 14px rgba(0,0,0,0.4)"
                      : "0 1px 10px rgba(0,0,0,0.08)",
              }}
            >
              {term}
            </motion.div>
          );
        })}
      </div>

      {/* Caveat nederst */}
      {caveat ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.6 + terms.length * staggerSeconds + 0.4,
          }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4vh, 3rem)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: mutedColor,
            textAlign: "center",
            maxWidth: "min(48em, 88%)",
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          {caveat}
        </motion.div>
      ) : null}
    </div>
  );
}
