"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CaseGrid — rutnät av case/exempel-kort. Tänkt för "scope"-slides som
 * visar flera fall samtidigt (val, händelser, exempel) utan att lägga in
 * en hardkodad rubrikprefix. Stödjer valfri tumnagelbild per kort —
 * "wall of evidence"-känsla när varje kort har en bild, mer typografiskt
 * när inga bilder.
 *
 * MDX-format:
 * ```mdx
 * <CaseGrid
 *   chapter="§ Scope"
 *   title="Det här är inte en framtidsbild."
 *   accent= "var(--accent)"
 * >
 * - Slovakien · sept 2023 · Deepfake-audio på Šimečka 48h före valet.
 * - ★ Rumänien · dec 2024 · Första EU-val annullerat. · /bilder/rumanien.jpg
 * </CaseGrid>
 * ```
 *
 * Per rad: `Plats · Datum · Beskrivning · Bildsökväg(optional)`
 * Prefix `★ ` på Plats markerar primary (accent-ram + glow).
 */

interface CaseGridProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.74. */
  overlay?: number | string;
  /** Antal kolumner. Default = auto baserat på antal items. */
  columns?: number | string;
  /** Liten hint längst ner. */
  hint?: string;
  /**
   * Display-läge:
   * - "grid" (default) = alla kort i ett rutnät, alla synliga samtidigt
   * - "carousel" = ett kort centrerat och aktivt, övriga peekar in från
   *   sidorna i mindre/dimmade format. Stega framåt för att byta aktivt.
   */
  display?: "grid" | "carousel";
  children?: ReactNode;
}

