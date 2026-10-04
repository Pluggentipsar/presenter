"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * QuestionBeneath — N "produkter" bockas av som triviala (✓ på sekunder),
 * glider sedan undan och bleknar medan en större *fråga* reser sig underifrån
 * och växer. Byggt för vändningen "maskinen gör produkten på tjugo sekunder —
 * men vad var det vi skulle lära ut?". Rörelsen ÄR poängen: det färdiga
 * sjunker undan, frågan blir kvar.
 *
 * Stegsystem: 2 steg. Steg 0 = produkterna tonar in och bockas av. Steg 1 =
 * de drar sig undan och frågan reser sig. Ett klick.
 *
 * MDX-format — children = en rad per produkt:
 * ```mdx
 * <QuestionBeneath
 *   kicker="§ Vändningen"
 *   question="Men vad var det vi skulle **lära ut**?"
 *   note="Produkten var aldrig poängen."
 *   doneLabel="20 sek"
 * >
 * - Artikeln
 * - Låten
 * - Affischen
 * - Uppsatsen
 * </QuestionBeneath>
 * ```
 */

interface QuestionBeneathProps {
  kicker?: string;
  question?: string;
  note?: string;
  doneLabel?: string;
  accent?: string;
  background?: string;
  overlay?: number | string;
  children?: ReactNode;
}

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

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const pushLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) out.push(raw);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li")
          pushLi(li as ReactElement<{ children?: ReactNode }>);
      });
    } else if (t === "li") {
      pushLi(el);
    }
  });
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = Number.isFinite(overlay) ? Math.max(0, Math.min(1, overlay)) : 0.6;
    return `linear-gradient(rgba(6,7,12,${a}), rgba(6,7,12,${Math.min(1, a + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <span key={i} style={{ color: accent, fontWeight: 700, textShadow: `0 0 38px ${withAlpha(accent, 0.45)}` }}>
          {p.slice(2, -2)}
        </span>
      );
    if (p.startsWith("*") && p.endsWith("*"))
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    return <span key={i}>{p}</span>;
  });
}

function ProductCard({
  label,
  index,
  accent,
  dimmed,
  onPhoto,
}: {
  label: string;
  index: number;
  accent: string;
  dimmed: boolean;
  onPhoto: boolean;
}) {
  // När kortet vilar på ett mörkt foto-scrim ska det vara ljust glas; annars
  // ska det följa temat (mörkt på nattglas, ljust/elevated på dagsljus).
  const cardStyle: CSSProperties = onPhoto
    ? {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 150,
        padding: "18px 20px",
        borderRadius: 16,
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 55%, rgba(122,168,255,0.05) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderTopColor: "rgba(255,255,255,0.20)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        boxShadow: `0 18px 44px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10)`,
      }
    : {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 150,
        padding: "18px 20px",
        borderRadius: 16,
        background: "var(--bg-elevated)",
        border: `1px solid ${withAlpha(accent, 0.18)}`,
        borderTopColor: "rgba(0,0,0,0.10)",
        backdropFilter: "blur(18px) saturate(160%)",
        WebkitBackdropFilter: "blur(18px) saturate(160%)",
        boxShadow: `0 18px 44px -22px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)`,
      };
  const labelColor = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.18, ease: [0.22, 1, 0.36, 1] }}
      style={cardStyle}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(1.05rem, 1.5vw, 1.5rem)",
          color: labelColor,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* check som ritas in */}
        <motion.svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <motion.circle cx="12" cy="12" r="11" stroke={accent} strokeWidth="1.5" opacity="0.4" />
          <motion.path
            d="M7 12.5l3.2 3.2L17 9"
            stroke={accent}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.5 + index * 0.18 }}
          />
        </motion.svg>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: dimmed ? 0.5 : 1 }}
          transition={{ delay: 0.7 + index * 0.18 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          klar
        </motion.span>
      </div>
    </motion.div>
  );
}

export function QuestionBeneath({
  kicker,
  question = "Men vad var det vi skulle **lära ut**?",
  note,
  doneLabel = "20 sek",
  accent = "var(--accent)",
  background,
  overlay = 0.6,
  children,
}: QuestionBeneathProps) {
  const items = useMemo(() => parseItems(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(2);
  const revealed = step >= 1;

  // En foto-bakgrund får ett mörkt scrim (se resolveBackground) — då måste
  // texten vara fast ljus på alla teman. Utan foto följer texten temat.
  const onPhoto = Boolean(
    background && (background.startsWith("/") || background.startsWith("http")),
  );
  const titleColor = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {kicker ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4.5vh, 3.4rem)",
            left: "clamp(2.5rem, 5vw, 5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: accent,
            zIndex: 4,
          }}
        >
          {kicker}
        </div>
      ) : null}

      {/* "20 sek" stämpel uppe till höger som bleknar när frågan reser sig */}
      <motion.div
        animate={{ opacity: revealed ? 0.2 : 1 }}
        transition={{ duration: 0.6 }}
        style={{
          position: "absolute",
          top: "clamp(2rem, 4.5vh, 3.4rem)",
          right: "clamp(2.5rem, 5vw, 5rem)",
          zIndex: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 13px",
          borderRadius: 99,
          background: withAlpha(accent, 0.12),
          border: `1px solid ${withAlpha(accent, 0.3)}`,
          fontFamily: "var(--font-mono)",
          fontSize: "0.75rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: accent,
        }}
      >
        ✓ {doneLabel}
      </motion.div>

      {/* Produkt-rad — glider upp & bleknar när frågan kommer */}
      <motion.div
        animate={{
          opacity: revealed ? 0.16 : 1,
          y: revealed ? "-30%" : "0%",
          scale: revealed ? 0.82 : 1,
          filter: revealed ? "blur(3px) saturate(0.3)" : "blur(0px) saturate(1)",
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(0.8rem, 1.6vw, 1.6rem)",
          flexWrap: "wrap",
          padding: "0 clamp(2.5rem, 6vw, 7rem)",
          zIndex: revealed ? 1 : 2,
        }}
      >
        {items.map((it, i) => (
          <ProductCard key={i} label={it} index={i} accent={accent} dimmed={revealed} onPhoto={onPhoto} />
        ))}
      </motion.div>

      {/* Frågan — reser sig underifrån */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 clamp(2.5rem, 8vw, 10rem)",
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(2.4rem, 5.2vw, 5rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
            color: titleColor,
            maxWidth: "20ch",
          }}
        >
          {renderInline(question, accent)}
        </div>
        {note ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={revealed ? { opacity: 0.8 } : { opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              marginTop: "clamp(1rem, 2.2vh, 1.8rem)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
              color: mutedColor,
            }}
          >
            {renderInline(note, accent)}
          </motion.div>
        ) : null}
      </motion.div>
    </div>
  );
}
