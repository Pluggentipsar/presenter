"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AssessmentTwins — visualiserar Roe, Perkins & Giray (2026) "assessment twins":
 * para en GenAI-sårbar uppgift med en TVILLING som mäter SAMMA lärandemål via
 * ANNAT bevis. Tvillingen ger inget eget betyg — den BEKRÄFTAR eller BEGRÄNSAR
 * den första. Diskrepansen är signalen. Inte övervakning — para, inte polisa.
 *
 * Cyklare: samma länkade-kort-ram, men PARET cyklar genom flera exempel (space)
 * så publiken får en repertoar och lyfter blicken. Vänster = sårbar (?, kan vara
 * AI), höger = tvillingen (✓, bekräftar), glödande länk = samma lärandemål.
 *
 * Innehåll via children — en rad per par:
 *   - Kontext :: Sårbar uppgift :: Tvilling (handling)
 *
 * Temaadaptiv (var(--accent), var(--accent-alert)).
 */

interface AssessmentTwinsProps {
  kicker?: string;
  chapter?: string;
  source?: string;
  title?: string;
  subtitle?: string;
  /** Etikett på länken mellan korten. */
  linkLabel?: string;
  /** Roll-bricka, vänster kort. */
  vulnerableRole?: string;
  /** Roll-bricka, höger kort. */
  twinRole?: string;
  /** Persistent poäng. **fet** = accent, ~~fet~~ = alert. */
  payoff?: string;
  accent?: string;
  children?: ReactNode;
}

