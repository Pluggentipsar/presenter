"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import styles from "./HitZone.module.css";

/**
 * HitZone — arbetsuppgifter som utspridda kort, och AI:ns träffyta som
 * blommar upp under dem.
 *
 * Byggd för kommunal-utveckling-v2:s "er arbetsvecka": i stället för en
 * lista ligger veckans moment som papper på ett skrivbord — lätt roterade,
 * långsamt gungande. Vid klicket tecknas en streckad zon över ytan
 * ("AI:ns träffyta"), korten innanför tonas i accent, och slutraden landar.
 *
 * Vilka kort som hamnar innanför räknas ut GEOMETRISKT ur kortens position
 * mot zonens ellips — ett kort nära randen blir "på kanten" (streckad ram)
 * och kan pekas på i talmanuset. Flytta ett kort i MDX:en och dess status
 * följer med.
 *
 * ```mdx
 * <HitZone
 *   chapter="§ Öppning · Er arbetsvecka"
 *   title="Titta på vad ni faktiskt gör under en vecka."
 *   zoneLabel="AI:ns träffyta"
 *   closing="Nästan allt ligger **mitt i träffytan.**"
 * >
 * - Läser och sammanställer · Rapporter, remissvar, enkäter · 18 · 26
 * - Förbereder och leder · Nätverk, styrgrupper · 13 · 64
 * </HitZone>
 * ```
 *
 * Per rad: `Verb · detalj · x · y` där x/y är procent av kortytan.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface HitZoneProps {
  chapter?: string;
  /** Rubrik uppe till vänster. */
  title?: string;
  /** Etikett på zonens rand. */
  zoneLabel?: string;
  /** Slutrad som landar med zonen. `**fet**` → accent. */
  closing?: string;
  /** Zonens ellips i procent: "cx,cy,rx,ry". */
  zone?: string;
  accent?: string;
  /** Keep card centers and the closing line inside the projector-safe area. */
  contained?: boolean | string;
  /** Kort som markdown-lista: `- Verb · detalj · x · y`. */
  children?: ReactNode;
}

interface WorkCard {
  verb: string;
  detail: string;
  x: number;
  y: number;
}

function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { props?: { children?: ReactNode } };
    return toText(el.props?.children);
  }
  return "";
}

function parseCards(children: ReactNode): WorkCard[] {
  const cards: WorkCard[] = [];
  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "ul" || el.type === "ol") {
        visit(el.props.children);
        return;
      }
      if (el.type === "li") {
        const parts = toText(el.props.children).split("·").map((p) => p.trim());
        if (parts.length >= 2) {
          cards.push({
            verb: parts[0],
            detail: parts[1],
            x: Number.parseFloat(parts[2] ?? "") || 50,
            y: Number.parseFloat(parts[3] ?? "") || 50,
          });
        }
        return;
      }
      visit(el.props?.children);
    });
  };
  visit(children);
  return cards;
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 700 }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** < 0.92 = innanför · 0.92–1.18 = på kanten · annars utanför. */
function zoneStatus(
  card: WorkCard,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): "inne" | "kant" | "ute" {
  const v = ((card.x - cx) / rx) ** 2 + ((card.y - cy) / ry) ** 2;
  if (v < 0.92 ** 2) return "inne";
  if (v <= 1.18 ** 2) return "kant";
  return "ute";
}

