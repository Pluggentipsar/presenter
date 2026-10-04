"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { glassCardStyle, AmbientBackdrop } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * NoResistanceSystems ★ — tre ställen där samma sak händer.
 *
 * Ersätter en hel AI-vänner-akt: flödet, vännen och chattboten som tre
 * kolumner där motståndet försvinner. Byggd för att SKÖRDAS ur ett förspel:
 * kolumner med miljö-kicker ("Skolgården · måndag") ekar citatslidernas
 * form, så att rummet känner igen rösterna utan att någon text säger det.
 *
 * Kolumnen som saknar miljö (`ny`-flaggan) markeras svagt annorlunda —
 * accentlinje i toppen och chattprickar i stället för miljörad. Det är den
 * enda av de tre som rummet möter för första gången här.
 *
 * Koreografi: kolumnerna tänds i följd. I varje kolumn dyker "det som
 * försvinner"-raden upp — och SJUNKER sedan i opacitet, bokstavligen
 * (CSS-keyframes, så rörelsen överlever frusna rAF-bildrutor). Sista
 * klicket: rubriken landar och en linje tecknas under alla tre.
 *
 * ```mdx
 * <NoResistanceSystems
 *   kicker="§ MOT · Mönstret"
 *   title="System byggda för att **inte säga emot** dig"
 *   footer="Inte tre problem. Tre ställen där motståndet försvinner."
 * >
 * - Skolgården · måndag :: Flödet :: ger mer av samma :: att möta något du inte valt
 * - Skolskjutsen · onsdag :: AI-vännen :: finns alltid, kräver inget :: att den andra har egna behov
 * - ny :: Chattboten :: håller med :: att någon säger emot dig
 * </NoResistanceSystems>
 * ```
 */

interface Column {
  /** Miljö-kicker ("Skolgården · måndag") — eller "ny" för den omärkta. */
  env: string;
  name: string;
  behavior: string;
  loss: string;
  isNew: boolean;
}

interface NoResistanceSystemsProps {
  kicker?: string;
  /** Rubriken som landar SIST. **fet** blir accent. */
  title: string;
  /** Liten rad under linjen i slutläget. */
  footer?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseColumns(children: ReactNode): Column[] {
  const out: Column[] = [];
  const add = (raw: string) => {
    const p = raw.split("::").map((s) => s.trim().replace(/\*\*/g, ""));
    if (p.length < 4) return;
    const isNew = /^ny$/i.test(p[0]);
    out.push({ env: isNew ? "" : p[0], name: p[1], behavior: p[2], loss: p[3], isNew });
  };
  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) add(m[1]);
    }
    return out;
  }
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