interface Pair {
  context: string;
  vulnerable: string;
  twin: string;
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

function parsePairs(children: ReactNode): Pair[] {
  const out: Pair[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*::\s*/).map((s) => s.trim());
    if (parts.length >= 3) out.push({ context: parts[0], vulnerable: parts[1], twin: parts[2] });
    else if (parts.length === 2) out.push({ context: "", vulnerable: parts[0], twin: parts[1] });
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

function renderInline(text: string, accent: string, alert: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={i} style={{ color: accent, fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("~~") && p.endsWith("~~"))
      return <strong key={i} style={{ color: alert, fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    return <span key={i}>{p}</span>;
  });
}

const FALLBACK: Pair[] = [{ context: "Allmän linje", vulnerable: "Essän", twin: "Muntligt — förklara argumentet" }];

export function AssessmentTwins({
  kicker = "§ Bedömning · tvillingar",
  chapter,
  source = "Roe, Perkins & Giray · 2026",
  title = "Bedömningstvillingar",
  subtitle = "Para den sårbara uppgiften med en tvilling — samma mål, annat bevis. Tvillingen bekräftar.",
  linkLabel = "samma lärandemål",
  vulnerableRole = "kan vara AI",
  twinRole = "bekräftar",
  payoff = "Tvillingen ger inget eget betyg — den **bekräftar** eller ~~begränsar~~ det första. Skaver de? Diskrepansen är signalen.",
  accent = "var(--accent)",
  children,
}: AssessmentTwinsProps) {
  const parsed = parsePairs(children);
  const pairs = parsed.length > 0 ? parsed : FALLBACK;
  const n = pairs.length;
  const step = useSlideSteps(n);
  const i = Math.min(Math.max(step, 0), n - 1);
  const pair = pairs[i];
  const alert = "var(--accent-alert)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-ambient-bg
      style={{
        background:
          "radial-gradient(ellipse 85% 75% at 50% 26%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 78%)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        padding: "clamp(2.4rem, 4.5vw, 4.5rem)",
      }}
    >
      {/* Topprad */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        {kicker ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--room-caption, clamp(0.7rem, 0.9vw, 0.92rem))",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: accent,
              fontWeight: 600,
            }}
          >
            {kicker}
          </motion.div>
        ) : <span />}
        {(chapter || source) ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--room-caption, clamp(0.66rem, 0.85vw, 0.85rem))",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textAlign: "right",
            }}
          >
            {chapter ?? source}
          </motion.div>
        ) : null}
      </div>

      {/* Rubrik + underrubrik */}
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(2.1rem, 4.4vw, 3.8rem)",
          lineHeight: 1.02,
          letterSpacing: "-0.025em",
          margin: "clamp(0.7rem, 1.5vh, 1.3rem) 0 0",
        }}
      >
        {title}
      </motion.h2>
      {subtitle ? (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--room-body, clamp(1rem, 1.3vw, 1.4rem))",
            lineHeight: 1.4,
            color: "var(--text-muted)",
            maxWidth: "42em",
            margin: "0.5rem 0 0",
          }}
        >
          {subtitle}
        </motion.p>
      ) : null}

      {/* Cyklande par */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(0.9rem, 1.8vh, 1.6rem)",
          marginTop: "clamp(0.8rem, 1.6vh, 1.4rem)",
        }}
      >
        {/* Kontext-etikett (linjen) */}
        <div style={{ height: "clamp(1.3rem, 2.4vh, 1.9rem)", display: "flex", justifyContent: "center" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`ctx-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-caption, clamp(0.72rem, 0.95vw, 0.98rem))",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              {pair.context}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Korten + länk */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "stretch", gap: "clamp(0.8rem, 2vw, 2rem)" }}>
          {/* Vänster: sårbar */}
          <div data-card=""
            style={{
              position: "relative",
              borderRadius: "1rem",
              border: `1px solid ${withAlpha(accent, 0.28)}`,
              background: "var(--bg-surface)",
              padding: "clamp(1.3rem, 2.4vw, 2.2rem)",
              boxShadow: "0 30px 60px -34px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
              minWidth: 0,
            }}
          >
            <RoleBadge glyph="?" label={vulnerableRole} color={alert} />
            <AnimatePresence mode="wait">
              <motion.div
                key={`v-${i}`}
                initial={{ opacity: 0, x: -16, filter: "blur(5px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -16, filter: "blur(5px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(1.5rem, 2.6vw, 2.5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.015em",
                }}
              >
                {pair.vulnerable}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Länk */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: "clamp(5rem, 9vw, 9.5rem)" }}>
            <motion.div data-glow=""
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: "2px",
                background: withAlpha(accent, 0.7),
                boxShadow: `0 0 14px ${withAlpha(accent, 0.5)}`,
                transformOrigin: "center",
              }}
            />
            <div data-tag=""
              style={{
                position: "relative",
                zIndex: 2,
                padding: "0.3rem 0.7rem",
                borderRadius: "9999px",
                background: "var(--bg)",
                border: `1px solid ${withAlpha(accent, 0.4)}`,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--room-caption, clamp(0.58rem, 0.76vw, 0.78rem))",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {linkLabel}
            </div>
          </div>

          {/* Höger: tvillingen */}
          <div data-card=""
            style={{
              position: "relative",
              borderRadius: "1rem",
              border: `1px solid ${withAlpha(accent, 0.5)}`,
              background: "var(--bg-surface)",
              padding: "clamp(1.3rem, 2.4vw, 2.2rem)",
              boxShadow: `0 30px 60px -34px rgba(0,0,0,0.7), 0 0 50px -22px ${withAlpha(accent, 0.55)}`,
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
              minWidth: 0,
            }}
          >
            <RoleBadge glyph="✓" label={twinRole} color={accent} />
            <AnimatePresence mode="wait">
              <motion.div
                key={`t-${i}`}
                initial={{ opacity: 0, x: 16, filter: "blur(5px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 16, filter: "blur(5px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(1.5rem, 2.6vw, 2.5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.015em",
                  color: "var(--text)",
                }}
              >
                {pair.twin}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Progress-prickar */}
        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", marginTop: "clamp(0.3rem, 0.8vh, 0.7rem)" }}>
          {pairs.map((_, idx) => (
            <motion.div
              key={idx}
              animate={{
                background: idx === i ? accent : withAlpha(accent, 0.22),
                width: idx === i ? "2rem" : "0.55rem",
              }}
              transition={{ duration: 0.4 }}
              style={{ height: "3px", borderRadius: "2px" }}
            />
          ))}
        </div>
      </div>

      {/* Persistent poäng */}
      {payoff ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(1.1rem, 1.85vw, 2rem)",
            lineHeight: 1.22,
            letterSpacing: "-0.015em",
            marginTop: "clamp(0.9rem, 1.8vh, 1.5rem)",
            maxWidth: "40em",
          }}
        >
          {renderInline(payoff, accent, alert)}
        </motion.div>
      ) : null}
    </div>
  );
}

function RoleBadge({ glyph, label, color }: { glyph: string; label: string; color: string }) {
  return (
    <div data-tag=""
      style={{
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.3rem 0.75rem",
        borderRadius: "9999px",
        border: `1px solid ${withAlpha(color, 0.5)}`,
        background: withAlpha(color, 0.1),
        color,
        fontFamily: "var(--font-mono)",
        fontSize: "var(--room-caption, clamp(0.66rem, 0.85vw, 0.85rem))",
        letterSpacing: "0.06em",
      }}
    >
      <span aria-hidden style={{ fontWeight: 800, fontSize: "1.05em", lineHeight: 1 }}>{glyph}</span>
      <span>{label}</span>
    </div>
  );
}
