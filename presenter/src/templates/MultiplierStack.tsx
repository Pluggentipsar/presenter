"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

/**
 * MultiplierStack — mängdskiftet som bild: ETT dokument blir MÅNGA.
 *
 * Byggd för kommunal-utveckling-v2:s "förr: en analys — nu: sex artefakter
 * innan lunch". Vänster: ett ensamt dokumentkort i mycket luft (ensamheten
 * är poängen). Klick: sex dokumentkort DELAS UT från originalet — flyger in
 * från vänster med stigande stagger, landar i ett 3×2-rutnät under en
 * tidschip ("Nu · innan lunch"), och slutraden landar.
 *
 * Multiplikationen är argumentet — inte listan.
 *
 * ```mdx
 * <MultiplierStack
 *   chapter="§ Mängdskiftet · Före lunch"
 *   beforeLabel="Förr"
 *   beforeTitle="En analys"
 *   afterLabel="Nu · innan lunch"
 *   closing="Ingenting är nytt arbete. Det nya är att **allt ryms.**"
 * >
 * - Huvudanalysen · som förut — fast med källor att klicka på
 * - Ett pre-mortem · åtta sätt satsningen kan dö på
 * </MultiplierStack>
 * ```
 *
 * Per rad: `Titel · detalj`. 4–6 rader är lagom (rutnätet är 3×2).
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface MultiplierStackProps {
  chapter?: string;
  /** Etikett under det ensamma kortet. */
  beforeLabel?: string;
  /** Titel på det ensamma kortet. */
  beforeTitle?: string;
  /** Underrad på det ensamma kortet. */
  beforeCaption?: string;
  /** Tidschip ovanför rutnätet — landar med klicket. */
  afterLabel?: string;
  /** Slutrad, `**fet**` → accent. */
  closing?: string;
  accent?: string;
  /** Artefakterna som markdown-lista: `- Titel · detalj`. */
  children?: ReactNode;
}

interface Artifact {
  title: string;
  caption: string;
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

function parseArtifacts(children: ReactNode): Artifact[] {
  const out: Artifact[] = [];
  const visit = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "ul" || el.type === "ol") {
        visit(el.props.children);
        return;
      }
      if (el.type === "li") {
        const [title, ...rest] = toText(el.props.children).split("·");
        out.push({
          title: (title ?? "").trim(),
          caption: rest.join("·").trim(),
        });
        return;
      }
      visit(el.props?.children);
    });
  };
  visit(children);
  return out;
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

/** Tunna "textrader" som får en yta att läsa som dokument. */
function FauxLines({
  count,
  accent,
  wide = false,
}: {
  count: number;
  accent: string;
  wide?: boolean;
}) {
  const widths = wide
    ? ["92%", "78%", "88%", "64%", "84%", "40%"]
    : ["88%", "64%", "76%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: wide ? "0.55rem" : "0.32rem" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: wide ? 5 : 3.5,
            width: widths[i % widths.length],
            borderRadius: 999,
            background:
              i === 0 ? withAlpha(accent, 0.55) : "var(--text-muted)",
            opacity: i === 0 ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

/** Vikt hörn uppe till höger — dokument-signaturen. */
function FoldedCorner({ size = 16 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 0,
        height: 0,
        borderStyle: "solid",
        borderWidth: `0 ${size}px ${size}px 0`,
        borderColor: `transparent var(--bg) transparent transparent`,
        filter: "drop-shadow(-1.5px 1.5px 1px rgba(0,0,0,0.12))",
      }}
    />
  );
}

