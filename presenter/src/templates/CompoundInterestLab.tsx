"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";

/**
 * CompoundInterestLab ★ — elevens egen simulering, körbar på duken.
 *
 * Sliden finns för att visa vad "eleven som skapare" betyder på riktigt:
 * i stället för en PowerPoint om ränta på ränta står eleven vid en modell
 * hen byggt och drar i reglagen. Därför är det här ingen bild på en
 * simulering — det ÄR en. Joel kan dra i den mitt i passet.
 *
 * Steg 0 visar prompten eleven skrev. Steg 1 fäller ut labbet. Ordningen
 * är poängen: publiken ska se att vägen från mening till verktyg är kort.
 *
 * Defaultvärdena är valda för att göra chocken maximal — samma
 * månadsbelopp, tio års försprång, sju procent. Försprånget kostar
 * 120 000 kr extra insatt och ger nästan 700 000 kr mer på kontot. Drar
 * man i räntereglaget växer kvoten till något som inte går att förklara
 * med intuition, bara med modellen. Det är den upplevelsen eleven ska ge
 * sina klasskamrater.
 *
 * OBS för talaren: när ett reglage har fokus går piltangenterna till
 * reglaget, inte till nästa slide (SlideViewer släpper igenom INPUT).
 * Klicka utanför labbet innan du bläddrar vidare.
 *
 * ```mdx
 * <CompoundInterestLab
 *   tag="§ Eleven som skapare"
 *   title="Simuleringen — i stället för presentationen"
 *   promptBy="Elev · ekonomi, gymnasial vux"
 *   prompt="Bygg en sida där jag kan dra i reglagen och se hur mycket tiden betyder för sparande."
 * />
 * ```
 */

interface CompoundInterestLabProps {
  tag?: string;
  title?: string;
  /** Vem som skrev prompten — liten etikett över promptkortet. */
  promptBy?: string;
  /** Elevens prompt. Visas på steg 0. Stödjer **fet**. */
  prompt?: string;
  /** Verktygsnamn i promptkortet. */
  widgetName?: string;
  /** Raden under labbet. Stödjer **fet**. */
  footnote?: string;
  accent?: string;
}

const BASE_YEARS = 20;
const MAX_YEARS = 40;

interface Series {
  deposited: number;
  value: number;
  points: { m: number; v: number }[];
}

/** Månadssparande med månadsränta. Startar efter `delayMonths`. */
function project(monthly: number, ratePct: number, delayMonths: number, totalMonths: number): Series {
  const i = ratePct / 100 / 12;
  const points: { m: number; v: number }[] = [];
  let v = 0;
  let deposited = 0;
  for (let m = 0; m <= totalMonths; m++) {
    if (m > delayMonths) {
      v = v * (1 + i) + monthly;
      deposited += monthly;
    }
    points.push({ m, v });
  }
  return { deposited, value: v, points };
}

const nf = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const kr = (n: number) => `${nf.format(Math.round(n))} kr`;