/** Placement stays on static wrappers; only the zone and card appearance animate. */
function ContainedHitZone({ chapter, title, closing, zoneLabel, accent, cards, ellipse, revealed, reduced }: {
  chapter?: string; title?: string; closing?: string; zoneLabel: string; accent: string;
  cards: WorkCard[]; ellipse: number[]; revealed: boolean; reduced: boolean;
}) {
  const [cx, cy, rx, ry] = ellipse;
  const transition = { duration: reduced ? 0 : 0.65, ease: EASE };
  return <section className={styles.scene} data-hitzone="contained" data-phase={revealed ? 1 : 0} style={{ "--hit-accent": accent } as CSSProperties}>
    <header className={styles.header}>
      {chapter && <div className={styles.chapter}><EditableText path="chapter" value={chapter}>{chapter}</EditableText></div>}
      {title && <h2><EditableText path="title" value={title}>{title}</EditableText></h2>}
    </header>
    <div className={styles.map} data-hitzone-map="">
      <motion.svg className={styles.zone} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden initial={false} animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.94 }} transition={transition} style={{ transformOrigin: `${cx}% ${cy}%` }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={accent} fillOpacity={0.08} stroke={accent} strokeWidth={2} strokeDasharray="7 7" vectorEffect="non-scaling-stroke" />
      </motion.svg>
      <div className={styles.zoneAnchor} style={{ left: `${cx}%`, top: `${cy - ry}%` }}>
        <motion.div data-hitzone-label="" className={styles.zoneLabel} initial={false} animate={{ opacity: revealed ? 1 : 0 }} transition={transition} style={{ color: accent }}>
          <EditableText path="zoneLabel" value={zoneLabel}>{zoneLabel}</EditableText>
        </motion.div>
      </div>
      {cards.map((card, i) => {
        const status = zoneStatus(card, cx, cy, rx, ry);
        return <div key={i} className={styles.cardAnchor} style={{ left: `${card.x}%`, top: `${card.y}%` }}>
          <motion.article data-card="" data-status={revealed ? status : "neutral"} className={styles.card} initial={false} animate={{ backgroundColor: revealed && status === "inne" ? `color-mix(in srgb, ${accent} 6%, var(--bg))` : "var(--bg)" }} transition={transition}>
            <h3><span className={styles.dot} aria-hidden />{card.verb}</h3>
            <div className={styles.detail}>{card.detail}</div>
            {revealed && status === "kant" && <span className={styles.edgeLabel}>PÅ GRÄNSEN</span>}
          </motion.article>
        </div>;
      })}
    </div>
    <footer className={styles.footer} data-hitzone-footer="">
      <motion.p initial={false} animate={{ opacity: revealed ? 1 : 0 }} transition={transition}>
        {closing && <EditableText path="closing" value={closing}>{renderInline(closing, accent)}</EditableText>}
      </motion.p>
    </footer>
  </section>;
}

