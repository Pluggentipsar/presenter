"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BaraWorkmap — en uppgift nedbruten i arbetsmoment, med ansvarsbeslut per moment.
 *
 * Bygger på BÄRA (bara-taupe.vercel.app): beslutet fattas inte för hela
 * uppgiften utan **per moment**. En enda AI-nivå för hela uppgiften döljer
 * vilka kognitiva handlingar som faktiskt delegeras.
 *
 * Momenten avtäcks ett i taget så publiken hinner läsa varje beslut — det är
 * besluten som är innehållet, inte listan.
 *
 * ```mdx
 * <BaraWorkmap
 *   kicker="Historisk källanalys · åk 7–9"
 *   title="Moment för moment"
 *   bottomLine="Åtta moment. Åtta beslut. Ingen generell AI-policy i sikte."
 * >
 * - Förstå uppgiften · Identifiera fråga, källor och slutsatsens fokus. · stodjer
 * - Läsa källorna · Identifiera centrala uppgifter i båda källorna. · bar
 * - Formulera slutsatsen · Skriva en slutsats som inte går längre än källorna medger. · bar
 * - Förklara källvalen · Muntligt visa vad varje källa stödjer och begränsas av. · kontroll
 * </BaraWorkmap>
 * ```
 *
 * Status per rad: `bar` (eleven bär) · `stodjer` (AI stödjer) ·
 * `utfor` (AI utför, eleven ansvarar) · `kontroll` (kontrollpunkt utan generativ AI).
 *
 * Färgerna är BÄRA:s egna och därför hårdsatta som defaults — de är verktygets
 * identitet, inte temats. De går att skriva över med props om ett deck kräver det.
 */

type Status = "bar" | "stodjer" | "utfor" | "kontroll";

interface BaraWorkmapProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  bottomLine?: string;
  /** Vem som bär — "Eleven" (default) eller t.ex. "Jag" när exemplet är talarens eget. */
  who?: string;
  /** Färg per status — BÄRA:s egen palett som default. */
  colorBar?: string;
  colorStodjer?: string;
  colorUtfor?: string;
  colorKontroll?: string;
  children?: ReactNode;
}

interface Moment {
  title: string;
  blurb: string;
  status: Status;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const LABEL: Record<Status, string> = {
  bar: "Eleven bär",
  stodjer: "AI stödjer",
  utfor: "AI utför",
  kontroll: "Kontrollpunkt",
};

const SUBLABEL: Record<Status, string> = {
  bar: "kärnarbetet",
  stodjer: "för tänkandet vidare",
  utfor: "eleven ansvarar",
  kontroll: "utan generativ AI",
};

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseMoments(children: ReactNode): Moment[] {
  const out: Moment[] = [];
  const push = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const p = raw.split(/\s*·\s*/);
    const s = (p[2] ?? "bar").trim().toLowerCase();
    const status: Status =
      s === "stodjer" || s === "stödjer" ? "stodjer"
      : s === "utfor" || s === "utför" ? "utfor"
      : s === "kontroll" ? "kontroll"
      : "bar";
    out.push({ title: (p[0] ?? "").trim(), blurb: (p[1] ?? "").trim(), status });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          push(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      push(el);
    }
  });
  return out;
}

export function BaraWorkmap({
  kicker,
  title = "Moment för moment",
  subtitle,
  bottomLine,
  who = "Eleven",
  colorBar = "#3E4C8C",
  colorStodjer = "#1F6B4A",
  colorUtfor = "#B0713A",
  colorKontroll = "#2F7D5B",
  children,
}: BaraWorkmapProps) {
  const moments = useMemo(() => parseMoments(children), [children]);
  const step = useSlideSteps(moments.length);

  const colorOf = (s: Status) =>
    s === "bar" ? colorBar
    : s === "stodjer" ? colorStodjer
    : s === "utfor" ? colorUtfor
    : colorKontroll;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(2rem, 4vh, 3.2rem) clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(0.8rem, 2vh, 1.4rem)",
        }}
      >
        {/* Rubrikrad */}
        <div style={{ flexShrink: 0 }}>
          {kicker ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-caption, clamp(0.7rem, 0.95vw, 1rem))",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "0.5rem",
              }}
            >
              {kicker}
            </div>
          ) : null}
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.9rem, 3.4vw, 3.1rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: "var(--text)",
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "0.4rem 0 0",
                fontFamily: "var(--font-body)",
                fontSize: "var(--room-detail, clamp(0.9rem, 1.15vw, 1.15rem))",
                color: "var(--text-muted)",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Momentlistan */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.35rem, 0.9vh, 0.7rem)",
            justifyContent: "center",
          }}
        >
          {moments.map((m, i) => {
            const shown = step >= i;
            const c = colorOf(m.status);
            return (
              <motion.div data-row=""
                key={i}
                initial={false}
                animate={{ opacity: shown ? 1 : 0.12, x: shown ? 0 : -12 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(0.8rem, 1.6vw, 1.6rem)",
                  padding: "clamp(0.5rem, 1.1vh, 0.85rem) clamp(0.9rem, 1.6vw, 1.4rem)",
                  background: "var(--bg-surface)",
                  // Vänsterkanten bär beslutet — det är det som ska gå att
                  // läsa av på fem meters håll, inte badgetexten.
                  borderLeft: `5px solid ${c}`,
                  borderRadius: "0.4rem",
                  boxShadow: shown ? `0 1px 12px ${withAlpha(c, 0.13)}` : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--room-body, clamp(0.85rem, 1.2vw, 1.2rem))",
                    fontWeight: 700,
                    color: c,
                    minWidth: "1.8em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--room-body, clamp(1rem, 1.5vw, 1.5rem))",
                      fontWeight: 600,
                      lineHeight: 1.15,
                      color: "var(--text)",
                    }}
                  >
                    {m.title}
                  </span>
                  {m.blurb ? (
                    <span
                      style={{
                        display: "block",
                        fontFamily: "var(--font-body)",
                        fontSize: "var(--room-body, clamp(0.75rem, 1vw, 1rem))",
                        lineHeight: 1.3,
                        color: "var(--text-muted)",
                      }}
                    >
                      {m.blurb}
                    </span>
                  ) : null}
                </span>

                <span data-tag=""
                  style={{
                    flexShrink: 0,
                    textAlign: "right",
                    padding: "0.3em 0.9em",
                    borderRadius: "999px",
                    border: `1.5px solid ${withAlpha(c, 0.45)}`,
                    background: withAlpha(c, 0.08),
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--room-caption, clamp(0.62rem, 0.85vw, 0.85rem))",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: c,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.status === "bar" ? `${who} bär` : LABEL[m.status]}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--room-caption, clamp(0.58rem, 0.72vw, 0.72rem))",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.status === "utfor" ? `${who.toLowerCase()} ansvarar` : SUBLABEL[m.status]}
                  </span>
                </span>
              </motion.div>
            );
          })}
        </div>

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: step >= moments.length - 1 ? 1 : 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "var(--room-body, clamp(0.95rem, 1.35vw, 1.35rem))",
              color: "var(--text-muted)",
            }}
          >
            {bottomLine}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
