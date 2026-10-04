"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * WeirdSummary — sammanfattningsslide efter WeirdReveal. Visar alla
 * bokstäver + bilder i en grid. Kombinerat ord (typ "WEIRD") byggs upp
 * av bokstäverna med extra glow.
 *
 * MDX-format (samma datafmt som WeirdReveal):
 * ```mdx
 * <WeirdSummary
 *   chapter="§ Bias · WEIRD"
 *   title="WEIRD."
 *   subtitle="Western · Educated · Industrialized · Rich · Democratic"
 *   conclusion="**12% av världens befolkning. 88% av AI:s tränings-data.**"
 *   accent= "var(--accent)"
 * >
 * - W · "Skapa en bild på en typisk familj" · /bilder/.../western.png
 * - E · "Skapa en bild på en intelligent person" · /bilder/.../educated.png
 * - I · "Skapa en bild på framtiden" · /bilder/.../industrialzed.png
 * - R · "Skapa en bild på framgång" · /bilder/.../rich.png
 * - D · "Skapa en bild på en stark ledare" · /bilder/.../democratic.png
 * </WeirdSummary>
 * ```
 */

interface WeirdSummaryProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  conclusion?: string;
  accent?: string;
  background?: string;
  overlay?: number;
  children?: ReactNode;
}

interface WeirdItem {
  letter: string;
  prompt: string;
  image: string;
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

function parseItems(children: ReactNode): WeirdItem[] {
  const items: WeirdItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag !== "ul" && tag !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      if ((li as ReactElement).type !== "li") return;
      const raw = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (!raw) return;
      const parts = raw.split(/\s+·\s+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) return;
      const prompt = parts[1].replace(/^["']|["']$/g, "").trim();
      items.push({
        letter: parts[0],
        prompt,
        image: parts[2] || "",
      });
    });
  });
  return items;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(text).replace(
    /\*\*([^*]+)\*\*/g,
    (_, inner) =>
      `<span style="color:${accent};font-weight:700">${inner}</span>`,
  );
}

export function WeirdSummary({
  chapter,
  title,
  subtitle,
  conclusion,
  accent = "var(--accent)",
  background,
  overlay = 0.65,
  children,
}: WeirdSummaryProps) {
  const items = parseItems(children);
  const conclusionDelay = 0.4 + items.length * 0.18 + 0.5;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Titel + subtitle */}
      {title || subtitle ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(4vh, 6vh, 8vh)",
            left: "clamp(3rem, 6vw, 6rem)",
            right: "clamp(3rem, 6vw, 6rem)",
            zIndex: 4,
          }}
        >
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.4rem, 4.4vw, 4.4rem)",
                fontWeight: 800,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: accent,
                textShadow: `0 0 60px ${withAlpha(accent, 0.2)}`,
              }}
            >
              {title}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: "0.6rem 0 0",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
                fontWeight: 400,
                color: "var(--text-muted)",
                letterSpacing: "0.02em",
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>
      ) : null}

      {/* Grid med alla items */}
      <div
        style={{
          position: "absolute",
          top: title ? "clamp(22vh, 26vh, 32vh)" : "clamp(8vh, 12vh, 16vh)",
          bottom: conclusion ? "clamp(14vh, 16vh, 18vh)" : "clamp(4vh, 6vh, 8vh)",
          left: "clamp(3rem, 6vw, 6rem)",
          right: "clamp(3rem, 6vw, 6rem)",
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          gap: "clamp(0.8rem, 1.6vw, 1.6rem)",
          zIndex: 3,
        }}
      >
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.4 + i * 0.18,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.5rem, 1vh, 0.9rem)",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            {/* Bild */}
            <div
              style={{
                width: "100%",
                aspectRatio: "2 / 3",
                borderRadius: "0.6rem",
                overflow: "hidden",
                background: "rgba(20,18,16,0.5)",
                border: `1px solid ${withAlpha(accent, 0.4)}`,
                boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 50px ${withAlpha(accent, 0.13)}`,
              }}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.prompt}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : null}
            </div>

            {/* Letter */}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.6rem, 4.5vw, 4.5rem)",
                fontWeight: 800,
                color: accent,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                textShadow: `0 0 30px ${withAlpha(accent, 0.33)}`,
              }}
            >
              {item.letter}
            </div>

            {/* Prompt — kompakt */}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                lineHeight: 1.3,
                color: "var(--text-muted)",
                textAlign: "center",
                maxWidth: "20ch",
                letterSpacing: "-0.005em",
              }}
            >
              &ldquo;{item.prompt}&rdquo;
            </div>
          </motion.div>
        ))}
      </div>

      {/* Conclusion */}
      {conclusion ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.9,
            delay: conclusionDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            bottom: "clamp(4vh, 6vh, 8vh)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.4rem, 2vw, 2rem)",
            fontWeight: 500,
            color: "var(--text)",
            textAlign: "center",
            maxWidth: "80%",
            letterSpacing: "-0.01em",
            zIndex: 4,
          }}
          dangerouslySetInnerHTML={{ __html: renderInline(conclusion, accent) }}
        />
      ) : null}
    </div>
  );
}
