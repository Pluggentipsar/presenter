"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * JaggedReveal ★ — jagged frontier i tre akter, med storleken som argument.
 *
 * Omdesign av JaggedFrontier (som visar allt på en gång, auto-spelat). Här
 * bär DRAMATURGIN poängen:
 *
 * - Akt 0 (vid landning): AI:s briljans STORT och glödande, centrerat. Rummet
 *   ska hinna imponeras. "Tar sig ut ur en låst testmiljö", "Erdős", "poesi
 *   över mänsklig nivå".
 * - Akt 1 (klick): briljansen KRYMPER och docker upp i toppen som en tunn,
 *   dämpad rad — och missarna störtar in stort i centrum. "Läser klockor
 *   50,1 %", "hittar på trovärdiga källor", "snubblar på enkla pussel". En
 *   taggig stupkurva dras från varje topp ner till sin dal. Samma modell —
 *   och avgrunden mellan kolumnerna ÄR den taggiga fronten.
 * - Akt 2 (klick): landningen. "Det här är jagged frontier."
 *
 * Drop-in-kompatibel med JaggedFrontier: samma props (chapter/title/landing/
 * background/overlay) och samma MDX-format `Briljans · Miss`. Skillnaden är
 * bara koreografin. Tema-medveten: på foto-scrim tvingas ljus text, på ett
 * rent tema följer texten temat (mörk på dagsljus).
 */

interface JaggedRevealProps {
  chapter?: string;
  title?: string;
  /** Kraftig slutsats som fälls in i sista akten. Stödjer **fetstil**. */
  landing?: string;
  accent?: string;
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
  /** Eyebrow över briljanskolumnerna. */
  topLabel?: string;
  /** Eyebrow över missarna när de störtar in. */
  bottomLabel?: string;
  /** MDX-lista med par `Briljans · Miss`. */
  children?: ReactNode;
}

interface Pair {
  brilliance: string;
  failure: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parsePairs(children: ReactNode): Pair[] {
  const out: Pair[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const idx = t.indexOf("·");
    if (idx > -1) {
      out.push({
        brilliance: t.slice(0, idx).trim(),
        failure: t.slice(idx + 1).trim(),
      });
    } else {
      out.push({ brilliance: t, failure: "" });
    }
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(
            extractText(
              (li as ReactElement<{ children?: ReactNode }>).props.children,
            ),
          );
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

function hasDarkBackdrop(bg: string | undefined): boolean {
  if (!bg) return false;
  if (bg.startsWith("/") || bg.startsWith("http")) return true;
  return !bg.includes("var(--bg)");
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 800 }}>
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const FIXED_LIGHT = "rgba(245,246,250,0.94)";
const FIXED_LIGHT_MUTED = "rgba(245,246,250,0.6)";

export function JaggedReveal({
  chapter,
  title,
  landing,
  accent = "var(--accent)",
  background,
  overlay,
  overlayMode = "dark",
  topLabel = "Det här klarar den",
  bottomLabel = "Det här klarar den inte",
  children,
}: JaggedRevealProps) {
  const pairs = parsePairs(children);
  const step = useSlideSteps(3); // 0 briljans · 1 missar · 2 landning

  if (pairs.length === 0) return null;

  const fallen = step >= 1; // briljansen krympt, missarna inne
  const landed = step >= 2;

  const onDark = hasDarkBackdrop(background);
  const primary = onDark ? FIXED_LIGHT : "var(--text)";
  const muted = onDark ? FIXED_LIGHT_MUTED : "var(--text-muted)";
  const alert = "var(--accent-alert)";
  const textShadow = onDark ? "0 4px 20px rgba(0,0,0,0.6)" : "none";

  const n = pairs.length;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: buildBackgroundCss(background, overlay, overlayMode),
      }}
    >
      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.2vh, 2.6rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: muted,
            zIndex: 6,
            textShadow,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Titel — vänster topp */}
      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3.5vh, 3rem)",
            left: "clamp(2.5rem, 5vw, 5rem)",
            margin: 0,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(1.4rem, 2.4vw, 2.4rem)",
            letterSpacing: "-0.015em",
            lineHeight: 1.05,
            color: primary,
            maxWidth: "60%",
            zIndex: 6,
            textShadow,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>
      ) : null}

      {/* Eyebrow: briljans-sidan (uppe) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        style={{
          position: "absolute",
          top: fallen ? "clamp(6.5rem, 15vh, 9rem)" : "clamp(6rem, 14vh, 8.5rem)",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: withAlpha(accent, 0.85),
          zIndex: 4,
          transition: "top 0.7s cubic-bezier(0.22,1,0.36,1)",
          textShadow,
        }}
      >
        {topLabel}
      </motion.div>

      {/* Kolumnerna */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          zIndex: 3,
          padding: "0 clamp(2rem, 5vw, 5rem)",
        }}
      >
        {pairs.map((pair, i) => (
          <Column
            key={i}
            index={i}
            pair={pair}
            fallen={fallen}
            accent={accent}
            alert={alert}
            primary={primary}
            muted={muted}
            textShadow={textShadow}
          />
        ))}
      </div>

      {/* Eyebrow: miss-sidan (nere) — in när de störtar */}
      <motion.div
        initial={false}
        animate={{ opacity: fallen ? 1 : 0, y: fallen ? 0 : 8 }}
        transition={{ duration: 0.6, delay: fallen ? 0.35 : 0 }}
        style={{
          position: "absolute",
          bottom: landed ? "clamp(7rem, 16vh, 10rem)" : "clamp(4rem, 9vh, 6rem)",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: withAlpha(alert, 0.9),
          zIndex: 4,
          transition: "bottom 0.7s cubic-bezier(0.22,1,0.36,1)",
          textShadow,
        }}
      >
        {bottomLabel}
      </motion.div>

      {/* Landning */}
      {landing ? (
        <motion.div
          initial={false}
          animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 14 }}
          transition={{ duration: 0.8, delay: landed ? 0.2 : 0, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            bottom: "clamp(2.5rem, 6vh, 4.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.7rem, 3vw, 2.9rem)",
            letterSpacing: "-0.02em",
            color: primary,
            textAlign: "center",
            maxWidth: "82%",
            zIndex: 5,
            textShadow,
          }}
        >
          <EditableText path="landing" value={landing}>
            {renderInline(landing, accent)}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}

