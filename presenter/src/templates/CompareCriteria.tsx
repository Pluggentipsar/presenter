"use client";

import { motion } from "framer-motion";
import { Children, Fragment, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

interface CompareCriteriaProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Rubrik för vänster spalt — typ "Källkritik var". */
  leftTitle: string;
  /** Rubrik för höger spalt — typ "Relationskritik är också". */
  rightTitle: string;
  /**
   * Markdown-lista med kriterier — varje rad förgrenar med "|" mellan
   * vänster och höger.
   * Format: `- VÄNSTER_TEXT | HÖGER_TEXT`
   */
  children?: ReactNode;
  /**
   * Slutrad under jämförelsen — den poäng de två spalterna leder fram till.
   * Utan den registreras inga steg och sliden beter sig exakt som förut.
   */
  closing?: string;
  /** Vändningen på slutraden, på nästa klick. Kräver `closing`. */
  closingReveal?: string;
}

interface CriteriaRow {
  left: string;
  right: string;
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parseRows(children: ReactNode): CriteriaRow[] {
  const out: CriteriaRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const [left = "", right = ""] = raw.split("|").map((s) => s.trim());
    out.push({ left, right });
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
 * CompareCriteria — Bokuppslag-jämförelse mellan "var" och "är också".
 *
 * Vänster spalt: det gamla (källkritik som var). Tonad ner — italic,
 * mindre, dämpad färg.
 * Höger spalt: det nya (relationskritik är också). Full färg, levande,
 * lite större.
 *
 * Mellan: en vertikal ornament-linje. Subtil men närvarande.
 *
 * Designat för slide 18 (landningen) i en föreläsning.
 */
export function CompareCriteria({
  kicker,
  chapter,
  leftTitle,
  rightTitle,
  children,
  closing,
  closingReveal,
}: CompareCriteriaProps) {
  const rows = parseRows(children);
  const closingSteps = closing ? (closingReveal ? 3 : 2) : 0;
  const step = useSlideSteps(closingSteps);
  const closingOut = Boolean(closing) && step >= 1;
  const revealOut = Boolean(closingReveal) && step >= 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
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
        </motion.div>
      ) : null}

      {/* Innehåll — bokuppslag */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          zIndex: 2,
        }}
      >
        {/*
         * ETT rutnät för båda spalterna, inte två fristående kolumner.
         * Varje kriteriepar delar rad, så vänster och höger står i höjd med
         * varandra — jämförelsen är hela poängen och den går förlorad om
         * raderna glider isär när texterna är olika långa.
         */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1.1fr",
            columnGap: "clamp(2rem, 4vw, 4rem)",
            rowGap: "clamp(1rem, 2.5vh, 2rem)",
            width: "100%",
            maxWidth: "var(--slide-max-width)",
            alignItems: "start",
          }}
        >
          {/* Rubrik vänster */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{
              gridColumn: 1,
              gridRow: 1,
              justifySelf: "end",
              textAlign: "right",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            <EditableText path="leftTitle" value={leftTitle}>
              {leftTitle}
            </EditableText>
          </motion.div>

          {/* Vertikal ornament-linje — spänner över rubrikrad + alla par */}
          <motion.div
            aria-hidden
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 0.4 }}
            transition={{ duration: 1.2, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
            style={{
              gridColumn: 2,
              gridRow: `1 / ${rows.length + 2}`,
              width: "1px",
              background:
                "linear-gradient(180deg, transparent 0%, var(--accent) 20%, var(--accent) 80%, transparent 100%)",
              alignSelf: "stretch",
              transformOrigin: "top",
            }}
          />

          {/* Rubrik höger */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.3 }}
            style={{
              gridColumn: 3,
              gridRow: 1,
              justifySelf: "start",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--accent)",
              fontWeight: 700,
            }}
          >
            <EditableText path="rightTitle" value={rightTitle}>
              {rightTitle}
            </EditableText>
          </motion.div>

          {rows.map((row, i) => (
            <Fragment key={i}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7 + i * 0.2 }}
                style={{
                  gridColumn: 1,
                  gridRow: i + 2,
                  justifySelf: "end",
                  textAlign: "right",
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(1.2rem, 1.8vw, 1.7rem)",
                  lineHeight: 1.35,
                  color: "var(--text-muted)",
                  letterSpacing: "-0.005em",
                  maxWidth: "18em",
                }}
              >
                {row.left}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 1.6 + i * 0.25,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  gridColumn: 3,
                  gridRow: i + 2,
                  justifySelf: "start",
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontSize: "clamp(1.3rem, 2vw, 1.95rem)",
                  lineHeight: 1.35,
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                  maxWidth: "22em",
                }}
              >
                {row.right}
              </motion.div>
            </Fragment>
          ))}
        </div>

        {/* ————— Slutraden, i två steg ————— */}
        {closing ? (
          <div
            style={{
              // Samma bredd som jämförelsen ovanför, så accentlinjen löper
              // kant i kant med spalterna i stället för att bli en lös stump.
              width: "100%",
              maxWidth: "var(--slide-max-width)",
              marginTop: "clamp(1.6rem, 4vh, 2.8rem)",
              paddingTop: "clamp(0.9rem, 1.8vh, 1.4rem)",
              borderTop: "2px solid var(--accent)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.5rem, 1.2vh, 0.9rem)",
            }}
          >
            <motion.div
              initial={false}
              animate={{
                opacity: closingOut ? (revealOut ? 0.45 : 1) : 0,
                y: closingOut ? 0 : 10,
              }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(1.05rem, 1.6vw, 1.6rem)",
                lineHeight: 1.35,
                color: "var(--text)",
              }}
            >
              <EditableText path="closing" value={closing}>
                {closing}
              </EditableText>
            </motion.div>

            {closingReveal ? (
              <motion.div
                initial={false}
                animate={{ opacity: revealOut ? 1 : 0, y: revealOut ? 0 : 10 }}
                transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(1.2rem, 1.95vw, 1.95rem)",
                  lineHeight: 1.3,
                  letterSpacing: "-0.015em",
                  color: "var(--accent)",
                }}
              >
                <EditableText path="closingReveal" value={closingReveal}>
                  {closingReveal}
                </EditableText>
              </motion.div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
