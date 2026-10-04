"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { buildBackgroundCss } from "@/lib/background";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

interface SentenceSlotProps {
  /** Single-mode: fast text före slotten, t.ex. "Det var en". */
  prefix?: string;
  /** Single-mode: fast text efter slotten (valfri). */
  suffix?: string;
  /** Single-mode: comma-separerade ord som roterar i slotten. */
  words?: string;
  /** ms mellan ord-byten. Default 1800. */
  interval?: number;
  /** Storlek på meningen. Default xl. */
  size?: "lg" | "xl" | "2xl";
  /** Centrera meningen vertikalt + horisontellt. Default true. */
  centered?: boolean;
  /** Bakgrund. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
  /**
   * Multi-mode: lista av meningar — en per markdown-punkt i children, format:
   *   - Prefix · ord1, ord2, ord3
   *   - Prefix · ord1, ord2[ | suffix]
   *
   * Vid klick (space) byts hela meningen. Inom varje mening roterar orden
   * automatiskt enligt `interval`.
   */
  children?: ReactNode;
}

interface SentencePrompt {
  prefix: string;
  words: string[];
  suffix?: string;
}

const SIZES: Record<NonNullable<SentenceSlotProps["size"]>, string> = {
  lg: "clamp(2.75rem, 6.5vw, 5rem)",
  xl: "clamp(3.5rem, 9vw, 7.5rem)",
  "2xl": "clamp(4.5rem, 12vw, 10rem)",
};

function parseWords(raw: string): string[] {
  return raw
    .split(/[,·|]/)
    .map((w) => w.trim())
    .filter(Boolean);
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

function parsePrompts(children: ReactNode): SentencePrompt[] {
  const out: SentencePrompt[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    // Format: "Prefix · ord1, ord2, ord3" ev. med "| suffix" sist
    const dotParts = raw.split(/\s*·\s*/);
    if (dotParts.length < 2) return;
    const prefix = dotParts[0].trim();
    const wordsPart = dotParts.slice(1).join(" · ").trim();
    // Suffix: text efter " | " om finns
    let suffix: string | undefined;
    let wordsRaw = wordsPart;
    const pipeIdx = wordsPart.indexOf("|");
    if (pipeIdx !== -1) {
      wordsRaw = wordsPart.slice(0, pipeIdx).trim();
      suffix = wordsPart.slice(pipeIdx + 1).trim() || undefined;
    }
    const words = wordsRaw
      .split(/[,;]/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!prefix || words.length === 0) return;
    out.push({ prefix, words, suffix });
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
 * Stor centrerad mening där ett ord roterar inline i en "slot" (t.ex. "Det var en ___").
 * Orden glider in från toppen, sitter kort, glider ut nedåt — som en spelautomat.
 *
 * Tänkt för "fortsätt-meningen"-momentet: visar visuellt hur AI gissar nästa ord.
 *
 * Två lägen:
 *
 * **Single (legacy):**
 * ```mdx
 * <SentenceSlot prefix="Det var en" words="gång, prinsessa, björn" />
 * ```
 *
 * **Multi (klick mellan meningar):**
 * ```mdx
 * <SentenceSlot>
 * - Det var en · gång, prinsessa, björn
 * - HV71 är världens · bästa, värsta, snyggaste
 * - Taylor Swift är · ung, amerikansk, populär
 * </SentenceSlot>
 * ```
 *
 * Tryck space → byter mening. Orden roterar automatiskt inom varje mening.
 */
export function SentenceSlot({
  prefix,
  suffix,
  words,
  interval = 1800,
  size = "xl",
  centered = true,
  background,
  overlay,
  overlayMode = "dark",
  children,
}: SentenceSlotProps) {
  // Parse multi-prompts från children; fallback till single (prefix/words).
  const prompts = useMemo<SentencePrompt[]>(() => {
    const parsed = parsePrompts(children);
    if (parsed.length > 0) return parsed;
    if (prefix && words) {
      return [{ prefix, words: parseWords(words), suffix }];
    }
    return [];
  }, [children, prefix, words, suffix]);

  const promptIdx = useSlideSteps(Math.max(prompts.length, 1));
  const activePrompt = prompts[Math.min(promptIdx, prompts.length - 1)] ?? {
    prefix: "",
    words: [""],
  };

  const [wordIdx, setWordIdx] = useState(0);

  // Reset ord-rotation när meningen byts.
  useEffect(() => {
    setWordIdx(0);
  }, [promptIdx]);

  useEffect(() => {
    if (activePrompt.words.length < 2) return;
    const timer = setInterval(() => {
      setWordIdx((i) => (i + 1) % activePrompt.words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [activePrompt.words.length, interval]);

  const currentWord = activePrompt.words[wordIdx] ?? "";
  // Längsta ordet definierar slot-bredden så meningen inte hoppar
  const longestWord = useMemo(
    () =>
      activePrompt.words.reduce((a, b) => (b.length > a.length ? b : a), ""),
    [activePrompt.words],
  );

  return (
    <div
      className={`relative flex h-full w-full overflow-hidden p-12 ${
        centered ? "items-center justify-center" : "items-start"
      }`}
      style={{ background: buildBackgroundCss(background, overlay, overlayMode) }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: "var(--heading-weight)",
          fontSize: SIZES[size],
          lineHeight: 1.15,
          letterSpacing: "var(--heading-tracking)",
          textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
          color: "var(--text)",
          textAlign: "center",
          margin: 0,
          maxWidth: "94%",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={`prefix-${promptIdx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            style={{ display: "inline" }}
          >
            {activePrompt.prefix}
          </motion.span>
        </AnimatePresence>
        <span> </span>
        <span
          style={{
            position: "relative",
            display: "inline-block",
            verticalAlign: "baseline",
            overflow: "hidden",
            color: "var(--accent)",
          }}
        >
          {/* Ghost reserverar bredd + höjd så meningen inte hoppar */}
          <span
            aria-hidden
            style={{
              visibility: "hidden",
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            {longestWord}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${currentWord}-${promptIdx}-${wordIdx}`}
              initial={{ y: "-110%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "110%", opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
              }}
            >
              {currentWord}
            </motion.span>
          </AnimatePresence>
        </span>
        {activePrompt.suffix ? (
          <>
            <span> </span>
            <span>{activePrompt.suffix}</span>
          </>
        ) : null}
      </h1>
    </div>
  );
}
