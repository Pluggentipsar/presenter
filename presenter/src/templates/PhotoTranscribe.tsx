"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface PhotoTranscribeProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  closing?: string;
  /** Bildens src — handskrivna anteckningar e.dyl. */
  photoSrc: string;
  photoAlt?: string;
  /** Liten bildtext under fotot, t.ex. "Sida 1 & 2 · 27 maj 2024". */
  photoCaption?: string;
  /** Rotation i grader (default -2 för "lagt på bordet"-känsla). */
  photoRotation?: number | string;
  /** Eyebrow ovanför outputen, t.ex. "MÖTESPROTOKOLL". */
  outputEyebrow?: string;
  /** Rubrik på output-sidan. */
  outputTitle?: string;
  /** Etikett för prompt-strippen längst ner. Tom = göm. */
  promptLabel?: string;
  /** Prompttext. Tom = göm hela strippen. */
  prompt?: string;
  background?: string;
  overlay?: number | string;
  accent?: string;
  /**
   * Markdown-lista. Varje rad blir en output-rad i protokollet:
   *
   *     - Datum · 2024-05-27 · 09:00–11:30
   *     - Plats · Konferensrum Eken / Teams
   *     - **Beslut** · Ny mötesmall klar till nästa möte
   *
   * Format per rad:
   *   `- label · värde` (två-kolumns)  eller
   *   `- **label** · värde` (label markeras starkare)  eller
   *   `- värde` (full-bredd, t.ex. en åtgärdspunkt)
   */
  children?: ReactNode;
}

interface ProtocolRow {
  label: string;
  value: string;
  strong: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
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

function parseRows(children: ReactNode): ProtocolRow[] {
  const rows: ProtocolRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    if (parts.length >= 2) {
      const labelRaw = parts[0].trim();
      const value = parts.slice(1).join(" · ").trim();
      const strong = /^\*\*.*\*\*$/.test(labelRaw);
      const label = labelRaw.replace(/^\*\*|\*\*$/g, "");
      rows.push({ label, value, strong });
    } else {
      rows.push({ label: "", value: raw, strong: false });
    }
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
  return rows;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (!p) return null;
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
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
 * PhotoTranscribe — visar en bild (typiskt handskrivna anteckningar) på
 * vänster sida och en strukturerad output (mötesprotokoll, åtgärdslista,
 * sammanfattning) på höger.
 *
 * Pedagogiskt syfte: visa AI som *seende* — inte bara läsande. Bilden
 * tilltas lite och får skuggor så det känns som ett papper på ett bord.
 *
 * Steppning:
 *   step 0 — bara fotot syns
 *   step 1 — output-eyebrow + titel rullar in
 *   step 2 — protokollraderna fadar in en efter en
 *   step 3 — closing
 */
export function PhotoTranscribe({
  chapter,
  title,
  subtitle,
  closing,
  photoSrc,
  photoAlt,
  photoCaption,
  photoRotation = -2,
  outputEyebrow = "RESULTAT",
  outputTitle,
  promptLabel = "PROMPT",
  prompt,
  background,
  overlay,
  accent = "#B4763A",
  children,
}: PhotoTranscribeProps) {
  const rows = useMemo(() => parseRows(children), [children]);
  // step går från 0 → rows.length + 2 (output reveal + closing)
  const step = useSlideSteps(rows.length + 3);
  const rotation =
    typeof photoRotation === "string"
      ? parseFloat(photoRotation)
      : photoRotation ?? -2;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      data-no-avsandar-footer
      style={{ background: resolveBackground(background, overlay ?? 0.7) }}
    >
      {/* Atmosfärs-glow bakom fotot */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%",
          left: "5%",
          width: "55%",
          height: "60%",
          background: `radial-gradient(ellipse, ${withAlpha(accent, 0.13)} 0%, transparent 70%)`,
          zIndex: 1,
        }}
      />

      {/* Header */}
      <div
        className="absolute"
        style={{
          top: "clamp(2rem, 4vh, 3.5rem)",
          left: "clamp(2rem, 5vw, 4.5rem)",
          right: "clamp(2rem, 5vw, 4.5rem)",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          gap: "0.65rem",
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
              fontSize: "clamp(1.6rem, 3.4vw, 2.85rem)",
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
              fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
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

      {/* Main grid */}
      <div
        className="absolute"
        style={{
          top: "clamp(11rem, 22vh, 14rem)",
          bottom: prompt ? "clamp(7rem, 14vh, 9rem)" : "clamp(3rem, 6vh, 4.5rem)",
          left: "clamp(2rem, 5vw, 4.5rem)",
          right: "clamp(2rem, 5vw, 4.5rem)",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "clamp(1rem, 2.5vw, 2.5rem)",
          zIndex: 3,
        }}
      >
        {/* LEFT: Fotot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotate: rotation - 4 }}
          animate={{ opacity: 1, scale: 1, rotate: rotation }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            justifySelf: "center",
            maxWidth: "100%",
          }}
        >
          {/* Tape-detalj uppe i hörnen för att förstärka pappers-känslan */}
          <div
            style={{
              position: "absolute",
              top: "-0.8rem",
              left: "8%",
              width: "3.5rem",
              height: "1.1rem",
              background: "var(--text-muted)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              transform: "rotate(-3deg)",
              zIndex: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "-0.7rem",
              right: "12%",
              width: "3rem",
              height: "1rem",
              background: "var(--text-muted)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              transform: "rotate(4deg)",
              zIndex: 4,
            }}
          />
          <img
            src={photoSrc}
            alt={photoAlt ?? "Fotograferad anteckning"}
            style={{
              display: "block",
              width: "100%",
              maxHeight: "min(58vh, 38rem)",
              objectFit: "contain",
              borderRadius: "2px",
              boxShadow:
                "0 30px 60px rgba(0,0,0,0.55), 0 12px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(247,241,230,0.06)",
              background: "#fff",
            }}
          />
          {photoCaption ? (
            <div
              style={{
                marginTop: "0.85rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                textAlign: "center",
              }}
            >
              <EditableText path="photoCaption" value={photoCaption}>
                {photoCaption}
              </EditableText>
            </div>
          ) : null}
        </motion.div>

        {/* MIDDLE: Pil + AI-etikett */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: step >= 1 ? 1 : 0.3, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.7rem",
            color: accent,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.6rem",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              writingMode: "vertical-rl",
            }}
          >
            AI ser och strukturerar
          </div>
          <svg width="24" height="40" viewBox="0 0 24 40" fill="none">
            <motion.path
              d="M 12 2 L 12 32 M 4 24 L 12 32 L 20 24"
              stroke={accent}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, delay: 0.6 }}
              style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
            />
          </svg>
        </motion.div>