/** Kort form för stödlinjernas etiketter: 1,2 mkr · 600 tkr · 0. */
function shortKr(n: number): string {
  if (n < 1) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mkr`;
  return `${Math.round(n / 1000)} tkr`;
}

/**
 * Runda upp till närmaste läsbara tal. Stegen ligger tätt med flit — en
 * gles stege (1, 2, 5) skulle låta toppkurvan sluta på 60 % av höjden och
 * få hela diagrammet att se platt ut när man drar i reglagen.
 */
const NICE = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / mag;
  return (NICE.find((s) => f <= s) ?? 10) * mag;
}

// Diagrammets rityta. PAD_L rymmer kronetiketterna, PAD_B årtalen.
const VB_W = 800;
const VB_H = 210;
const PAD_L = 62;
const PAD_B = 18;
const PAD_T = 12;

export function CompoundInterestLab({
  tag,
  title,
  promptBy = "Elev · ekonomi, gymnasial vux",
  prompt,
  widgetName = "ChatGPT",
  footnote,
  accent = "var(--accent)",
}: CompoundInterestLabProps) {
  const step = useSlideSteps(2);
  const built = step >= 1;

  const [monthly, setMonthly] = useState(1000);
  const [headStart, setHeadStart] = useState(10);
  const [rate, setRate] = useState(7);

  const totalMonths = MAX_YEARS * 12;
  const early = useMemo(
    () => project(monthly, rate, (MAX_YEARS - BASE_YEARS - headStart) * 12, totalMonths),
    [monthly, rate, headStart, totalMonths],
  );
  const late = useMemo(
    () => project(monthly, rate, (MAX_YEARS - BASE_YEARS) * 12, totalMonths),
    [monthly, rate, totalMonths],
  );

  const extraIn = early.deposited - late.deposited;
  const extraOut = early.value - late.value;
  const ratio = extraIn > 0 ? extraOut / extraIn : 0;

  const earlyStartM = (MAX_YEARS - BASE_YEARS - headStart) * 12;
  const lateStartM = (MAX_YEARS - BASE_YEARS) * 12;

  // Skalan rundas upp till ett läsbart tal så stödlinjernas etiketter blir
  // "1,5 mkr" och inte "1 219 971 kr". Annars går kurvorna inte att läsa av.
  const top = niceCeil(Math.max(early.value, late.value, 1));
  const xAt = (m: number) => PAD_L + (m / totalMonths) * (VB_W - 4 - PAD_L);
  const yAt = (v: number) => VB_H - PAD_B - (v / top) * (VB_H - PAD_B - PAD_T);

  const gridLines = [0, 0.5, 1].map((f) => ({
    v: top * f,
    y: yAt(top * f),
    label: shortKr(top * f),
  }));

  const path = (s: Series) =>
    s.points
      .filter((_, k) => k % 3 === 0)
      .map((p, k) => `${k === 0 ? "M" : "L"} ${xAt(p.m).toFixed(1)} ${yAt(p.v).toFixed(1)}`)
      .join(" ");

  const muted = "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {tag ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.4vh, 2.8rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="tag" value={tag}>
            {tag}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(1.8rem, 3.6vh, 3rem) clamp(2.4rem, 5vw, 5rem)",
          paddingTop: "clamp(3.6rem, 7vh, 5rem)",
          gap: "clamp(0.7rem, 1.6vh, 1.2rem)",
          zIndex: 2,
          minHeight: 0,
        }}
      >
        {title ? (
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.3rem, 2.4vw, 2.1rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title} multiline block>
              {inlineMarkdown(title)}
            </EditableText>
          </div>
        ) : null}

        {/* ── Steg 0 · prompten eleven skrev ── */}
        {prompt ? (
          <motion.div
            animate={{ opacity: built ? 0.42 : 1 }}
            transition={{ duration: 0.6 }}
            style={{
              border: "1px solid rgba(128,128,128,0.26)",
              borderRadius: "var(--radius, 0.6rem)",
              background: "var(--bg-surface)",
              padding: "clamp(0.7rem, 1.5vh, 1.1rem) clamp(0.9rem, 1.8vw, 1.4rem)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.58rem, 0.72vw, 0.75rem)",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "0.4rem",
              }}
            >
              <span>{promptBy}</span>
              <span style={{ color: muted }}>→ {widgetName}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)",
                lineHeight: 1.35,
                color: "var(--text)",
              }}
            >
              <EditableText path="prompt" value={prompt} multiline block>
                {inlineMarkdown(prompt)}
              </EditableText>
            </div>
          </motion.div>
        ) : null}

        {/* ── Steg 1 · det eleven fick ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={built ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: built ? "grid" : "none",
            gridTemplateColumns: "minmax(0, 15rem) minmax(0, 1fr)",
            gap: "clamp(1rem, 2.4vw, 2rem)",
            border: `1px solid ${accent}`,
            borderRadius: "var(--radius, 0.6rem)",
            background: "var(--bg-surface)",
            padding: "clamp(0.9rem, 2vh, 1.5rem) clamp(1rem, 2vw, 1.6rem)",
          }}
        >
          {/* Reglagen */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "clamp(0.7rem, 1.6vh, 1.2rem)" }}>
            <Slider label="Kr i månaden" value={monthly} min={200} max={3000} step={100} onChange={setMonthly} display={kr(monthly)} accent={accent} />
            <Slider label="Års försprång" value={headStart} min={0} max={20} step={1} onChange={setHeadStart} display={`${headStart} år`} accent={accent} />
            <Slider label="Avkastning per år" value={rate} min={1} max={12} step={0.5} onChange={setRate} display={`${rate} %`} accent={accent} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.1em", color: muted, lineHeight: 1.5 }}>
              Båda slutar samma dag.<br />Den sena sparar i {BASE_YEARS} år.
            </div>
          </div>

          {/* Kurvorna + utfallet */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "0.5rem" }}>
            {/* preserveAspectRatio="none" låter diagrammet fylla sin ruta i
                stället för att skalas ned och centreras — och då krävs
                vectorEffect på strecken, annars blir de olika tjocka i x
                och y. Utan detta ser kurvorna hoptryckta ut. */}
            <svg
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              preserveAspectRatio="none"
              style={{ width: "100%", flex: "1 1 auto", minHeight: "5rem" }}
              aria-hidden
            >
              {/* Vågräta stödlinjer med kronbelopp — kurvorna ska gå att
                  läsa av, inte bara beundras. */}
              {gridLines.map((g) => (
                <g key={g.v}>
                  <line
                    x1={PAD_L}
                    y1={g.y}
                    x2={VB_W - 4}
                    y2={g.y}
                    stroke="rgba(128,128,128,0.22)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={PAD_L - 6}
                    y={g.y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: muted }}
                  >
                    {g.label}
                  </text>
                </g>
              ))}

              {/* Där var och en börjar spara */}
              {[
                { m: lateStartM, c: muted },
                { m: earlyStartM, c: accent },
              ].map((s, k) => (
                <line
                  key={k}
                  x1={xAt(s.m)}
                  y1={12}
                  x2={xAt(s.m)}
                  y2={VB_H - PAD_B}
                  stroke={s.c}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.55}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <path
                d={path(late)}
                fill="none"
                stroke={muted}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={path(early)}
                fill="none"
                stroke={accent}
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              <text
                x={PAD_L}
                y={VB_H - 3}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: muted }}
              >
                år 0
              </text>
              <text
                x={VB_W - 4}
                y={VB_H - 3}
                textAnchor="end"
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: muted }}
              >
                år {MAX_YEARS}
              </text>
            </svg>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1.2rem" }}>
              <Outcome label={`Börjar ${headStart} år tidigare`} deposited={early.deposited} value={early.value} color={accent} strong />
              <Outcome label="Börjar senare" deposited={late.deposited} value={late.value} color={muted} />
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(128,128,128,0.22)",
                paddingTop: "0.5rem",
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(0.9rem, 1.45vw, 1.35rem)",
                lineHeight: 1.25,
                color: "var(--text)",
              }}
            >
              {extraIn > 0 ? (
                <>
                  <strong style={{ color: accent }}>{kr(extraIn)}</strong> mer insatt ger{" "}
                  <strong style={{ color: accent }}>{kr(extraOut)}</strong> mer på kontot —{" "}
                  <strong style={{ color: accent }}>{ratio.toFixed(1)}×</strong> tillbaka.
                </>
              ) : (
                <>Dra i <strong style={{ color: accent }}>försprånget</strong> och se vad tiden gör.</>
              )}
            </div>
          </div>
        </motion.div>

        {footnote ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={built ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.78vw, 0.8rem)",
              letterSpacing: "0.1em",
              color: muted,
              flexShrink: 0,
            }}
          >
            <EditableText path="footnote" value={footnote}>
              {inlineMarkdown(footnote)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  display: string;
  accent: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.58rem, 0.72vw, 0.74rem)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "0.25rem",
        }}
      >
        <span>{label}</span>
        <span style={{ color: accent, fontSize: "1.15em", letterSpacing: "0.04em" }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: accent, cursor: "pointer" }}
      />
    </label>
  );
}

function Outcome({
  label,
  deposited,
  value,
  color,
  strong,
}: {
  label: string;
  deposited: number;
  value: number;
  color: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.56rem, 0.7vw, 0.72rem)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color,
          marginBottom: "0.15rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display, var(--font-sans))",
          fontSize: strong ? "clamp(1.1rem, 1.9vw, 1.8rem)" : "clamp(0.95rem, 1.6vw, 1.5rem)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1.05,
          color: "var(--text)",
        }}
      >
        {kr(value)}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.56rem, 0.7vw, 0.72rem)",
          color: "var(--text-muted)",
        }}
      >
        insatt {kr(deposited)}
      </div>
    </div>
  );
}
