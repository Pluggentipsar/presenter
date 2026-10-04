"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

interface FeedItem {
  /** Sökväg till bild eller video. Tomt = placeholder. */
  src: string;
  /** Caption som visas under varje item — typ "AI-genererad annons / SVT-bluff" */
  caption?: string;
  /** "image" | "video" — bestämmer hur det renderas. Default image. */
  kind?: "image" | "video";
  /** Liten taggning ovan item, t.ex. "SPONSRAD", "TRENDING". */
  tag?: string;
}

interface PhoneFeedRevealProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Övergripande rubrik bredvid telefonen. */
  title?: string;
  /** Underrubrik / kontext. */
  subtitle?: string;
  /**
   * Markdown-lista med feed-items.
   * Format: `- SRC · CAPTION · KIND · TAG`
   * (alla utom SRC valfria)
   *
   * Joel kan börja med tomma SRC — de blir placeholder-rutor som han
   * fyller i senare via inline-edit.
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseItems(children: ReactNode): FeedItem[] {
  const out: FeedItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [src = "", caption, kindRaw, tag] = parts;
    const kind: "image" | "video" = kindRaw === "video" ? "video" : "image";
    out.push({
      src,
      caption: caption || undefined,
      kind,
      tag: tag || undefined,
    });
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

/**
 * PhoneFeedReveal — Telefon-mockup med stegvis feed-reveal.
 *
 * Visar en stiliserad smartphone bredvid en kort text. Inuti telefonen
 * "scrollar" feeden — Joel steppar fram nästa item med tangentbordet
 * eller så scroll:as den auto. Items kan vara bilder, videos eller
 * placeholder-rutor (om Joel ännu inte har media).
 *
 * Designat för slide 5 (deepfakes/bluffannonser-momentet) i
 * en föreläsning. Tema-agnostisk.
 */
export function PhoneFeedReveal({
  kicker,
  chapter,
  title = "Källkritik i AI-eran",
  subtitle,
  children,
}: PhoneFeedRevealProps) {
  const items = parseItems(children);
  // Använder slide-steps: visa N items där N = step + 1
  // (första visas direkt, sedan steppas resten in)
  const currentStep = useSlideSteps(items.length);
  const visibleCount = currentStep + 1;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
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
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      <div
        className="relative flex h-full w-full"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(2rem, 5vw, 5rem)",
          zIndex: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Vänster: text */}
        <div
          style={{
            flex: "1 1 40%",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1rem, 2vh, 1.5rem)",
            maxWidth: "min(28rem, 40%)",
            alignItems: "flex-start",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.3vw, 1.2rem)",
                lineHeight: 1.5,
                color: "var(--text-muted)",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              <EditableText path="subtitle" value={subtitle}>
                {subtitle}
              </EditableText>
            </motion.p>
          ) : null}

          {/* Diskret stega-hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            style={{
              marginTop: "clamp(1rem, 2vh, 2rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.8vw, 0.78rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {visibleCount} / {items.length}  ·  → nästa klipp
          </motion.div>
        </div>

        {/* Höger: telefon */}
        <PhoneMockup items={items} visibleCount={visibleCount} />
      </div>
    </div>
  );
}

function PhoneMockup({
  items,
  visibleCount,
}: {
  items: FeedItem[];
  visibleCount: number;
}) {
  const currentIndex = Math.max(
    0,
    Math.min(items.length - 1, visibleCount - 1),
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: "0 0 auto",
        width: "clamp(16rem, 22vw, 20rem)",
        aspectRatio: "9 / 19.5",
        background: "color-mix(in srgb, var(--text) 92%, transparent)",
        borderRadius: "clamp(1.8rem, 2.6vw, 2.6rem)",
        padding: "clamp(0.5rem, 0.7vw, 0.8rem)",
        position: "relative",
        boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
      }}
    >
      {/* Phone "notch" */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "clamp(1.1rem, 1.6vw, 1.6rem)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(3.5rem, 5vw, 5rem)",
          height: "clamp(0.9rem, 1.2vw, 1.2rem)",
          borderRadius: "clamp(0.5rem, 0.7vw, 0.7rem)",
          background: "color-mix(in srgb, var(--text) 96%, transparent)",
          zIndex: 5,
        }}
      />

      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--bg)",
          borderRadius: "clamp(1.3rem, 2.2vw, 2.2rem)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Status bar */}
        <div
          style={{
            padding: "clamp(2rem, 3vh, 3.2rem) clamp(1rem, 1.5vw, 1.4rem) clamp(0.5rem, 1vh, 1rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.72rem)",
            color: "var(--text)",
            fontWeight: 600,
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          <span>09:42</span>
          <span style={{ opacity: 0.65 }}>● ● ● ● ●</span>
        </div>

        {/* Storvy — ett klipp i taget, fyller telefonen */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {items.length > 0 ? (
            <AnimatePresence>
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: "absolute", inset: 0 }}
              >
                <BigFeedItem item={items[currentIndex]} index={currentIndex} />
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function BigFeedItem({ item, index }: { item: FeedItem; index: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "color-mix(in srgb, var(--text) 8%, transparent)",
      }}
    >
      {/* Media — fyller hela skärmen */}
      {item.src && item.kind === "video" ? (
        <video
          src={item.src}
          autoPlay
          loop
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : item.src ? (
        <img
          src={item.src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.8rem, 1vw, 1rem)",
            color: "var(--text-muted)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          #{index + 1}
        </div>
      )}

      {/* Tag — överlagd uppe till vänster */}
      {item.tag ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(0.6rem, 1.2vw, 1rem)",
            left: "clamp(0.6rem, 1.2vw, 1rem)",
            padding:
              "clamp(0.28rem, 0.5vh, 0.42rem) clamp(0.5rem, 0.9vw, 0.8rem)",
            background: "rgba(10, 9, 8, 0.8)",
            borderRadius: "0.4rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.55rem, 0.72vw, 0.68rem)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent-alert)",
            fontWeight: 600,
          }}
        >
          {item.tag}
        </div>
      ) : null}

      {/* Caption — överlagd nere på en mörk scrim */}
      {item.caption ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding:
              "clamp(1.6rem, 3.5vh, 2.8rem) clamp(0.7rem, 1.3vw, 1.1rem) clamp(0.7rem, 1.5vh, 1.1rem)",
            background:
              "linear-gradient(to top, rgba(10,9,8,0.9) 0%, rgba(10,9,8,0.6) 55%, transparent 100%)",
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.78rem, 1.05vw, 1rem)",
            lineHeight: 1.4,
            color: "rgba(245,246,250,0.92)",
          }}
        >
          {item.caption}
        </div>
      ) : null}
    </div>
  );
}
