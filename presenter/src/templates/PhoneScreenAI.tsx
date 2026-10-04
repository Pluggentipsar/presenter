"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { buildBackgroundCss } from "@/lib/background";
import { unwrapLazy } from "@/lib/extract-text";

interface PhoneScreenAIProps {
  /** Liten label uppe, t.ex. "§ Krok · pivoten". */
  eyebrow?: string;
  /** Stor rubrik. Ex: "Telefonen din. Och AI inuti den." */
  title?: string;
  /** Subtitel under rubriken. Visas tunt. */
  subtitle?: string;
  /** Texten som visas när alla appar är "AI-stämplade". */
  closer?: string;
  /** Klocktid i status bar. Default "09:42". */
  clockTime?: string;
  /** Bakgrund — CSS-värde eller bildsökväg. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
  /**
   * Markdown-lista med appar:
   * `- /sökväg/till/logga.svg · Appnamn · Vad AI gör i appen`
   * Varje rad ger en app + en stegvis-avslöjad caption till höger.
   */
  children?: ReactNode;
}

interface App {
  src: string;
  name: string;
  caption: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

function parseApps(children: ReactNode): App[] {
  const out: App[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (li) => {
      if (!isValidElement(li)) return;
      const liEl = li as ReactElement<{ children?: ReactNode }>;
      const text = extractText(liEl.props.children).trim();
      if (!text) return;
      const parts = text.split("·").map((s) => s.trim());
      if (parts.length < 2) return;
      out.push({
        src: parts[0],
        name: parts[1] ?? "",
        caption: parts[2] ?? "",
      });
    });
  });
  return out;
}

/**
 * Mobiltelefon-mockup med apps och AI-stämpel-reveal.
 * Manual step-through: tryck pil höger för att stämpla varje app i tur och ordning.
 *
 * Layout: telefon till vänster, captions byggs upp till höger.
 * Final step: closer-text fades in.
 *
 * Användning:
 * ```mdx
 * <PhoneScreenAI
 *   eyebrow="§ A · Pivoten"
 *   title="Telefonen din. Och AI inuti den."
 *   closer="Allt med AI inuti — på en enda skärm."
 * >
 * - /bilder/mellanstadiet/logos/spotify.svg · Spotify · AI väljer låtarna
 * - /bilder/mellanstadiet/logos/tiktok.svg · TikTok · AI väljer flödet
 * - /bilder/mellanstadiet/logos/snapchat.svg · Snap · AI gör filtren
 * - /bilder/mellanstadiet/logos/instagram.svg · Instagram · AI väljer rullarna
 * - /bilder/mellanstadiet/logos/youtube.svg · YouTube · AI rekommenderar
 * - /bilder/mellanstadiet/logos/chatgpt.svg · ChatGPT · AI svarar på allt
 * - /bilder/mellanstadiet/logos/roblox.svg · Roblox · AI styr fienderna
 * - /bilder/mellanstadiet/logos/google-translate.svg · Translate · AI översätter
 * </PhoneScreenAI>
 * ```
 */
