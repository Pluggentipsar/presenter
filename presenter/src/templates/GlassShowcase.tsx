"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import {
  AmbientBackdrop,
  GlassCard,
} from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

interface GlassShowcaseProps {
  kicker?: string;
  chapter?: string;
  title: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  accent2?: string;
  /** Antal kolumner i grid. Default 3. */
  columns?: number;
  /** Markdown-lista. Varje rad: `Eyebrow · Titel · Beskrivning` */
  children?: ReactNode;
}

interface ShowcaseItem {
  eyebrow: string;
  title: string;
  description: string;
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

function parseItems(children: ReactNode): ShowcaseItem[] {
  const out: ShowcaseItem[] = [];
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
          const parts = text.split(/\s*·\s*/);
          out.push({
            eyebrow: parts[0] ?? "",
            title: parts[1] ?? "",
            description: parts.slice(2).join(" · "),
          });
        }
      });
    }
  });
  return out;
}

export function GlassShowcase({
  kicker,
  chapter,
  title,
  subtitle,
  background,
  accent,
  accent2,
  columns = 3,
  children,
}: GlassShowcaseProps) {
  const items = parseItems(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop
        background={background}
        accent={accent}
        accent2={accent2}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          padding: "clamp(3rem, 5vw, 5rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.8rem, 3vh, 2.5rem)",
        }}
      >
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
              transition={{ duration: 0.6 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.72rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--accent)",
                fontWeight: 500,
              }}
            >
              {kicker}
            </motion.div>
          ) : null}
          {chapter ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {chapter}
            </motion.div>
          ) : null}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ maxWidth: "44em" }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 4.5vw, 4rem)",
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
                fontSize: "clamp(1.05rem, 1.3vw, 1.3rem)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
                margin: "1rem 0 0 0",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </motion.div>

        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: "clamp(1.2rem, 2vw, 1.8rem)",
            alignItems: "center",
          }}
        >
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.25 + i * 0.12,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <GlassCard size="md">
                {item.eyebrow ? (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      letterSpacing: "0.32em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      marginBottom: "0.6rem",
                    }}
                  >
                    {item.eyebrow}
                  </div>
                ) : null}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.2rem, 1.6vw, 1.7rem)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                    marginBottom: "0.5rem",
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </div>
                {item.description ? (
                  <p
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 1vw, 1rem)",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
