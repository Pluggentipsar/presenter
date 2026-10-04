"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * GapText — samma text i flera grader av begriplighet. Tröskeln upplevd.
 *
 * Född i en föreläsning (2026-09-03) för 95 %-regeln (Hirsch): en
 * text där 20 % av orden bytts mot nonsensord är obegriplig fast varje
 * svenskt ord i den är känt; vid 5 % lär man sig; vid 0 % läser man. I
 * stället för att REFERERA regeln får publiken sitta i 80 %-versionen och
 * känna hur lektionen känns för eleven som fått fel nivå.
 *
 * Varje klick byter version. Orden som skiljer sig från SISTA versionen
 * (ordposition för ordposition) markeras i accent — så syns luckorna som
 * luckor, och när sista versionen kommer är allt bläck. Etiketten uppe
 * till höger (80 % → 95 % → 100 %) sätts i `labels`.
 *
 * ```mdx
 * <GapText chapter="§ 01 · Nivåer" labels="80 % kända ord | 95 % | 100 %" source="Hirsch 2000">
 * - Vikingarna seglade med sina frelar över det snyktiga havet.
 * - Vikingarna seglade med sina skepp över det snyktiga havet.
 * - Vikingarna seglade med sina skepp över det stormiga havet.
 * </GapText>
 * ```
 *
 * Generell: fungerar för vilken "samma text, flera versioner"-poäng som
 * helst (Lix-nivåer, översättningsgrader, rättelser).
 */

interface GapTextProps {
  chapter?: string;
  /** Etiketter per version, åtskilda med |. */
  labels?: string;
  /** Källa, mono nere till vänster. */
  source?: string;
  accent?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function toText(rawNode: ReactNode): string {
  // Flight-referens (react.lazy) över server→klient-gränsen packas upp först,
  // annars är props inte där vid upprepade besök och texten blir "".
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { type?: unknown; props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    if (el.type === "li") return `${inner}\n`;
    return inner;
  }
  return "";
}

function parseVersions(children: ReactNode): string[] {
  return toText(children)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Ordvis jämförelse mot facit: samma position, annat ord → lucka. Skiljetecken ignoreras. */
function core(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function GapText({ chapter, labels = "", source, accent = "var(--accent)", children }: GapTextProps) {
  const versions = parseVersions(children);
  const n = versions.length;
  const step = useSlideSteps(Math.max(n, 1));
  const current = Math.min(step, Math.max(n - 1, 0));
  const labelList = labels
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const label = labelList[current] ?? "";

  const finalWords = (versions[n - 1] ?? "").split(/\s+/);
  const words = (versions[current] ?? "").split(/\s+/);

  const mono: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.66rem, 0.85vw, 0.9rem)",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Graden — stor mono-siffra uppe till höger, byts med versionen */}
      {label ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.4vh, 2.8rem)",
            right: "clamp(2rem, 4vw, 4rem)",
            textAlign: "right",
            zIndex: 3,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: EASE }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(1.4rem, 2.6vw, 2.8rem)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                lineHeight: 1,
                color: current === n - 1 ? "var(--text)" : accent,
              }}
            >
              {label}
            </motion.div>
          </AnimatePresence>
          <div style={{ ...mono, marginTop: "0.5rem", color: "var(--text-muted)" }}>
            {current + 1} / {n}
          </div>
        </div>
      ) : null}

      {/* Texten */}
      <div
        style={{
          position: "absolute",
          inset: "clamp(6rem, 16vh, 10rem) clamp(2rem, 4vw, 4rem) clamp(4rem, 9vh, 6rem)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={current}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{
              margin: 0,
              maxWidth: "24em",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.7rem, 3.3vw, 3.6rem)",
              lineHeight: 1.16,
              letterSpacing: "-0.015em",
              color: "var(--text)",
            }}
          >
            {words.map((w, i) => {
              const gap = core(w) !== core(finalWords[i] ?? "");
              return (
                <span key={i}>
                  <span
                    style={
                      gap
                        ? {
                            color: accent,
                            fontStyle: "italic",
                            textDecoration: "underline",
                            textDecorationThickness: "0.06em",
                            textUnderlineOffset: "0.12em",
                          }
                        : undefined
                    }
                  >
                    {w}
                  </span>
                  {i < words.length - 1 ? " " : null}
                </span>
              );
            })}
          </motion.p>
        </AnimatePresence>
      </div>

      {source ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            bottom: "clamp(1.6rem, 3.4vh, 2.8rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path="source" value={source}>
            {source}
          </EditableText>
        </div>
      ) : null}
    </div>
  );
}