export function PhoneScreenAI({
  eyebrow,
  title,
  subtitle,
  closer,
  clockTime = "09:42",
  background,
  overlay,
  overlayMode = "dark",
  children,
}: PhoneScreenAIProps) {
  const apps = useMemo(() => parseApps(children), [children]);
  const totalSteps = apps.length + (closer ? 1 : 0);
  const step = useSlideSteps(totalSteps);

  const stampedCount = Math.min(step, apps.length);
  const closerVisible = closer ? step >= apps.length + 1 : false;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{ background: buildBackgroundCss(background, overlay, overlayMode) }}
    >
      {(eyebrow || title || subtitle) ? (
        <div className="flex flex-col gap-2 px-12 pt-10">
          {eyebrow ? (
            <div
              className="text-xs uppercase"
              style={{
                color: "var(--text-muted)",
                letterSpacing: "0.3em",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          {title ? (
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(2rem, 4.2vw, 3.25rem)",
                lineHeight: 1.1,
                letterSpacing: "var(--heading-tracking)",
                textTransform: "var(--heading-case)" as React.CSSProperties["textTransform"],
                color: "var(--text)",
                margin: 0,
              }}
            >
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p
              className="max-w-3xl"
              style={{
                fontSize: "clamp(1rem, 1.4vw, 1.25rem)",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-[auto_1fr] items-center gap-12 px-12 pb-10 pt-6 md:gap-20">
        <PhoneMockup
          apps={apps}
          stampedCount={stampedCount}
          clockTime={clockTime}
        />

        <div className="flex flex-col gap-3 self-center">
          {apps.map((app, i) => (
            <CaptionRow
              key={app.src + i}
              app={app}
              visible={i < stampedCount}
            />
          ))}

          <AnimatePresence>
            {closerVisible && closer ? (
              <motion.div
                key="closer"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 max-w-2xl"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)",
                  lineHeight: 1.18,
                  letterSpacing: "var(--heading-tracking)",
                  color: "var(--accent)",
                }}
              >
                {closer}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PhoneMockup({
  apps,
  stampedCount,
  clockTime,
}: {
  apps: App[];
  stampedCount: number;
  clockTime: string;
}) {
  return (
    <div
      className="relative shrink-0"
      style={{
        width: "clamp(260px, 28vw, 360px)",
        aspectRatio: "9 / 19",
        background: "#0a0a0a",
        borderRadius: "clamp(28px, 3.2vw, 42px)",
        padding: "clamp(8px, 0.9vw, 12px)",
        boxShadow:
          "0 30px 60px -20px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #2a3a5e 0%, #1a2640 60%, #0e1628 100%)",
          borderRadius: "clamp(22px, 2.6vw, 34px)",
        }}
      >
        {/* Notch */}
        <div
          aria-hidden
          className="absolute left-1/2 top-2 -translate-x-1/2"
          style={{
            width: "32%",
            height: "18px",
            background: "#0a0a0a",
            borderRadius: "9999px",
          }}
        />

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 pt-4 text-white"
          style={{ fontSize: "0.7rem", fontWeight: 600 }}
        >
          <span>{clockTime}</span>
          <span style={{ letterSpacing: "0.1em" }}>● ● ●</span>
        </div>

        {/* App grid */}
        <div
          className="grid grid-cols-4 gap-3 p-4 pt-7"
          style={{ alignContent: "start" }}
        >
          {apps.map((app, i) => (
            <AppIcon
              key={app.src + i}
              app={app}
              stamped={i < stampedCount}
              delay={i * 0.05}
            />
          ))}
        </div>

        {/* Home indicator */}
        <div
          aria-hidden
          className="absolute bottom-2 left-1/2 -translate-x-1/2"
          style={{
            width: "32%",
            height: "4px",
            background: "rgba(255,255,255,0.4)",
            borderRadius: "9999px",
          }}
        />
      </div>
    </div>
  );
}

function AppIcon({
  app,
  stamped,
  delay,
}: {
  app: App;
  stamped: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: delay + 0.4,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="relative flex flex-col items-center gap-1"
    >
      <div
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden"
        style={{
          background: "white",
          borderRadius: "22%",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        }}
      >
        <img
          src={app.src}
          alt={app.name}
          className="h-[72%] w-[72%] object-contain"
          draggable={false}
        />

        <AnimatePresence>
          {stamped ? (
            <>
              {/* Pulse ring */}
              <motion.div
                key="pulse"
                aria-hidden
                initial={{ opacity: 0.7, scale: 1 }}
                animate={{ opacity: 0, scale: 1.55 }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  repeat: 2,
                  repeatDelay: 0.2,
                }}
                className="absolute inset-0"
                style={{
                  borderRadius: "22%",
                  border: "3px solid var(--accent)",
                }}
              />
              {/* AI badge */}
              <motion.div
                key="badge"
                initial={{ opacity: 0, scale: 0.4, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: 0.45,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
                className="absolute"
                style={{
                  top: "-6px",
                  right: "-6px",
                  background: "var(--accent)",
                  color: "white",
                  fontSize: "0.55rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  boxShadow: "0 2px 6px var(--accent-glow)",
                }}
              >
                AI
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </div>
      <span
        style={{
          fontSize: "0.5rem",
          color: "white",
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
        }}
      >
        {app.name}
      </span>
    </motion.div>
  );
}

function CaptionRow({ app, visible }: { app: App; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center"
            style={{
              background: "white",
              borderRadius: "22%",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <img
              src={app.src}
              alt={app.name}
              className="h-[70%] w-[70%] object-contain"
              draggable={false}
            />
          </div>
          <div className="flex flex-col">
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(1.1rem, 1.8vw, 1.6rem)",
                color: "var(--text)",
                lineHeight: 1.1,
              }}
            >
              {app.name}
            </span>
            <span
              style={{
                fontSize: "clamp(0.85rem, 1.2vw, 1rem)",
                color: "var(--text-muted)",
                lineHeight: 1.3,
              }}
            >
              {app.caption}
            </span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