interface Case {
  place: string;
  date: string;
  description: string;
  image: string;
  primary: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
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

function parseCases(children: ReactNode): Case[] {
  const out: Case[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    let placeRaw = (parts[0] ?? "").trim();
    const date = (parts[1] ?? "").trim();
    let description = (parts[2] ?? "").trim();
    let image = (parts[3] ?? "").trim();
    // Om man bara haft "place · description" (utan datum) går det också
    if (!description && date && !/^\d|^(jan|feb|mar|apr|maj|jun|jul|aug|sep|okt|nov|dec)/i.test(date)) {
      description = date;
    }
    let primary = false;
    if (placeRaw.startsWith("★ ") || placeRaw.startsWith("★")) {
      primary = true;
      placeRaw = placeRaw.replace(/^★\s*/, "").trim();
    }
    if (!placeRaw) return;
    out.push({ place: placeRaw, date, description, image, primary });
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
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
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

function autoColumns(n: number): number {
  if (n <= 2) return n;
  if (n <= 4) return n;
  if (n <= 6) return 3;
  if (n <= 8) return 4;
  if (n <= 9) return 3;
  return 4;
}

export function CaseGrid({
  chapter,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  overlay = 0.74,
  columns,
  hint,
  display = "grid",
  children,
}: CaseGridProps) {
  const cases = useMemo(() => parseCases(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const cols =
    columns !== undefined
      ? typeof columns === "string"
        ? parseInt(columns, 10) || autoColumns(cases.length)
        : columns
      : autoColumns(cases.length);
  const anyImages = cases.some((c) => c.image);
  const isCarousel = display === "carousel";

  // Carousel-geometri (samma mönster som MediaCarousel)
  const cardWidthPct = 56; // % av carousel-arean
  const gapPct = 4;
  const stepWidthPct = cardWidthPct + gapPct;
  const card0LeftPct = 50 - cardWidthPct / 2;
  // useSlideSteps får alltid kallas (rules of hooks). Om vi inte är i
  // carousel-läge så registrerar vi 1 step (= ingen reell stegning).
  const carouselStep = useSlideSteps(isCarousel ? Math.max(cases.length, 1) : 1);
  const translatePct = isCarousel
    ? -carouselStep * stepWidthPct
    : 0;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Chapter */}
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative h-full w-full flex flex-col"
        style={{
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1.4rem, 2.5vh, 2.2rem)",
          zIndex: 2,
        }}
      >
        {/* Titel + subtitle */}
        <div style={{ flexShrink: 0, maxWidth: "min(1300px, 92%)" }}>
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2.2rem, 4vw, 3.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: "var(--text-muted)",
                marginTop: "0.5rem",
                maxWidth: "70ch",
                lineHeight: 1.4,
              }}
            >
              {renderInline(subtitle, accent)}
            </motion.div>
          ) : null}
        </div>

        {/* Grid eller Carousel beroende på display */}
        {isCarousel ? (
          <div
            style={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <motion.div
              animate={{ x: `${translatePct}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {cases.map((c, i) => {
                const isActive = i === carouselStep;
                const distance = Math.abs(i - carouselStep);
                const cardLeftPct =
                  card0LeftPct + i * stepWidthPct;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${cardLeftPct}%`,
                      top: "50%",
                      width: `${cardWidthPct}%`,
                      maxHeight: "92%",
                      transition: "opacity 0.6s, transform 0.6s, filter 0.6s",
                      opacity: isActive
                        ? 1
                        : Math.max(0.25, 0.55 - distance * 0.15),
                      transform: isActive
                        ? "translateY(-50%) scale(1)"
                        : `translateY(-50%) scale(${Math.max(
                            0.82,
                            0.94 - distance * 0.06
                          )})`,
                      filter: isActive
                        ? "none"
                        : `saturate(0.55) brightness(0.7) blur(${
                            distance > 1 ? 1.5 : 0
                          }px)`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--bg-elevated)",
                        border: c.primary
                          ? `2px solid ${withAlpha(accent, 0.67)}`
                          : isActive
                          ? `1.5px solid ${withAlpha(accent, 0.33)}`
                          : "1px solid rgba(127,127,127,0.18)",
                        borderRadius: "0.85rem",
                        overflow: "hidden",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        boxShadow: isActive
                          ? c.primary
                            ? `0 32px 70px -16px ${withAlpha(accent, 0.4)}, inset 0 1px 0 ${withAlpha(accent, 0.4)}`
                            : `0 32px 70px -16px rgba(0,0,0,0.65), inset 0 1px 0 ${withAlpha(accent, 0.2)}`
                          : "0 16px 32px -12px rgba(0,0,0,0.5)",
                        position: "relative",
                      }}
                    >
                      {/* Image (om finns) */}
                      {c.image ? (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16/9",
                            overflow: "hidden",
                            background: "#0a0908",
                            borderBottom: c.primary
                              ? `1.5px solid ${withAlpha(accent, 0.33)}`
                              : "1px solid rgba(127,127,127,0.12)",
                          }}
                        >
                          <img
                            src={c.image}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              filter: "brightness(0.92) saturate(1.05)",
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Glow ovanifrån för primary */}
                      {c.primary ? (
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: `radial-gradient(ellipse at top, ${withAlpha(accent, 0.14)} 0%, transparent 60%)`,
                            pointerEvents: "none",
                          }}
                        />
                      ) : null}

                      {/* Body */}
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          padding: "clamp(1.5rem, 2.5vw, 2.4rem)",
                          gap: "clamp(0.5rem, 1vh, 0.85rem)",
                          position: "relative",
                          justifyContent: "center",
                        }}
                      >
                        {c.date ? (
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "clamp(0.8rem, 1vw, 1rem)",
                              letterSpacing: "0.22em",
                              textTransform: "uppercase",
                              color: c.primary ? accent : `${withAlpha(accent, 0.87)}`,
                              fontWeight: 600,
                            }}
                          >
                            {c.date}
                          </div>
                        ) : null}

                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: "clamp(2rem, 3.4vw, 3rem)",
                            lineHeight: 1.05,
                            letterSpacing: "-0.025em",
                            color: "var(--text)",
                          }}
                        >
                          {c.place}
                          {c.primary ? (
                            <span
                              style={{ color: accent, marginLeft: "0.4em" }}
                            >
                              ★
                            </span>
                          ) : null}
                        </div>

                        {c.description ? (
                          <div
                            style={{
                              fontFamily: "var(--font-body)",
                              fontSize: "clamp(1.05rem, 1.4vw, 1.4rem)",
                              lineHeight: 1.4,
                              color: "var(--text)",
                              marginTop: "0.4rem",
                            }}
                          >
                            {renderInline(c.description, accent)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Stega-indikator */}
            {cases.length > 1 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                style={{
                  position: "absolute",
                  bottom: "clamp(0.6rem, 1.5vh, 1.2rem)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: `${withAlpha(accent, 0.67)}`,
                  zIndex: 5,
                }}
              >
                <span>← →</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {String(carouselStep + 1).padStart(2, "0")} /{" "}
                  {String(cases.length).padStart(2, "0")}
                </span>
              </motion.div>
            ) : null}
          </div>
        ) : (
          <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: "clamp(0.7rem, 1.2vw, 1.3rem)",
            minHeight: 0,
            alignContent: "center",
          }}
        >
          {cases.map((c, i) => {
            const baseDelay = 0.7 + i * 0.09;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.7,
                  delay: baseDelay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--bg-elevated)",
                  border: c.primary
                    ? `1.5px solid ${withAlpha(accent, 0.67)}`
                    : "1px solid rgba(127,127,127,0.18)",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  boxShadow: c.primary
                    ? `0 22px 50px -16px ${withAlpha(accent, 0.33)}, inset 0 1px 0 ${withAlpha(accent, 0.4)}`
                    : `0 18px 38px -16px rgba(0,0,0,0.55)`,
                  position: "relative",
                  minHeight: 0,
                }}
              >
                {/* Image */}
                {c.image ? (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      overflow: "hidden",
                      background: "#0a0908",
                      borderBottom: c.primary
                        ? `1.5px solid ${withAlpha(accent, 0.33)}`
                        : "1px solid rgba(127,127,127,0.12)",
                    }}
                  >
                    <img
                      src={c.image}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: "brightness(0.92) saturate(1.05)",
                      }}
                    />
                  </div>
                ) : anyImages ? (
                  /* Reservera samma höjd så kort utan bild blir konsistenta */
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: "var(--bg-surface)",
                      borderBottom: "1px solid rgba(127,127,127,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: `${withAlpha(accent, 0.4)}`,
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                    }}
                  >
                    [bild]
                  </div>
                ) : null}

                {/* Glow ovanifrån för primary */}
                {c.primary ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `radial-gradient(ellipse at top, ${withAlpha(accent, 0.12)} 0%, transparent 60%)`,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}

                {/* Body */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    padding: "clamp(0.8rem, 1.2vw, 1.2rem)",
                    gap: "clamp(0.3rem, 0.6vh, 0.5rem)",
                    position: "relative",
                  }}
                >
                  {/* Date eyebrow */}
                  {c.date ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: c.primary ? accent : `${withAlpha(accent, 0.67)}`,
                      }}
                    >
                      {c.date}
                    </div>
                  ) : null}

                  {/* Place */}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.2rem, 1.7vw, 1.6rem)",
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                      color: "var(--text)",
                    }}
                  >
                    {c.place}
                    {c.primary ? (
                      <span style={{ color: accent, marginLeft: "0.4em" }}>★</span>
                    ) : null}
                  </div>

                  {/* Description */}
                  {c.description ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.82rem, 0.98vw, 0.98rem)",
                        lineHeight: 1.4,
                        color: "var(--text-muted)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {renderInline(c.description, accent)}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
        )}

        {/* Hint */}
        {hint ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{
              duration: 0.6,
              delay: 0.7 + cases.length * 0.09 + 0.4,
            }}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
              color: "var(--text-muted)",
              maxWidth: "70ch",
            }}
          >
            {renderInline(hint, accent)}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
