"use client";

import { Children, isValidElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TargetLanguageImages ★ — meningen på målspråket blir en bild.
 *
 * Ett språk i taget. Prompten skrivs fram på målspråket medan bilden bakom
 * skärper från suddig och urblekt till klar — de landar samtidigt, så det
 * läser som att orden framkallade bilden.
 *
 * Det är hela den didaktiska poängen: eleven måste formulera sig på
 * målspråket för att få rätt bild, och bilden blir sedan ett ankare för
 * orden. Blir bilden fel var det meningen som brast, inte modellen. Därför
 * fyller bilden hela ytan och prompten ligger som en bildtext över den —
 * bilden är inte illustration till texten, den är svaret på den.
 *
 * MDX-format — ett språk per rad, fält separerade med `·`:
 * ```mdx
 * <TargetLanguageImages chapter="§ Moderna språk" title="…">
 * - Engelska · English · A man with grey beard looking at a beach. · /bilder/x/haj.png
 * - Spanska · Español · Un futbolista con una camiseta roja. · /bilder/x/fotboll.png
 * </TargetLanguageImages>
 * ```
 * Fälten är `svenskt språknamn · språkets eget namn · prompt · bild`.
 */

interface TargetLanguageImagesProps {
  chapter?: string;
  title?: string;
  /** Rad som fälls in på sista steget. Stödjer **fetstil**. */
  payoff?: string;
  /** Tecken per sekund när prompten skrivs fram. */
  typeSpeed?: number;
  children?: ReactNode;
}

interface LanguageItem {
  /** Språkets namn på svenska — för lärarpubliken. */
  swedish: string;
  /** Språkets namn på sig självt — det eleven möter. */
  native: string;
  prompt: string;
  image: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function addItem(items: LanguageItem[], text: string) {
  const p = text.split("·").map((s) => s.trim());
  if (!p[0]) return;
  items.push({
    swedish: p[0] ?? "",
    native: p[1] ?? "",
    prompt: p[2] ?? "",
    image: p[3] ?? "",
  });
}

/**
 * Presentationsvyn ger React-noder via MDXRemote, editorns SlideRenderer
 * skickar råtexten. Båda måste fungera.
 */
function parseItems(children: ReactNode): LanguageItem[] {
  const items: LanguageItem[] = [];

  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) addItem(items, m[1]);
    }
    return items;
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          addItem(items, extractText((li as ReactElement<{ children?: ReactNode }>).props.children).trim());
        }
      });
    } else if (el.type === "li") {
      addItem(items, extractText(el.props.children).trim());
    }
  });

  return items;
}

/** Text över foto — alltid ljus, oavsett tema. */
const INK = "#FBFCFE";
const INK_SOFT = "rgba(251,252,254,0.72)";

