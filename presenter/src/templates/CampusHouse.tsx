"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CampusHouse ★ — ett hus i skymning där uppgångarna tänds, en per klick.
 *
 * Byggd för "vuxenutbildningen är inte en målgrupp — det är många":
 * fyra skolformer som fyra UPPGÅNGAR i samma hus (sida vid sida — ingen
 * våningshierarki), och finalen tänder HELA huset: skylten, foajébandet
 * och ljuskäglorna ur portarna. "Hela huset" blir bokstavligt.
 *
 * Scenen är en egen illustration (skymningspalett, hårdkodad som en
 * bildbakgrund vore) men all typografi konsumerar tema-tokens, så
 * vänsterspalten följer dagsljus/nattglas/etc.
 *
 * MDX-format — rader "Namn · Plakett · beskrivning", ★-raden är finalen:
 * ```mdx
 * <CampusHouse chapter="§ Särart" title="Inte en målgrupp — ett helt hus."
 *   bottomLine="Ett hus. Många vägar in. Samma uppdrag.">
 * - SFI · SFI · Svenska från dag ett — ofta helt ny i språket
 * - Grundläggande · GRUND · Det som inte blev klart förra gången
 * - Gymnasial · GYMN · Kurser, behörighet, en väg vidare
 * - Lärvux · LÄRVUX · Anpassad utbildning — lärande på egna villkor
 * - ★ Hela huset · · Och långt fler än lärare: SYV, elevhälsa, administration
 * </CampusHouse>
 * ```
 */

interface CampusHouseProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Skylttexten på taket. Tänds i finalen. */
  signText?: string;
  /** Rad som fälls in under scenen när hela huset lyser. */
  bottomLine?: string;
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
  children?: ReactNode;
}