// ── Kolumn ────────────────────────────────────────────────────────────────

interface ColumnProps {
  index: number;
  pair: Pair;
  fallen: boolean;
  accent: string;
  alert: string;
  primary: string;
  muted: string;
  textShadow: string;
}

function Column({
  pair,
  fallen,
  accent,
  alert,
  primary,
  muted,
  textShadow,
}: ColumnProps) {
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {/* Toppmarkör (peak) */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{
          top: fallen ? "20%" : "34%",
          scale: fallen ? 0.6 : 1,
          opacity: fallen ? 0.7 : 1,
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: "50%",
          marginLeft: "-7px",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: accent,
          boxShadow: `0 0 24px ${withAlpha(accent, 0.7)}, 0 0 60px ${withAlpha(accent, 0.35)}`,
          border: "2px solid rgba(255,255,255,0.85)",
        }}
      />

      {/* Briljans-etikett — stor & centrerad → liten & uppe */}
      <motion.div
        initial={false}
        animate={{
          top: fallen ? "24%" : "40%",
          opacity: fallen ? 0.72 : 1,
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: "6%",
          right: "6%",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <motion.div
          initial={false}
          animate={{ scale: fallen ? 0.62 : 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            transformOrigin: "top center",
            fontFamily: "var(--font-display)",
            fontWeight: fallen ? 500 : 600,
            fontSize: "clamp(1.15rem, 1.9vw, 1.95rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.015em",
            color: fallen ? muted : primary,
            textShadow,
          }}
        >
          {pair.brilliance}
        </motion.div>
      </motion.div>

      {/* Taggig stupkurva ner till dalen — dras när missarna störtar */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ scaleY: fallen ? 1 : 0, opacity: fallen ? 1 : 0 }}
        transition={{ duration: 0.55, delay: fallen ? 0.15 : 0, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          left: "50%",
          top: "30%",
          height: "30%",
          width: "2px",
          marginLeft: "-1px",
          background: `linear-gradient(to bottom, ${withAlpha(accent, 0.5)}, ${withAlpha(alert, 0.8)})`,
          transformOrigin: "top",
        }}
      />

      {/* Dalmarkör (valley) — in med missen */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: fallen ? 1 : 0, scale: fallen ? 1 : 0.4 }}
        transition={{ type: "spring", stiffness: 300, damping: 16, delay: fallen ? 0.5 : 0 }}
        style={{
          position: "absolute",
          top: "62%",
          left: "50%",
          marginLeft: "-6px",
          width: "12px",
          height: "12px",
          borderRadius: "2px",
          transform: "rotate(45deg)",
          background: alert,
          boxShadow: `0 0 18px ${withAlpha(alert, 0.6)}`,
          border: "1.5px solid rgba(255,255,255,0.7)",
        }}
      />

      {/* Miss-etikett — störtar in stort */}
      <motion.div
        initial={false}
        animate={{
          opacity: fallen ? 1 : 0,
          y: fallen ? 0 : -18,
        }}
        transition={{ duration: 0.6, delay: fallen ? 0.5 : 0, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "68%",
          left: "5%",
          right: "5%",
          textAlign: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "clamp(1.3rem, 2.3vw, 2.4rem)",
          lineHeight: 1.12,
          letterSpacing: "-0.02em",
          color: primary,
          textShadow,
          zIndex: 2,
        }}
      >
        {pair.failure}
      </motion.div>
    </div>
  );
}
