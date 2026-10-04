"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * LessonArc ★ — en lektion som en lins: smal i ändarna, vid i mitten.
 *
 * Stationerna ligger på en form som pinchar ihop där eleven arbetar ensam
 * och buktar ut där AI vidgar. Formen bär budskapet utan att någon behöver
 * läsa den — publiken längst bak ser att början och slutet är trånga och
 * att mitten är öppen, och har därmed redan förstått "AI vidgar i mitten,
 * eleven äger början och slutet".
 *
 * Byggd som ersättare till en ProcessChain där fyra likadana rutor gav alla
 * stationer samma tyngd — vilket är precis fel, eftersom hela poängen är att
 * ändarna tillhör någon annan än mitten. Där låg dessutom rubriken på 70 px
 * medan stationerna, som ÄR innehållet, låg på 12–15 px.
 *
 * MDX-format — en station per rad, `etikett · beskrivning · ägare`:
 * ```mdx
 * <LessonArc kicker="§ Ett exempel" title="En lektion. Alla tre rörelser."
 *   payoff="AI vidgar i mitten. **Eleven äger början och slutet.**">
 * - MOT · Formulera en egen ståndpunkt och två skäl — utan AI. · eleven
 * - GENOM · Låt AI spela djävulens advokat. · ai
 * - MED · Be AI peka på luckor och saknade perspektiv. · ai
 * - JAG · Ompröva, skriv om och försvara slutsatsen utan AI. · eleven
 * </LessonArc>
 * ```
 * Ägaren är `eleven` eller `ai` och styr både formen och färgen.
 */

interface LessonArcProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  /** Underrubrik — den konkreta uppgiften. */
  subtitle?: string;
  /** Landningsrad som fälls in på sista steget. Stödjer **fetstil**. */
  payoff?: string;
  accent?: string;
  children?: ReactNode;
}

interface Station {
  label: string;
  body: string;
  owner: "eleven" | "ai";
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseStations(children: ReactNode): Station[] {
  const out: Station[] = [];
  const add = (raw: string) => {
    const p = raw.split("·").map((s) => s.trim());
    if (!p[0]) return;
    out.push({
      // Fetstil i MDX-källan följer med som ** — etiketten sätts stor ändå.
      label: p[0].replace(/\*\*/g, ""),
      body: p[1] ?? "",
      owner: /^ai$/i.test(p[2] ?? "") ? "ai" : "eleven",
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
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children).trim());
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children).trim());
    }
  });
  return out;
}

// Linsens geometri i sitt eget koordinatsystem. Halvhöjden följer en sinus:
// noll-ish vid ändarna, maximal på mitten. Det är hela bilden.
const VB_W = 1000;
const VB_H = 240;
const MID = VB_H / 2;
const H_MIN = 5;
const H_MAX = 96;

function halfHeight(t: number): number {
  return H_MIN + (H_MAX - H_MIN) * Math.sin(Math.PI * t);
}

function lensPath(): string {
  const steps = 64;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * VB_W;
    const h = halfHeight(t);
    top.push(`${x.toFixed(1)},${(MID - h).toFixed(1)}`);
    bottom.push(`${x.toFixed(1)},${(MID + h).toFixed(1)}`);
  }
  return `M ${top.join(" L ")} L ${bottom.reverse().join(" L ")} Z`;
}

