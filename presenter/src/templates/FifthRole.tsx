"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FifthRole ★ — fyra roller vi ger, en som ges mot oss.
 *
 * Decket bygger fyra roller genom hela passet, och de har alla samma
 * riktning: vi räcker något till AI:n. Masken bryter mönstret, och
 * brottet är hela poängen — den ges av någon annan och är riktad mot
 * oss. Därför har den ingen plats i RoleOrbit, och därför duger inte en
 * textrad som säger det.
 *
 * Riktningen bär argumentet. Fyra pilar går inåt. Sedan kommer en femte
 * från utsidan, går förbi AI:n utan att stanna, och landar på oss — och
 * etiketten till vänster byter från VI till DIG i samma rörelse.
 *
 * Den femte bär `accentAlert`, för det är en blottläggning: något som
 * görs mot publiken utan att de bett om det. Det är den enda gången
 * templaten använder rött.
 *
 * ```mdx
 * <FifthRole
 *   chapter="§ 4 · Den femte rollen"
 *   usLabel="Vi"
 *   targetLabel="Dig"
 *   aiLabel="AI"
 *   givenLabel="Fyra roller vi ger AI"
 *   fifthLabel="Masken"
 *   fifthNote="ges av någon annan — riktad mot dig"
 *   landing="Fyra roller **vi** ger. Den femte ger **någon annan.**"
 * >
 * - Oraklet
 * - Tjänaren
 * - Vännen
 * - Rivalen
 * </FifthRole>
 * ```
 */

interface FifthRoleProps {
  chapter?: string;
  kicker?: string;
  /** Etiketten längst till vänster innan den femte kommer. */
  usLabel?: string;
  /** Vad samma etikett byter till när den femte landat. */
  targetLabel?: string;
  /** Texten i mitten. Ingen robot, inget ansikte — bara ordet. */
  aiLabel?: string;
  /** Liten rubrik över de fyra. */
  givenLabel?: string;
  /** Namnet på den femte rollen. */
  fifthLabel?: string;
  /** Underrad till den femte. */
  fifthNote?: string;
  /** Landningsraden. Stödjer **fet**. */
  landing?: string;
  accent?: string;
  /** Signalfärg för den femte. Default temats accentAlert. */
  alert?: string;
  /** Markdown-lista: de fyra rollerna. */
  children?: ReactNode;
}

const W = 1000;
const H = 440;

const AI = { x: 508, y: 220, r: 62 };
const US = { x: 96, y: 220 };
const CHIP = { w: 196, h: 44, x: 176 };
const ROWS = [64, 148, 292, 376];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseRoles(children: ReactNode): string[] {
  const out: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "li") {
        const t = extractText(el.props.children).trim();
        if (t) out.push(t);
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out.slice(0, 4);
}

