"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RapidFire — kortstacken som byter av sig själv.
 *
 * Född i en föreläsning (2026-09-03) för "tio byggen på tre minuter":
 * ett kort per bygge, resultatbild + rubrik + en rad prompt + kräver-tagg,
 * och en räknare som driver tempot så att föreläsaren inte behöver. Varje
 * kort ligger `interval` sekunder (default 20), en tunn stapel rinner ur
 * under tiden, sedan skjuts nästa kort in från höger.
 *
 * Två steg: steg 0 är stacken (auto), steg 1 är ÖVERSIKTEN — alla kort som
 * ett rutnät, "allt det här finns i sandlådan". Piltangent tar dig alltså
 * ur stacken oavsett var räknaren är; klick på kortet byter kort för hand
 * och nollställer klockan.
 *
 * ```mdx
 * <RapidFire chapter="§ 01 · Materialet" interval={20}>
 * - Glosor i sammanhang · Skriv tio meningar där varje ord ur listan används naturligt · /bilder/x/glosor.png
 * - Sångtext · Skriv en sångtext på A2-nivå om vikingatiden · /bilder/x/sang.png · Suno
 * </RapidFire>
 * ```
 *
 * Rad = `Rubrik · prompt · bild · kräver`. Fälten är frivilliga från höger.
 * `**fet**` i rubrik/prompt → accent.
 */

interface RapidFireProps {
  chapter?: string;
  /** Sekunder per kort. Default 20. 0 = ingen klocka, bara klick. */
  interval?: number | string;
  /** Rubrik över översikten (steg 1). */
  overviewTitle?: string;
  accent?: string;
  children?: ReactNode;
}

interface Card {
  title: string;
  prompt: string;
  image: string;
  requires: string;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function toText(rawNode: ReactNode): string {
  // Flight-referens (react.lazy) över server→klient-gränsen packas upp först,
  // annars är props inte där vid upprepade besök och texten blir "".
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { type?: unknown; props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "li") return `${inner}\n`;
    return inner;
  }
  return "";
}

function parseCards(children: ReactNode): Card[] {
  return toText(children)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const [title = "", prompt = "", image = "", requires = ""] = line
        .split(/\s·\s/)
        .map((p) => p.trim());
      return { title, prompt, image, requires };
    })
    .filter((c) => c.title.length > 0);
}

