"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * WeirdReveal — spotlight-mode visualisering av ett pattern (typ WEIRD).
 *
 * Stega fram en bokstav i taget. Varje bokstav får CENTERSTAGE: huge
 * letter + prompt-text på vänster halva, stor bild på höger. Övergångarna
 * är crossfades — föregående försvinner när nästa kommer.
 *
 * För en sammanfattningsslide med alla bokstäver, använd WeirdSummary.
 *
 * MDX-format:
 * ```mdx
 * <WeirdReveal
 *   chapter="§ Bias · WEIRD"
 *   title="Be AI om något 'normalt' — du får WEIRD."
 *   accent= "var(--accent)"
 * >
 * - W · "Skapa en bild på en typisk familj" · /bilder/.../western.png
 * - E · "Skapa en bild på en intelligent person" · /bilder/.../educated.png
 * - I · "Skapa en bild på framtiden" · /bilder/.../industrialzed.png
 * - R · "Skapa en bild på framgång" · /bilder/.../rich.png
 * - D · "Skapa en bild på en stark ledare" · /bilder/.../democratic.png
 * </WeirdReveal>
 * ```
 *
 * Format per rad: `Letter · Prompt · ImageURL`.
 */

interface WeirdRevealProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
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

export function WeirdReveal({
  chapter,
  title,
  subtitle,
  accent = "var(--accent)",
  background,
  overlay = 0.65,
  children,
}: WeirdRevealProps) {
  const items = parseItems(children);
  // Steg 0 = inget visat, 1..N = visa item N-1
  const totalSteps = items.length + 1;
  const step = useSlideSteps(totalSteps);
  const activeIdx = step === 0 ? -1 : step - 1;
  const active = activeIdx >= 0 ? items[activeIdx] : null;

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
                fontSize: "clamp(1.4rem, 2.2vw, 2.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "var(--text)",
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
                margin: "0.4rem 0 0",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                fontWeight: 400,
                color: "var(--text-muted)",
                maxWidth: "70ch",
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>
      ) : null}

      {/* Steg-progress nederst (dots) */}
      {items.length > 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: "clamp(2.4rem, 5vh, 4rem)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "0.7rem",
            alignItems: "center",
            zIndex: 4,
          }}
        >
          {items.map((it, i) => {
            const isActive = i === activeIdx;
            const isPassed = activeIdx > i;
            return (
              <div
                key={i}
                style={{
                  width: isActive ? "2.4rem" : "0.5rem",
                  height: "0.5rem",
                  borderRadius: "0.3rem",
                  background: isActive
                    ? accent
                    : isPassed
                      ? `${withAlpha(accent, 0.53)}`
                      : "rgba(247,241,230,0.22)",
                  transition: "all 480ms cubic-bezier(0.22, 1, 0.36, 1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isActive ? (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      color: "#0a0908",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {it.letter}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Centerstage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding:
            "clamp(14vh, 18vh, 22vh) clamp(3rem, 6vw, 6rem) clamp(8vh, 12vh, 14vh)",
          zIndex: 3,
        }}
      >
        <AnimatePresence mode="wait">
          {active ? (
            <Spotlight key={activeIdx} item={active} accent={accent} />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.2rem, 1.8vw, 1.8rem)",
                color: "var(--text-muted)",
              }}
            >
              Stega framåt — en bokstav i taget.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Spotlight — en item centrerat
// ============================================================================

function Spotlight({ item, accent }: { item: WeirdItem; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
        alignItems: "center",
        gap: "clamp(2rem, 5vw, 5rem)",
        width: "100%",
        maxWidth: "1400px",
      }}
    >
      {/* Letter + prompt på vänster */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 2.5vh, 2.5rem)",
          alignItems: "flex-start",
        }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 22,
            delay: 0.15,
          }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(10rem, 22vw, 22rem)",
            fontWeight: 800,
            color: accent,
            letterSpacing: "-0.05em",
            lineHeight: 0.85,
            textShadow: `0 0 80px ${withAlpha(accent, 0.33)}, 0 0 200px ${withAlpha(accent, 0.13)}`,
          }}
        >
          {item.letter}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(1.4rem, 2.2vw, 2.2rem)",
            fontWeight: 400,
            lineHeight: 1.3,
            color: "var(--text)",
            letterSpacing: "-0.01em",
            maxWidth: "30ch",
          }}
        >
          &ldquo;{item.prompt}&rdquo;
        </motion.div>
      </div>

      {/* Bild på höger — diffunderar in */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "2 / 3",
          maxHeight: "78vh",
          maxWidth: "min(100%, calc(78vh * 2 / 3))",
          marginLeft: "auto",
          marginRight: "auto",
          borderRadius: "0.85rem",
          overflow: "hidden",
          background: "rgba(20,18,16,0.5)",
          border: `1px solid ${withAlpha(accent, 0.33)}`,
          boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 120px ${withAlpha(accent, 0.13)}`,
        }}
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            src={item.image}
            alt={item.prompt}
            initial={{
              opacity: 0.15,
              filter: "blur(40px) saturate(0.2) brightness(0.6)",
            }}
            animate={{
              opacity: [0.15, 0.55, 0.85, 1],
              filter: [
                "blur(40px) saturate(0.2) brightness(0.6)",
                "blur(20px) saturate(0.55) brightness(0.85)",
                "blur(8px) saturate(0.85) brightness(0.95)",
                "blur(0px) saturate(1) brightness(1)",
              ],
            }}
            transition={{
              duration: 1.8,
              delay: 0.55,
              times: [0, 0.35, 0.7, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : null}
      </motion.div>
    </motion.div>
  );
}
