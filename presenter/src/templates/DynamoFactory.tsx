"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import type { ReactNode } from "react";

/**
 * DynamoFactory — elektrifieringsanalogin som två fabriksgolv.
 *
 * Paul A. David 1990 ("The Dynamo and the Computer"): fabrikerna bytte
 * ångmaskinen mot en elmotor och behöll remtransmissionen — samma layout,
 * nästan ingen produktivitetsvinst på ~30 år. Vinsten kom först när varje
 * maskin fick en egen motor och golvet ritades om kring arbetsflödet.
 *
 * Tre steg:
 *   0 — vänstra fabriken tecknas: EN kraftkälla (accent), tak-axel,
 *       remmar som snurrar, maskinerna på rad under axeln.
 *   1 — statistiken mellan panelerna landar ("~30 år · ingen mätbar vinst").
 *   2 — högra fabriken tecknas: motor på varje maskin, fri layout,
 *       flödespilar — och slutraden stiger in.
 *
 * Accentfärgen ÄR elkraften: en punkt till vänster, utspridd till höger.
 *
 * ```mdx
 * <DynamoFactory
 *   chapter="§ Transformationen"
 *   title="Fabrikerna bytte motor. Och fick ingenting."
 *   stat="~30 år"
 *   statCaption="utan mätbar produktivitetsvinst"
 *   closing="Vinsten kom när **golvet ritades om** kring den nya kraften."
 *   source="Paul A. David 1990 · The Dynamo and the Computer"
 * />
 * ```
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface DynamoFactoryProps {
  chapter?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  leftLabel?: string;
  rightLabel?: string;
  stat?: string;
  statCaption?: string;
  closing?: string;
  source?: string;
  accent?: string;
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

/** Sågtandstak + väggar + golv, gemensamt för båda panelerna. */
const SHELL_PATH =
  "M 25 300 L 25 95 L 107 45 L 107 95 L 189 45 L 189 95 L 271 45 L 271 95 L 353 45 L 353 95 L 435 45 L 435 300 Z";

function Belt({
  d,
  animate,
  muted = false,
}: {
  d: string;
  animate: boolean;
  muted?: boolean;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="var(--text-muted)"
      strokeOpacity={muted ? 0.5 : 0.8}
      strokeWidth={2}
      strokeDasharray="5 6"
      initial={{ strokeDashoffset: 0 }}
      animate={animate ? { strokeDashoffset: [0, -22] } : undefined}
      transition={
        animate
          ? { duration: 0.9, repeat: Infinity, ease: "linear" }
          : undefined
      }
    />
  );
}

/** Vänstra golvet: en kraftkälla, takaxel, remmar, maskiner på rad. */
function GroupDriveFactory({
  accent,
  beltsOn,
}: {
  accent: string;
  beltsOn: boolean;
}) {
  const pulleys = [130, 210, 290, 368];
  return (
    <svg viewBox="0 0 460 330" style={{ width: "100%", height: "auto" }}>
      {/* Skalet */}
      <motion.path
        d={SHELL_PATH}
        fill="none"
        stroke="var(--text)"
        strokeOpacity={0.8}
        strokeWidth={2.5}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
      />

      {/* Takaxeln med upphängningar */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
      >
        <line
          x1={58}
          y1={130}
          x2={420}
          y2={130}
          stroke="var(--text-muted)"
          strokeWidth={3}
          strokeOpacity={0.85}
        />
        {[107, 189, 271, 353].map((x) => (
          <line
            key={x}
            x1={x}
            y1={95}
            x2={x}
            y2={130}
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            strokeOpacity={0.5}
          />
        ))}
        {/* Remskivor som snurrar */}
        {pulleys.map((x, i) => (
          <motion.g
            key={x}
            animate={beltsOn ? { rotate: 360 } : undefined}
            transition={
              beltsOn
                ? { duration: 2.4, repeat: Infinity, ease: "linear" }
                : undefined
            }
            style={{ transformOrigin: `${x}px 130px` }}
          >
            <circle
              cx={x}
              cy={130}
              r={11}
              fill="var(--bg-surface)"
              stroke="var(--text-muted)"
              strokeWidth={2}
            />
            <line
              x1={x - 8}
              y1={130}
              x2={x + 8}
              y2={130}
              stroke="var(--text-muted)"
              strokeWidth={1.5}
            />
            <line
              x1={x}
              y1={122}
              x2={x}
              y2={138}
              stroke="var(--text-muted)"
              strokeWidth={1.5}
            />
          </motion.g>
        ))}
      </motion.g>

      {/* Kraftkällan — den enda accentpunkten */}
      <motion.g
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 1.15, ease: EASE }}
      >
        <rect
          x={40}
          y={252}
          width={68}
          height={48}
          rx={4}
          fill="var(--bg-surface)"
          stroke={accent}
          strokeWidth={2.5}
        />
        <circle
          cx={74}
          cy={244}
          r={30}
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
        <circle cx={74} cy={244} r={5} fill={accent} />
        <circle
          cx={74}
          cy={244}
          r={40}
          fill="none"
          stroke={accent}
          strokeOpacity={0.2}
          strokeWidth={8}
        />
        {/* Rem från kraftkällan upp till axeln */}
        <Belt d="M 62 218 L 120 140" animate={beltsOn} />
        <Belt d="M 96 226 L 138 141" animate={beltsOn} />
      </motion.g>

      {/* Maskinerna på rad + remmar ned */}
      {pulleys.map((x, i) => (
        <motion.g
          key={x}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 1.3 + i * 0.12, ease: EASE }}
        >
          <rect
            x={x - 26}
            y={262}
            width={52}
            height={38}
            rx={3}
            fill="var(--bg-surface)"
            stroke="var(--text)"
            strokeOpacity={0.75}
            strokeWidth={2}
          />
          <circle
            cx={x}
            cy={254}
            r={8}
            fill="var(--bg-surface)"
            stroke="var(--text-muted)"
            strokeWidth={2}
          />
          <Belt d={`M ${x - 7} 138 L ${x - 6} 248`} animate={beltsOn} muted />
          <Belt d={`M ${x + 7} 138 L ${x + 6} 248`} animate={beltsOn} muted />
        </motion.g>
      ))}
    </svg>
  );
}

