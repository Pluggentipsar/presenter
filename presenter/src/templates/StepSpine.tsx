"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * StepSpine — få steg som bygger på varandra, på en spikrak ryggrad.
 *
 * Byggd som alternativ till `ProcessBeats` när stegen är få och texten är
 * lång. Där bär en böjd bana rytmen; här är hela poängen att inget får se
 * ojämnt ut. Ryggraden ligger på en fast höjd och alla kolumner hänger i
 * den: numret och etiketten bottnar mot linjen ovanifrån, rubriken och
 * beskrivningen börjar direkt under den. Kolumnerna kan därför ha helt
 * olika textmängd utan att raderna glider isär.
 *
 * Linjen ritas ut vänster→höger i takt med klicken, så sekvensen syns —
 * data blir mönster blir förutsägelse.
 *
 * Samma radformat som ProcessBeats, så innehåll kan flyttas mellan dem
 * genom att bara byta komponentnamn.
 *
 * ```mdx
 * <StepSpine
 *   kicker="§ 1 · Det tekniska minimumet"
 *   title="Tre saker räcker långt."
 *   subtitle="Mer teknik än så här behöver varken du eller eleverna."
 *   closing="Mönster kan bära kunskap. Men mönster är inte samma sak som förståelse."
 * >
 * - Den har tränats på enorma mängder data · Text från nätet, böcker, kod · input
 * - Den förutsäger vad som passar härnäst · Ett ord i taget · ai-key
 * </StepSpine>
 * ```
 *
 * Per rad: `Rubrik · Beskrivning · variant`.
 * Varianter: `input`/`human` (märks DU), `ai`, `ai-key` (framhävt steg).
 */

type Variant = "input" | "ai" | "ai-key" | "human";

interface Step {
  title: string;
  caption: string;
  variant: Variant;
}

interface StepSpineProps {
  chapter?: string;
  kicker?: string;
  /** Rubrik överst. */
  title?: string;
  /** Underrubrik under rubriken. */
  subtitle?: string;
  /** Slutrad — landar när alla steg står. */
  closing?: string;
  children?: ReactNode;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VARIANTS: Variant[] = ["input", "ai", "ai-key", "human"];
const VARIANT_LABEL: Record<Variant, string> = {
  input: "DU",
  ai: "AI",
  "ai-key": "AI",
  human: "DU",
};

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

function parseSteps(children: ReactNode): Step[] {
  const out: Step[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    const variant = parts.find((p) =>
      (VARIANTS as string[]).includes(p.toLowerCase()),
    );
    const rest = parts.filter((p) => p !== variant);
    out.push({
      title: rest[0] ?? "",
      caption: rest.slice(1).join(" · "),
      variant: (variant?.toLowerCase() as Variant) ?? "ai",
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

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export function StepSpine({
  chapter,
  kicker,
  title,
  subtitle,
  closing,
  children,
}: StepSpineProps) {
  const steps = useMemo(() => parseSteps(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(steps.length + (closing ? 1 : 0));
  const shown = Math.min(step + 1, steps.length);
  const landed = Boolean(closing) && step >= steps.length;

  const cols = `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))`;
  const gap = "clamp(1.2rem, 3vw, 3.2rem)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 62%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
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
              marginBottom: "clamp(0.8rem, 2vh, 1.4rem)",
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
          <motion.h2
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, delay: 0.1 }}
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(2rem, 3.7vw, 3.5rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title)}
            </EditableText>
          </motion.h2>
        ) : null}

        {subtitle ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.3 }}
            style={{
              marginTop: "clamp(0.35rem, 0.9vh, 0.6rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              lineHeight: 1.35,
              color: "var(--text-muted)",
              maxWidth: "40em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {renderInline(subtitle)}
            </EditableText>
          </motion.div>
        ) : null}

        {/* ══════ Ryggraden ══════
            Tre rader i grid: allt ovanför linjen bottnar mot den, allt under
            börjar vid den. Det är det som gör att kolumnerna aldrig glider
            isär hur olika långa texterna än är. */}
        <div style={{ marginTop: "clamp(2rem, 6vh, 4rem)" }}>
          {/* Rad 1 — nummer och variant, bottenjusterade mot linjen */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap,
              alignItems: "end",
            }}
          >
            {steps.map((s, i) => {
              const on = i < shown;
              const isKey = s.variant === "ai-key";
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0.16, y: on ? 0 : 8 }}
                  transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.6em",
                    paddingBottom: "clamp(0.5rem, 1.2vh, 0.85rem)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.9rem, 3.4vw, 3.3rem)",
                      lineHeight: 1,
                      letterSpacing: "-0.03em",
                      color: isKey
                        ? "var(--accent)"
                        : "color-mix(in srgb, var(--text) 26%, transparent)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.9vw, 0.9rem)",
                      letterSpacing: "0.3em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "var(--text-muted)",
                    }}
                  >
                    {VARIANT_LABEL[s.variant]}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Rad 2 — själva linjen, med en nod per kolumn */}
          <div style={{ position: "relative", height: "2px" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "color-mix(in srgb, var(--text) 12%, transparent)",
              }}
            />
            <motion.div
              initial={false}
              animate={{
                scaleX: steps.length > 0 ? shown / steps.length : 0,
              }}
              transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--accent)",
                transformOrigin: "left",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: cols,
                gap,
              }}
            >
              {steps.map((s, i) => {
                const on = i < shown;
                const isKey = s.variant === "ai-key";
                return (
                  <div key={i} style={{ position: "relative" }}>
                    <motion.span
                      initial={false}
                      animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0.2 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.5,
                        ease: EASE,
                      }}
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        y: "-50%",
                        width: isKey ? "0.95rem" : "0.7rem",
                        height: isKey ? "0.95rem" : "0.7rem",
                        borderRadius: "50%",
                        background: on
                          ? "var(--accent)"
                          : "color-mix(in srgb, var(--text) 20%, transparent)",
                        boxShadow: on && isKey ? "0 0 22px var(--accent-glow)" : "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rad 3 — rubrik och beskrivning, toppjusterade från linjen */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap,
              alignItems: "start",
              marginTop: "clamp(1rem, 2.4vh, 1.6rem)",
            }}
          >
            {steps.map((s, i) => {
              const on = i < shown;
              const isKey = s.variant === "ai-key";
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0.16, y: on ? 0 : 10 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.6,
                    delay: reduceMotion || !on ? 0 : 0.1,
                    ease: EASE,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: isKey ? 700 : 600,
                      fontSize: "clamp(1.4rem, 2.4vw, 2.3rem)",
                      lineHeight: 1.2,
                      letterSpacing: "-0.02em",
                      color: isKey ? "var(--accent)" : "var(--text)",
                    }}
                  >
                    {renderInline(s.title)}
                  </div>
                  {s.caption ? (
                    <div
                      style={{
                        marginTop: "clamp(0.4rem, 1vh, 0.7rem)",
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(1rem, 1.45vw, 1.4rem)",
                        lineHeight: 1.5,
                        color: "var(--text-muted)",
                      }}
                    >
                      {renderInline(s.caption)}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ————— Slutraden ————— */}
        {closing ? (
          <motion.div
            initial={false}
            animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
            style={{
              marginTop: "clamp(1.8rem, 5vh, 3.2rem)",
              paddingTop: "clamp(0.9rem, 1.8vh, 1.4rem)",
              borderTop: "2px solid var(--accent)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.25rem, 2vw, 2rem)",
              lineHeight: 1.35,
              color: "var(--text)",
            }}
          >
            <EditableText path="closing" value={closing}>
              {renderInline(closing)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