function renderRich(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} style={{ color: "var(--accent-ink, var(--accent))" }}>
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function NoResistanceSystems({
  kicker,
  title,
  footer,
  children,
}: NoResistanceSystemsProps) {
  const cols = parseColumns(children);
  // Läge 0: första kolumnen · +1 per kolumn · sista läget: rubriken landar.
  const step = useSlideSteps(cols.length + 1);
  const landed = step >= cols.length;

  if (cols.length === 0) return null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Pop-och-sjunk för "det som försvinner" — CSS-keyframes så att
          slutläget skrivs av stylesystemet även utan rAF. */}
      <style>{`
        @keyframes nrsLossSink {
          0%   { opacity: 0; transform: translateY(8px); }
          22%  { opacity: 1; transform: translateY(0); }
          58%  { opacity: 1; }
          100% { opacity: 0.45; transform: translateY(2px); }
        }
      `}</style>
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1.8rem, 3.6vh, 2.8rem) clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1rem, 2.2vh, 1.6rem)",
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        {/* ─── Rubriken — landar sist, ovanför kolumnerna ─── */}
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            letterSpacing: "var(--heading-tracking)",
            fontSize: "clamp(1.7rem, 3.4vw, 3.3rem)",
            lineHeight: 1.15,
            color: "var(--text)",
            minHeight: "1.3em",
            opacity: landed ? 1 : 0,
            transform: landed ? "translateY(0) scale(1)" : "translateY(-14px) scale(0.97)",
            transition: `opacity 0.8s ${EASE}, transform 0.8s ${EASE}`,
          }}
        >
          <EditableText path="title" value={title}>
            {renderRich(title)}
          </EditableText>
        </div>

        {/* ─── De tre kolumnerna ─── */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))`,
            gap: "clamp(1rem, 2vw, 1.8rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {cols.map((c, i) => {
            const on = step >= i;
            return (
              <div
                key={c.name}
                style={{
                  ...glassCardStyle({ padding: "clamp(1.3rem, 2.6vh, 2rem) clamp(1.2rem, 2vw, 1.8rem)" }),
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  // Den nya markeras svagt annorlunda: en accentlinje i toppen.
                  borderTop: c.isNew
                    ? "2.5px solid var(--accent)"
                    : "1px solid var(--glass-border-top, rgba(255,255,255,0.6))",
                  opacity: on ? 1 : 0,
                  transform: on ? "translateY(0)" : "translateY(30px)",
                  transition: `opacity 0.7s ${EASE}, transform 0.7s ${EASE}`,
                }}
              >
                {/* Miljö-kickern — förspelets eko. Den nya får chattprickar. */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.8vw, 0.8rem)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    minHeight: "1.2em",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                  }}
                >
                  {c.isNew ? (
                    <span aria-hidden style={{ display: "inline-flex", gap: "0.28rem", alignItems: "center" }}>
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          animate={on ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.35 }}
                          transition={{ duration: 1.6, repeat: Infinity, delay: d * 0.22 }}
                          style={{
                            width: "0.42rem",
                            height: "0.42rem",
                            borderRadius: "50%",
                            background: "var(--accent)",
                            display: "inline-block",
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    c.env
                  )}
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(1.5rem, 2.7vw, 2.6rem)",
                    lineHeight: 1.1,
                    color: "var(--text)",
                  }}
                >
                  {c.name}
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.95rem, 1.4vw, 1.35rem)",
                    color: "var(--text)",
                  }}
                >
                  {c.behavior}
                </div>

                <div style={{ flex: 1 }} />

                {/* Det som försvinner — dyker upp och SJUNKER sedan. */}
                <div
                  style={{
                    borderTop: "1px solid var(--glass-border, rgba(16,20,28,0.10))",
                    paddingTop: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.56rem, 0.7vw, 0.7rem)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      marginBottom: "0.35rem",
                    }}
                  >
                    Det som försvinner
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.88rem, 1.25vw, 1.2rem)",
                      lineHeight: 1.4,
                      color: "var(--text)",
                      opacity: on ? undefined : 0,
                      animation: on ? "nrsLossSink 2.6s ease-out 0.35s both" : "none",
                    }}
                  >
                    {c.loss}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Linjen under alla tre + footer — samma sak händer ─── */}
        <div style={{ minHeight: "2.4em" }}>
          <svg
            width="100%"
            height="10"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            aria-hidden
            style={{ display: "block" }}
          >
            <path
              d="M2 5 L 98 5"
              pathLength={1}
              stroke="var(--accent)"
              strokeWidth="1.4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: landed ? 0 : 1,
                opacity: landed ? 1 : 0,
                transition: `stroke-dashoffset 0.9s ${EASE} 0.3s, opacity 0.2s ease 0.3s`,
              }}
            />
          </svg>
          {footer ? (
            <div
              style={{
                textAlign: "center",
                marginTop: "0.55rem",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.85rem, 1.15vw, 1.1rem)",
                color: "var(--text-muted)",
                opacity: landed ? 1 : 0,
                transform: landed ? "translateY(0)" : "translateY(8px)",
                transition: `opacity 0.6s ${EASE} 0.75s, transform 0.6s ${EASE} 0.75s`,
              }}
            >
              <EditableText path="footer" value={footer}>
                {footer}
              </EditableText>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