function renderInline(text: string, accent: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: accent }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function RapidFire({
  chapter,
  interval = 20,
  overviewTitle = "Allt det här finns i sandlådan.",
  accent = "var(--accent)",
  children,
}: RapidFireProps) {
  const cards = parseCards(children);
  const n = cards.length;
  const step = useSlideSteps(2);
  const overview = step >= 1;
  const seconds = Math.max(0, typeof interval === "string" ? parseFloat(interval) || 0 : interval);

  const [index, setIndex] = useState(0);
  // Klockan nollställs varje gång kortet byts — därför lever "cycle" som
  // nyckel för stapelns animation: ny nyckel = ny stapel från noll.
  const [cycle, setCycle] = useState(0);
  const timer = useRef<number | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (n === 0 ? 0 : (i + 1) % n));
    setCycle((c) => c + 1);
  }, [n]);

  useEffect(() => {
    if (overview || seconds <= 0 || n <= 1) return;
    timer.current = window.setTimeout(next, seconds * 1000);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [cycle, index, overview, seconds, n, next]);

  const mono: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "clamp(0.66rem, 0.85vw, 0.9rem)",
    letterSpacing: "0.22em",
    textTransform: "uppercase",
  };

  const card = cards[index];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
      onClick={overview ? undefined : next}
    >
      {chapter ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 4rem)",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Räknaren — stor, mono, uppe till höger. Stapeln under rinner ur. */}
      {!overview && n > 0 ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.4vh, 2.8rem)",
            right: "clamp(2rem, 4vw, 4rem)",
            textAlign: "right",
            zIndex: 3,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(1.4rem, 2.6vw, 2.8rem)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            {pad(index + 1)}
            <span style={{ color: "var(--text-muted)" }}> / {pad(n)}</span>
          </div>
          {seconds > 0 ? (
            <div
              style={{
                marginTop: "0.6rem",
                marginLeft: "auto",
                width: "clamp(6rem, 12vw, 12rem)",
                height: "4px",
                background: "var(--accent-dim)",
                overflow: "hidden",
              }}
            >
              <motion.div
                key={cycle}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: seconds, ease: "linear" }}
                style={{ height: "100%", background: accent, transformOrigin: "left" }}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Stacken */}
      {!overview ? (
        <AnimatePresence mode="wait">
          {card ? (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.45, ease: EASE }}
              style={{
                position: "absolute",
                inset: "clamp(5rem, 12vh, 8rem) clamp(2rem, 4vw, 4rem) clamp(2rem, 5vh, 4rem)",
                display: "grid",
                gridTemplateColumns: card.image ? "minmax(0, 1.05fr) minmax(0, 1fr)" : "1fr",
                gap: "clamp(1.5rem, 3vw, 3.5rem)",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                {/* Löpnumret — massivt, ljust, bakom rubriken */}
                <div
                  aria-hidden
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)" as unknown as number,
                    fontSize: "clamp(5rem, 13vw, 14rem)",
                    lineHeight: 0.8,
                    letterSpacing: "-0.04em",
                    color: "var(--text)",
                    opacity: 0.07,
                    userSelect: "none",
                  }}
                >
                  {pad(index + 1)}
                </div>
                <h2
                  style={{
                    margin: "-0.35em 0 0",
                    fontFamily: "var(--font-display)",
                    fontWeight: "var(--heading-weight)" as unknown as number,
                    textTransform: "uppercase",
                    fontSize: card.image ? "clamp(2.2rem, 4.6vw, 5.2rem)" : "clamp(2.8rem, 6.4vw, 7rem)",
                    lineHeight: 0.92,
                    letterSpacing: "-0.02em",
                    color: "var(--text)",
                  }}
                >
                  {renderInline(card.title, accent)}
                </h2>
                {card.prompt ? (
                  <p
                    style={{
                      margin: "clamp(1rem, 2.2vh, 1.8rem) 0 0",
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.85rem, 1.15vw, 1.25rem)",
                      lineHeight: 1.45,
                      color: "var(--text)",
                      maxWidth: "36em",
                    }}
                  >
                    <span style={{ color: accent, marginRight: "0.6em" }}>›</span>
                    {renderInline(card.prompt, accent)}
                  </p>
                ) : null}
                {card.requires ? (
                  <span
                    data-tag="solid"
                    style={{
                      ...mono,
                      display: "inline-block",
                      marginTop: "clamp(0.8rem, 1.8vh, 1.4rem)",
                      padding: "0.35em 0.7em",
                      background: "var(--text)",
                      color: "var(--bg)",
                    }}
                  >
                    kräver {card.requires}
                  </span>
                ) : null}
              </div>
              {card.image ? (
                <div
                  data-card
                  style={{
                    justifySelf: "end",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    background: "var(--bg-elevated, var(--bg-surface))",
                    border: "2px solid var(--text)",
                    padding: "0.5rem",
                    boxShadow: "var(--card-shadow, 10px 10px 0 var(--accent))",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.title}
                    style={{ display: "block", maxHeight: "62vh", maxWidth: "100%", objectFit: "contain" }}
                  />
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : (
        /* Översikten — rutnät med alla kort */
        <div
          style={{
            position: "absolute",
            inset: "clamp(5rem, 12vh, 8rem) clamp(2rem, 4vw, 4rem) clamp(2rem, 5vh, 4rem)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2.4vh, 2rem)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)" as unknown as number,
              textTransform: "uppercase",
              fontSize: "clamp(1.8rem, 3.6vw, 4rem)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="overviewTitle" value={overviewTitle}>
              {overviewTitle}
            </EditableText>
          </h2>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gridTemplateColumns: `repeat(${n > 8 ? 4 : n > 4 ? 3 : 2}, minmax(0, 1fr))`,
              gap: "clamp(0.5rem, 1vw, 1rem)",
              flex: 1,
              alignContent: "start",
            }}
          >
            {cards.map((c, i) => (
              <motion.li
                key={i}
                data-card="flat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
                style={{
                  display: "flex",
                  gap: "0.7rem",
                  alignItems: "baseline",
                  padding: "clamp(0.6rem, 1.2vh, 1rem) clamp(0.7rem, 1vw, 1rem)",
                  border: "2px solid var(--text)",
                  minWidth: 0,
                }}
              >
                <span style={{ ...mono, color: accent, flex: "0 0 auto" }}>{pad(i + 1)}</span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "clamp(0.9rem, 1.3vw, 1.4rem)",
                    lineHeight: 1.15,
                    color: "var(--text)",
                    minWidth: 0,
                  }}
                >
                  {renderInline(c.title, accent)}
                  {c.requires ? (
                    <span style={{ ...mono, marginLeft: "0.6em", color: "var(--text-muted)" }}>{c.requires}</span>
                  ) : null}
                </span>
              </motion.li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
