"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

/**
 * CodeOverVideo ★ — filmen bär sliden, texten ligger ovanpå.
 *
 * Till skillnad från CodeGeneration, som delar ytan mellan video och kod,
 * spelar videon här i HELSKÄRM bakom allt. Prompten, förklaringen och den
 * framtypade koden ligger i en frostad panel till vänster. Panelen har
 * ingen skarp kant — den tonar ut mot höger med en mask, så filmen syns
 * igenom och publiken kan följa vad som händer i den.
 *
 * Knappen uppe till höger fäller undan panelen helt. Under föreläsning kan
 * man då dra allt fokus till filmen och sedan ta tillbaka texten.
 *
 * ```mdx
 * <CodeOverVideo
 *   eyebrow="Lucka 6 · Du behöver inte vara programmerare"
 *   title="Koda fram ett stöd"
 *   subtitle="Bionic reading: feta första halvan av varje ord."
 *   bionicSubtitle
 *   prompt="Skriv en liten webbsida som gör om text till bionic reading."
 *   videoSrc="/videos/…/bionic-reading.mp4"
 * >
 * ```js
 * function bionic(text) { … }
 * ```
 * </CodeOverVideo>
 * ```
 */

interface CodeOverVideoProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** Rendera underrubriken som bionic reading — halva ordet fetstilt. */
  bionicSubtitle?: boolean;
  /** Prompten som skickades till AI:n. */
  prompt?: string;
  /** Videon som fyller hela sliden. */
  videoSrc?: string;
  /** "cover" fyller ytan (default), "contain" visar hela bildrutan. */
  videoFit?: "cover" | "contain";
  /**
   * Var i bildrutan beskärningen ska landa. Default "left center" — då
   * skjuts filmens innehåll så långt åt höger som möjligt, bort från
   * panelen. Sätt "center" om motivet sitter mitt i bilden.
   */
  videoPosition?: string;
  /** Tecken per sekund när koden typas fram. */
  codeSpeed?: number;
  /** Panelens bredd. Håll den smal — filmen ska bära sliden. */
  panelWidth?: string;
  children?: ReactNode;
}

function extractCode(children: ReactNode): string {
  // MDX ger kodblock som <pre><code>…</code></pre>; vi vill åt råtexten.
  const walk = (node: ReactNode): string => {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(walk).join("");
    if (node && typeof node === "object" && "props" in node) {
      return walk((node as { props?: { children?: ReactNode } }).props?.children);
    }
    return "";
  };
  return walk(children).replace(/^\n+|\n+$/g, "");
}

/**
 * Panelen är alltid mörkt glas, oavsett tema. Temats egna tokens duger
 * därför inte: på ett ljust tema som dagsljus är `--accent` mörkgrön
 * (#15692b) för att synas mot vitt, och försvinner helt här. `--accent-bright`
 * är den ljusa tvillingen (#34c759) och faller tillbaka på `--accent` för
 * mörka teman, där accenten redan är ljus.
 */
const INK = "#FCFDFF";
const INK_SOFT = "rgba(252,253,255,0.62)";
const INK_FAINT = "rgba(252,253,255,0.5)";
const ACCENT = "var(--accent-bright, var(--accent))";

/**
 * Bionic reading: fetare första halva, ljusare andra halva.
 *
 * OBS: här måste det vara <span>, inte <strong>. globals.css färgar alla
 * <strong> med temats accent — på dagsljus mörkgrönt bläck plus ett
 * grönt markörsvep, byggt för mörk text på ljus botten. Mot mörkt glas blir
 * det oläsligt. Kontrasten görs i stället inom den ljusa skalan, vilket är
 * hela poängen med bionic reading.
 */
function renderBionic(text: string) {
  return text.split(/(\s+)/).map((part, i) => {
    if (!part.trim()) return <span key={i}>{part}</span>;
    const n = Math.ceil(part.length / 2);
    return (
      <span key={i} style={{ whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 700, color: INK }}>{part.slice(0, n)}</span>
        <span style={{ fontWeight: 400, color: INK_SOFT }}>{part.slice(n)}</span>
      </span>
    );
  });
}

