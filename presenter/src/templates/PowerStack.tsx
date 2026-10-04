"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * PowerStack — fem (eller färre) företagskolumner med produktstack och
 * en sammanfattande tagline. Kort flyger in en i taget, varje kort visar
 * företagsnamn, ett nyckel-stat (UPPERCASE accent), och en lista av
 * produkter/tjänster som taggar in efter kortets entré. Tagline
 * kommer in efter alla kort har landat.
 *
 * Tänkt för "vem äger lådan"-moment där maktkoncentrationen ska kännas.
 *
 * MDX-format:
 * ```mdx
 * <PowerStack
 *   chapter="§ Vem äger lådan"
 *   title="Fem företag äger nästan all generativ AI."
 *   tagline="Och de som äger infrastrukturen formar samtalet."
 *   accent= "var(--accent)"
 *   background="..."
 * >
 * - Microsoft · $13B i OpenAI · Azure, Copilot, Office, GitHub, LinkedIn
 * - Google · 1,8 mdr användare · Gemini, DeepMind, Workspace, Android, YouTube
 * - ...
 * </PowerStack>
 * ```
 *
 * Per rad: `Företag · Stat · Produkt1, Produkt2, ...`
 */

interface PowerStackProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Citat eller mening efter alla kort har landat. */
  tagline?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay på bakgrundsbild (0-1). Default 0.78. */
  overlay?: number | string;
  children?: ReactNode;
}

interface Company {
  name: string;
  stat: string;
  products: string[];
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

function parseCompanies(children: ReactNode): Company[] {
  const out: Company[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 1) return;
    const name = (parts[0] ?? "").trim();
    const stat = (parts[1] ?? "").trim();
    const productsRaw = parts.slice(2).join(" · ").trim();
    const products = productsRaw
      ? productsRaw
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
    if (!name) return;
    out.push({ name, stat, products });
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

/**
 * Logo-uppslag baserat på företagsnamn (case-insensitive). Loggorna ligger
 * monokrom-kräm i public/logos/. Returnerar null om okänt företag — då
 * faller kortet tillbaka till bara textnamnet.
 */
function getLogoSrc(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  if (normalized === "microsoft") return "/logos/microsoft.svg";
  if (normalized === "google") return "/logos/google.svg";
  if (normalized === "amazon") return "/logos/amazon.svg";
  if (normalized === "meta") return "/logos/meta.svg";
  if (normalized === "xai" || normalized === "x") return "/logos/xai.svg";
  return null;
}

export function PowerStack({
  chapter,
  title,
  subtitle,
  tagline,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: PowerStackProps) {
  const companies = useMemo(() => parseCompanies(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  // Sluttid för animationer (när tagline ska komma in)
  const cardEntryDelay = 0.85;
  const cardStagger = 0.18;
  const cardDuration = 0.85;
  const productStagger = 0.07;
  const taglineDelay =
    cardEntryDelay +
    Math.max(companies.length - 1, 0) * cardStagger +
    cardDuration +
    0.6;

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

      {/* Subtle grid mönster i bakgrunden */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(247,241,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(247,241,230,0.04) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 75%)",
          zIndex: 1,
        }}
      />

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

        {/* Kort-grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(companies.length, 1)}, 1fr)`,
            gap: "clamp(0.7rem, 1.2vw, 1.2rem)",
            minHeight: 0,
            alignItems: "stretch",
          }}
        >
          {companies.map((company, i) => {
            const baseDelay = cardEntryDelay + i * cardStagger;
            const logoSrc = getLogoSrc(company.name);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 70, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: cardDuration,
                  delay: baseDelay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background:
                    "linear-gradient(180deg, rgba(28, 24, 18, 0.78) 0%, rgba(15, 13, 10, 0.85) 100%)",
                  border: "1px solid rgba(247,241,230,0.08)",
                  borderTop: `3px solid ${accent}`,
                  borderRadius: "0.5rem",
                  padding: "clamp(0.95rem, 1.5vw, 1.5rem)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: `0 24px 48px -16px rgba(0,0,0,0.55), inset 0 1px 0 ${withAlpha(accent, 0.2)}`,
                }}
              >
                {/* Accent glow ovanifrån */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "60%",
                    background: `radial-gradient(ellipse at top, ${withAlpha(accent, 0.12)} 0%, transparent 70%)`,
                    pointerEvents: "none",
                  }}
                />

                {/* Logo (om finns) */}
                {logoSrc ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: baseDelay + 0.25 }}
                    style={{
                      height: "clamp(2.6rem, 3.6vw, 3.4rem)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      marginBottom: "clamp(0.7rem, 1.2vh, 1rem)",
                      position: "relative",
                    }}
                  >
                    <img
                      src={logoSrc}
                      alt={company.name}
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        opacity: 0.95,
                        filter: `drop-shadow(0 0 18px ${withAlpha(accent, 0.2)})`,
                      }}
                    />
                  </motion.div>
                ) : null}

                {/* Företagsnamn */}
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: logoSrc
                      ? "clamp(0.9rem, 1.1vw, 1.1rem)"
                      : "clamp(1.4rem, 2.2vw, 2.1rem)",
                    letterSpacing: logoSrc ? "0.18em" : "-0.02em",
                    textTransform: logoSrc ? "uppercase" : "none",
                    color: logoSrc ? "var(--text-muted)" : "var(--text)",
                    marginBottom: "0.25rem",
                    position: "relative",
                    lineHeight: 1.05,
                  }}
                >
                  {company.name}
                </div>

                {/* Stat (eyebrow) */}
                {company.stat ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: baseDelay + 0.4 }}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: accent,
                      marginBottom: "clamp(0.85rem, 1.4vh, 1.2rem)",
                      position: "relative",
                      lineHeight: 1.3,
                    }}
                  >
                    {company.stat}
                  </motion.div>
                ) : (
                  <div style={{ marginBottom: "clamp(0.85rem, 1.4vh, 1.2rem)" }} />
                )}

                {/* Divider */}
                <div
                  aria-hidden
                  style={{
                    height: 1,
                    background: "rgba(247,241,230,0.12)",
                    marginBottom: "clamp(0.7rem, 1.2vh, 1rem)",
                    position: "relative",
                  }}
                />

                {/* Produkter */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(0.3rem, 0.55vh, 0.45rem)",
                    position: "relative",
                  }}
                >
                  {company.products.map((product, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: baseDelay + 0.65 + j * productStagger,
                      }}
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                        color: "var(--text)",
                        lineHeight: 1.3,
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.45rem",
                      }}
                    >
                      <span
                        style={{
                          color: `${withAlpha(accent, 0.6)}`,
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85em",
                        }}
                      >
                        ›
                      </span>
                      <span>{product}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Tagline */}
        {tagline ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: taglineDelay,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              flexShrink: 0,
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(1.4rem, 2.4vw, 2.2rem)",
              color: "var(--text)",
              letterSpacing: "-0.015em",
              maxWidth: "70ch",
              borderTop: `1px solid ${withAlpha(accent, 0.33)}`,
              paddingTop: "clamp(1rem, 1.8vh, 1.5rem)",
              lineHeight: 1.25,
            }}
          >
            {renderInline(tagline, accent)}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