export function HitZone({
  chapter,
  title,
  zoneLabel = "AI:ns träffyta",
  closing,
  zone = "54,46,45,42",
  accent = "var(--accent)",
  contained = false,
  children,
}: HitZoneProps) {
  const step = useSlideSteps(2);
  const revealed = step >= 1;
  const reduced = useReducedMotion();
  const bounded = contained === true || contained === "true";

  const cards = useMemo(() => parseCards(children), [children]);
  const [cx, cy, rx, ry] = useMemo(() => {
    const parts = zone.split(",").map((p) => Number.parseFloat(p.trim()));
    return [parts[0] || 54, parts[1] || 46, parts[2] || 45, parts[3] || 42];
  }, [zone]);

  if (bounded) return <ContainedHitZone chapter={chapter} title={title} closing={closing} zoneLabel={zoneLabel} accent={accent} cards={cards} ellipse={[cx, cy, rx, ry]} revealed={revealed} reduced={!!reduced} />;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          style={{
            position: "absolute",
            top: "clamp(3.6rem, 8vh, 6rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
            margin: 0,
            maxWidth: "34rem",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.5rem, 2.6vw, 2.5rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--text)",
            zIndex: 4,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>
      ) : null}

      {/* Kortytan */}
      <div
        style={{
          position: "absolute",
          left: "clamp(2rem, 5vw, 5rem)",
          right: "clamp(2rem, 5vw, 5rem)",
          top: "clamp(7rem, 16vh, 11rem)",
          bottom: "clamp(4.5rem, 11vh, 7.5rem)",
        }}
      >
        {/* Träffytan */}
        <motion.svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.9 }}
          transition={{ duration: 0.9, ease: EASE }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            transformOrigin: `${cx}% ${cy}%`,
          }}
        >
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={`url(#hitzone-fill)`}
          />
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={accent}
            strokeOpacity={0.75}
            strokeWidth={2}
            strokeDasharray="7 7"
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <radialGradient id="hitzone-fill">
              <stop offset="0%" stopColor={withAlpha(accent, 0.14)} />
              <stop offset="70%" stopColor={withAlpha(accent, 0.07)} />
              <stop offset="100%" stopColor={withAlpha(accent, 0.0)} />
            </radialGradient>
          </defs>
        </motion.svg>

        {/* Zonetiketten på randen */}
        <motion.div data-tag=""
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 8 }}
          transition={{ duration: 0.7, ease: EASE, delay: revealed ? 0.35 : 0 }}
          style={{
            position: "absolute",
            left: `${cx}%`,
            top: `${cy - ry}%`,
            transform: "translate(-50%, -50%)",
            padding: "0.35rem 0.9rem",
            borderRadius: 999,
            background: "var(--bg-surface)",
            border: `1.5px solid ${withAlpha(accent, 0.7)}`,
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.8vw, 0.85rem)",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: accent,
            whiteSpace: "nowrap",
            zIndex: 3,
            boxShadow: `0 10px 30px -14px ${withAlpha(accent, 0.5)}`,
          }}
        >
          <EditableText path="zoneLabel" value={zoneLabel}>
            {zoneLabel}
          </EditableText>
        </motion.div>

        {/* Korten */}
        {cards.map((card, i) => {
          const status = zoneStatus(card, cx, cy, rx, ry);
          const lit = revealed && status !== "ute";
          const onEdge = revealed && status === "kant";
          const rot = [-2.5, 1.8, -1.2, 2.6, -1.8, 1.4, -2.2, 2.1][i % 8];
          return (
            <motion.div data-card=""
              key={i}
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: reduced ? 0 : [0, -5, 0],
              }}
              transition={{
                opacity: { duration: 0.6, ease: EASE, delay: 0.15 + i * 0.12 },
                scale: { duration: 0.6, ease: EASE, delay: 0.15 + i * 0.12 },
                y: reduced
                  ? { duration: 0.6, ease: EASE, delay: 0.15 + i * 0.12 }
                  : {
                      duration: 4.2 + (i % 3) * 0.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.8 + i * 0.35,
                    },
              }}
              style={{
                position: "absolute",
                left: `${card.x}%`,
                top: `${card.y}%`,
                transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                maxWidth: "clamp(11rem, 17vw, 16rem)",
                padding: "clamp(0.8rem, 1.3vw, 1.2rem) clamp(0.9rem, 1.5vw, 1.4rem)",
                borderRadius: "0.9rem",
                background: lit
                  ? `linear-gradient(180deg, ${withAlpha(accent, 0.1)}, var(--bg-surface))`
                  : "var(--bg-surface)",
                border: onEdge
                  ? `1.5px dashed ${withAlpha(accent, 0.85)}`
                  : lit
                    ? `1.5px solid ${withAlpha(accent, 0.6)}`
                    : "1px solid var(--text-muted)",
                boxShadow: lit
                  ? `0 16px 44px -20px ${withAlpha(accent, 0.55)}`
                  : "0 12px 34px -22px rgba(0,0,0,0.35)",
                transition:
                  "background 0.7s, border 0.7s, box-shadow 0.7s",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.5rem",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: lit ? accent : "var(--text-muted)",
                    opacity: lit ? 1 : 0.5,
                    transform: "translateY(-1px)",
                    transition: "background 0.7s, opacity 0.7s",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(1rem, 1.5vw, 1.4rem)",
                    lineHeight: 1.15,
                    letterSpacing: "-0.01em",
                    color: "var(--text)",
                  }}
                >
                  {card.verb}
                </div>
              </div>
              <div
                style={{
                  marginTop: "0.4rem",
                  fontSize: "clamp(0.75rem, 1vw, 0.95rem)",
                  lineHeight: 1.35,
                  color: "var(--text-muted)",
                }}
              >
                {card.detail}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Slutraden */}
      {closing ? (
        <motion.p
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 18 }}
          transition={{ duration: 0.8, ease: EASE, delay: revealed ? 0.5 : 0 }}
          style={{
            position: "absolute",
            bottom: "clamp(1.6rem, 4.5vh, 3rem)",
            left: "50%",
            transform: "translateX(-50%)",
            margin: 0,
            width: "max-content",
            maxWidth: "80%",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(1.3rem, 2.3vw, 2.2rem)",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            color: "var(--text)",
            zIndex: 4,
          }}
        >
          <EditableText path="closing" value={closing}>
            {renderInline(closing, accent)}
          </EditableText>
        </motion.p>
      ) : null}
    </div>
  );
}
