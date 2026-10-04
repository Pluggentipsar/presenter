"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ToolHub — klickbar verktygshubb med "utbrutna" detaljsidor. Rutnät av kort;
 * klick på ett kort öppnar en overlay som visar verktygets innehåll (prompt,
 * bilder, skärmbild + ljudspelare, video, eller en "öppna live"-länk). Klick
 * på × eller utanför panelen stänger. Tänk: en hubb man dyker in i och ut ur,
 * inte linjära slides.
 *
 * Children — en rad per verktyg, fält separerade med `||`:
 *   `Etikett || Verktyg || key:value || key:value ...`
 * keys: `img` (kan upprepas), `shot` (skärmbild), `audio`, `video`, `link`,
 *       `info`, `prompt`. (Värdet splittas på FÖRSTA kolon — URL:er funkar.)
 *
 * ```mdx
 * <ToolHub chapter="§ Bygg material" title="Verktygen — klicka och utforska">
 * - Bild || Gemini || img:/a.png || img:/b.png || info:… || prompt:Skapa…
 * - Podd || NotebookLM || link:https://… || info:Visas live.
 * </ToolHub>
 * ```
 */

interface Tool {
  label: string;
  tool: string;
  imgs: string[];
  shot?: string;
  audio?: string;
  video?: string;
  link?: string;
  info?: string;
  prompt?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

function parseTools(children: ReactNode): Tool[] {
  const out: Tool[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*\|\|\s*/);
    if (parts.length < 2) return;
    const t: Tool = { label: parts[0].trim(), tool: parts[1].trim(), imgs: [] };
    for (const seg of parts.slice(2)) {
      const ci = seg.indexOf(":");
      if (ci < 0) continue;
      const key = seg.slice(0, ci).trim();
      const val = seg.slice(ci + 1).trim();
      if (key === "img") t.imgs.push(val);
      else if (key === "shot") t.shot = val;
      else if (key === "audio") t.audio = val;
      else if (key === "video") t.video = val;
      else if (key === "link") t.link = val;
      else if (key === "info") t.info = val;
      else if (key === "prompt") t.prompt = val;
    }
    out.push(t);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") walkLi(li as ReactElement<{ children?: ReactNode }>);
      });
    } else if (el.type === "li") walkLi(el);
  });
  return out;
}

