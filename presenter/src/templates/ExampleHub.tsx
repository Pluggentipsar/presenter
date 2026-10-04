"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { unwrapLazy } from "@/lib/extract-text";

interface ExampleHubProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  /** Etikett på husknappen i detaljvyn. Default "Alla exempel". */
  homeLabel?: string;
  /** Antal kolumner i hub-rutnätet. Default 3. */
  columns?: number | string;
  accent?: string;
  background?: string;
  /**
   * Markdown-lista. En rad per exempel, fält separerade med " · ":
   *   Titel · Ämne · Kort beskrivning · /video/sokvag.mp4 · Prompt (valfri)
   */
  children?: ReactNode;
}

interface Example {
  title: string;
  subject: string;
  blurb: string;
  video?: string;
  prompt?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseExamples(children: ReactNode): Example[] {
  const rows: string[] = [];
  const pushLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (raw) rows.push(raw);
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          pushLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      pushLi(el);
    }
  });
  return rows.map((row) => {
    const p = row.split(/\s*·\s*/);
    return {
      title: (p[0] ?? "").trim(),
      subject: (p[1] ?? "").trim(),
      blurb: (p[2] ?? "").trim(),
      video: (p[3] ?? "").trim() || undefined,
      prompt: (p[4] ?? "").trim() || undefined,
    };
  });
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <path d="M15 18 9 12l6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

const num = (i: number) => String(i + 1).padStart(2, "0");

