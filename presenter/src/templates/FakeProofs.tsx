"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { Lightbox } from "./Lightbox";
import { unwrapLazy } from "@/lib/extract-text";

interface FakeProofItem {
  image: string;
  source: string;
  caption?: string;
}

interface FakeProofsProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /** Stegvis reveal av varje kort. Default true. */
  stepped?: boolean;
  /**
   * Markdown-lista i children. Format per rad:
   *
   * `- /path/to/image.png · Källa-namn · Caption-text`
   *
   * Källan visas som monospace-badge ovanför bilden, captionen som
   * kursiv beskrivning under.
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseItems(children: ReactNode): FakeProofItem[] {
  const items: FakeProofItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children);
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    let image = "";
    const rest: string[] = [];
    for (const p of parts) {
      if (!image && (p.startsWith("/") || p.startsWith("http"))) image = p;
      else rest.push(p);
    }
    if (!image) return;
    const [source = "", caption] = rest;
    items.push({ image, source, caption });
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
  return items;
}

function renderTitle(title: string, accent: string): ReactNode {
  const parts = title.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 800 }}>
          {p.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/**
 * FakeProofs — tre tiltade skärmdumpar/bilder som "fake evidence".
 *
 * Korten ligger lite slumpartat tiltade (som om de slängts upp som
 * bevismaterial på en redaktion). Klick på ett kort öppnar lightbox
 * med full upplösning. Stegvis reveal som default.
 *
 * Designintention: detta är *blottläggnings*-rytm. Använd när poängen
 * är att illustrera hur lätt det är att fejka — inte som dekorativ
 * bildvisning. Tre exemplar är optimum; två blir tunt, fyra trångt.
 *
 * Format:
 * ```mdx
 * <FakeProofs
 *   kicker="§ Flöde · Det du ser"
 *   title="**ALLT** går att fejka."
 *   subtitle="Och era elever vet det redan."
 * >
 * - /bilder/skarmdump1.png · Vklass · Eleven har VG i alla ämnen
 * - /bilder/skarmdump2.png · WhatsApp · Påminn läraren att gå tidigare
 * - /bilder/skarmdump3.png · Instagram · Story som inte hänt
 * </FakeProofs>
 * ```
 */
export function FakeProofs({
  kicker,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  stepped = true,
  children,
}: FakeProofsProps) {
  const items = parseItems(children);
  const activeStep = useSlideSteps(stepped ? Math.max(items.length, 1) : 0);
  const [lightbox, setLightbox] = useState<FakeProofItem | null>(null);

  // Deterministisk tilt per kort — slumpmässigt utseende, samma varje render.
  const tilts = [-4.5, 2.2, -2.4];

  // Custom backdrop (foto/gradient) passas via prop → texten ska vara fast ljus.
  // Utan prop följer slide-bakgrunden temat → texten följer temats tokens.
  const hasCustomBg = !!background;
  const introText = hasCustomBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const introMuted = hasCustomBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background ?? "var(--slide-base, var(--bg))",
      }}
    >
      {/* Subtil grain-overlay för "fysisk redaktionsbänk"-känsla */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(236,126,38,0.06), transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(3rem, 5vw, 5rem) clamp(3rem, 6vw, 6rem)",
          zIndex: 2,
          gap: "clamp(1.5rem, 3vh, 2.5rem)",
        }}
      >
        {/* Intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "42em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: introMuted,
              }}
            >
              {kicker}
            </motion.div>
          ) : null}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(2.8rem, 6vw, 5.5rem)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              color: introText,
              margin: 0,
            }}
          >
            {renderTitle(title, accent)}
          </motion.h2>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.32 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1.05rem, 1.25vw, 1.3rem)",
                lineHeight: 1.5,
                color: introMuted,
                margin: 0,
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>

        {/* Tiltade kort */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${items.length}, 1fr)`,
            gap: "clamp(1.5rem, 3vw, 3rem)",
            alignItems: "stretch",
            paddingTop: "clamp(0.5rem, 2vh, 1.5rem)",
          }}
        >
          {items.map((item, i) => {
            const revealed = stepped ? i <= activeStep : true;
            const tilt = tilts[i % tilts.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 60, rotate: tilt + 6 }}
                animate={
                  revealed
                    ? { opacity: 1, y: 0, rotate: tilt }
                    : { opacity: 0, y: 60, rotate: tilt + 6 }
                }
                transition={{
                  duration: 0.85,
                  delay: stepped ? 0 : 0.45 + i * 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  transformOrigin: "center top",
                }}
              >
                {/* Source-badge */}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    color: accent,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      background: accent,
                      boxShadow: `0 0 12px ${withAlpha(accent, 0.67)}`,
                    }}
                  />
                  {item.source}
                </div>

                {/* Klickbart bildkort */}
                <button
                  type="button"
                  onClick={() => setLightbox(item)}
                  aria-label={`Förstora ${item.source}-bilden`}
                  style={{
                    all: "unset",
                    flex: 1,
                    minHeight: "clamp(14rem, 38vh, 28rem)",
                    borderRadius: "0.5rem",
                    background: "var(--bg-elevated)",
                    border: `1px solid ${withAlpha(accent, 0.2)}`,
                    boxShadow:
                      "0 30px 60px -25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "zoom-in",
                    transition:
                      "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "rotate(0deg) translateY(-6px) scale(1.015)";
                    e.currentTarget.style.boxShadow = `0 50px 90px -25px rgba(0,0,0,0.8), 0 0 0 1px ${withAlpha(accent, 0.4)} inset, 0 0 40px -8px ${withAlpha(accent, 0.53)}`;
                    const parent = e.currentTarget.parentElement;
                    if (parent) parent.style.transform = "rotate(0deg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow =
                      "0 30px 60px -25px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)";
                    const parent = e.currentTarget.parentElement;
                    if (parent) parent.style.transform = "";
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.caption ?? item.source}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      position: "absolute",
                      inset: 0,
                      padding: "0.75rem",
                    }}
                  />
                  {/* FAKE-stämpel diagonalt över */}
                  <motion.div
                    initial={{ opacity: 0, scale: 1.4, rotate: -18 }}
                    animate={
                      revealed
                        ? { opacity: 1, scale: 1, rotate: -14 }
                        : { opacity: 0, scale: 1.4, rotate: -18 }
                    }
                    transition={{
                      duration: 0.55,
                      delay: stepped ? 0.35 : 0.65 + i * 0.15,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    style={{
                      position: "absolute",
                      top: "clamp(1.5rem, 3vh, 2.5rem)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      padding: "0.4rem 1.1rem",
                      border: `3px solid ${accent}`,
                      borderRadius: "0.25rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(1rem, 1.4vw, 1.5rem)",
                      fontWeight: 800,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: accent,
                      background: "rgba(10,9,8,0.55)",
                      backdropFilter: "blur(2px)",
                      pointerEvents: "none",
                      boxShadow: `0 0 30px ${withAlpha(accent, 0.4)}`,
                    }}
                  >
                    Fejk
                  </motion.div>
                </button>

                {/* Caption */}
                {item.caption ? (
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontStyle: "italic",
                      fontSize: "clamp(0.9rem, 1.05vw, 1.1rem)",
                      lineHeight: 1.4,
                      color: introMuted,
                    }}
                  >
                    {item.caption}
                  </div>
                ) : null}
              </motion.div>
            );
          })}
        </div>
      </div>

      <Lightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        image={lightbox?.image}
        caption={
          lightbox
            ? [lightbox.source, lightbox.caption].filter(Boolean).join(" · ")
            : undefined
        }
      />
    </div>
  );
}