export function LessonArc({
  kicker,
  chapter,
  title,
  subtitle,
  payoff,
  accent = "var(--accent)",
  children,
}: LessonArcProps) {
  const stations = parseStations(children);
  const step = useSlideSteps(stations.length);
  const isLast = step >= stations.length - 1;

  if (stations.length === 0) return null;

  // Första och sista stationen ligger i linsens hopklämda ändar, mellanliggande
  // i buken. Med fyra stationer landar de på 0, 1/3, 2/3 och 1.
  const tFor = (i: number) => (stations.length === 1 ? 0.5 : i / (stations.length - 1));
  const revealT = tFor(step);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        padding: "clamp(2rem, 4vh, 3.4rem) clamp(2.5rem, 5vw, 5rem)",
      }}
    >
      {kicker || chapter ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.72rem, 0.95vw, 0.95rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path={kicker ? "kicker" : "chapter"} value={kicker ?? chapter}>
            {kicker ?? chapter}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.7rem, 3vw, 3rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.1,
            color: "var(--text)",
            margin: "clamp(0.5rem, 1.2vh, 0.9rem) 0 0",
            maxWidth: "26ch",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </h2>
      ) : null}

      {subtitle ? (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(1rem, 1.45vw, 1.35rem)",
            lineHeight: 1.4,
            color: "var(--text-muted)",
            margin: "clamp(0.4rem, 1vh, 0.7rem) 0 0",
            maxWidth: "52ch",
          }}
        >
          <EditableText path="subtitle" value={subtitle}>
            {subtitle}
          </EditableText>
        </p>
      ) : null}

      {/* Linsen med stationerna */}
      <div
        style={{
          position: "relative",
          flex: 1,
          marginTop: "clamp(1rem, 2.4vh, 2rem)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Ägarband — säger vem som håller i vad, utan att peka */}
        <div
          style={{
            position: "relative",
            height: "1.4em",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.78vw, 0.75rem)",
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ position: "absolute", left: 0 }}>Eleven</span>
          <span
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              color: accent,
            }}
          >
            AI vidgar
          </span>
          <span style={{ position: "absolute", right: 0 }}>Eleven</span>
        </div>

        <div style={{ position: "relative", width: "100%" }}>
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            aria-hidden
            style={{ display: "block", width: "100%", height: "clamp(6rem, 17vh, 11rem)" }}
          >
            <defs>
              <linearGradient id="lessonarc-fill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={withAlpha(accent, 0.1)} />
                <stop offset="50%" stopColor={withAlpha(accent, 0.34)} />
                <stop offset="100%" stopColor={withAlpha(accent, 0.1)} />
              </linearGradient>
              <clipPath id="lessonarc-clip">
                {/* Linsen öppnar sig i takt med stegen — den växer alltså fram
                    tillsammans med berättelsen i stället för att stå färdig. */}
                <motion.rect
                  x="0"
                  y="0"
                  height={VB_H}
                  initial={false}
                  animate={{ width: Math.max(revealT * VB_W, 26) }}
                  transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                />
              </clipPath>
            </defs>

            {/* Spökkontur: hela formen svagt, så man anar vart det bär */}
            <path d={lensPath()} fill="none" stroke={withAlpha(accent, 0.22)} strokeWidth="1.5" />
            <path d={lensPath()} fill="url(#lessonarc-fill)" clipPath="url(#lessonarc-clip)" />

            {/* Mittlinjen — lektionens gång */}
            <line
              x1="0"
              y1={MID}
              x2={VB_W}
              y2={MID}
              stroke={withAlpha(accent, 0.3)}
              strokeWidth="1"
              strokeDasharray="4 6"
            />

            {stations.map((s, i) => {
              const t = tFor(i);
              const on = i <= step;
              return (
                <motion.circle
                  key={i}
                  cx={t * VB_W}
                  cy={MID}
                  r={s.owner === "eleven" ? 11 : 7}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0.22, scale: on ? 1 : 0.7 }}
                  transition={{ duration: 0.4, delay: on ? 0.1 : 0 }}
                  fill={s.owner === "eleven" ? accent : "var(--bg)"}
                  stroke={accent}
                  strokeWidth={s.owner === "eleven" ? 0 : 3}
                  style={{ transformOrigin: `${t * VB_W}px ${MID}px` }}
                />
              );
            })}
          </svg>

          {/* Stationstexterna — det här ÄR innehållet, så det får störst yta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${stations.length}, 1fr)`,
              gap: "clamp(0.8rem, 2vw, 2rem)",
              marginTop: "clamp(0.8rem, 2vh, 1.6rem)",
            }}
          >
            {stations.map((s, i) => {
              const on = i <= step;
              const isEleven = s.owner === "eleven";
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity: on ? 1 : 0.25, y: on ? 0 : 8 }}
                  transition={{ duration: 0.45, delay: on ? 0.12 : 0, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    textAlign: "center",
                    borderTop: `2px solid ${isEleven ? accent : withAlpha(accent, 0.3)}`,
                    paddingTop: "clamp(0.6rem, 1.4vh, 1rem)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.5rem, 2.7vw, 2.6rem)",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                      color: isEleven ? accent : "var(--text)",
                      marginBottom: "clamp(0.4rem, 1vh, 0.7rem)",
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      // Stationstexten är innehållet. Den föregående mallen
                      // satte den på 12 px medan rubriken fick 70 — omvänd
                      // hierarki, och oläslig från bortre raden.
                      fontSize: "clamp(0.95rem, 1.55vw, 1.45rem)",
                      lineHeight: 1.38,
                      color: "var(--text-muted)",
                    }}
                  >
                    {s.body}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {payoff ? (
        <motion.div
          initial={false}
          animate={{ opacity: isLast ? 1 : 0, y: isLast ? 0 : 10 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "clamp(0.8rem, 2vh, 1.4rem)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.15rem, 1.9vw, 1.85rem)",
            lineHeight: 1.3,
            color: "var(--text)",
            maxWidth: "48ch",
          }}
          dangerouslySetInnerHTML={{
            __html: payoff.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
      ) : null}
    </div>
  );
}