export function CodeOverVideo({
  eyebrow,
  title,
  subtitle,
  bionicSubtitle = false,
  prompt,
  videoSrc,
  videoFit = "cover",
  videoPosition = "left center",
  codeSpeed = 26,
  panelWidth = "min(52%, 40rem)",
  children,
}: CodeOverVideoProps) {
  const code = extractCode(children);
  const [panelOpen, setPanelOpen] = useState(true);
  const [typedChars, setTypedChars] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  // Koden typas fram i realtid, och pausar på riktigt när panelen fälls
  // undan: den samlade speltiden sparas i elapsedRef, så typningen fortsätter
  // där den var när texten kommer tillbaka i stället för att hoppa till slutet.
  useEffect(() => {
    if (!code || !panelOpen) return;
    startRef.current = null;
    const step = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = elapsedRef.current + (ts - startRef.current) / 1000;
      const target = Math.min(Math.floor(elapsed * codeSpeed), code.length);
      setTypedChars(target);
      if (target < code.length) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (startRef.current != null) {
        elapsedRef.current += (performance.now() - startRef.current) / 1000;
        startRef.current = null;
      }
    };
  }, [code, codeSpeed, panelOpen]);

  const typed = code.slice(0, typedChars);
  const caret = typedChars < code.length;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "#07070a" }}>
      {/* Videon — hela ytan, bakom allt */}
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: videoFit,
            objectPosition: videoPosition,
            zIndex: 0,
          }}
        />
      ) : null}

      {/* Panelen. Ingen kant, ingen ruta — en frostad yta som tonar ut mot
          höger så videon fortsätter synas igenom. */}
      <AnimatePresence>
        {panelOpen ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              width: panelWidth,
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "clamp(0.75rem, 1.5vh, 1.2rem)",
              padding: "clamp(2rem, 3.4vw, 3.4rem)",
              // Stor högermarginal med flit: texten ska sluta INNAN masken
              // börjar tona ut, annars hamnar ljus text på ljus film.
              paddingRight: "clamp(4.5rem, 9vw, 9rem)",
              color: INK,
              // Frostat glas utan kant. Bakgrunden mörknar där texten står
              // och masken löser upp panelen mot höger, så filmen tar över
              // gradvis i stället för att mötas av en ruta.
              background:
                "linear-gradient(90deg, rgba(8,8,12,0.9) 0%, rgba(8,8,12,0.84) 62%, rgba(8,8,12,0) 100%)",
              backdropFilter: "blur(16px) saturate(118%)",
              WebkitBackdropFilter: "blur(16px) saturate(118%)",
              maskImage:
                "linear-gradient(90deg, black 0%, black 80%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(90deg, black 0%, black 80%, transparent 100%)",
            }}
          >
            {eyebrow ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.66rem, 0.92vw, 0.88rem)",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: INK_FAINT,
                }}
              >
                <EditableText path="eyebrow" value={eyebrow}>
                  {eyebrow}
                </EditableText>
              </div>
            ) : null}

            {title ? (
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(1.7rem, 2.9vw, 2.8rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  color: INK,
                }}
              >
                <EditableText path="title" value={title}>
                  {title}
                </EditableText>
              </h2>
            ) : null}

            {subtitle ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1.02rem, 1.55vw, 1.4rem)",
                  lineHeight: 1.45,
                  margin: 0,
                  color: INK,
                }}
              >
                <EditableText path="subtitle" value={subtitle}>
                  {bionicSubtitle ? renderBionic(subtitle) : subtitle}
                </EditableText>
              </p>
            ) : null}

            {/* Prompten som en riktig chattruta — det är ju så Joel skrev den.
                Samma formspråk som PromptInput, men i mörk variant. */}
            {prompt ? (
              <div
                style={{
                  marginTop: "0.35rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.82vw, 0.76rem)",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: INK_FAINT,
                  }}
                >
                  Du skriver
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "0.85rem",
                    padding: "clamp(0.85rem, 1.5vw, 1.3rem) clamp(1rem, 1.7vw, 1.5rem)",
                    borderRadius: "1.1rem",
                    background: "rgba(255,255,255,0.09)",
                    border: `1px solid ${ACCENT}`,
                    boxShadow: `0 0 0 4px rgba(52,199,89,0.09), 0 18px 40px -22px rgba(0,0,0,0.8)`,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.98rem, 1.42vw, 1.28rem)",
                      lineHeight: 1.4,
                      color: INK,
                    }}
                  >
                    <EditableText path="prompt" value={prompt}>
                      {prompt}
                    </EditableText>
                  </span>
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "clamp(1.8rem, 2.6vw, 2.3rem)",
                      height: "clamp(1.8rem, 2.6vw, 2.3rem)",
                      borderRadius: "999px",
                      background: ACCENT,
                      color: "#07130b",
                    }}
                  >
                    <svg
                      width="60%"
                      height="60%"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </span>
                </div>
              </div>
            ) : null}

            {code ? (
              <pre
                style={{
                  margin: "0.45rem 0 0",
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.76rem, 1.05vw, 0.98rem)",
                  lineHeight: 1.6,
                  color: INK_SOFT,
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  maxHeight: "34vh",
                  // Reservera hela kodblockets höjd direkt. Annars växer det
                  // medan typningen pågår, och eftersom panelen är centrerad
                  // kryper rubriken uppåt under hela sliden.
                  minHeight: `${code.split("\n").length * 1.6}em`,
                }}
              >
                {typed}
                {caret ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: "0.5em",
                      background: ACCENT,
                    }}
                  >
                    &nbsp;
                  </span>
                ) : null}
              </pre>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Fäll undan panelen och låt filmen ta över */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        title={
          panelOpen
            ? "Dölj texten och visa filmen i helskärm"
            : "Visa texten igen"
        }
        aria-label={panelOpen ? "Maximera filmen" : "Visa texten igen"}
        style={{
          position: "absolute",
          top: "clamp(1.2rem, 2.4vh, 2rem)",
          right: "clamp(1.2rem, 2.4vw, 2rem)",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.42rem 0.75rem",
          borderRadius: "999px",
          border: "1px solid rgba(245,246,250,0.28)",
          background: "rgba(8,8,12,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "rgba(245,246,250,0.92)",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.6rem, 0.78vw, 0.72rem)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {panelOpen ? (
            <>
              <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" />
            </>
          ) : (
            <>
              <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
            </>
          )}
          {panelOpen ? null : <rect x="8" y="8" width="8" height="8" rx="1" />}
        </svg>
        {panelOpen ? "Maximera film" : "Visa text"}
      </button>
    </div>
  );
}
