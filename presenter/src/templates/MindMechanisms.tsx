"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface Mechanism {
  name: string;
  description: string;
}

interface MindMechanismsProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Övergripande prefix/rubrik. */
  prefix?: string;
  /**
   * Markdown-lista med mekanismer.
   * Format: `- NAMN — BESKRIVNING`
   *
   * Exempel:
   *   - Auktoritetsbias — AI låter kunnig, vi sänker garden
   *   - Halo-effekten — välformulerat läses som sant
   */
  children?: ReactNode;
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractTextNode(el.props.children);
    if (t === "strong") return inner;
    if (t === "em") return inner;
    return inner;
  }
  return "";
}

function parseMechanisms(children: ReactNode): Mechanism[] {
  const out: Mechanism[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    // Stöd både " — " (em-dash) och " - "
    const splitter = raw.includes("—") ? "—" : "-";
    const [name = "", ...rest] = raw.split(splitter);
    const description = rest.join(splitter).trim();
    out.push({ name: name.trim(), description });
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

/**
 * MindMechanisms — numrerad lista av psykologiska bias-mekanismer,
 * designad som ett uppslag i en facklitterär bok.
 *
 * Layout:
 *   01  Auktoritetsbias
 *       AI låter kunnig, vi sänker garden
 *
 * Varje mekanism får ett tunt mono-nummer i accent-färg (terrakotta i
 * relationskritik-temat), själva namnet i serif italic accent, och
 * förklaringen i lugn löpande text. Tunn ornament-linje under varje.
 *
 * Stegvis reveal med 0.6s mellan varje. Tema-agnostisk.
 */
export function MindMechanisms({
  kicker,
  chapter,
  prefix,
  children,
}: MindMechanismsProps) {
  const mechanisms = parseMechanisms(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
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
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
          zIndex: 2,
        }}
      >
        {/* Prefix */}
        {prefix ? (
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.4rem, 2.2vw, 2rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              color: "var(--text)",
              textAlign: "center",
              margin: 0,
              marginBottom: "clamp(0.5rem, 1.5vh, 1.5rem)",
              fontStyle: "italic",
            }}
          >
            <EditableText path="prefix" value={prefix}>
              {prefix}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* Mekanism-lista */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            width: "100%",
            maxWidth: "min(54rem, 100%)",
          }}
        >
          {mechanisms.map((m, i) => (
            <MechanismRow
              key={i}
              mechanism={m}
              index={i}
              delay={0.7 + i * 0.6}
              isLast={i === mechanisms.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface MechanismRowProps {
  mechanism: Mechanism;
  index: number;
  delay: number;
  isLast: boolean;
}

function MechanismRow({ mechanism, index, delay, isLast }: MechanismRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "clamp(1.2rem, 2.5vw, 2.2rem)",
        alignItems: "baseline",
        padding: "clamp(0.9rem, 1.8vh, 1.5rem) 0",
        borderBottom: isLast
          ? "none"
          : "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
      }}
    >
      {/* Nummer */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.85rem, 1.1vw, 1.05rem)",
          letterSpacing: "0.18em",
          color: "var(--accent)",
          fontWeight: 500,
          fontVariantNumeric: "tabular-nums",
          paddingTop: "0.2em",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Innehåll */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.25rem, 0.6vh, 0.5rem)",
        }}
      >
        {/* Mekanism-namn */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(1.4rem, 2.2vw, 2rem)",
            lineHeight: 1.2,
            letterSpacing: "-0.015em",
            color: "var(--accent)",
          }}
        >
          {mechanism.name}
        </div>

        {/* Beskrivning */}
        {mechanism.description ? (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
              lineHeight: 1.5,
              color: "var(--text)",
              letterSpacing: "0.005em",
            }}
          >
            {mechanism.description}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
