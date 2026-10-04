"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CorrectedClaim — den vedertagna föreställningen mot den som stämmer.
 *
 * Retoriken "inte X — utan Y" är inte en vändning i tiden (det är
 * `TurnStatement`) utan två samtidiga påståenden där kontrasten ÄR poängen.
 * Därför visas båda direkt, utan klick.
 *
 * Typografin bär skillnaden: den avfärdade föreställningen sätts i **konturtext**
 * — ihålig, utan fyllning — och rättelsen i solid displaygrad. Ett ihåligt
 * påstående ser ihåligt ut. Det är en effekt som inte går att göra i PowerPoint
 * och som publiken läser utan att den behöver förklaras.
 *
 * ```mdx
 * <CorrectedClaim chapter="§ Landningen"
 *   truth="Frågan är: **hjälpte den med rätt sak?**">
 * Frågan är aldrig ”hjälpte AI:n för mycket?”
 * </CorrectedClaim>
 * ```
 */

interface CorrectedClaimProps {
  /** Kapitelmarkör uppe till vänster. */
  chapter?: string;
  /** Rättelsen — sätts solid. Stödjer **fet** → accentfärg. */
  truth: string;
  /** Den avfärdade föreställningen — sätts i konturtext. */
  children: ReactNode;
  accent?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** MDX-barn → ren text, med <strong> återställd till **…**. */
function toText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    return (node as { type?: unknown }).type === "strong" ? `**${inner}**` : inner;
  }
  return "";
}

export function CorrectedClaim({
  chapter,
  truth,
  children,
  accent = "var(--accent)",
}: CorrectedClaimProps) {
  const claim = toText(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
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
        </div>
      ) : null}

      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.6rem, 4vh, 2.8rem)",
          padding: "clamp(3rem, 7vh, 6rem) clamp(2.5rem, 6vw, 6rem)",
          // Procent, aldrig em — em räknas mot rotens 16 px här, inte mot
          // displaygraden, och skulle klämma texten till en smal remsa.
          maxWidth: "82%",
        }}
      >
        {/* Föreställningen — ihålig konturtext */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "calc(clamp(1.7rem, 3.1vw, 2.9rem) * var(--display-scale, 1))",
            lineHeight: 1.16,
            letterSpacing: "-0.02em",
            // Konturtext: ingen fyllning, bara linje. Stroke i muted så den
            // läser som "avfärdad" och inte som "dekorativ".
            color: "transparent",
            WebkitTextStroke: "1.6px var(--text-muted)",
          }}
        >
          <EditableText path="content" block value={claim}>
            {renderInline(claim)}
          </EditableText>
        </motion.div>

        {/* Accentstrecket som skiljer föreställningen från rättelsen */}
        <motion.div
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
          style={{
            height: "2px",
            width: "clamp(4rem, 8vw, 8rem)",
            transformOrigin: "left",
            background: `linear-gradient(90deg, ${withAlpha(accent, 0.9)} 0%, transparent 100%)`,
            boxShadow: `0 0 18px ${withAlpha(accent, 0.3)}`,
            borderRadius: "999px",
          }}
        />

        {/* Rättelsen — solid */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "calc(clamp(2.1rem, 4vw, 3.8rem) * var(--display-scale, 1))",
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
            color: "var(--text)",
          }}
        >
          <EditableText path="truth" value={truth}>
            {renderInline(truth)}
          </EditableText>
        </motion.div>
      </div>
    </div>
  );
}
