"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown, markdownToReact } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PredictionChorus ★ — kören av tvärsäkra förutsägelser, och nypan salt.
 *
 * De som bygger modellerna säger alla när AGI kommer. De säger det med
 * samma säkerhet — och de säger olika saker. Sliden låter rösterna komma
 * en i taget, var och en med sitt datum, tills brädet är fullt. Först då
 * tippar saltkaret i mitten och saltar över alltihop.
 *
 * Poängen är inte att någon har fel. Poängen är att samma personer säljer
 * det de förutspår — och att det är en källkritisk observation, inte en
 * elakhet. Nypan salt gör den observationen utan att Joel behöver säga den.
 *
 * MDX-format — `Namn · Organisation · Datum :: Citatet`:
 *
 * ```mdx
 * <PredictionChorus
 *   kicker="§ Och sen då? · Rösterna"
 *   title="Alla vet exakt när. Ingen säger samma sak."
 *   saltLine="Samma personer **säljer** det de förutspår."
 * >
 * - Sam Altman · OpenAI · sep 2024 :: Superintelligens inom **några tusen dagar**.
 * - Dario Amodei · Anthropic · jan 2025 :: Inom **5–10 år** …
 * </PredictionChorus>
 * ```
 */

interface PredictionChorusProps {
  kicker?: string;
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Landningsraden som kommer med saltet. Stödjer **fetstil**. */
  saltLine?: string;
  /** Etiketten under saltkaret. */
  saltLabel?: string;
  /** Saltkarets storlek. 1 = 52×80 px. Default 5 — det ska synas i en aula. */
  saltScale?: number;
  accent?: string;
  children?: ReactNode;
}