/** Högra golvet: motor på varje maskin, fri layout, flödespilar. */
function UnitDriveFactory({ accent }: { accent: string }) {
  const machines = [
    { x: 62, y: 150, w: 60, h: 42, r: -7 },
    { x: 135, y: 228, w: 60, h: 42, r: 0 },
    { x: 240, y: 142, w: 60, h: 42, r: 6 },
    { x: 318, y: 222, w: 60, h: 42, r: 0 },
    { x: 232, y: 258, w: 46, h: 34, r: -4 },
  ];
  return (
    <svg viewBox="0 0 460 330" style={{ width: "100%", height: "auto" }}>
      <motion.path
        d={SHELL_PATH}
        fill="none"
        stroke="var(--text)"
        strokeOpacity={0.8}
        strokeWidth={2.5}
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />

      {machines.map((m, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0.8, rotate: m.r }}
          animate={{ opacity: 1, scale: 1, rotate: m.r }}
          transition={{ duration: 0.5, delay: 0.7 + i * 0.13, ease: EASE }}
          style={{
            transformOrigin: `${m.x + m.w / 2}px ${m.y + m.h / 2}px`,
          }}
        >
          <rect
            x={m.x}
            y={m.y}
            width={m.w}
            height={m.h}
            rx={3}
            fill="var(--bg-surface)"
            stroke="var(--text)"
            strokeOpacity={0.75}
            strokeWidth={2}
          />
          {/* Egen motor — elkraften utspridd */}
          <circle
            cx={m.x + m.w}
            cy={m.y}
            r={13}
            fill="none"
            stroke={accent}
            strokeOpacity={0.22}
            strokeWidth={7}
          />
          <circle cx={m.x + m.w} cy={m.y} r={7} fill={accent} />
          <line
            x1={m.x + m.w - 6}
            y1={m.y + 5}
            x2={m.x + m.w - 16}
            y2={m.y + 14}
            stroke={accent}
            strokeWidth={2}
          />
        </motion.g>
      ))}

      {/* Flödespilar — layouten följer arbetet nu */}
      {[
        "M 110 185 C 150 205, 165 215, 178 228",
        "M 196 240 C 230 225, 240 200, 258 182",
        "M 300 175 C 330 190, 335 205, 342 218",
      ].map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke={accent}
          strokeOpacity={0.65}
          strokeWidth={2}
          strokeDasharray="4 5"
          markerEnd={`url(#flowhead-${i})`}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.5 + i * 0.2, ease: EASE }}
        />
      ))}
      <defs>
        {[0, 1, 2].map((i) => (
          <marker
            key={i}
            id={`flowhead-${i}`}
            viewBox="0 0 8 8"
            refX={6}
            refY={4}
            markerWidth={7}
            markerHeight={7}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={accent} fillOpacity={0.65} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

export function DynamoFactory({
  chapter,
  kicker = "Paul A. David 1990",
  title = "Fabrikerna bytte motor. Och fick ingenting.",
  subtitle,
  leftLabel = "1895 · Ny kraft, gammal layout",
  rightLabel = "1920-tal · Golvet ritas om",
  stat = "~30 år",
  statCaption = "utan mätbar produktivitetsvinst",
  closing,
  source = "Paul A. David 1990 · ”The Dynamo and the Computer” · AER 80(2)",
  accent = "var(--accent)",
}: DynamoFactoryProps) {
  const step = useSlideSteps(3);
  const reduced = useReducedMotion();
  const beltsOn = !reduced;
  const showStat = step >= 1;
  const showRight = step >= 2;

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
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding:
            "clamp(4.2rem, 9vh, 6rem) clamp(2.5rem, 5.5vw, 5.5rem) clamp(1.8rem, 4vh, 2.8rem)",
          gap: "clamp(0.8rem, 2vh, 1.4rem)",
        }}
      >
        {/* Rubrikblock */}
        <div style={{ maxWidth: "58rem" }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: accent,
              marginBottom: "0.6rem",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 3.1vw, 3rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {renderInline(title, accent)}
            </EditableText>
          </motion.h2>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{
                margin: "0.6rem 0 0",
                fontSize: "clamp(0.95rem, 1.25vw, 1.25rem)",
                lineHeight: 1.45,
                color: "var(--text-muted)",
                maxWidth: "46rem",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Panelerna */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr clamp(8rem, 13vw, 12rem) 1fr",
            alignItems: "center",
            gap: "clamp(0.6rem, 1.4vw, 1.4rem)",
          }}
        >
          {/* Vänster fabrik */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <GroupDriveFactory accent={accent} beltsOn={beltsOn} />
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.66rem, 0.85vw, 0.88rem)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              <EditableText path="leftLabel" value={leftLabel}>
                {leftLabel}
              </EditableText>
            </div>
          </div>

          {/* Statistiken i mitten */}
          <div style={{ textAlign: "center", alignSelf: "center" }}>
            {showStat ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(2.2rem, 4vw, 3.8rem)",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    color: "var(--text)",
                  }}
                >
                  <EditableText path="stat" value={stat}>
                    {stat}
                  </EditableText>
                </div>
                <div
                  style={{
                    marginTop: "0.7rem",
                    fontSize: "clamp(0.82rem, 1.05vw, 1.05rem)",
                    lineHeight: 1.4,
                    color: "var(--text-muted)",
                  }}
                >
                  <EditableText path="statCaption" value={statCaption}>
                    {statCaption}
                  </EditableText>
                </div>
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0, x: -6 }}
                  animate={{
                    opacity: showRight ? 1 : 0.25,
                    x: showRight ? 0 : -6,
                  }}
                  transition={{ duration: 0.6, ease: EASE }}
                  style={{
                    marginTop: "1rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.4rem, 2.2vw, 2rem)",
                    color: accent,
                  }}
                >
                  ⟶
                </motion.div>
              </motion.div>
            ) : null}
          </div>

          {/* Höger fabrik */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {showRight ? (
              <>
                <UnitDriveFactory accent={accent} />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.66rem, 0.85vw, 0.88rem)",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: accent,
                    textAlign: "center",
                  }}
                >
                  <EditableText path="rightLabel" value={rightLabel}>
                    {rightLabel}
                  </EditableText>
                </motion.div>
              </>
            ) : (
              <div
                aria-hidden
                style={{
                  aspectRatio: "460 / 330",
                  border: `1.5px dashed ${withAlpha(accent, 0.0)}`,
                }}
              />
            )}
          </div>
        </div>

        {/* Slutrad + källa */}
        <div style={{ minHeight: "clamp(2.2rem, 6vh, 3.6rem)", textAlign: "center" }}>
          {showRight && closing ? (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 1.1 }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(1.2rem, 2vw, 1.9rem)",
                lineHeight: 1.3,
                color: "var(--text)",
              }}
            >
              <EditableText path="closing" value={closing}>
                {renderInline(closing, accent)}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "clamp(0.9rem, 2.2vh, 1.5rem)",
            left: "clamp(2.5rem, 5.5vw, 5.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.78rem)",
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            opacity: 0.85,
          }}
        >
          <EditableText path="source" value={source}>
            {source}
          </EditableText>
        </div>
      </div>
    </div>
  );
}
