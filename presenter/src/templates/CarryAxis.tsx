"use client";

import { Children, Fragment, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CarryAxis ★ — samma mening tre gånger, uppradad på ordet som inte ändras.
 *
 * Meningarna sätts i tre spalter: bäraren högerställd, verbet i en fast
 * mittkolumn, bördan vänsterställd. Verbet bildar därmed en lodrät axel
 * genom sliden, och parallellstrukturen syns i stället för att behöva
 * påpekas — det är samma mening, bara olika vem och olika vad.
 *
 *        AI kan │ bära │ arbetet.
 *            Du │ bär  │ omdömet.
 *  Eleven måste │ bära │ lärandet.
 *
 * Den sista raden kan sättas isär med en linje och stannar kvar i full
 * styrka när de tidigare dämpas. Det är den man ska gå därifrån med.
 *
 * MDX-format — `bärare · verb · börda`, plus `sist` på den som sätts isär:
 * ```mdx
 * <CarryAxis chapter="§ Omdömet · Svaret">
 * - AI kan · bära · arbetet.
 * - Du · bär · omdömet.
 * - Eleven måste få · bära · lärandet. · sist
 * </CarryAxis>
 * ```
 */

interface CarryAxisProps {
  chapter?: string;
  /**
   * Villkoret meningarna hänger på — sätts kursivt i display över axeln,
   * i bläck. Hålls kort; meningarna ska fortfarande bära sliden.
   */
  kicker?: string;
  accent?: string;
  children?: ReactNode;
}

interface Line {
  who: string;
  verb: string;
  what: string;
  /** Sätts isär med en linje och blir kvar när de andra dämpas. */
  apart: boolean;
}

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

function parseLines(children: ReactNode): Line[] {
  const out: Line[] = [];
  const add = (raw: string) => {
    const p = raw.split("·").map((s) => s.trim().replace(/\*\*/g, ""));
    if (!p[0] || !p[1]) return;
    out.push({
      who: p[0],
      verb: p[1],
      what: p[2] ?? "",
      apart: /^sist$/i.test(p[3] ?? ""),
    });
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

export function CarryAxis({
  chapter,
  kicker,
  accent = "var(--accent)",
  children,
}: CarryAxisProps) {
  const lines = parseLines(children);
  const step = useSlideSteps(lines.length);

  if (lines.length === 0) return null;

  const lastIndex = lines.length - 1;
  const landed = step >= lastIndex;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Ljuset samlas kring den sista raden när den landat. */}
      <motion.div
        aria-hidden
        animate={{ opacity: landed ? 1 : 0.35 }}
        transition={{ duration: 1 }}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `radial-gradient(52% 46% at 50% 68%, ${withAlpha(accent, 0.15)} 0%, transparent 70%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(2rem, 4vh, 3.2rem) clamp(2.5rem, 5vw, 5rem)",
        }}
      >
        {chapter ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="chapter" value={chapter}>
              {chapter}
            </EditableText>
          </div>
        ) : null}

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {kicker ? (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(1.1rem, 1.7vw, 1.7rem)",
                lineHeight: 1.2,
                color: "var(--text)",
                opacity: 0.85,
                textAlign: "center",
                marginBottom: "clamp(0.8rem, 2vh, 1.4rem)",
              }}
            >
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              // Bäraren, verbet, bördan. Verbkolumnen är axeln.
              gridTemplateColumns: "auto auto auto",
              alignItems: "baseline",
              columnGap: "clamp(0.5rem, 1.2vw, 1.1rem)",
              rowGap: "clamp(0.6rem, 1.8vh, 1.3rem)",
            }}
          >
            {lines.map((l, i) => {
              const on = i <= step;
              // När sista raden landat dras de tidigare tillbaka. Det är den
              // sista publiken ska gå därifrån med.
              const receded = landed && i < lastIndex;
              const size = i === lastIndex ? "clamp(2.1rem, 4.4vw, 4.4rem)" : "clamp(1.9rem, 3.9vw, 3.9rem)";

              // Opaciteten sätts per cell — en wrapper med display:contents
              // genererar ingen box, så varken opacity eller transform biter
              // på den.
              //
              // Och den sätts med CSS-transition, inte med Framer Motion.
              // Framer driver värdet bildruta för bildruta; uteblir bildrutorna
              // står raden kvar på noll och payoff-raden syns aldrig. En
              // CSS-transition skriver målvärdet direkt i stilen och animerar
              // om den hinner — den failar synlig i stället för osynlig.
              const cell = {
                fontFamily: "var(--font-display)",
                fontSize: size,
                lineHeight: 1.08,
                whiteSpace: "nowrap" as const,
                opacity: on ? (receded ? 0.42 : 1) : 0,
                transition: "opacity 600ms var(--motion-ease, cubic-bezier(0.22,1,0.36,1))",
              };

              return (
                <Fragment key={i}>
                  {/* Avskiljaren ovanför den rad som sätts isär */}
                  {l.apart ? (
                    <div
                      aria-hidden
                      style={{
                        gridColumn: "1 / -1",
                        height: "1px",
                        background: withAlpha(accent, 0.4),
                        transformOrigin: "center",
                        transform: on ? "scaleX(1)" : "scaleX(0)",
                        opacity: on ? 1 : 0,
                        transition:
                          "transform 700ms var(--motion-ease, cubic-bezier(0.22,1,0.36,1)), opacity 500ms ease",
                        margin: "clamp(0.7rem, 2vh, 1.4rem) 0",
                      }}
                    />
                  ) : null}

                  <div
                    style={{
                      ...cell,
                      textAlign: "right",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      color: "var(--text-muted)",
                    }}
                  >
                    {l.who}
                  </div>

                  {/* Konstanten. Den ändras aldrig — därför axeln. */}
                  <div
                    style={{
                      ...cell,
                      textAlign: "center",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      color: "var(--text)",
                    }}
                  >
                    {l.verb}
                  </div>

                  <div
                    style={{
                      ...cell,
                      textAlign: "left",
                      fontWeight: 800,
                      letterSpacing: "-0.025em",
                      color: accent,
                      textShadow:
                        i === lastIndex && landed
                          ? `0 0 70px ${withAlpha(accent, 0.4)}`
                          : "none",
                    }}
                  >
                    {l.what}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
