"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useId, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * MythTimeline — den gamla drömmen om något i vår egen avbild.
 *
 * Detta är medvetet INGEN tidslinje. Alla motiv delar exakt samma kontur och
 * exakt samma ram; det är bara skinnet som byts. Golem, automat, Frankenstein
 * och chatboten växer fram ur samma figur — publiken ska känna att det är
 * samma dröm som byter skepnad, inte fyra separata historiska exempel.
 *
 * Utan bildfiler ritas kodade siluetter: samma kroppskontur, olika inre
 * textur (lera, mekanik, sömmar, upplösning i text). De håller som färdig
 * bild i sig, och byts sömlöst mot Joels egna motiv genom att lägga till en
 * sökväg sist på raden.
 *
 * ```mdx
 * <MythTimeline
 *   kicker="§ 0 · Den gamla drömmen"
 *   statement="Vi har alltid velat skapa något i vår egen avbild."
 * >
 * - Golem · Prag, 1500-tal · lera
 * - Automaten · 1700-tal · mekanik
 * - Frankensteins varelse · 1818 · sömmar
 * - Chatboten · 2020-tal · sprak · /bilder/eleverna-om-ai/chatbot.png
 * </MythTimeline>
 * ```
 *
 * Per rad: `Namn · Epok · siluett-typ · bildsökväg (valfri)`.
 * Siluett-typer: `lera`, `mekanik`, `sommar`, `sprak`.
 */

interface MythTimelineProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Meningen som ligger över motiven. */
  statement?: string;
  /** Underrad längst ned — landar på sista steget. */
  subline?: string;
  children?: ReactNode;
}

type SkinKind = "lera" | "mekanik" | "sommar" | "sprak";

