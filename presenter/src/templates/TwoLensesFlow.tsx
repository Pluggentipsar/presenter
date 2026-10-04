"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface TwoLensesFlowProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /**
   * Markdown-lista. Tre rader (sista är "landningen").
   * Format: `- ANTECEDENT → CONSEQUENT`
   *
   * Exempel:
   *   - Bara psykologi → vi *skuldbelägger* eleven
   *   - Bara system → vi blir *maktlösa*
   *   - **Båda samtidigt** → vi kan jobba med det
   */
  children?: ReactNode;
}

interface FlowRow {
  antecedent: string;
  consequent: string;
  isLanding: boolean; // sista raden — får mer vikt
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
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseRows(children: ReactNode): FlowRow[] {
  const raw: { ant: string; cons: string }[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const text = extractTextNode(li.props.children).trim();
    if (!text) return;
    const [ant = "", cons = ""] = text.split("→").map((s) => s.trim());
    raw.push({ ant, cons });
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
  return raw.map((r, i) => ({
    antecedent: r.ant,
    consequent: r.cons,
    isLanding: i === raw.length - 1,
  }));
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span
          key={i}
          style={{ color: "var(--accent)", fontWeight: 700 }}
        >
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

/**
 * TwoLensesFlow — tre rader med "→"-pilar som bygger ett resonemang.
 *
 * Designat för slide 16 — där psykologi och system är två linser och
 * landningen är "båda samtidigt". Sista raden får visuellt företräde:
 * kraftigare typografi, ornament-linje under, längre paus.
 *
 * Tema-agnostisk. Stöd för **fet** (var(--accent)) och *kursiv* i text.
 */
export function TwoLensesFlow({
  kicker,
  chapter,
  children,
}: TwoLensesFlowProps) {
  const rows = parseRows(children);

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
          padding: "clamp(3rem, 6vw, 7rem)",
          gap: "clamp(1.5rem, 3.5vh, 2.8rem)",
          zIndex: 2,
        }}
      >
        {rows.map((row, i) => (
          <FlowRow key={i} row={row} delay={0.5 + i * 0.8} />
        ))}
      </div>
    </div>
  );
}

interface FlowRowProps {
  row: FlowRow;
  delay: number;
}

function FlowRow({ row, delay }: FlowRowProps) {
  const isLanding = row.isLanding;
  const baseFontSize = isLanding
    ? "clamp(1.6rem, 2.6vw, 2.4rem)"
    : "clamp(1.2rem, 1.9vw, 1.8rem)";
  // Primary statement text must read at full strength on light themes —
  // the landing/non-landing hierarchy is carried by font size, weight,
  // italic and the accent arrow/ornament, not by dimming the body text.
  const opacity = 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(1rem, 2.5vw, 2rem)",
        maxWidth: "min(64rem, 100%)",
        width: "100%",
        justifyContent: "center",
        position: "relative",
        paddingBottom: isLanding ? "clamp(0.8rem, 1.5vh, 1.3rem)" : 0,
      }}
    >
      {/* Antecedent (vänster) */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: isLanding ? "normal" : "italic",
          fontWeight: isLanding ? 500 : 400,
          fontSize: baseFontSize,
          lineHeight: 1.3,
          color: "var(--text)",
          textAlign: "right",
          flex: "1 1 0",
          maxWidth: "20em",
        }}
      >
        {renderInline(row.antecedent)}
      </div>

      {/* Pil */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.2 }}
        style={{
          flex: "0 0 auto",
          fontFamily: "var(--font-mono)",
          fontSize: isLanding
            ? "clamp(1.5rem, 2.5vw, 2.3rem)"
            : "clamp(1.2rem, 2vw, 1.8rem)",
          color: isLanding ? "var(--accent)" : "var(--text-muted)",
          fontWeight: isLanding ? 700 : 400,
        }}
      >
        →
      </motion.div>

      {/* Consequent (höger) */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: isLanding ? "normal" : "italic",
          fontWeight: isLanding ? 500 : 400,
          fontSize: baseFontSize,
          lineHeight: 1.3,
          color: "var(--text)",
          textAlign: "left",
          flex: "1 1 0",
          maxWidth: "20em",
        }}
      >
        {renderInline(row.consequent)}
      </div>

      {/* Ornament-linje under landning */}
      {isLanding ? (
        <motion.div
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: 1.0,
            delay: delay + 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(6rem, 12vw, 12rem)",
            height: "1.5px",
            background: "var(--accent)",
            transformOrigin: "center",
          }}
        />
      ) : null}
    </motion.div>
  );
}
