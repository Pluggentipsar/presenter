"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * VisualSupportFamily ★ — sex former visuellt stöd, en fråga i taget.
 *
 * Byggd för att hålla ihop en sektion som annars splittras på fem
 * templates (RevealList + tre PromptToImage + TwoSides). Problemet med
 * den uppdelningen: publiken ser fem olika layouter för vad som i själva
 * verket är EN familj artefakter — och missar det som faktiskt skiljer
 * dem åt.
 *
 * Här är urvalskriteriet hjälten. Varje form svarar på en egen fråga
 * ("vad ska hända?", "vad hände?", "vad gör jag med det jag känner?"),
 * och frågan står stort. Formerna förväxlas hela tiden i verkligheten;
 * det är frågan som avgör vilken man ska bygga.
 *
 * Layout: artefakten till vänster i en lätt lutad ram, frågan och
 * beskrivningen till höger, prompten i mono under — och en remsa av sex
 * platser längst ned som fylls i medan man klickar. Publiken ser hela
 * tiden både helheten (sex former) och detaljen (den aktiva).
 *
 * Steg 0 visar rubriken och sex tomma platser. Steg 1..N tänder en form
 * i taget; tidigare former ligger kvar i remsan som ifyllda.
 *
 * ```mdx
 * <VisualSupportFamily
 *   kicker="§ Anpassande · Familjen"
 *   title="”Visuellt stöd” är inte en sak."
 *   subtitle="Sex former, sex olika jobb — och det är frågan som avgör vilken du behöver."
 * >
 * - Visuellt schema · Vad händer nu? · Dagen i ordning. · /bilder/…/schema.png · Skapa ett visuellt schema…
 * - Seriesamtal · Vad hände? · Konflikten i rutor. · /bilder/…/serie.png · Ett seriesamtal i fyra rutor…
 * </VisualSupportFamily>
 * ```
 *
 * Per rad: `Namn · Fråga · Beskrivning · /bild.png · Prompt`.
 * Bild och prompt är valfria — utan bild visas ett numrerat platshållarkort.
 */

interface VisualSupportFamilyProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  accent?: string;
  children?: ReactNode;
}