interface Voice {
  name: string;
  org: string;
  date: string;
  /** Frilagd PNG, beskuren till motivet och bottenankrad. */
  portrait: string;
  quote: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseVoices(children: ReactNode): Voice[] {
  const out: Voice[] = [];
  const add = (raw: string) => {
    const [metaPart, ...quoteParts] = raw.split("::");
    if (quoteParts.length === 0) return;
    // Porträttet känns igen på att det är en sökväg — då spelar det ingen
    // roll var i meta-listan det står.
    const meta = metaPart.split("·").map((p) => p.trim());
    const portrait = meta.find((p) => p.startsWith("/")) ?? "";
    const rest = meta.filter((p) => p !== portrait);
    out.push({
      name: rest[0] ?? "",
      org: rest[1] ?? "",
      date: rest[2] ?? "",
      portrait,
      quote: quoteParts.join("::").trim(),
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

/** Hur långt karet tippar. Kornens utgångspunkt räknas ur samma vinkel. */
const TIP_DEG = 100;

/** Saltkorn som faller ur karet — fasta positioner så de inte hoppar vid omrendering. */
const GRAINS = [
  { dx: -34, dy: 96, d: 0.05, s: 3.1 },
  { dx: 18, dy: 122, d: 0.22, s: 2.4 },
  { dx: -8, dy: 152, d: 0.38, s: 3.6 },
  { dx: 46, dy: 108, d: 0.12, s: 2.2 },
  { dx: -58, dy: 134, d: 0.46, s: 2.8 },
  { dx: 66, dy: 148, d: 0.3, s: 3.3 },
  { dx: 4, dy: 190, d: 0.55, s: 2.1 },
  { dx: -80, dy: 176, d: 0.62, s: 2.6 },
  { dx: 88, dy: 182, d: 0.7, s: 2.9 },
  { dx: 32, dy: 214, d: 0.78, s: 2.3 },
  { dx: -44, dy: 222, d: 0.86, s: 3.0 },
  { dx: 12, dy: 250, d: 0.94, s: 2.5 },
];

function SaltShaker({
  tipped,
  accent,
  scale,
}: {
  tipped: boolean;
  accent: string;
  scale: number;
}) {
  const W = 52 * scale;
  const H = 80 * scale;

  // Var hamnar locket när karet har tippat? Kornen ska komma UR det, inte ur
  // containerns origo. Räknat i containerns koordinatsystem:
  //   pivot   = transformOrigin (50% 88%) plus den animerade förflyttningen
  //   lock    = 14,1 % ned i SVG:n, alltså 0,739·H ovanför pivoten
  //   rotation svänger den vektorn till (0,739·H·sinθ, −0,739·H·cosθ)
  const rad = (TIP_DEG * Math.PI) / 180;
  const capX = -0.6 * W + 0.739 * H * Math.sin(rad);
  const capY = -0.45 * H + 0.38 * H - 0.739 * H * Math.cos(rad);
  // Fallet skalar mildare än karet — annars regnar kornen ut ur sliden.
  const spread = scale * 0.3;

  return (
    <div style={{ position: "relative", width: 0, height: 0 }}>
      {/* Karet finns inte förrän det behövs — annars står ett oförklarat
          föremål mitt i brädet under hela uppräkningen.

          Det tippar nästan platt (100°) i stället för 128°: i stor skala
          lägger sig kroppen då längs rännan MELLAN kortraderna i stället för
          att falla ned i ett kort. */}
      <motion.div
        initial={false}
        animate={{
          rotate: tipped ? TIP_DEG : 0,
          // Rotationen kastar kroppen ned åt höger. Utan kompensation hamnar
          // hela karet i kortet nere till höger; med den ligger det centrerat
          // över korsningen och överlappet delas mellan de två undre korten.
          x: tipped ? -0.6 * W : 0,
          y: tipped ? -0.45 * H : 0,
          opacity: tipped ? 1 : 0,
        }}
        transition={{
          rotate: { duration: 0.9, delay: 0.25, ease: [0.34, 1.4, 0.64, 1] },
          x: { duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
          y: { duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.35 },
        }}
        style={{
          position: "absolute",
          left: `${-W / 2}px`,
          top: `${-H / 2}px`,
          transformOrigin: "50% 88%",
          filter: "drop-shadow(0 26px 34px rgba(0,0,0,0.24))",
        }}
      >
        <svg width={W} height={H} viewBox="0 0 60 92" fill="none" aria-hidden>
          {/* Kropp */}
          <path
            d="M12 30 C12 24 16 21 20 20 L40 20 C44 21 48 24 48 30 L50 80 C50 86 46 89 40 89 L20 89 C14 89 10 86 10 80 Z"
            fill="var(--bg-surface)"
            stroke="color-mix(in srgb, var(--text) 42%, transparent)"
            strokeWidth="2"
          />
          {/* Etikettband */}
          <path
            d="M11.6 52 L48.4 52 L48.9 68 L11.1 68 Z"
            fill={`color-mix(in srgb, ${accent} 30%, transparent)`}
          />
          {/* Lock */}
          <path
            d="M17 20 C17 11 22 6 30 6 C38 6 43 11 43 20 Z"
            fill="color-mix(in srgb, var(--text) 22%, var(--bg-surface))"
            stroke="color-mix(in srgb, var(--text) 45%, transparent)"
            strokeWidth="2"
          />
          {/* Hål i locket */}
          {[
            [24, 13],
            [30, 11],
            [36, 13],
            [27, 17],
            [33, 17],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="1.5"
              fill="color-mix(in srgb, var(--text) 55%, transparent)"
            />
          ))}
        </svg>
      </motion.div>

      {/* Kornen */}
      {tipped
        ? GRAINS.map((g, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                // Locket pekar snett nedåt höger efter tippet, så kornen
                // sprutar först åt det hållet och faller sedan.
                x: (g.dx + 50) * spread,
                y: g.dy * spread,
              }}
              transition={{
                duration: 2.4,
                // Vänta tills karet har tippat färdigt (0,25 s fördröjning
                // plus 0,9 s rotation) — annars rinner saltet ur ett kar
                // som fortfarande står upp.
                delay: 1.15 + g.d,
                ease: "easeIn",
                repeat: Infinity,
                repeatDelay: 0.9,
              }}
              style={{
                position: "absolute",
                left: capX,
                top: capY,
                width: g.s * spread * 1.6,
                height: g.s * spread * 1.6,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--text) 62%, transparent)",
              }}
            />
          ))
        : null}
    </div>
  );
}

export function PredictionChorus({
  kicker,
  chapter,
  title,
  subtitle,
  saltLine,
  saltLabel = "En nypa salt",
  saltScale = 5,
  accent = "var(--accent)",
  children,
}: PredictionChorusProps) {
  const voices = parseVoices(children);
  // Ett steg per röst, plus ett sista där saltet tippar.
  const step = useSlideSteps(voices.length + 1);
  const salted = step >= voices.length;

  if (voices.length === 0) return null;

  const columns = voices.length <= 2 ? 1 : 2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        display: "flex",
        flexDirection: "column",
        padding:
          "clamp(1.6rem, 3.4vh, 2.8rem) clamp(2rem, 4.5vw, 4.5rem) clamp(1.4rem, 3vh, 2.4rem)",
      }}
    >
      {/* Överrad */}
      {kicker || chapter ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            marginBottom: "clamp(0.6rem, 1.4vh, 1.2rem)",
          }}
        >
          <span style={{ color: accent, fontWeight: 600 }}>
            {kicker ? (
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            ) : null}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {chapter ? (
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            ) : null}
          </span>
        </div>
      ) : null}

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(1.7rem, 3vw, 3rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            color: "var(--text)",
            margin: 0,
            textAlign: "center",
          }}
        >
          <EditableText path="title" value={title}>
            {inlineMarkdown(title)}
          </EditableText>
        </motion.h2>
      ) : null}

      {subtitle ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.95rem, 1.3vw, 1.35rem)",
            color: "var(--text-muted)",
            textAlign: "center",
            margin: "clamp(0.4rem, 1vh, 0.8rem) auto 0",
            maxWidth: "46em",
          }}
        >
          <EditableText path="subtitle" value={subtitle}>
            {inlineMarkdown(subtitle)}
          </EditableText>
        </motion.p>
      ) : null}

      {/* Rutnätet med rösterna — saltkaret sitter i korsningen */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          // Bred kolumnränna: saltkaret ska rymmas i korsningen utan att
          // lägga sig över datum-brickan i kortets nedre högra hörn.
          columnGap: "clamp(1.5rem, 4.6vw, 4.6rem)",
          rowGap: "clamp(0.8rem, 1.8vh, 1.7rem)",
          gridAutoRows: "minmax(0, 1fr)",
          marginTop: "clamp(0.8rem, 2vh, 1.6rem)",
        }}
      >
        {voices.map((v, i) => {
          const shown = step >= i;
          return (
            <motion.figure
              key={i}
              initial={false}
              animate={{
                opacity: shown ? (salted ? 0.72 : 1) : 0,
                y: shown ? 0 : 22,
                scale: shown ? 1 : 0.97,
              }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                margin: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "clamp(0.6rem, 1.4vh, 1rem)",
                padding:
                  "clamp(1rem, 2.2vh, 1.7rem) clamp(1.2rem, 2vw, 2rem) clamp(0.9rem, 1.8vh, 1.4rem)",
                borderRadius: "clamp(0.5rem, 0.8vw, 0.9rem)",
                background: "color-mix(in srgb, var(--bg-surface) 88%, transparent)",
                border: `1px solid color-mix(in srgb, var(--text) ${salted ? 8 : 14}%, transparent)`,
                boxShadow: salted
                  ? "0 10px 30px -22px rgba(0,0,0,0.5)"
                  : "0 24px 60px -34px rgba(0,0,0,0.55)",
                filter: salted ? "saturate(0.45)" : "none",
                transition: "filter 0.9s, border-color 0.9s, box-shadow 0.9s",
                overflow: "hidden",
              }}
            >
              {/* Datum uppe till höger — en stämpel på när det sades, och
                  frigör nedre högra hörnet åt porträttet. */}
              {v.date ? (
                <span
                  style={{
                    position: "absolute",
                    top: "clamp(0.7rem, 1.5vh, 1.1rem)",
                    right: "clamp(0.9rem, 1.5vw, 1.4rem)",
                    padding: "0.2em 0.7em",
                    borderRadius: "999px",
                    border: `1px solid color-mix(in srgb, ${accent} 40%, transparent)`,
                    color: accent,
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.62rem, 0.8vw, 0.88rem)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    zIndex: 2,
                  }}
                >
                  {v.date}
                </span>
              ) : null}

              <blockquote
                style={{
                  margin: 0,
                  paddingTop: v.date ? "clamp(1.1rem, 2vh, 1.6rem)" : 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.35rem, 2.15vw, 2.6rem)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  color: "var(--text)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <EditableText path={`voices.${i}.quote`} value={v.quote}>
                  {markdownToReact(`”${v.quote}”`)}
                </EditableText>
              </blockquote>

              <figcaption
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: "1em",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.72rem, 0.95vw, 1.05rem)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <span style={{ display: "block", lineHeight: 1.45 }}>
                  <span
                    style={{
                      display: "block",
                      color: "var(--text)",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {v.name}
                  </span>
                  <span style={{ display: "block", color: "var(--text-muted)" }}>
                    {v.org}
                  </span>
                </span>

                {/* Frilagt porträtt, bottenankrat mot kortets underkant.
                    marginBottom neutraliserar kortets bottenpadding så
                    axlarna vilar på kanten i stället för att sväva. */}
                {v.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.portrait}
                    alt=""
                    style={{
                      height: "clamp(5rem, 16vh, 11rem)",
                      width: "auto",
                      objectFit: "contain",
                      objectPosition: "bottom",
                      marginBottom: "calc(-1 * clamp(0.9rem, 1.8vh, 1.4rem))",
                      flexShrink: 0,
                      alignSelf: "flex-end",
                    }}
                  />
                ) : null}
              </figcaption>
            </motion.figure>
          );
        })}

        {/* Saltkaret — mitt i korsningen, tippar när alla röster är uppe */}
        {columns === 2 ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            <SaltShaker tipped={salted} accent={accent} scale={saltScale} />
          </div>
        ) : null}
      </div>

      {/* Landningsraden */}
      {saltLine ? (
        <motion.div
          initial={false}
          animate={{ opacity: salted ? 1 : 0, y: salted ? 0 : 10 }}
          transition={{ duration: 0.7, delay: salted ? 0.75 : 0 }}
          style={{
            textAlign: "center",
            margin: "clamp(0.9rem, 2.2vh, 1.7rem) auto 0",
            maxWidth: "38em",
          }}
        >
          {saltLabel ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.82vw, 0.88rem)",
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "0.5em",
              }}
            >
              {saltLabel}
            </div>
          ) : null}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.1rem, 1.75vw, 2.05rem)",
              lineHeight: 1.25,
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="saltLine" value={saltLine}>
              {inlineMarkdown(saltLine)}
            </EditableText>
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}

export default PredictionChorus;