interface Wing {
  name: string;
  plaque: string;
  description: string;
  finale: boolean;
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

function parseWings(children: ReactNode): Wing[] {
  const out: Wing[] = [];
  const add = (raw: string) => {
    let working = raw.trim();
    if (!working) return;
    let finale = false;
    if (working.startsWith("★")) {
      finale = true;
      working = working.replace(/^★\s*/, "");
    }
    const parts = working.split("·").map((s) => s.trim().replace(/\*\*/g, ""));
    out.push({
      name: parts[0] ?? "",
      plaque: parts.length >= 3 ? parts[1] : (parts[0] ?? "").toUpperCase(),
      description: parts.length >= 3 ? parts.slice(2).join(" · ") : (parts[1] ?? ""),
      finale,
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children));
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

/* ── Skymningspaletten — scenens egna färger, som en illustration ── */
const SKY_TOP = "#1F2A44";
const SKY_MID = "#3A4A6E";
const HORIZON = "#B9765C";
const FACADE = "#333D52";
const FACADE_EDGE = "#485571";
const WINDOW_DARK = "#252E45";
const WINDOW_LIT_A = "#FFE3B0";
const WINDOW_LIT_B = "#FFB65C";
const DOOR_DARK = "#2B3450";
const LIGHT_WARM = "#FFD9A0";

/** Ett fönster som tänds med liten flimmer-attack. */
function Window({
  x,
  y,
  w,
  h,
  lit,
  delay,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  delay: number;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={WINDOW_DARK} stroke={FACADE_EDGE} strokeWidth={1.2} />
      <motion.g
        initial={false}
        animate={lit ? { opacity: [0, 1, 0.55, 1] } : { opacity: 0 }}
        transition={
          lit
            ? { duration: 0.55, delay, times: [0, 0.4, 0.7, 1], ease: "easeOut" }
            : { duration: 0.3 }
        }
      >
        <rect x={x} y={y} width={w} height={h} rx={3} fill="url(#chWindowLit)" filter="url(#chGlow)" />
        {/* spröjs */}
        <line x1={x + w / 2} y1={y + 3} x2={x + w / 2} y2={y + h - 3} stroke="#B97E33" strokeWidth={1} opacity={0.55} />
        <line x1={x + 3} y1={y + h / 2} x2={x + w - 3} y2={y + h / 2} stroke="#B97E33" strokeWidth={1} opacity={0.4} />
      </motion.g>
    </g>
  );
}

export function CampusHouse({
  chapter,
  title,
  subtitle,
  signText = "CAMPUS",
  bottomLine,
  background,
  overlay,
  overlayMode = "dark",
  children,
}: CampusHouseProps) {
  const rows = parseWings(children);
  const wings = rows.filter((r) => !r.finale);
  const finaleRow = rows.find((r) => r.finale);
  const totalSteps = rows.length + 1; // steg 0 = mörkt hus
  const step = useSlideSteps(totalSteps);
  const litCount = Math.min(step, wings.length);
  const wholeHouse = step >= rows.length; // finalen nådd

  if (wings.length === 0) return null;

  /* ── Husgeometri: uppgångar sida vid sida ── */
  const VB_W = 560;
  const VB_H = 460;
  const bx = 52; // husets vänsterkant
  const bw = VB_W - bx * 2; // husets bredd
  const wingW = bw / wings.length;
  const roofY = 128;
  const groundY = 404;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: buildBackgroundCss(background, overlay, overlayMode),
        padding: "clamp(1.8rem, 4vh, 3rem) clamp(2.4rem, 4.5vw, 4.6rem)",
      }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.4rem, 3vh, 2.4rem)",
            right: "clamp(2rem, 4vw, 3.4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.66rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path="chapter" value={chapter}>{chapter}</EditableText>
        </div>
      ) : null}

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "minmax(0, 10fr) minmax(0, 11fr)",
          gap: "clamp(1.6rem, 3.5vw, 3.6rem)",
          alignItems: "center",
        }}
      >
        {/* ── Vänster: titel + uppgångarna som lista ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.9rem, 2.2vh, 1.5rem)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(1.9rem, 3.4vw, 3.1rem)",
                letterSpacing: "var(--heading-tracking)",
                lineHeight: 1.05,
                color: "var(--text)",
              }}
            >
              <EditableText path="title" value={title}>{title}</EditableText>
            </motion.h2>
          ) : null}

          {subtitle ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.95rem, 1.35vw, 1.3rem)",
                color: "var(--text-muted)",
                maxWidth: "40ch",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>{subtitle}</EditableText>
            </motion.p>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.55rem, 1.4vh, 1rem)" }}>
            {wings.map((wing, i) => {
              const lit = litCount > i;
              return (
                <motion.div
                  key={wing.name + i}
                  initial={false}
                  animate={{ opacity: lit ? 1 : 0.28, x: lit ? 0 : -8 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr)",
                    gap: "clamp(0.7rem, 1.4vw, 1.1rem)",
                    alignItems: "baseline",
                    borderLeft: lit
                      ? `3px solid ${LIGHT_WARM}`
                      : "3px solid color-mix(in srgb, var(--text) 15%, transparent)",
                    paddingLeft: "clamp(0.7rem, 1.4vw, 1.1rem)",
                    transition: "border-color 0.5s ease",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.1rem, 1.8vw, 1.7rem)",
                      color: "var(--text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {wing.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.85rem, 1.15vw, 1.1rem)",
                      lineHeight: 1.4,
                      color: "var(--text-muted)",
                    }}
                  >
                    {wing.description}
                  </span>
                </motion.div>
              );
            })}

            {finaleRow ? (
              <motion.div
                initial={false}
                animate={{
                  opacity: wholeHouse ? 1 : 0.22,
                  scale: wholeHouse ? 1 : 0.98,
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  marginTop: "clamp(0.3rem, 0.8vh, 0.6rem)",
                  padding: "clamp(0.65rem, 1.4vh, 1rem) clamp(0.9rem, 1.8vw, 1.3rem)",
                  borderRadius: "calc(var(--radius, 0.75rem) + 2px)",
                  background: wholeHouse
                    ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                    : "color-mix(in srgb, var(--text) 6%, transparent)",
                  border: `1px solid ${
                    wholeHouse
                      ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                      : "color-mix(in srgb, var(--text) 12%, transparent)"
                  }`,
                  transition: "background 0.6s ease, border-color 0.6s ease",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(1.05rem, 1.7vw, 1.6rem)",
                    color: wholeHouse ? "var(--accent)" : "var(--text)",
                  }}
                >
                  {finaleRow.name}.
                </span>{" "}
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.85rem, 1.15vw, 1.1rem)",
                    color: "var(--text-muted)",
                  }}
                >
                  {finaleRow.description}
                </span>
              </motion.div>
            ) : null}
          </div>
        </div>

        {/* ── Höger: huset i skymning ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(0.6rem, 1.4vh, 1rem)", minWidth: 0 }}>
          <div
            style={{
              borderRadius: "clamp(0.9rem, 1.6vw, 1.4rem)",
              overflow: "hidden",
              boxShadow: "0 22px 60px -30px rgba(15, 20, 35, 0.55)",
              lineHeight: 0,
            }}
          >
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" role="img" aria-label="Ett hus i skymning där uppgångarna tänds en i taget">
              <defs>
                <linearGradient id="chSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={SKY_TOP} />
                  <stop offset="0.62" stopColor={SKY_MID} />
                  <stop offset="1" stopColor={HORIZON} />
                </linearGradient>
                <linearGradient id="chWindowLit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={WINDOW_LIT_A} />
                  <stop offset="1" stopColor={WINDOW_LIT_B} />
                </linearGradient>
                <linearGradient id="chCone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={LIGHT_WARM} stopOpacity="0.5" />
                  <stop offset="1" stopColor={LIGHT_WARM} stopOpacity="0" />
                </linearGradient>
                <filter id="chGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Himlen */}
              <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#chSky)" />

              {/* Stjärnor — tänds fler när hela huset lyser */}
              {[
                [48, 46, 1.6], [120, 84, 1.2], [212, 38, 1.8], [304, 72, 1.2],
                [388, 44, 1.5], [472, 90, 1.3], [520, 40, 1.7], [76, 108, 1.1],
              ].map(([sx, sy, sr], i) => (
                <motion.circle
                  key={i}
                  cx={sx}
                  cy={sy}
                  r={sr}
                  fill="#F4EBD8"
                  initial={{ opacity: 0.35 }}
                  animate={{ opacity: wholeHouse ? [0.35, 0.95, 0.5, 0.9] : 0.4 }}
                  transition={
                    wholeHouse
                      ? { duration: 2.4 + i * 0.3, repeat: Infinity, repeatType: "mirror", delay: i * 0.2 }
                      : { duration: 0.8 }
                  }
                />
              ))}
              {/* Månskära */}
              <circle cx={496} cy={64} r={13} fill="#EFE6D2" opacity={0.85} />
              <circle cx={502} cy={60} r={12} fill={SKY_TOP} opacity={0.95} />

              {/* Marken */}
              <rect x="0" y={groundY} width={VB_W} height={VB_H - groundY} fill="#232B41" />

              {/* Huskroppen */}
              <rect x={bx} y={roofY} width={bw} height={groundY - roofY} fill={FACADE} stroke={FACADE_EDGE} strokeWidth={1.5} />
              {/* Taklist */}
              <rect x={bx - 8} y={roofY - 12} width={bw + 16} height={14} rx={3} fill={FACADE_EDGE} />

              {/* Skylten — tänds i finalen */}
              <g>
                <rect x={VB_W / 2 - 96} y={roofY - 46} width={192} height={26} rx={6} fill={DOOR_DARK} stroke={FACADE_EDGE} strokeWidth={1.2} />
                <motion.g
                  initial={false}
                  animate={wholeHouse ? { opacity: [0, 1, 0.6, 1] } : { opacity: 0 }}
                  transition={wholeHouse ? { duration: 0.7, times: [0, 0.4, 0.7, 1] } : { duration: 0.3 }}
                >
                  <rect x={VB_W / 2 - 96} y={roofY - 46} width={192} height={26} rx={6} fill="none" stroke={LIGHT_WARM} strokeWidth={1.6} filter="url(#chGlow)" />
                  <text
                    x={VB_W / 2}
                    y={roofY - 28}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="13"
                    letterSpacing="6"
                    fill={LIGHT_WARM}
                    filter="url(#chGlow)"
                  >
                    {signText}
                  </text>
                </motion.g>
                {/* släckt skylttext */}
                {!wholeHouse ? (
                  <text
                    x={VB_W / 2}
                    y={roofY - 28}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize="13"
                    letterSpacing="6"
                    fill={FACADE_EDGE}
                  >
                    {signText}
                  </text>
                ) : null}
              </g>

              {/* Uppgångarna */}
              {wings.map((wing, i) => {
                const lit = litCount > i;
                const x0 = bx + i * wingW;
                const doorW = 40;
                const doorH = 64;
                const doorX = x0 + wingW / 2 - doorW / 2;
                const doorY = groundY - doorH;
                const winW = 32;
                const winH = 38;
                const gapX = (wingW - winW * 2) / 3;
                return (
                  <g key={wing.name + i}>
                    {/* skiljelinje mellan uppgångar */}
                    {i > 0 ? (
                      <line x1={x0} y1={roofY + 6} x2={x0} y2={groundY - 4} stroke={FACADE_EDGE} strokeWidth={1} opacity={0.5} />
                    ) : null}

                    {/* två våningar fönster */}
                    {[0, 1].map((col) =>
                      [0, 1].map((row) => (
                        <Window
                          key={`${col}-${row}`}
                          x={x0 + gapX + col * (winW + gapX)}
                          y={158 + row * 62}
                          w={winW}
                          h={winH}
                          lit={lit}
                          delay={0.12 * (col + row * 2)}
                        />
                      )),
                    )}

                    {/* porten */}
                    <path
                      d={`M ${doorX} ${groundY} v ${-doorH + 10} q 0 -10 10 -10 h ${doorW - 20} q 10 0 10 10 v ${doorH - 10} z`}
                      fill={DOOR_DARK}
                      stroke={lit ? LIGHT_WARM : FACADE_EDGE}
                      strokeWidth={lit ? 1.8 : 1.2}
                      style={{ transition: "stroke 0.5s ease" }}
                    />
                    {/* dörrfönster */}
                    <motion.rect
                      x={doorX + doorW / 2 - 9}
                      y={doorY + 12}
                      width={18}
                      height={14}
                      rx={2}
                      fill="url(#chWindowLit)"
                      initial={false}
                      animate={{ opacity: lit ? 1 : 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      filter="url(#chGlow)"
                    />
                    {/* plakett ovanför porten */}
                    <motion.g initial={false} animate={{ opacity: lit ? 1 : 0.35 }} transition={{ duration: 0.5 }}>
                      <rect x={x0 + wingW / 2 - 34} y={doorY - 22} width={68} height={16} rx={4} fill={lit ? "#4A3A24" : DOOR_DARK} stroke={lit ? LIGHT_WARM : FACADE_EDGE} strokeWidth={1} style={{ transition: "fill 0.5s ease, stroke 0.5s ease" }} />
                      <text
                        x={x0 + wingW / 2}
                        y={doorY - 10}
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                        fontSize="9.5"
                        letterSpacing="1.5"
                        fill={lit ? LIGHT_WARM : FACADE_EDGE}
                        style={{ transition: "fill 0.5s ease" }}
                      >
                        {wing.plaque}
                      </text>
                    </motion.g>

                    {/* ljuskägla ur porten — finalen */}
                    <motion.path
                      d={`M ${doorX + 4} ${groundY} L ${doorX - 16} ${groundY + 42} L ${doorX + doorW + 16} ${groundY + 42} L ${doorX + doorW - 4} ${groundY} Z`}
                      fill="url(#chCone)"
                      initial={false}
                      animate={{ opacity: wholeHouse ? 1 : 0 }}
                      transition={{ duration: 0.8, delay: 0.15 * i }}
                    />
                  </g>
                );
              })}

              {/* varm markreflektion i finalen */}
              <motion.rect
                x={bx - 10}
                y={groundY}
                width={bw + 20}
                height={26}
                fill={LIGHT_WARM}
                initial={false}
                animate={{ opacity: wholeHouse ? 0.1 : 0 }}
                transition={{ duration: 1 }}
              />
            </svg>
          </div>

          {bottomLine ? (
            <motion.p
              initial={false}
              animate={{ opacity: wholeHouse ? 1 : 0, y: wholeHouse ? 0 : 8 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: 0,
                textAlign: "center",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
                color: "var(--text)",
              }}
            >
              <EditableText path="bottomLine" value={bottomLine}>{bottomLine}</EditableText>
            </motion.p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
