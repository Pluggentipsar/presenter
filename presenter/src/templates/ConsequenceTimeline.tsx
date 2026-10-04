"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface TimelineRow {
  date: string;
  text: string;
}

interface ConsequenceTimelineProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Rubrik högst upp. Default: "Det här fick konsekvenser." */
  title?: string;
  /**
   * Markdown-lista med tidslinje-rader.
   * Format: `- DATUM · TEXT`
   */
  children?: ReactNode;
  /** Hjälplinjer i footer (komma- eller punkt-separerade). */
  helpLines?: string;
  /**
   * Sätt en specifik rad till "alert" — använder var(--accent-alert) på datumet.
   * 1-indexerat. Default: ingen är alert.
   */
  alertRow?: number | string;
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

function parseRows(children: ReactNode): TimelineRow[] {
  const out: TimelineRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const [date = "", text = ""] = raw.split("·").map((p) => p.trim());
    out.push({ date, text });
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
 * ConsequenceTimeline — värdig datum-tidslinje för "när det går illa".
 *
 * Designat för slide 13.5 i en föreläsning — Adam Raine-
 * fallet kopplat till OpenAI:s designval. Lugn, neutralt formspråk:
 * datum i mono-font till vänster, prickad vertikal linje i mitten,
 * berättande text till höger. Inga porträtt, inga bilder, ingen drama-
 * tisering.
 *
 * En rad kan markeras som "alert" (röd) för att lyfta fram nyckeldatumet
 * — typiskt det datum då tragedin skedde. Footer med hjälplinjer.
 */
export function ConsequenceTimeline({
  kicker,
  chapter,
  title = "Det här fick konsekvenser.",
  children,
  helpLines,
  alertRow,
  background,
  overlay,
  overlayMode = "dark",
}: ConsequenceTimelineProps) {
  const rows = parseRows(children);
  const alertIdx =
    typeof alertRow === "string" ? parseInt(alertRow, 10) : alertRow;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background
          ? buildBackgroundCss(background, overlay, overlayMode)
          : "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 80%)",
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
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(2rem, 4vh, 3.5rem)",
          zIndex: 2,
        }}
      >
        {/* Rubrik */}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "clamp(1.7rem, 2.8vw, 2.6rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              textAlign: "center",
              margin: 0,
              marginBottom: "clamp(0.5rem, 1vh, 1rem)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
        ) : null}

        {/* Tidslinje */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: "min(54rem, 100%)",
            position: "relative",
          }}
        >
          {/* Vertikal linje bakom (subtil) */}
          <motion.div
            aria-hidden
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 0.5 }}
            transition={{ duration: 1.4, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              left: "clamp(7rem, 11vw, 11rem)",
              top: "1.2rem",
              bottom: "1.2rem",
              width: "1px",
              background:
                "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--text) 25%, transparent) 15%, color-mix(in srgb, var(--text) 25%, transparent) 85%, transparent 100%)",
              transformOrigin: "top",
            }}
          />

          {rows.map((row, i) => (
            <TimelineRow
              key={i}
              row={row}
              delay={0.8 + i * 0.5}
              isAlert={i + 1 === alertIdx}
              isLast={i === rows.length - 1}
            />
          ))}
        </div>

        {/* Help-lines footer */}
        {helpLines ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.8 + rows.length * 0.5 + 0.5,
            }}
            style={{
              marginTop: "clamp(0.5rem, 1.5vh, 1.5rem)",
              paddingTop: "clamp(1rem, 2vh, 1.6rem)",
              borderTop:
                "1px solid color-mix(in srgb, var(--text) 15%, transparent)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--accent-alert)",
              fontWeight: 600,
              textAlign: "center",
              maxWidth: "min(54rem, 100%)",
              width: "100%",
            }}
          >
            <EditableText path="helpLines" value={helpLines}>
              {helpLines}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

interface TimelineRowProps {
  row: TimelineRow;
  delay: number;
  isAlert: boolean;
  isLast: boolean;
}

function TimelineRow({ row, delay, isAlert, isLast }: TimelineRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "clamp(7rem, 11vw, 11rem) 2rem 1fr",
        alignItems: "baseline",
        padding:
          "clamp(0.7rem, 1.3vh, 1.1rem) 0 clamp(0.9rem, 1.7vh, 1.5rem)",
        position: "relative",
      }}
    >
      {/* Datum */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.85rem, 1.1vw, 1.05rem)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: isAlert ? "var(--accent-alert)" : "var(--accent)",
          fontWeight: isAlert ? 700 : 600,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
          paddingRight: "clamp(0.7rem, 1.2vw, 1rem)",
        }}
      >
        {row.date}
      </div>

      {/* Punkt på linjen */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          paddingTop: "0.5em",
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.5,
            delay: delay + 0.15,
            ease: [0.22, 1.3, 0.36, 1],
          }}
          style={{
            width: isAlert ? "0.7rem" : "0.55rem",
            height: isAlert ? "0.7rem" : "0.55rem",
            borderRadius: "50%",
            background: isAlert ? "var(--accent-alert)" : "var(--accent)",
            border: isAlert
              ? "2px solid color-mix(in srgb, var(--accent-alert) 30%, transparent)"
              : "none",
            boxShadow: isAlert
              ? "0 0 0 4px color-mix(in srgb, var(--accent-alert) 12%, transparent)"
              : "none",
            zIndex: 2,
          }}
        />
      </div>

      {/* Text */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: isAlert ? 500 : 400,
          fontSize: "clamp(1.05rem, 1.4vw, 1.3rem)",
          lineHeight: 1.45,
          color: "var(--text)",
          letterSpacing: "0.005em",
          maxWidth: "32em",
        }}
      >
        {row.text}
      </div>
    </motion.div>
  );
}