export function MultiplierStack({
  chapter,
  beforeLabel = "Förr",
  beforeTitle = "En analys",
  beforeCaption,
  afterLabel = "Nu · innan lunch",
  closing,
  accent = "var(--accent)",
  children,
}: MultiplierStackProps) {
  const step = useSlideSteps(2);
  const revealed = step >= 1;
  const artifacts = useMemo(() => parseArtifacts(children), [children]);

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

      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "clamp(2rem, 4.5vw, 4.5rem)",
          padding:
            "clamp(4.5rem, 10vh, 7rem) clamp(2.5rem, 6vw, 6rem) clamp(4rem, 10vh, 6.5rem)",
        }}
      >
        {/* ── Förr: det ensamma dokumentet ── */}
        <div
          style={{
            flexShrink: 0,
            width: "clamp(11rem, 17vw, 16rem)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(0.9rem, 2vh, 1.4rem)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: revealed ? 0.55 : 1,
              y: 0,
              scale: revealed ? 0.96 : 1,
            }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "3 / 4",
              background: "var(--bg-surface)",
              border: "1.5px solid var(--text-muted)",
              borderRadius: "0.7rem",
              padding: "clamp(1rem, 1.8vw, 1.5rem)",
              boxShadow: "0 18px 44px -24px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.8rem, 1.6vh, 1.2rem)",
            }}
          >
            <FoldedCorner size={22} />
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.05rem, 1.6vw, 1.5rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
                color: "var(--text)",
                paddingRight: "1.2rem",
              }}
            >
              <EditableText path="beforeTitle" value={beforeTitle}>
                {beforeTitle}
              </EditableText>
            </div>
            <FauxLines count={6} accent={accent} wide />
            {beforeCaption ? (
              <div
                style={{
                  marginTop: "auto",
                  fontSize: "clamp(0.7rem, 0.9vw, 0.85rem)",
                  color: "var(--text-muted)",
                  lineHeight: 1.35,
                }}
              >
                <EditableText path="beforeCaption" value={beforeCaption}>
                  {beforeCaption}
                </EditableText>
              </div>
            ) : null}
          </motion.div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.66rem, 0.85vw, 0.88rem)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="beforeLabel" value={beforeLabel}>
              {beforeLabel}
            </EditableText>
          </div>
        </div>

        {/* Pil + multiplikator */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: revealed ? 1 : 0.2, x: revealed ? 0 : -8 }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.4rem",
            color: accent,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.1rem, 1.7vw, 1.6rem)",
            }}
          >
            ×{artifacts.length || 6}
          </div>
          <div style={{ fontSize: "clamp(1.5rem, 2.4vw, 2.3rem)", lineHeight: 1 }}>⟶</div>
        </motion.div>

        {/* ── Nu: rutnätet ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.8rem, 1.8vh, 1.3rem)",
          }}
        >
          <motion.div
            initial={false}
            animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 10 }}
            transition={{ duration: 0.6, ease: EASE, delay: revealed ? 0.15 : 0 }}
            style={{ display: "flex", justifyContent: "flex-start" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.55rem",
                padding: "0.4rem 1rem",
                borderRadius: 999,
                background: withAlpha(accent, 0.1),
                border: `1.5px solid ${withAlpha(accent, 0.55)}`,
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.68rem, 0.88vw, 0.92rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: accent,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: accent,
                }}
              />
              <EditableText path="afterLabel" value={afterLabel}>
                {afterLabel}
              </EditableText>
            </div>
          </motion.div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "clamp(0.7rem, 1.4vw, 1.2rem)",
            }}
          >
            {artifacts.map((a, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              return (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 0,
                    x: `${-24 - col * 9}vw`,
                    y: row === 0 ? "7vh" : "-7vh",
                    scale: 0.55,
                    rotate: -7,
                  }}
                  animate={
                    revealed
                      ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }
                      : {
                          opacity: 0,
                          x: `${-24 - col * 9}vw`,
                          y: row === 0 ? "7vh" : "-7vh",
                          scale: 0.55,
                          rotate: -7,
                        }
                  }
                  transition={{
                    duration: 0.75,
                    ease: EASE,
                    delay: revealed ? 0.2 + i * 0.13 : 0,
                  }}
                  style={{
                    position: "relative",
                    background: "var(--bg-surface)",
                    border: `1.5px solid ${withAlpha(accent, 0.4)}`,
                    borderRadius: "0.7rem",
                    padding:
                      "clamp(0.75rem, 1.3vw, 1.1rem) clamp(0.85rem, 1.4vw, 1.2rem)",
                    boxShadow: `0 14px 36px -22px ${withAlpha(accent, 0.5)}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.45rem",
                    minHeight: "clamp(5.2rem, 11vh, 7.5rem)",
                  }}
                >
                  <FoldedCorner size={14} />
                  <FauxLines count={2} accent={accent} />
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(0.92rem, 1.3vw, 1.25rem)",
                      lineHeight: 1.12,
                      letterSpacing: "-0.01em",
                      color: "var(--text)",
                      paddingRight: "0.8rem",
                    }}
                  >
                    {a.title}
                  </div>
                  {a.caption ? (
                    <div
                      style={{
                        fontSize: "clamp(0.72rem, 0.95vw, 0.92rem)",
                        lineHeight: 1.3,
                        color: "var(--text-muted)",
                      }}
                    >
                      {a.caption}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slutraden */}
      {closing ? (
        <motion.p
          initial={false}
          animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 16 }}
          transition={{ duration: 0.7, ease: EASE, delay: revealed ? 0.9 : 0 }}
          style={{
            position: "absolute",
            bottom: "clamp(1.5rem, 4vh, 2.8rem)",
            left: "50%",
            transform: "translateX(-50%)",
            margin: 0,
            width: "max-content",
            maxWidth: "82%",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(1.2rem, 2.1vw, 2rem)",
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