interface Motif {
  name: string;
  era: string;
  skin: SkinKind;
  image?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Den gemensamma kroppskonturen. Identisk för alla fyra — det är poängen. */
const BODY_PATH =
  "M50 14 C58 14 64 20 64 28 C64 34 61 38 58 41 C72 46 80 58 82 74 " +
  "C84 92 84 112 82 130 L18 130 C16 112 16 92 18 74 C20 58 28 46 42 41 " +
  "C39 38 36 34 36 28 C36 20 42 14 50 14 Z";

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
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

function parseMotifs(children: ReactNode): Motif[] {
  const out: Motif[] = [];
  const skins: SkinKind[] = ["lera", "mekanik", "sommar", "sprak"];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    if (!parts[0]) return;
    const image = parts.find((p) => p.startsWith("/") || p.startsWith("http"));
    const skinPart = parts.find((p) =>
      (skins as string[]).includes(p.toLowerCase()),
    );
    out.push({
      name: parts[0],
      era: parts[1] && parts[1] !== skinPart && parts[1] !== image ? parts[1] : "",
      skin: (skinPart?.toLowerCase() as SkinKind) ?? skins[out.length % 4],
      image,
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/** Inre textur per epok. Konturen är alltid densamma — bara huden byts. */
function SkinDetail({ kind }: { kind: SkinKind }) {
  const stroke = "var(--accent)";
  if (kind === "lera") {
    // Lera: grova, oregelbundna block. Något format för hand, inte konstruerat.
    return (
      <g stroke={stroke} strokeWidth={0.9} fill="none" opacity={0.55}>
        <path d="M28 60 H72" />
        <path d="M26 78 H74" />
        <path d="M24 96 H76" />
        <path d="M24 114 H76" />
        <path d="M44 60 V130" />
        <path d="M58 60 V130" />
        <path d="M36 41 Q50 48 64 41" />
      </g>
    );
  }
  if (kind === "mekanik") {
    // Automaten: kugghjul och axlar. Konstruerad, inte formad.
    return (
      <g stroke={stroke} strokeWidth={0.9} fill="none" opacity={0.6}>
        <circle cx={50} cy={72} r={13} />
        <circle cx={50} cy={72} r={4.5} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return (
            <line
              key={i}
              x1={50 + Math.cos(a) * 13}
              y1={72 + Math.sin(a) * 13}
              x2={50 + Math.cos(a) * 17}
              y2={72 + Math.sin(a) * 17}
            />
          );
        })}
        <circle cx={33} cy={102} r={7.5} />
        <circle cx={67} cy={102} r={7.5} />
        <line x1={50} y1={85} x2={50} y2={122} />
        <circle cx={50} cy={27} r={4} />
      </g>
    );
  }
  if (kind === "sommar") {
    // Frankenstein: sömmar och två bultar. Sammansatt av delar.
    return (
      <g stroke={stroke} strokeWidth={0.9} fill="none" opacity={0.6}>
        <path d="M50 41 V130" strokeDasharray="3 3" />
        <path d="M24 84 H76" strokeDasharray="3 3" />
        {[52, 62, 72, 92, 102, 112].map((y) => (
          <g key={y}>
            <line x1={46} y1={y} x2={54} y2={y} />
          </g>
        ))}
        {[30, 42, 58, 70].map((x) => (
          <line key={x} x1={x} y1={80} x2={x} y2={88} />
        ))}
        <circle cx={36} cy={28} r={2.6} fill={stroke} stroke="none" />
        <circle cx={64} cy={28} r={2.6} fill={stroke} stroke="none" />
      </g>
    );
  }
  // Chatboten: figuren löses upp i språk. Inga kretskort, ingen robot.
  return (
    <g opacity={0.62}>
      <g stroke={stroke} strokeWidth={1.4} strokeLinecap="round">
        {[
          [30, 58, 62],
          [30, 68, 48],
          [30, 78, 56],
          [30, 92, 40],
          [30, 102, 52],
          [30, 112, 34],
        ].map(([x, y, w], i) => (
          <line key={i} x1={x} y1={y} x2={x + w} y2={y} opacity={0.35 + i * 0.09} />
        ))}
      </g>
      {/* Chattbubblor som stiger ur figuren */}
      <g fill="none" stroke={stroke} strokeWidth={1}>
        <rect x={54} y={20} width={22} height={13} rx={4} />
        <path d="M60 33 L58 38 L65 33" />
        <rect x={26} y={36} width={17} height={10} rx={3.5} opacity={0.6} />
      </g>
    </g>
  );
}

export function MythTimeline({
  chapter,
  kicker,
  statement,
  subline,
  children,
}: MythTimelineProps) {
  const motifs = useMemo(() => parseMotifs(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;
  // Unikt per instans — annars krockar klippbanorna om bilden återanvänds.
  const clipId = `myth-clip-${useId().replace(/:/g, "")}`;
  // Har Joel levererat motiv? Då gäller ett annat visuellt läge än platshållarnas.
  const hasImages = useMemo(() => motifs.some((m) => m.image), [motifs]);

  const step = useSlideSteps(Math.max(motifs.length, 1));
  const index = Math.min(step, Math.max(motifs.length - 1, 0));
  const current = motifs[index];
  const isLast = index >= motifs.length - 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 42%, var(--bg-surface) 0%, var(--bg) 74%)",
      }}
    >
      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 5,
          }}
        >
          {kicker ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--accent)",
              }}
            >
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </span>
          ) : null}
          {chapter ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "color-mix(in srgb, var(--text) 45%, transparent)",
                marginLeft: "auto",
              }}
            >
              <EditableText path="chapter" value={chapter}>
                {chapter}
              </EditableText>
            </span>
          ) : null}
        </div>
      ) : null}

      {/* ————— Motivet — samma ram, samma kontur, nytt skinn ————— */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          // Lämna plats åt topprad och den nu betydligt större namnraden,
          // annars lägger sig motivet över den.
          paddingTop: "clamp(3.5rem, 8vh, 5rem)",
          paddingBottom: hasImages
            ? "clamp(8rem, 20vh, 13rem)"
            : "clamp(6rem, 15vh, 9rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "relative",
            height: "min(74vh, 34rem)",
            maxHeight: "100%",
            // Riktiga motiv är kvadratiska och bär sin egen siluett; den smala
            // ramen gäller bara de kodade platshållarna.
            aspectRatio: hasImages ? "1 / 1" : "100 / 144",
          }}
        >
          {/* Grön dis bakom figuren. Motiven är nästan vita och skulle annars
              tappa fäste mot daylightapples ljusa bakgrund. */}
          {hasImages ? (
            <div
              style={{
                position: "absolute",
                inset: "-12%",
                background:
                  "radial-gradient(ellipse at 50% 56%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 66%)",
              }}
            />
          ) : null}

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 1.04, filter: "blur(10px)" }
              }
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                filter: "blur(8px)",
                transition: { duration: reduceMotion ? 0 : 0.4 },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
              style={{ position: "absolute", inset: 0 }}
            >
              {current?.image ? (
                // Ingen klippbana och ingen gråskala: motiven har egen alfa och
                // den turkosgröna tonen är det som håller ihop dem visuellt.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter:
                      "drop-shadow(0 24px 60px color-mix(in srgb, var(--accent) 30%, transparent))",
                  }}
                />
              ) : (
                // Kodade platshållare: hit hör konturen, som ÄR poängen när
                // det inte finns några motiv — samma figur, nytt skinn.
                <svg
                  viewBox="0 0 100 144"
                  style={{ width: "100%", height: "100%" }}
                >
                  <defs>
                    <clipPath id={clipId}>
                      <path d={BODY_PATH} />
                    </clipPath>
                  </defs>
                  <motion.path
                    d={BODY_PATH}
                    fill="color-mix(in srgb, var(--accent) 7%, transparent)"
                    stroke="color-mix(in srgb, var(--accent) 45%, transparent)"
                    strokeWidth={1.1}
                    initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 1.6, ease: EASE }}
                  />
                  <SkinDetail kind={current?.skin ?? "lera"} />
                </svg>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ————— Meningen, över motiven ————— */}
      {statement ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(3rem, 7vw, 7rem)",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 1, delay: 0.4, ease: EASE }}
            style={{
              maxWidth: "16em",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.7rem, 3.3vw, 3.2rem)",
              lineHeight: 1.18,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              padding: "clamp(1.4rem, 3vw, 2.6rem)",
              background:
                "radial-gradient(ellipse at 50% 50%, var(--bg) 46%, transparent 78%)",
            }}
          >
            <EditableText path="statement" value={statement}>
              {renderInline(statement)}
            </EditableText>
          </motion.div>
        </div>
      ) : null}

      {/* ————— Motivets namn och epok ————— */}
      {current ? (
        <div
          style={{
            position: "absolute",
            bottom: subline ? "clamp(4.6rem, 10vh, 6.6rem)" : "clamp(2rem, 4.5vh, 3.4rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "center",
            zIndex: 4,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.25 } }}
              transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE }}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "0.6em",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(2rem, 4.4vw, 4.2rem)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.03em",
                  color: "var(--accent)",
                  textShadow: "0 10px 50px var(--accent-glow)",
                }}
              >
                {current.name}
              </span>
              {current.era ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.75rem, 1.1vw, 1.15rem)",
                    letterSpacing: "0.26em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  {current.era}
                </span>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : null}

      {/* ————— Underrad ————— */}
      {subline ? (
        <motion.div
          initial={false}
          animate={{ opacity: isLast ? 1 : 0, y: isLast ? 0 : 10 }}
          transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 4.5vh, 3.4rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.95rem, 1.35vw, 1.35rem)",
            color: "var(--text-muted)",
            zIndex: 4,
          }}
        >
          <EditableText path="subline" value={subline}>
            {subline}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