        {/* RIGHT: Output / protokoll */}
        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : 14 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            background: "var(--bg-elevated)",
            border: "1px solid rgba(127,127,127,0.18)",
            borderRadius: "4px",
            padding: "clamp(1.2rem, 2vw, 1.8rem)",
            backdropFilter: "blur(8px)",
            maxHeight: "min(58vh, 38rem)",
            overflow: "auto",
          }}
        >
          {/* Eyebrow */}
          {outputEyebrow ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "0.6rem",
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
              <EditableText path="outputEyebrow" value={outputEyebrow}>
                {outputEyebrow}
              </EditableText>
            </div>
          ) : null}
          {outputTitle ? (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.1rem, 1.6vw, 1.4rem)",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "1rem",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              <EditableText path="outputTitle" value={outputTitle}>
                {outputTitle}
              </EditableText>
            </div>
          ) : null}
          {/* Linje */}
          <div
            style={{
              width: "100%",
              height: "1px",
              background:
                "linear-gradient(to right, rgba(127,127,127,0.35), transparent)",
              marginBottom: "0.9rem",
            }}
          />
          {/* Rader */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {rows.map((row, i) => {
              const visible = step >= 2 + Math.min(i, rows.length - 1);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{
                    opacity: visible ? 1 : 0,
                    y: visible ? 0 : 4,
                  }}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: row.label ? "grid" : "block",
                    gridTemplateColumns: row.label ? "9rem 1fr" : "1fr",
                    gap: "1rem",
                    paddingBottom: "0.6rem",
                    borderBottom:
                      i < rows.length - 1
                        ? "1px solid rgba(127,127,127,0.16)"
                        : "none",
                  }}
                >
                  {row.label ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.66rem",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: row.strong ? accent : "var(--text-muted)",
                        paddingTop: "0.18em",
                      }}
                    >
                      <EditableText path={`rows[${i}].label`} value={row.label}>
                        {row.label}
                      </EditableText>
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.95rem",
                      lineHeight: 1.5,
                      color: row.label ? "var(--text)" : "var(--text)",
                      fontStyle: row.label ? "normal" : "italic",
                    }}
                  >
                    <EditableText path={`rows[${i}].value`} value={row.value}>
                      {renderInline(row.value, accent)}
                    </EditableText>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Prompt strip nederst */}
      {prompt ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 8 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            position: "absolute",
            bottom: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(2rem, 5vw, 4.5rem)",
            right: "clamp(2rem, 5vw, 4.5rem)",
            zIndex: 4,
            background: "var(--bg-elevated)",
            border: "1px solid rgba(127,127,127,0.16)",
            borderLeft: `3px solid ${accent}`,
            borderRadius: "3px",
            padding: "0.85rem 1.2rem",
            backdropFilter: "blur(10px)",
          }}
        >
          {promptLabel ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.6rem",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "0.3rem",
              }}
            >
              <EditableText path="promptLabel" value={promptLabel}>
                {promptLabel}
              </EditableText>
            </div>
          ) : null}
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
              lineHeight: 1.45,
              color: "var(--text)",
              whiteSpace: "pre-wrap",
            }}
          >
            <EditableText path="prompt" value={prompt}>{prompt}</EditableText>
          </div>
        </motion.div>
      ) : null}

      {/* Closing */}
      {closing ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: step >= rows.length + 2 ? 1 : 0 }}
          transition={{ duration: 0.7 }}
          style={{
            position: "absolute",
            bottom: prompt
              ? "clamp(8rem, 16vh, 11rem)"
              : "clamp(1rem, 2vh, 1.6rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4,
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)",
            color: "var(--text-muted)",
            textAlign: "center",
            maxWidth: "36em",
            padding: "0 1rem",
          }}
        >
          <EditableText path="closing" value={closing ?? ""}>{closing}</EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
