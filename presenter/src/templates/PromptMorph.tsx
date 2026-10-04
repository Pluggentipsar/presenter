"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PromptMorph — samma prompt, fyra gånger, tills eleven bytt roll.
 *
 * Varje steg visar hela prompten på nytt, men **det tillagda är markerat**
 * som i en versionshistorik. Diffen räknas ut automatiskt med LCS mot
 * föregående steg — Joel skriver bara de fyra prompterna, ingen manuell
 * markering, och den håller även när texten redigeras i efterhand.
 *
 * Under prompten löper en rollskala från mottagare till deltagare. Det är
 * själva argumentet: prompten blir inte "bättre" i teknisk mening, eleven
 * flyttar sig.
 *
 * ```mdx
 * <PromptMorph
 *   kicker="§ 2 · Från beställning till samarbete"
 *   roleFrom="Mottagare"
 *   roleTo="Deltagare"
 * >
 * - Skriv en text om franska revolutionen. · Beställaren
 * - Jag går i årskurs 9 och försöker förstå orsakerna till franska revolutionen. · Den som berättar vem hen är
 * </PromptMorph>
 * ```
 *
 * Per rad: `Prompten · Rolletikett`.
 */

interface PromptMorphProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Rubrik ovanför promptfönstret. */
  title?: string;
  /** Vänstra änden på rollskalan. */
  roleFrom?: string;
  /** Högra änden på rollskalan. */
  roleTo?: string;
  /** Etikett på promptfönstrets titelrad. */
  windowLabel?: string;
  children?: ReactNode;
}

interface Version {
  prompt: string;
  role: string;
}

interface DiffWord {
  word: string;
  added: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseVersions(children: ReactNode): Version[] {
  const out: Version[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      prompt: parts[0].trim(),
      role: parts.slice(1).join(" · ").trim(),
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

/** Jämför på normaliserad form så skiljetecken inte skapar falska tillägg. */
function key(word: string): string {
  return word.toLowerCase().replace(/[.,:;!?"”„]/g, "");
}

/**
 * Ordvis diff via LCS. Returnerar nästa version med varje ord markerat som
 * tillagt eller oförändrat. Borttagna ord visas inte — poängen är vad som
 * VÄXER fram, inte vad som försvann.
 */
function diffWords(prev: string, next: string): DiffWord[] {
  const a = prev ? prev.split(/\s+/).filter(Boolean) : [];
  const b = next.split(/\s+/).filter(Boolean);
  if (a.length === 0) return b.map((word) => ({ word, added: true }));

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        key(a[i]) === key(b[j])
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffWord[] = [];
  let i = 0;
  let j = 0;
  while (j < n) {
    if (i < m && key(a[i]) === key(b[j])) {
      out.push({ word: b[j], added: false });
      i++;
      j++;
    } else if (i < m && dp[i + 1][j] >= dp[i][j + 1]) {
      // Ord som fanns förut men inte längre — hoppas över.
      i++;
    } else {
      out.push({ word: b[j], added: true });
      j++;
    }
  }
  return out;
}

export function PromptMorph({
  chapter,
  kicker,
  title,
  roleFrom = "Mottagare",
  roleTo = "Deltagare",
  windowLabel = "Elevens prompt",
  children,
}: PromptMorphProps) {
  const versions = useMemo(() => parseVersions(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(Math.max(versions.length, 1));
  const index = Math.min(step, Math.max(versions.length - 1, 0));
  const current = versions[index];
  const previous = index > 0 ? versions[index - 1] : undefined;

  const diff = useMemo(
    () => (current ? diffWords(previous?.prompt ?? "", current.prompt) : []),
    [current, previous],
  );

  // Hur långt eleven flyttat sig längs rollskalan.
  const progress =
    versions.length > 1 ? index / (versions.length - 1) : index > 0 ? 1 : 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 18%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1rem, 2.5vh, 1.8rem)",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
            }}
          >
            {kicker ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </span>
            ) : null}
            {chapter ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--text) 45%, transparent)",
                  marginLeft: "auto",
                }}
              >
                <EditableText path="chapter" value={chapter}>
                  {chapter}
                </EditableText>
              </span>
            ) : null}
          </div>
        ) : null}

        {title ? (
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.4rem, 2.3vw, 2.2rem)",
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        ) : null}

        {/* ————— Promptfönstret ————— */}
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            boxShadow:
              "0 30px 70px -40px color-mix(in srgb, var(--accent) 40%, transparent)",
          }}
        >
          {/* Titelrad — versionsnummer som i en historik */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              padding:
                "clamp(0.5rem, 1.1vh, 0.8rem) clamp(0.9rem, 1.6vw, 1.4rem)",
              borderBottom:
                "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
              background: "color-mix(in srgb, var(--text) 4%, transparent)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.58rem, 0.78vw, 0.78rem)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <span>{windowLabel}</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>
              v{index + 1}
              <span style={{ opacity: 0.45 }}> / {versions.length}</span>
            </span>
          </div>

          {/* Prompten med tillägg markerade */}
          <div
            style={{
              padding: "clamp(1.1rem, 2.2vw, 2rem)",
              minHeight: "clamp(6rem, 17vh, 10rem)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  transition: { duration: reduceMotion ? 0 : 0.2 },
                }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE }}
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.92rem, 1.35vw, 1.35rem)",
                  lineHeight: 1.65,
                  color: "var(--text)",
                }}
              >
                {diff.map((d, i) => (
                  <motion.span
                    key={i}
                    initial={
                      reduceMotion || !d.added
                        ? false
                        : { opacity: 0, y: -6, backgroundColor: "transparent" }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.4,
                      delay: reduceMotion ? 0 : 0.15 + i * 0.02,
                      ease: EASE,
                    }}
                    style={{
                      display: "inline",
                      color: d.added ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: d.added ? 700 : 400,
                      background: d.added
                        ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                        : "transparent",
                      borderRadius: "0.2em",
                      padding: d.added ? "0.08em 0.12em" : undefined,
                    }}
                  >
                    {d.word}{" "}
                  </motion.span>
                ))}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* ————— Rollskalan ————— */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div
            style={{
              position: "relative",
              height: "2px",
              background: "color-mix(in srgb, var(--text) 14%, transparent)",
              borderRadius: "1px",
            }}
          >
            <motion.span
              initial={false}
              animate={{ scaleX: progress }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--accent)",
                transformOrigin: "left",
                borderRadius: "1px",
              }}
            />
            <motion.span
              initial={false}
              animate={{ left: `${progress * 100}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
              style={{
                position: "absolute",
                top: "50%",
                width: "0.75rem",
                height: "0.75rem",
                marginTop: "-0.375rem",
                marginLeft: "-0.375rem",
                borderRadius: "50%",
                background: "var(--accent)",
                boxShadow: "0 0 20px var(--accent-glow)",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <span style={{ opacity: progress < 0.5 ? 1 : 0.4 }}>
              <EditableText path="roleFrom" value={roleFrom}>
                {roleFrom}
              </EditableText>
            </span>
            {current?.role ? (
              <AnimatePresence mode="wait">
                <motion.span
                  key={index}
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: reduceMotion ? 0 : 0.45 }}
                  style={{
                    color: "var(--accent)",
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textAlign: "center",
                  }}
                >
                  {current.role}
                </motion.span>
              </AnimatePresence>
            ) : null}
            <span style={{ opacity: progress >= 0.5 ? 1 : 0.4 }}>
              <EditableText path="roleTo" value={roleTo}>
                {roleTo}
              </EditableText>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