interface Form {
  name: string;
  question: string;
  blurb: string;
  image?: string;
  prompt?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const isImagePath = (p: string) =>
  p.startsWith("/") || /^https?:\/\//.test(p) || /\.(png|jpe?g|webp|avif|svg)$/i.test(p);

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parseForms(children: ReactNode): Form[] {
  const out: Form[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const parts = t.split(/\s*·\s*/).map((p) => p.trim());
    const imgIdx = parts.findIndex((p, i) => i > 0 && isImagePath(p));
    // Prompten är allt efter bilden — eller, när raden saknar bild, allt
    // efter beskrivningen. Utan det andra fallet tappar bildlösa former
    // sin prompt helt.
    const promptParts = imgIdx >= 0 ? parts.slice(imgIdx + 1) : parts.slice(3);
    out.push({
      name: parts[0] ?? "",
      question: parts[1] ?? "",
      blurb: parts[2] ?? "",
      image: imgIdx >= 0 ? parts[imgIdx] : undefined,
      prompt: promptParts.join(" · ").trim() || undefined,
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children));
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

/** **fet** → accentfärgad. */
function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 700 }}>
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function VisualSupportFamily({
  kicker,
  chapter,
  title,
  subtitle,
  accent = "var(--accent)",
  children,
}: VisualSupportFamilyProps) {
  const forms = useMemo(() => parseForms(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;
  // Steg 0: rubrik + tomma platser. Steg 1..N: en form i taget.
  const step = useSlideSteps(forms.length + 1);

  if (forms.length === 0) return null;

  const activeIndex = step - 1;
  const active = activeIndex >= 0 ? forms[activeIndex] : null;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 28% 18%, var(--bg-surface) 0%, var(--bg) 72%)",
        padding: "clamp(1.8rem, 3.8vh, 2.8rem) clamp(2.2rem, 4.5vw, 4rem)",
        gap: "clamp(0.6rem, 1.4vh, 1rem)",
      }}
    >
      {/* Topprad */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexShrink: 0 }}>
        {kicker ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.68rem, 0.88vw, 0.9rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontWeight: 600,
              color: accent,
            }}
          >
            {kicker}
          </span>
        ) : <span />}
        {chapter ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.62rem, 0.82vw, 0.82rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {chapter}
          </span>
        ) : null}
      </div>

      {/* Rubrik — krymper när en form är aktiv, så artefakten får plats */}
      <motion.div
        initial={false}
        animate={{
          height: active ? 0 : "auto",
          opacity: active ? 0 : 1,
          marginBottom: active ? 0 : undefined,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
        style={{ overflow: "hidden", flexShrink: 0 }}
      >
        {title ? (
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: "clamp(1.9rem, 3.6vw, 3.4rem)",
              letterSpacing: "var(--heading-tracking)",
              lineHeight: 1.04,
              color: "var(--text)",
              maxWidth: "24ch",
            }}
          >
            {renderInline(title, accent)}
          </h2>
        ) : null}
        {subtitle ? (
          <p
            style={{
              margin: "clamp(0.5rem, 1.1vh, 0.85rem) 0 0",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
              color: "var(--text-muted)",
              maxWidth: "52ch",
              lineHeight: 1.4,
            }}
          >
            {renderInline(subtitle, accent)}
          </p>
        ) : null}
      </motion.div>

      {/* Fokusfältet — artefakt till vänster, frågan till höger */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: "clamp(1.4rem, 3vw, 3rem)",
          alignItems: "center",
        }}
      >
        {/* Artefakten */}
        <div style={{ position: "relative", height: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 18, rotate: -1.4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, rotate: -1.1, scale: 1 }}
                exit={{ opacity: 0, y: -14, rotate: 0.6, scale: 0.98 }}
                transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  padding: "clamp(0.5rem, 1vw, 0.9rem)",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius, 0.75rem)",
                  border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
                  boxShadow:
                    "0 40px 70px -34px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.28)",
                  display: "flex",
                }}
              >
                {active.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={active.image}
                    alt={active.name}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "clamp(14rem, 46vh, 26rem)",
                      objectFit: "contain",
                      borderRadius: "calc(var(--radius, 0.75rem) * 0.6)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "clamp(12rem, 26vw, 20rem)",
                      height: "clamp(9rem, 20vh, 14rem)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(2.5rem, 5vw, 4rem)",
                      color: `color-mix(in srgb, ${accent} 40%, transparent)`,
                    }}
                  >
                    {String(activeIndex + 1).padStart(2, "0")}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="tom"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.4 }}
                style={{
                  width: "min(100%, 22rem)",
                  aspectRatio: "4 / 3",
                  borderRadius: "var(--radius, 0.75rem)",
                  border: `1.5px dashed color-mix(in srgb, ${accent} 30%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.68rem, 0.9vw, 0.9rem)",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Sex former
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Frågan + texten */}
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.4rem, 1vh, 0.75rem)" }}>
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
                style={{ display: "flex", flexDirection: "column", gap: "clamp(0.4rem, 1vh, 0.75rem)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.8vw, 0.82rem)",
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  {String(activeIndex + 1).padStart(2, "0")} · svarar på
                </span>

                {/* Frågan är hjälten — det är den som avgör valet */}
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(1.7rem, 3.1vw, 2.9rem)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.08,
                    color: accent,
                  }}
                >
                  {active.question}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(1.1rem, 1.7vw, 1.6rem)",
                    letterSpacing: "-0.01em",
                    color: "var(--text)",
                  }}
                >
                  {active.name}
                </p>

                {active.blurb ? (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.92rem, 1.15vw, 1.15rem)",
                      lineHeight: 1.45,
                      color: "var(--text-muted)",
                      maxWidth: "32ch",
                    }}
                  >
                    {active.blurb}
                  </p>
                ) : null}

                {active.prompt ? (
                  <div
                    style={{
                      marginTop: "clamp(0.2rem, 0.6vh, 0.5rem)",
                      padding: "clamp(0.55rem, 1vh, 0.8rem) clamp(0.7rem, 1.1vw, 1rem)",
                      borderRadius: "calc(var(--radius, 0.75rem) * 0.8)",
                      borderLeft: `2.5px solid ${accent}`,
                      background: "color-mix(in srgb, var(--bg-surface) 82%, transparent)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.7rem, 0.88vw, 0.88rem)",
                      lineHeight: 1.5,
                      color: "var(--text-muted)",
                      maxWidth: "40ch",
                    }}
                  >
                    {active.prompt}
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Remsan — sex platser som fylls i */}
      <div
        style={{
          flexShrink: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${forms.length}, 1fr)`,
          gap: "clamp(0.4rem, 0.9vw, 0.9rem)",
          paddingTop: "clamp(0.5rem, 1.2vh, 0.9rem)",
          borderTop: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
        }}
      >
        {forms.map((form, i) => {
          const seen = step >= i + 1;
          const isActive = activeIndex === i;
          return (
            <motion.div
              key={i}
              initial={false}
              animate={{ opacity: seen ? 1 : 0.3 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
              style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 0 }}
            >
              <motion.span
                aria-hidden
                initial={false}
                animate={{ scaleX: seen ? 1 : 0.18 }}
                transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
                style={{
                  height: isActive ? "3px" : "2px",
                  borderRadius: "999px",
                  background: seen ? accent : "color-mix(in srgb, var(--text) 25%, transparent)",
                  transformOrigin: "left",
                  boxShadow: isActive ? `0 0 12px ${accent}` : "none",
                  transition: "height 0.3s ease, box-shadow 0.3s ease",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.56rem, 0.74vw, 0.76rem)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: isActive ? accent : "var(--text-muted)",
                  fontWeight: isActive ? 700 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  transition: "color 0.4s ease",
                }}
              >
                {form.name}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