export function ExampleHub({
  kicker,
  title,
  subtitle,
  homeLabel = "Alla exempel",
  columns = 3,
  accent = "var(--accent)",
  background,
  children,
}: ExampleHubProps) {
  const examples = parseExamples(children);
  const n = examples.length;
  const [active, setActive] = useState<number | null>(null);
  const cols = typeof columns === "string" ? parseInt(columns, 10) : columns;

  // Tangent-/klickerstöd ENBART när ett exempel är öppet. Capture-fas så vi
  // vinner över SlideViewerns window-keydown (annars bläddrar hela decken).
  // På hub-vyn (active === null) lämnar vi pilarna åt decken.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowRight" || k === "PageDown") {
        e.preventDefault(); e.stopImmediatePropagation();
        setActive((a) => (a === null ? a : (a + 1) % n));
      } else if (k === "ArrowLeft" || k === "PageUp") {
        e.preventDefault(); e.stopImmediatePropagation();
        setActive((a) => (a === null ? a : (a - 1 + n) % n));
      } else if (k === "Escape") {
        e.preventDefault(); e.stopImmediatePropagation();
        setActive(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active, n]);

  // Foto-scrim följer temat: tonar mot --bg (mörk på mörka teman, ljus på ljusa)
  // så att temats text- och kortfärger behåller kontrast i båda lägena.
  const bg =
    background && (background.startsWith("/") || background.startsWith("http"))
      ? `linear-gradient(color-mix(in srgb, var(--bg) 78%, transparent), color-mix(in srgb, var(--bg) 90%, transparent)), url('${background}') center/cover no-repeat`
      : background || "var(--slide-base, var(--bg))";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      <AnimatePresence mode="wait">
        {active === null ? (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative flex h-full w-full flex-col"
            style={{ padding: "clamp(2rem, 3.5vw, 3.5rem)", gap: "clamp(1rem, 2vh, 1.5rem)" }}
          >
            {/* Header */}
            <div className="flex flex-col gap-1.5" style={{ flexShrink: 0, maxWidth: "48em" }}>
              {kicker ? (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem,0.85vw,0.9rem)", letterSpacing: "0.32em", textTransform: "uppercase", color: accent, fontWeight: 600 }}>
                  {kicker}
                </div>
              ) : null}
              {title ? (
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.8rem,3.2vw,2.8rem)", lineHeight: 1, letterSpacing: "-0.02em", color: "var(--text)", margin: 0 }}>
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "clamp(0.9rem,1.1vw,1.15rem)", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                  {subtitle}
                </p>
              ) : null}
            </div>

            {/* Rutnät av klickbara kort */}
            <div className="flex-1" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "clamp(0.6rem,1vw,1rem)", alignContent: "center" }}>
              {examples.map((ex, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 + ((i % cols) + Math.floor(i / cols)) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3 }}
                  className="group"
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    padding: "clamp(0.85rem,1.1vw,1.15rem)",
                    borderRadius: "0.7rem",
                    background: "var(--bg-elevated)",
                    backdropFilter: "blur(14px) saturate(140%)",
                    WebkitBackdropFilter: "blur(14px) saturate(140%)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 6px 18px -8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)",
                    color: "var(--text)",
                    font: "inherit",
                  }}
                >
                  <div className="flex items-center justify-between" style={{ width: "100%" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.18em", color: accent, fontWeight: 700 }}>{num(i)}</span>
                    <span style={{ color: accent, opacity: 0.5, display: "inline-flex" }}><Chevron dir="right" /></span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1rem,1.25vw,1.3rem)", lineHeight: 1.1, color: "var(--text)" }}>{ex.title}</div>
                  {ex.subject ? (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)" }}>{ex.subject}</div>
                  ) : null}
                  {ex.blurb ? (
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.74rem,0.84vw,0.88rem)", color: "var(--text-muted)", lineHeight: 1.35 }}>{ex.blurb}</div>
                  ) : null}
                </motion.button>
              ))}
            </div>

            <div style={{ flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", opacity: 0.7 }}>
              Klicka ett exempel · {n} stycken
            </div>
          </motion.div>
        ) : (
          <Detail
            key={`detail-${active}`}
            ex={examples[active]}
            index={active}
            total={n}
            accent={accent}
            homeLabel={homeLabel}
            onHome={() => setActive(null)}
            onPrev={() => setActive((a) => (a === null ? a : (a - 1 + n) % n))}
            onNext={() => setActive((a) => (a === null ? a : (a + 1) % n))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Detaljvyn följer CodeOverVideo-mönstret: filmen bär HELA sliden, texten
 * ligger i en frostad mörk panel nere till vänster som tonar ut åt höger.
 * Panelen är alltid mörkt glas oavsett tema — därför INK-konstanterna och
 * `--accent-bright` (ljusa accent-tvillingen på ljusa teman).
 */
const INK = "#FCFDFF";
const INK_SOFT = "rgba(252,253,255,0.68)";
const DETAIL_ACCENT = "var(--accent-bright, var(--accent))";

function Detail({
  ex, index, total, homeLabel, onHome, onPrev, onNext,
}: {
  ex: Example; index: number; total: number; accent: string; homeLabel: string;
  onHome: () => void; onPrev: () => void; onNext: () => void;
}) {
  const pill: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: "0.45rem",
    padding: "0.45rem 0.8rem", borderRadius: "999px", cursor: "pointer",
    background: "rgba(10,9,8,0.55)", border: "1px solid rgba(252,253,255,0.22)",
    color: INK, font: "inherit", fontFamily: "var(--font-mono)",
    fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase",
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
  };
  const pad = "clamp(1.5rem, 3vw, 3rem)";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#0a0908" }}
    >
      {/* Filmen bär hela sliden */}
      {ex.video ? (
        <video
          src={ex.video}
          autoPlay
          loop
          muted
          playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
        />
      ) : null}

      {/* Scrim: vänster + botten, så overlayn läser mot ljusa inspelningar */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1,
          background:
            "linear-gradient(90deg, rgba(10,9,8,0.62) 0%, rgba(10,9,8,0.34) 30%, rgba(10,9,8,0) 58%), linear-gradient(0deg, rgba(10,9,8,0.72) 0%, rgba(10,9,8,0.28) 26%, rgba(10,9,8,0) 46%)",
        }}
      />

      {/* Toppbar: hem + bläddring */}
      <div className="flex items-center justify-between" style={{ position: "absolute", top: pad, left: pad, right: pad, zIndex: 3 }}>
        <button type="button" onClick={onHome} style={pill}><HomeIcon /> {homeLabel}</button>
        <div className="flex items-center" style={{ gap: "0.6rem" }}>
          <button type="button" aria-label="Föregående" onClick={onPrev} style={{ ...pill, padding: "0.45rem" }}><Chevron dir="left" /></button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.15em", color: INK_SOFT, textShadow: "0 1px 8px rgba(10,9,8,0.6)" }}>{num(index)} / {num(total - 1)}</span>
          <button type="button" aria-label="Nästa" onClick={onNext} style={{ ...pill, padding: "0.45rem" }}><Chevron dir="right" /></button>
        </div>
      </div>

      {/* Textpanel nere till vänster — tonar ut åt höger som CodeOverVideo */}
      <div
        className="flex flex-col"
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2,
          padding: `clamp(2.2rem, 4vh, 3.4rem) ${pad} ${pad}`,
          gap: "0.7rem",
          maxWidth: "min(58%, 44rem)",
          WebkitMaskImage: "linear-gradient(90deg, black 78%, transparent 100%)",
          maskImage: "linear-gradient(90deg, black 78%, transparent 100%)",
        }}
      >
        <div className="flex items-baseline" style={{ gap: "0.8rem" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.2em", color: DETAIL_ACCENT, fontWeight: 700 }}>{num(index)}</span>
          {ex.subject ? (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", color: INK_SOFT }}>{ex.subject}</span>
          ) : null}
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(1.9rem, 3.4vw, 3.2rem)", lineHeight: 1.02, letterSpacing: "-0.02em", color: INK, margin: 0, textShadow: "0 2px 24px rgba(10,9,8,0.55)" }}>{ex.title}</h1>
        {ex.blurb ? (
          <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.95rem, 1.15vw, 1.15rem)", lineHeight: 1.45, color: INK_SOFT, margin: 0, maxWidth: "34em", textShadow: "0 1px 12px rgba(10,9,8,0.5)" }}>{ex.blurb}</p>
        ) : null}
        {ex.prompt ? (
          <div style={{ marginTop: "0.25rem", alignSelf: "flex-start", background: "rgba(252,253,255,0.94)", color: "#0a0908", padding: "0.75rem 1.05rem", borderRadius: "1.15rem", borderBottomLeftRadius: "0.3rem", fontFamily: "var(--font-body)", fontSize: "clamp(0.8rem, 0.95vw, 1rem)", lineHeight: 1.4, boxShadow: "0 18px 40px -18px rgba(0,0,0,0.6)", maxWidth: "36em" }}>{ex.prompt}</div>
        ) : null}
      </div>
    </motion.div>
  );
}
