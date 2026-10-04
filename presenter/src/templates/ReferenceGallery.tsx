"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ReferenceGalleryProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  closing?: string;
  /** Bilden som visar referenserna (typiskt en strip med 3-4 små thumbnails). */
  referenceSrc: string;
  referenceAlt?: string;
  /** Etikett ovanför referenserna. Default "REFERENSER". */
  referenceEyebrow?: string;
  /** Etikett ovanför de genererade bilderna. Default "AI:NS TOLKNING". */
  generatedEyebrow?: string;
  background?: string;
  overlay?: number | string;
  accent?: string;
  /**
   * Markdown-lista. Varje rad = en genererad bild:
   *
   *     - /workshop/diverse.png · Försättsbild · medborgardialog
   *     - /workshop/watercolor.png · Akvarell · broar mellan öar
   *
   * Format: `- src · titel · beskrivning`
   */
  children?: ReactNode;
}

interface GeneratedImage {
  src: string;
  title: string;
  description: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseImages(children: ReactNode): GeneratedImage[] {
  const items: GeneratedImage[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim());
    items.push({
      src: parts[0] ?? "",
      title: parts[1] ?? "",
      description: parts[2] ?? "",
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
  return items;
}

function resolveBackground(bg: string | undefined, overlay: number | string): string {
  const fallback =
    "radial-gradient(ellipse at 50% 25%, #141018 0%, #0a0908 80%)";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const a = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.7;
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * ReferenceGallery — visar en referensbild (strip med flera thumbnails) på
 * den övre halvan, en pil/etikett i mitten, och en rad med genererade
 * bilder undertill.
 *
 * Pedagogiskt: visa hur AI följer en visuell stil när du ger den
 * referensbilder att utgå från. Konkretiserar att man INTE behöver
 * beskriva en stil med ord — man kan visa.
 *
 * Steppning:
 *   step 0 — referensbilden
 *   step 1 — pilen och AI:NS TOLKNING-etiketten
 *   step 2..N — genererade bilder fadar in en åt gången
 *   step N+1 — closing
 */
export function ReferenceGallery({
  chapter,
  title,
  subtitle,
  closing,
  referenceSrc,
  referenceAlt,
  referenceEyebrow = "REFERENSER",
  generatedEyebrow = "AI:NS TOLKNING",
  background,
  overlay,
  accent = "#B4763A",
  children,
}: ReferenceGalleryProps) {
  const images = useMemo(() => parseImages(children), [children]);
  const step = useSlideSteps(images.length + 3);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-no-avsandar-footer
      style={{
        background: resolveBackground(background, overlay ?? 0.7),
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Atmosfärs-glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "50%",
          background: `radial-gradient(ellipse, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />

      {/* Header */}
      <div
        style={{
          padding:
            "clamp(1.6rem, 3.5vh, 2.8rem) clamp(2rem, 5vw, 4.5rem) 0",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          flexShrink: 0,
        }}
      >
        {chapter ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
            }}
          >
            <span
              style={{
                width: "1.6rem",
                height: "1px",
                background: "var(--text-muted)",
              }}
            />
            <EditableText path="chapter" value={chapter ?? ""}>{chapter}</EditableText>
          </motion.div>
        ) : null}
        {title ? (
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.55rem, 3.2vw, 2.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "var(--text)",
              margin: 0,
              maxWidth: "26em",
              textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        ) : null}
        {subtitle ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.9rem, 1.15vw, 1.1rem)",
              color: "var(--text-muted)",
              margin: 0,
              maxWidth: "32em",
              lineHeight: 1.45,
            }}
          >
            <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
          </motion.p>
        ) : null}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding:
            "clamp(1.2rem, 2.5vh, 2rem) clamp(2rem, 5vw, 4.5rem) clamp(2rem, 4vh, 3rem)",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 2vh, 1.6rem)",
          minHeight: 0,
        }}
      >
        {/* Top: reference */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.7rem",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <span
              style={{
                width: "1.4rem",
                height: "1px",
                background: "var(--text-muted)",
              }}
            />
            <EditableText path="referenceEyebrow" value={referenceEyebrow}>
              {referenceEyebrow}
            </EditableText>
            <span
              style={{
                width: "1.4rem",
                height: "1px",
                background: "var(--text-muted)",
              }}
            />
          </div>
          <div
            style={{
              position: "relative",
              maxWidth: "min(72%, 56rem)",
              borderRadius: "3px",
              overflow: "hidden",
              boxShadow:
                "0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(247,241,230,0.08)",
            }}
          >
            <img
              src={referenceSrc}
              alt={referenceAlt ?? "Referensbilder"}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                maxHeight: "min(22vh, 14rem)",
                objectFit: "contain",
                background: "rgba(247,241,230,0.04)",
              }}
            />
          </div>
        </motion.div>

        {/* Middle: arrow + label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: step >= 1 ? 1 : 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            color: accent,
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: "8rem",
              height: "1px",
              background:
                "linear-gradient(to right, transparent, rgba(247,241,230,0.3))",
            }}
          />
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <motion.path
                d="M 7 1 L 7 11 M 2 7 L 7 12 L 12 7"
                stroke={accent}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: step >= 1 ? 1 : 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
              />
            </svg>
            <span>AI följer vibben</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <motion.path
                d="M 7 1 L 7 11 M 2 7 L 7 12 L 12 7"
                stroke={accent}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: step >= 1 ? 1 : 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
              />
            </svg>
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: "8rem",
              height: "1px",
              background:
                "linear-gradient(to left, transparent, rgba(247,241,230,0.3))",
            }}
          />
        </motion.div>

        {/* Generated row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: step >= 1 ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.85rem",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.65rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: accent,
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <span
              style={{
                width: "0.45rem",
                height: "0.45rem",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
              }}
            />
            <EditableText path="generatedEyebrow" value={generatedEyebrow}>
              {generatedEyebrow}
            </EditableText>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${images.length}, 1fr)`,
              gap: "clamp(0.8rem, 1.5vw, 1.4rem)",
              width: "100%",
              flex: 1,
              minHeight: 0,
            }}
          >
            {images.map((img, i) => {
              const visible = step >= 2 + i;
              const tilt = ((i - (images.length - 1) / 2) * 1.5).toFixed(2);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 18, scale: 0.95 }}
                  animate={{
                    opacity: visible ? 1 : 0,
                    y: visible ? 0 : 18,
                    scale: visible ? 1 : 0.95,
                  }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                    transform: `rotate(${tilt}deg)`,
                    transformOrigin: "center top",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "3px",
                      overflow: "hidden",
                      boxShadow:
                        "0 18px 36px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(247,241,230,0.08)",
                      background: "rgba(247,241,230,0.04)",
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.title || `Genererad bild ${i + 1}`}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    {/* Liten siffer-stamp i hörnet */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0.5rem",
                        left: "0.5rem",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.55rem",
                        letterSpacing: "0.18em",
                        color: "rgba(245,246,250,0.92)",
                        background: "rgba(15,13,16,0.7)",
                        padding: "0.18rem 0.42rem",
                        borderRadius: "2px",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>
                  {img.title || img.description ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "0 0.4rem",
                      }}
                    >
                      {img.title ? (
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            color: "var(--text)",
                            letterSpacing: "-0.005em",
                          }}
                        >
                          <EditableText
                            path={`images[${i}].title`}
                            value={img.title}
                          >
                            {img.title}
                          </EditableText>
                        </div>
                      ) : null}
                      {img.description ? (
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontStyle: "italic",
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            marginTop: "0.15rem",
                            lineHeight: 1.35,
                          }}
                        >
                          <EditableText
                            path={`images[${i}].description`}
                            value={img.description}
                          >
                            {img.description}
                          </EditableText>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Closing */}
      {closing ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{
            opacity: step >= images.length + 2 ? 1 : 0,
            y: step >= images.length + 2 ? 0 : 6,
          }}
          transition={{ duration: 0.7 }}
          style={{
            position: "absolute",
            bottom: "clamp(0.8rem, 2vh, 1.4rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.85rem, 1.1vw, 1rem)",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "40em",
            padding: "0 1rem",
          }}
        >
          <EditableText path="closing" value={closing ?? ""}>{closing}</EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