export function ToolHub({
  chapter,
  title,
  subtitle,
  accent = "var(--accent)",
  background,
  children,
}: {
  chapter?: string;
  title?: string;
  subtitle?: string;
  accent?: string;
  background?: string;
  children?: ReactNode;
}) {
  const tools = parseTools(children);
  const [open, setOpen] = useState<number | null>(null);
  const active = open != null ? tools[open] : null;

  const bg = background
    ? (background.startsWith("/") || background.startsWith("http")
        ? `linear-gradient(rgba(10,9,8,0.72), rgba(10,9,8,0.84)), url('${background}') center/cover no-repeat`
        : background)
    : "var(--slide-base, var(--bg))";

  const promptCard: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.8rem, 1vw, 1rem)",
    lineHeight: 1.5,
    color: "var(--text)",
    background: "color-mix(in srgb, var(--bg-surface) 70%, transparent)",
    border: `1px solid ${withAlpha(accent, 0.4)}`,
    borderRadius: "var(--radius)",
    padding: "clamp(0.9rem, 1.4vw, 1.3rem)",
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      <div className="relative flex h-full w-full flex-col" style={{ padding: "clamp(2.2rem, 4vw, 4.5rem)", gap: "clamp(1rem, 2vh, 1.6rem)", zIndex: 2 }}>
        {/* Header */}
        <div className="flex flex-col" style={{ gap: "0.5rem", maxWidth: "44em" }}>
          {chapter ? <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--text-muted)" }}>{chapter}</div> : null}
          {title ? <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)", fontSize: "clamp(1.9rem, 3.6vw, 3rem)", lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>{title}</h2> : null}
          {subtitle ? <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.95rem, 1.2vw, 1.2rem)", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{subtitle}</p> : null}
        </div>

        {/* Kort-rutnät */}
        <div className="flex-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "clamp(0.8rem, 1.5vw, 1.4rem)", alignContent: "center" }}>
          {tools.map((t, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(i); }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.07 }}
              whileHover={{ y: -4 }}
              style={{
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "var(--radius)",
                border: `1px solid ${withAlpha(accent, 0.18)}`,
                background: "color-mix(in srgb, var(--bg-surface) 60%, transparent)",
                backdropFilter: "blur(8px)",
                boxShadow: `0 20px 50px -30px ${withAlpha(accent, 0.4)}`,
                padding: "clamp(1.1rem, 1.8vw, 1.6rem)",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                minHeight: "8rem",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>{t.label}</span>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "clamp(1.3rem, 1.9vw, 1.75rem)", color: "var(--text)", lineHeight: 1.1 }}>{t.tool}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: accent }}>Öppna →</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Detalj-overlay */}
      <AnimatePresence>
        {active ? (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 40, padding: "clamp(1.5rem, 3vw, 3rem)", background: "rgba(6,5,8,0.7)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: "min(64rem, 94%)",
                maxHeight: "88%",
                overflow: "auto",
                borderRadius: "var(--radius)",
                border: `1px solid ${withAlpha(accent, 0.45)}`,
                background: "color-mix(in srgb, var(--bg-surface) 88%, transparent)",
                backdropFilter: "blur(16px)",
                boxShadow: `0 50px 110px -30px ${withAlpha(accent, 0.5)}`,
                padding: "clamp(1.5rem, 3vw, 2.6rem)",
              }}
            >
              {/* header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.2rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: accent }}>{active.label}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.6rem, 2.6vw, 2.3rem)", color: "var(--text)", lineHeight: 1.05 }}>{active.tool}</span>
                </div>
                <button type="button" onClick={() => setOpen(null)} aria-label="Stäng" style={{ flexShrink: 0, width: "2.4rem", height: "2.4rem", borderRadius: "999px", border: "1px solid rgba(0,0,0,0.14)", background: "color-mix(in srgb, var(--bg-elevated) 80%, transparent)", color: "var(--text)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>

              {/* prompt */}
              {active.prompt ? (
                <div style={{ marginBottom: "1.2rem" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Prompt</div>
                  <div style={promptCard}>{active.prompt}</div>
                </div>
              ) : null}

              {/* media: bilder sida vid sida */}
              {active.imgs.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: active.imgs.length > 1 ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: active.info ? "1rem" : 0 }}>
                  {active.imgs.map((src, k) => (
                    <img key={k} src={src} alt={`${active.tool} ${k + 1}`} style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid rgba(0,0,0,0.1)", objectFit: "contain", background: "rgba(0,0,0,0.2)" }} />
                  ))}
                </div>
              ) : null}

              {/* media: skärmbild + ljud */}
              {active.shot ? (
                <img src={active.shot} alt={active.tool} style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid rgba(0,0,0,0.1)", marginBottom: "1rem" }} />
              ) : null}
              {active.audio ? (
                <audio controls src={active.audio} style={{ width: "100%", marginBottom: active.info ? "1rem" : 0 }} />
              ) : null}

              {/* media: video */}
              {active.video ? (
                <video controls src={active.video} style={{ width: "100%", borderRadius: "var(--radius)", border: "1px solid rgba(0,0,0,0.1)", marginBottom: active.info ? "1rem" : 0, background: "#000" }} />
              ) : null}

              {/* länk-knapp */}
              {active.link ? (
                <a
                  href={active.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(1rem, 1.4vw, 1.3rem)",
                    color: "var(--bg)",
                    background: accent,
                    padding: "0.7rem 1.4rem",
                    borderRadius: "var(--radius)",
                    textDecoration: "none",
                    marginBottom: active.info ? "1rem" : 0,
                  }}
                >
                  Öppna {active.tool} →
                </a>
              ) : null}

              {/* info */}
              {active.info ? (
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>{active.info}</p>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
