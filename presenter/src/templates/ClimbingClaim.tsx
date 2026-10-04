"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ClimbingClaim ★ — påståendet står stilla, ett ord klättrar.
 *
 * Meningen skrivs fram ord för ord och blir sedan kvar. Varje klick byter
 * bara ut ETT ord i den: det gamla stiger ur bild uppåt, det nya kommer
 * underifrån. Resten av meningen rör sig inte.
 *
 * Poängen är att påståendet aldrig omprövas — bara nivån. Publiken hinner
 * landa i "det gäller högstadiet", och sedan visar sliden att exakt samma
 * mening håller ett steg upp. Och ett till.
 *
 * Ett avslutande ord som slutar på "(?)" får parentesen satt lättare — det
 * markerar att sista steget är en öppen fråga, inte ett påstående.
 *
 * MDX-format — ett ord per rad, meningen delas av `before` och `after`:
 * ```mdx
 * <ClimbingClaim
 *   before="Det finns ingen uppgift, på"
 *   after=", som en chattbot inte löser med gott resultat."
 *   coda="Det måste betyda något för det vi gör."
 * >
 * - högstadienivå
 * - gymnasienivå
 * - högskolenivå (?)
 * </ClimbingClaim>
 * ```
 */

interface ClimbingClaimProps {
  chapter?: string;
  /** Meningen fram till ordet som byts. */
  before?: string;
  /** Meningen efter ordet som byts. */
  after?: string;
  /** Rad som står kvar under påståendet hela tiden. */
  coda?: string;
  accent?: string;
  children?: ReactNode;
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

function parseWords(children: ReactNode): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim().replace(/\*\*/g, "");
    if (t) out.push(t);
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

/** Ordet ord för ord, så meningen HÄNDER i stället för att bara stå där. */
function StaggeredText({ text, delay = 0 }: { text: string; delay?: number }) {
  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((w, i) =>
        w.trim() === "" ? (
          <span key={i}>{w}</span>
        ) : (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: delay + i * 0.035,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ display: "inline-block" }}
          >
            {w}
          </motion.span>
        ),
      )}
    </>
  );
}

export function ClimbingClaim({
  chapter,
  before = "",
  after = "",
  coda,
  accent = "var(--accent)",
  children,
}: ClimbingClaimProps) {
  const words = parseWords(children);
  const step = useSlideSteps(Math.max(words.length, 1));

  if (words.length === 0) return null;

  const index = Math.min(step, words.length - 1);
  const current = words[index];

  // Ett avslutande "(?)" sätts lättare — det är en öppen fråga, inte ett
  // påstående, och ska läsas som en tvekan snarare än som en del av ordet.
  const hedge = /\s*\(\?\)\s*$/.exec(current);
  const word = hedge ? current.slice(0, hedge.index) : current;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `radial-gradient(54% 50% at 50% 46%, ${withAlpha(accent, 0.13)} 0%, transparent 68%)`,
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
            gap: "clamp(1.2rem, 3vh, 2.4rem)",
          }}
        >
          <p
            style={{
              margin: 0,
              maxWidth: "min(90vw, 58rem)",
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: "clamp(1.9rem, 3.7vw, 3.7rem)",
              lineHeight: 1.14,
              letterSpacing: "var(--heading-tracking)",
              color: "var(--text)",
            }}
          >
            <StaggeredText text={before} />{" "}
            {/* Bytesplatsen. layout gör att resten av meningen glider mjukt
                i stället för att hoppa när ordlängden ändras. */}
            <motion.span
              layout
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                display: "inline-block",
                verticalAlign: "baseline",
                overflow: "hidden",
                paddingBottom: "0.08em",
                color: accent,
                fontWeight: 800,
              }}
            >
              {/*
                Bara det aktuella ordet renderas, och nyckeln gör att React
                monterar om det vid byte. INGEN AnimatePresence här med flit:
                den behåller det utgående ordet tills exit-animationen är klar,
                och hinner den inte köra — dold flik, snabba klick — står orden
                kvar och radas upp efter varandra till obegriplighet.
                Meningens korrekthet ska inte hänga på att bildrutor levereras.
              */}
              <motion.span
                key={current}
                initial={{ y: "0.75em", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "inline-block", whiteSpace: "nowrap" }}
              >
                {word}
                {hedge ? (
                  <span style={{ fontWeight: 400, opacity: 0.55 }}> (?)</span>
                ) : null}
              </motion.span>
            </motion.span>
            <StaggeredText text={after} delay={0.1} />
          </p>

          {coda ? (
            <p
              style={{
                margin: 0,
                maxWidth: "min(80vw, 46rem)",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.15rem, 2vw, 2rem)",
                lineHeight: 1.28,
                color: "var(--text-muted)",
              }}
            >
              <StaggeredText text={coda} delay={0.55} />
            </p>
          ) : null}
        </div>

        {/* Nivåmarkörer — visar hur många steg upp som återstår */}
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
          {words.map((w, i) => (
            <span
              key={w}
              style={{
                width: i === index ? "2.2rem" : "0.5rem",
                height: "0.5rem",
                borderRadius: "999px",
                background: i <= index ? accent : "var(--text-muted)",
                opacity: i <= index ? 1 : 0.3,
                transition: "all 380ms var(--motion-ease, cubic-bezier(0.22,1,0.36,1))",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