export function TargetLanguageImages({
  chapter,
  title,
  payoff,
  typeSpeed = 26,
  children,
}: TargetLanguageImagesProps) {
  const items = parseItems(children);
  const step = useSlideSteps(items.length);
  const current = items[Math.min(step, items.length - 1)];
  const isLast = step >= items.length - 1;

  const [typed, setTyped] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef<number | null>(null);

  const promptLength = current?.prompt.length ?? 0;

  useEffect(() => {
    if (!promptLength) return;
    // Ingen setTyped(0) här — första rAF-bilden räknar fram 0 ändå, och att
    // nollställa direkt i effekten är en render-bieffekt som React klagar på.
    startRef.current = null;
    const tick = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      const n = Math.min(Math.floor(elapsed * typeSpeed), promptLength);
      setTyped(n);
      if (n < promptLength) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // step ingår så varje nytt språk skriver fram sin egen prompt från noll.
  }, [promptLength, typeSpeed, step]);

  if (!current) return null;

  // Bilden skärper i takt med att meningen blir färdig. De landar samtidigt,
  // vilket är hela intrycket: orden framkallade bilden.
  const progress = promptLength ? typed / promptLength : 1;
  const blur = (1 - progress) * 16;
  const saturate = 0.35 + progress * 0.65;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "#08090d" }}>
      {/* Bilden fyller ytan. Korsfade mellan språken. */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current.image || step}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            background: current.image
              ? `url('${current.image}') center/cover no-repeat`
              : "#111",
            filter: `blur(${blur}px) saturate(${saturate})`,
            // Blurren suddar annars ut kanterna och visar bakgrunden igenom.
            transform: "scale(1.03)",
          }}
        />
      </AnimatePresence>

      {/* Scrim — texten ligger nertill, så tyngden ska ligga där. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(6,7,11,0.92) 0%, rgba(6,7,11,0.72) 26%, rgba(6,7,11,0.15) 55%, rgba(6,7,11,0.35) 100%)",
        }}
      />

      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.8rem, 3.6vh, 3rem)",
            left: "clamp(2.5rem, 5vw, 5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: INK_SOFT,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <h2
          style={{
            position: "absolute",
            top: "clamp(3.6rem, 7vh, 5.6rem)",
            left: "clamp(2.5rem, 5vw, 5rem)",
            right: "clamp(2.5rem, 5vw, 5rem)",
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.5rem, 2.6vw, 2.6rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.12,
            color: INK,
            textShadow: "0 2px 24px rgba(0,0,0,0.6)",
            maxWidth: "22ch",
            zIndex: 3,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </h2>
      ) : null}

      {/* Prompten som bildtext */}
      <div
        style={{
          position: "absolute",
          left: "clamp(2.5rem, 5vw, 5rem)",
          right: "clamp(2.5rem, 5vw, 5rem)",
          bottom: "clamp(2.2rem, 4.5vh, 3.6rem)",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.7rem, 1.4vh, 1.1rem)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.7rem" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1.1rem, 1.9vw, 1.85rem)",
              color: "var(--accent-bright, var(--accent))",
              letterSpacing: "-0.01em",
            }}
          >
            {current.native}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.8vw, 0.76rem)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: INK_SOFT,
            }}
          >
            {current.swedish}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-body)",
            fontSize: "clamp(1.15rem, 2vw, 2rem)",
            lineHeight: 1.32,
            color: INK,
            textShadow: "0 2px 20px rgba(0,0,0,0.75)",
            maxWidth: "34ch",
            minHeight: "2.6em",
          }}
        >
          {current.prompt.slice(0, typed)}
          {typed < promptLength ? (
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: "0.06em",
                height: "1em",
                marginLeft: "0.04em",
                verticalAlign: "text-bottom",
                background: "var(--accent-bright, var(--accent))",
              }}
            />
          ) : null}
        </p>

        {payoff ? (
          <motion.div
            initial={false}
            animate={{ opacity: isLast ? 1 : 0, y: isLast ? 0 : 8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.95rem, 1.4vw, 1.35rem)",
              lineHeight: 1.35,
              color: INK,
              maxWidth: "44ch",
              textShadow: "0 2px 16px rgba(0,0,0,0.7)",
            }}
            dangerouslySetInnerHTML={{
              __html: payoff.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        ) : null}
      </div>

      {/* Stegprickar */}
      <div
        style={{
          position: "absolute",
          right: "clamp(2.5rem, 5vw, 5rem)",
          bottom: "clamp(2.4rem, 4.8vh, 3.8rem)",
          display: "flex",
          gap: "0.4rem",
          zIndex: 3,
        }}
      >
        {items.map((it, i) => (
          <span
            key={it.native || i}
            style={{
              width: i === step ? "2.2rem" : "0.5rem",
              height: "0.5rem",
              borderRadius: "999px",
              background:
                i === step ? "var(--accent-bright, var(--accent))" : INK_SOFT,
              opacity: i === step ? 1 : 0.4,
              transition: "all 320ms var(--motion-ease)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