export function FifthRole({
  chapter,
  kicker,
  usLabel = "Vi",
  targetLabel = "Dig",
  aiLabel = "AI",
  givenLabel = "Fyra roller vi ger AI",
  fifthLabel = "Masken",
  fifthNote,
  landing,
  accent = "var(--accent)",
  alert = "var(--accent-alert, #E63946)",
  children,
}: FifthRoleProps) {
  const step = useSlideSteps(2);
  const struck = step >= 1;
  const roles = parseRoles(children);

  const muted = "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.2rem, 4.5vh, 4rem) clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(4.5rem, 8vh, 6rem)",
          gap: "clamp(0.8rem, 1.8vh, 1.4rem)",
          zIndex: 2,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", alignItems: "center" }}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: "auto", maxHeight: "100%", overflow: "visible" }}
            aria-hidden
          >
            <defs>
              <marker
                id="fr-head"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={accent} />
              </marker>
              <marker
                id="fr-head-alert"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={alert} />
              </marker>
              <filter id="fr-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Rubrik över de fyra */}
            <motion.text
              x={CHIP.x}
              y={30}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                fill: muted,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: struck ? 0.5 : 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {givenLabel}
            </motion.text>

            {/* De fyra rollerna — pilar inåt mot AI */}
            {roles.map((r, i) => {
              const y = ROWS[i] ?? 64 + i * 84;
              const cy = y + CHIP.h / 2;
              const from = { x: CHIP.x + CHIP.w, y: cy };
              const to = { x: AI.x - AI.r - 10, y: AI.y };
              const d = `M ${from.x} ${from.y} C ${from.x + 70} ${from.y} ${to.x - 60} ${to.y} ${to.x} ${to.y}`;
              return (
                <g key={r}>
                  <motion.rect
                    x={CHIP.x}
                    y={y}
                    width={CHIP.w}
                    height={CHIP.h}
                    rx={CHIP.h / 2}
                    fill="var(--bg-surface)"
                    stroke="rgba(128,128,128,0.32)"
                    strokeWidth={1.5}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: struck ? 0.45 : 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.25 + i * 0.12 }}
                  />
                  <motion.text
                    x={CHIP.x + CHIP.w / 2}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontFamily: "var(--font-display, var(--font-sans))",
                      fontSize: 21,
                      fontWeight: 600,
                      fill: "var(--text)",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: struck ? 0.45 : 1 }}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.12 }}
                  >
                    {r}
                  </motion.text>
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={accent}
                    strokeWidth={2}
                    markerEnd="url(#fr-head)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: struck ? 0.3 : 0.85 }}
                    transition={{ duration: 0.8, delay: 0.45 + i * 0.12 }}
                  />
                </g>
              );
            })}

            {/* VI / DIG */}
            <motion.text
              x={US.x}
              y={US.y}
              textAnchor="middle"
              dominantBaseline="middle"
              key={struck ? "dig" : "vi"}
              style={{
                fontFamily: "var(--font-display, var(--font-sans))",
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                fill: struck ? alert : "var(--text)",
              }}
              initial={{ opacity: 0, y: US.y + 8 }}
              animate={{ opacity: 1, y: US.y }}
              transition={{ duration: 0.6, delay: struck ? 0.9 : 0.15 }}
            >
              {struck ? targetLabel : usLabel}
            </motion.text>

            {/* AI i mitten — form, inte ansikte */}
            <motion.circle
              cx={AI.x}
              cy={AI.y}
              r={AI.r}
              fill="var(--bg-surface)"
              stroke="rgba(128,128,128,0.4)"
              strokeWidth={1.5}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: `${AI.x}px ${AI.y}px` }}
            />
            <motion.text
              x={AI.x}
              y={AI.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 26,
                letterSpacing: "0.18em",
                fill: "var(--text)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              {aiLabel}
            </motion.text>

            {/* ── DEN FEMTE — kommer utifrån, går förbi, landar på dig ── */}
            <motion.path
              d={`M 812 ${AI.y} C 700 ${AI.y - 130} 340 ${AI.y - 150} ${US.x + 6} ${US.y - 40}`}
              fill="none"
              stroke={alert}
              strokeWidth={3.5}
              markerEnd="url(#fr-head-alert)"
              filter="url(#fr-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={struck ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.g
              initial={{ opacity: 0, x: 40 }}
              animate={struck ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <rect
                x={822}
                y={AI.y - 26}
                width={168}
                height={52}
                rx={26}
                fill="var(--bg-surface)"
                stroke={alert}
                strokeWidth={2}
              />
              <text
                x={906}
                y={AI.y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontFamily: "var(--font-display, var(--font-sans))",
                  fontSize: 23,
                  fontWeight: 600,
                  fill: alert,
                }}
              >
                {fifthLabel}
              </text>
              {fifthNote ? (
                <text
                  x={906}
                  y={AI.y + 46}
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    fill: muted,
                  }}
                >
                  {fifthNote}
                </text>
              ) : null}
            </motion.g>
          </svg>
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={struck ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            style={{
              paddingTop: "clamp(0.8rem, 1.6vh, 1.3rem)",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.4rem, 2.6vw, 2.4rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            <EditableText path="landing" value={landing} multiline block>
              {inlineMarkdown(landing)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
