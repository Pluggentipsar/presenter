"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface LiftedDoorsProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  /** Liten footer per kort. Default "Se hela samtalet →". */
  itemFooter?: string;
  bottomLine?: string;
  /**
   * Markdown-lista. `- Titel · Beskrivning · Elev-citat · AI-citat`.
   * `★ Titel` markerar central. Sista två fält renderas som elev/AI-bubblor
   * i en miniatyr-chat.
   */
  children?: ReactNode;
}

interface DoorItem {
  title: string;
  description: string;
  studentLine: string;
  aiLine: string;
  starred: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseItems(children: ReactNode): DoorItem[] {
  const out: DoorItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      const starred = raw.startsWith("★");
      const clean = raw.replace(/^★\s*/, "");
      const parts = clean.split(/\s*·\s*/);
      out.push({
        title: parts[0] ?? "",
        description: parts[1] ?? "",
        studentLine: parts[2] ?? "",
        aiLine: parts[3] ?? "",
        starred,
      });
    });
  });
  return out;
}

/**
 * Tre "portaler" som peek:ar in i samtalen som följer. Varje portal är
 * en miniatyr chat-window-mockup med en elev-bubbla + AI-svar, numrerad,
 * med stark accent-glow under (lift-känslan). Klickas inte fram individuellt
 * — alla lyfts i stagger för att signalera "ni kommer att se dessa tre".
 */
export function LiftedDoors({
  kicker,
  chapter,
  title,
  subtitle,
  itemFooter = "Se hela samtalet →",
  bottomLine,
  children,
}: LiftedDoorsProps) {
  const items = parseItems(children);
  const accent = "var(--accent)";

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
          padding: "clamp(2.2rem, 3.8vw, 3.4rem)",
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

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ maxWidth: "44em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 4vw, 3.4rem)",
              fontWeight: 600,
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
                fontSize: "clamp(1rem, 1.2vw, 1.22rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "0.65rem 0 0 0",
                maxWidth: "42em",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        {/* Portals */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
            gap: "clamp(1rem, 1.8vw, 1.8rem)",
            minHeight: 0,
            alignItems: "stretch",
            paddingBottom: "clamp(1rem, 1.8vh, 1.6rem)",
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              {/* Pulserande lift-glow under */}
              <motion.div
                aria-hidden
                initial={{ opacity: 0, scaleX: 0.5 }}
                animate={{
                  opacity: item.starred ? [0.5, 0.85, 0.5] : [0.35, 0.55, 0.35],
                  scaleX: 1,
                }}
                transition={{
                  opacity: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.2 + i * 0.2 },
                  scaleX: { duration: 0.9, delay: 0.6 + i * 0.18 },
                }}
                style={{
                  position: "absolute",
                  bottom: -36,
                  left: "8%",
                  right: "8%",
                  height: 78,
                  borderRadius: "50%",
                  background: item.starred
                    ? `radial-gradient(ellipse, ${withAlpha("var(--accent)", 0.55)} 0%, transparent 75%)`
                    : `radial-gradient(ellipse, ${withAlpha("var(--accent)", 0.28)} 0%, transparent 75%)`,
                  filter: "blur(24px)",
                  zIndex: 0,
                }}
              />

              {/* Portal — miniatyr chat-window */}
              <motion.div
                initial={{ opacity: 0, y: 60, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 22,
                  delay: 0.4 + i * 0.22,
                }}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  borderRadius: "1.4rem",
                  overflow: "hidden",
                  background: item.starred
                    ? `linear-gradient(180deg, ${withAlpha("var(--accent)", 0.18)} 0%, ${withAlpha("var(--accent)", 0.04)} 100%)`
                    : "var(--bg-surface)",
                  border: item.starred
                    ? `1.5px solid ${withAlpha("var(--accent)", 0.5)}`
                    : "1px solid rgba(0,0,0,0.1)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  boxShadow: item.starred
                    ? `0 30px 70px -22px var(--accent-glow, rgba(0,0,0,0.4)), inset 0 1px 0 ${withAlpha("var(--accent)", 0.4)}`
                    : "0 22px 50px -18px rgba(0,0,0,0.25)",
                }}
              >
                {/* Window-bar */}
                <div
                  style={{
                    padding: "0.7rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(128,128,128,0.18)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "rgba(128,128,128,0.5)",
                      }}
                    />
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "rgba(128,128,128,0.38)",
                      }}
                    />
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "rgba(128,128,128,0.26)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.58rem",
                      letterSpacing: "0.32em",
                      textTransform: "uppercase",
                      color: item.starred ? accent : "var(--text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")} ·{" "}
                    {item.starred ? "★ Bredd" : "Genväg"}
                  </span>
                </div>

                {/* Title + description */}
                <div
                  style={{
                    padding: "clamp(1rem, 1.4vw, 1.3rem) clamp(1rem, 1.4vw, 1.3rem) clamp(0.6rem, 0.9vw, 0.8rem)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(1.15rem, 1.5vw, 1.4rem)",
                      fontWeight: 600,
                      letterSpacing: "-0.018em",
                      lineHeight: 1.18,
                      color: "var(--text)",
                    }}
                  >
                    {item.title}
                  </div>
                  {item.description ? (
                    <p
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.85rem, 0.98vw, 0.98rem)",
                        lineHeight: 1.5,
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </div>

                {/* Spacer */}
                <div style={{ flex: 1, minHeight: "0.5rem" }} />

                {/* Chat preview */}
                {(item.studentLine || item.aiLine) ? (
                  <div
                    style={{
                      padding: "clamp(0.7rem, 1vw, 1rem) clamp(0.8rem, 1.2vw, 1.1rem)",
                      borderTop: "1px solid rgba(128,128,128,0.14)",
                      background: "var(--bg-surface)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.45rem",
                    }}
                  >
                    {item.studentLine ? (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1.0 + i * 0.22 }}
                        style={{
                          alignSelf: "flex-end",
                          maxWidth: "92%",
                          padding: "0.45rem 0.7rem",
                          borderRadius: "0.9rem 0.9rem 0.3rem 0.9rem",
                          background:
                            "linear-gradient(180deg, #5B9DFF 0%, #2C7BFF 100%)",
                          color: "#fff",
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                          lineHeight: 1.4,
                          boxShadow: "0 3px 10px rgba(44,123,255,0.35)",
                        }}
                      >
                        {item.studentLine}
                      </motion.div>
                    ) : null}
                    {item.aiLine ? (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 1.2 + i * 0.22 }}
                        style={{
                          alignSelf: "flex-start",
                          maxWidth: "92%",
                          padding: "0.45rem 0.7rem",
                          borderRadius: "0.9rem 0.9rem 0.9rem 0.3rem",
                          background: "var(--bg-elevated)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(128,128,128,0.18)",
                          color: "var(--text)",
                          fontFamily: "var(--font-body)",
                          fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                          lineHeight: 1.4,
                          fontStyle: "italic",
                        }}
                      >
                        {item.aiLine}
                      </motion.div>
                    ) : null}
                  </div>
                ) : null}

                {/* Footer */}
                <div
                  style={{
                    padding: "0.5rem 1rem",
                    borderTop: "1px solid rgba(128,128,128,0.14)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.58rem",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: item.starred ? accent : "var(--text-muted)",
                    fontWeight: 600,
                    opacity: 0.85,
                    textAlign: "center",
                  }}
                >
                  {itemFooter}
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* Bottom-line */}
        {bottomLine ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 2 }}
            style={{
              borderTop: "1px solid rgba(128,128,128,0.18)",
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
