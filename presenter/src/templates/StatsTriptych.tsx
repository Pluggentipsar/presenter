"use client";

import { motion, useMotionValue, animate } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface StatsTriptychProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  source?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  /**
   * Markdown-lista — varje rad: `värde · etikett`.
   * Exempel: `- 77% · Gymnasiet`
   */
  children?: ReactNode;
}

interface Stat {
  value: number;
  suffix: string;
  prefix: string;
  label: string;
}

function resolveBackground(bg: string | undefined, overlay: number | string = 0.5): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const safe = Number.isFinite(n) ? n : 0.5;
    const a = Math.max(0, Math.min(1, safe));
    const b = Math.min(1, a + 0.22);
    return `linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * En foto-/URL-bakgrund får alltid en mörk scrim (se resolveBackground), så
 * texten ovanpå måste vara ljus-fixerad oavsett tema. Saknas foto-bakgrund
 * följer slidan temat (var(--bg)) och texten ska följa --text/--text-muted.
 */
function hasDarkScrim(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

const LIGHT_PRIMARY = "rgba(245,246,250,0.92)";
const LIGHT_MUTED = "rgba(245,246,250,0.6)";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseStats(children: ReactNode): Stat[] {
  const stats: Stat[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    const valueStr = parts[0].trim();
    const label = parts.slice(1).join(" · ").trim();
    // Parse värde — tillåt: "77%", "$750M", "1,250"
    const match = valueStr.match(/^([^\d.,-]*)([0-9.,-]+)(.*)$/);
    if (!match) return;
    const prefix = match[1];
    const num = parseFloat(match[2].replace(",", "."));
    const suffix = match[3];
    if (Number.isNaN(num)) return;
    stats.push({ value: num, suffix, prefix, label });
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
  return stats;
}

function Counter({
  stat,
  delay,
  accent,
  index,
  total,
  onDark,
}: {
  stat: Stat;
  delay: number;
  accent: string;
  index: number;
  total: number;
  onDark: boolean;
}) {
  const primary = onDark ? LIGHT_PRIMARY : "var(--text)";
  const muted = onDark ? LIGHT_MUTED : "var(--text-muted)";
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const to = setTimeout(() => {
      const controls = animate(mv, stat.value, {
        duration: 2,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setDisplay(v),
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(to);
  }, [mv, stat.value, delay]);

  const formatted = display.toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.8rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 600,
          opacity: 0.85,
        }}
      >
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          lineHeight: 0.92,
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          letterSpacing: "-0.045em",
        }}
      >
        {stat.prefix ? (
          <span
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              color: muted,
              marginRight: "0.2rem",
            }}
          >
            {stat.prefix}
          </span>
        ) : null}
        <span
          style={{
            fontSize: "clamp(5rem, 12vw, 13rem)",
            color: primary,
            textShadow: onDark
              ? `0 0 40px ${withAlpha(accent, 0.31)}, 0 8px 30px rgba(0,0,0,0.5)`
              : `0 0 40px ${withAlpha(accent, 0.2)}`,
          }}
        >
          {formatted}
        </span>
        {stat.suffix ? (
          <span
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              color: accent,
              marginLeft: "0.15rem",
              fontWeight: 600,
            }}
          >
            {stat.suffix}
          </span>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(1.05rem, 1.4vw, 1.5rem)",
          color: primary,
          maxWidth: "14em",
          lineHeight: 1.25,
        }}
      >
        {stat.label}
      </div>
    </motion.div>
  );
}

/**
 * Tre siffror räknar upp sekventiellt mot en bakgrundsbild. Bra för
 * statistik-slides ("X% av Y-gruppen"). Varje siffra får accent-färg
 * och stagger-reveal.
 */
export function StatsTriptych({
  kicker,
  title,
  subtitle,
  source,
  background,
  accent = "var(--accent)",
  overlay,
  children,
}: StatsTriptychProps) {
  const stats = parseStats(children);
  const onDark = hasDarkScrim(background);
  const primary = onDark ? LIGHT_PRIMARY : "var(--text)";
  const muted = onDark ? LIGHT_MUTED : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.5rem, 4.5vw, 5rem)",
          zIndex: 2,
          gap: "clamp(1.5rem, 3vh, 3rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "40em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(2rem, 4.5vw, 4rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.025em",
                color: primary,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.1rem, 1.4vw, 1.45rem)",
                color: muted,
                margin: 0,
                lineHeight: 1.4,
                maxWidth: "30em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Stats grid */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
            gap: "clamp(1.5rem, 3vw, 3.5rem)",
            alignItems: "center",
          }}
        >
          {stats.map((stat, i) => (
            <Counter
              key={i}
              stat={stat}
              delay={0.7 + i * 0.4}
              accent={accent}
              index={i}
              total={stats.length}
              onDark={onDark}
            />
          ))}
        </div>

        {/* Source */}
        {source ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 + stats.length * 0.4 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.82vw, 0.85rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: muted,
              marginTop: "auto",
            }}
          >
            Källa · <EditableText path="source" value={source ?? ""}>{source}</EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
