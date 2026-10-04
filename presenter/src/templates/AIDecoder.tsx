"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface AIDecoderProps {
  /** Eyebrow uppe i hörnet, t.ex. "§ Krok · Vad var AI?". */
  eyebrow?: string;
  /** Stor rubrik. */
  title?: string;
  /** Subtitel. */
  subtitle?: string;
  /** Liten avslutningstext längst ner. */
  closer?: string;
  /** Bakgrund — CSS-värde eller bildsökväg. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
  /**
   * Markdown-lista:
   * `- icon · namn · förklaring`
   * Icon = emoji ELLER bildsökväg (.svg/.png). Förklaring i 1-2 meningar.
   */
  children?: ReactNode;
}

interface DecodedItem {
  icon: string;
  name: string;
  explanation: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

function parseItems(children: ReactNode): DecodedItem[] {
  const out: DecodedItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      const liEl = li as ReactElement<{ children?: ReactNode }>;
      const text = extractText(liEl.props.children).trim();
      if (!text) return;
      const parts = text.split("·").map((s) => s.trim());
      if (parts.length < 2) return;
      out.push({
        icon: parts[0],
        name: parts[1] ?? "",
        explanation: parts[2] ?? "",
      });
    });
  });
  return out;
}

function isImagePath(s: string): boolean {
  return s.startsWith("/") || s.startsWith("http");
}

/**
 * Pedagogisk grid efter "fånga AI"-spelet. För varje sak: vad var AI:t?
 * Kort-grid (3-4 kolumner) med ikon + namn + 1-2 meningar förklaring.
 *
 * Användning:
 * ```mdx
 * <AIDecoder
 *   eyebrow="Vad var egentligen AI?"
 *   title="Det var AI i alla dessa."
 *   closer="Allt med AI inuti — och du möter det varje dag."
 * >
 * - 📱 · TikTok · Varje video du tittar på lär AI:n vad just du tycker är roligt.
 * - /bilder/mellanstadiet/logos/spotify.svg · Spotify · AI lyssnar på vilka låtar du gillar och hittar nya.
 * </AIDecoder>
 * ```
 */
export function AIDecoder({
  eyebrow,
  title,
  subtitle,
  closer,
  background,
  overlay,
  overlayMode = "dark",
  children,
}: AIDecoderProps) {
  const items = useMemo(() => parseItems(children), [children]);
  const cols = items.length <= 6 ? 3 : 4;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden p-12"
      style={{ background: buildBackgroundCss(background, overlay, overlayMode) }}
    >
      {(eyebrow || title || subtitle) ? (
        <div className="flex flex-col gap-2">
          {eyebrow ? (
            <div
              className="text-xs uppercase"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.3em",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          {title ? (
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(2rem, 4.2vw, 3.5rem)",
                lineHeight: 1.08,
                letterSpacing: "var(--heading-tracking)",
                textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p
              className="max-w-3xl"
              style={{
                fontSize: "clamp(1rem, 1.4vw, 1.25rem)",
                color: "var(--text-muted)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      <div
        className="mt-8 grid flex-1 gap-5"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          alignContent: "center",
        }}
      >
        {items.map((item, i) => (
          <DecoderCard key={item.name + i} item={item} index={i} />
        ))}
      </div>

      {closer ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + items.length * 0.06, duration: 0.6 }}
          className="mt-6 text-center"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.25rem, 2vw, 1.75rem)",
            color: "var(--accent)",
            letterSpacing: "var(--heading-tracking)",
          }}
        >
          {closer}
        </motion.div>
      ) : null}
    </div>
  );
}

function DecoderCard({ item, index }: { item: DecodedItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.15 + index * 0.06,
        duration: 0.55,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="flex flex-col gap-3 p-5 md:p-6"
      style={{
        background: "var(--bg-surface)",
        border: `var(--border-width) solid var(--accent-dim)`,
        borderRadius: "calc(var(--radius) * 1.5)",
        boxShadow: "0 8px 24px -12px rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center"
          style={{
            background: "white",
            borderRadius: "22%",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          }}
        >
          {isImagePath(item.icon) ? (
            <img
              src={item.icon}
              alt={item.name}
              className="h-[70%] w-[70%] object-contain"
              draggable={false}
            />
          ) : (
            <span
              style={{
                fontSize: "1.6rem",
                lineHeight: 1,
              }}
            >
              {item.icon}
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)",
            lineHeight: 1.1,
            color: "var(--text)",
            letterSpacing: "var(--heading-tracking)",
          }}
        >
          {item.name}
        </span>
      </div>
      <p
        style={{
          fontSize: "clamp(0.9rem, 1.2vw, 1.05rem)",
          lineHeight: 1.45,
          color: "var(--text)",
          margin: 0,
        }}
      >
        {item.explanation}
      </p>
    </motion.div>
  );
}
