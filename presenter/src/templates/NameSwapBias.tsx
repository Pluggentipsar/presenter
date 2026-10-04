"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { Lightbox } from "./Lightbox";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * NameSwapBias — samma prompt, ett namn bytt → AI:n fyller i resten längs
 * könslinjer. Två "karaktärskort" genereras med diffusion-animering (samma
 * teknik som PromptToImage) sida vid sida; nyckelord lyfts ut som pills.
 *
 * Stegvis: sida 1 diffunderar in på entré, klick genererar sida 2 (namnbytet),
 * nästa klick blottlägger biasen. Token i prompten (default `[namn]`) highlightas.
 *
 * MDX — en rad per sida, `Namn :: /bild.png :: pill · pill · pill`:
 * ```mdx
 * <NameSwapBias prompt="… som heter [namn] …" landing="… **ett ord** bytt …">
 * - Johanna :: /bilder/folkhogskola/johanna.png :: empatisk · tyst i grupp
 * - Jonas :: /bilder/folkhogskola/jonas.png :: humoristisk · deltar gärna
 * </NameSwapBias>
 * ```
 */

interface Side {
  name: string;
  image: string;
  pills: string[];
}

interface NameSwapBiasProps {
  chapter?: string;
  /** Prompten. Markera den utbytbara delen med token (default "[namn]"). */
  prompt: string;
  nameToken?: string;
  modelLabel?: string;
  /** Blottläggnings-rad nederst. `**fet**` blir signal-röd. */
  landing?: string;
  accent?: string;
  background?: string;
  diffusionDuration?: number | string;
  stepped?: boolean;
  children?: ReactNode;
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

function parseSides(children: ReactNode): Side[] {
  const out: Side[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*::\s*/);
    if (parts.length < 2) return;
    out.push({
      name: parts[0].trim(),
      image: parts[1].trim(),
      pills: (parts[2] ?? "")
        .split(/\s*[,·]\s*/)
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li")
          walkLi(li as ReactElement<{ children?: ReactNode }>);
      });
    } else if (t === "li") walkLi(el);
  });
  return out;
}

function resolveBackground(bg: string | undefined): string {
  const fallback =
    "radial-gradient(ellipse 90% 70% at 50% -10%, var(--bg-surface) 0%, var(--bg) 72%)";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http"))
    return `linear-gradient(rgba(6,7,12,0.7), rgba(6,7,12,0.85)), url('${bg}') center/cover no-repeat`;
  return bg;
}

function renderLanding(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} style={{ color: "var(--accent-alert, #E63946)" }}>
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function NameSwapBias({
  chapter,
  prompt,
  nameToken = "[namn]",
  modelLabel = "ChatGPT · Bildgenerering",
  landing,
  accent = "var(--accent)",
  background,
  diffusionDuration = 2200,
  stepped = true,
  children,
}: NameSwapBiasProps) {
  const sides = parseSides(children);
  // Steg 0 = bara prompten (läs i lugn och ro). Klick genererar kort 1, klick
  // kort 2, klick blottläggningen. Allt på klick — inget auto på entré.
  const totalSteps = Math.max(1, sides.length + (landing ? 1 : 0) + 1);
  const activeStep = useSlideSteps(totalSteps);
  const diffSec =
    (typeof diffusionDuration === "string"
      ? parseInt(diffusionDuration, 10)
      : diffusionDuration) / 1000;

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const sideRevealed = (i: number) => !stepped || activeStep >= i + 1;
  const landingRevealed = !stepped || activeStep >= sides.length + 1;

  const promptParts = prompt.split(nameToken);

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{
        background: resolveBackground(background),
        color: "var(--text)",
        padding: "clamp(2.1rem, 4vw, 3.8rem)",
      }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.4rem)",
            right: "clamp(2rem, 4vw, 3.4rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {chapter}
        </div>
      ) : null}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* prompt-ruta */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "min(880px, 94%)",
          margin: "clamp(0.4rem, 1.5vh, 1rem) auto 0",
          background: "rgba(20,18,16,0.92)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "0.85rem",
          boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.95rem",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              width: "1.25rem",
              height: "1.25rem",
              borderRadius: "50%",
              background: accent,
              color: "rgba(245,246,250,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "rgba(245,246,250,0.92)",
            }}
          >
            {modelLabel}
          </span>
        </div>
        <div
          style={{
            padding: "0.8rem 1.1rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(0.88rem, 1.2vw, 1.12rem)",
            lineHeight: 1.45,
            color: "rgba(245,246,250,0.92)",
          }}
        >
          <span style={{ color: "var(--accent-bright, var(--accent))", fontWeight: 600, marginRight: "0.35rem" }}>
            {">"}
          </span>
          {promptParts.map((part, i) => (
            <span key={i}>
              {part}
              {i < promptParts.length - 1 ? (
                <motion.span
                  animate={{
                    boxShadow: [
                      `0 0 0 ${withAlpha(accent, 0)}`,
                      `0 0 16px ${withAlpha(accent, 0.6)}`,
                      `0 0 0 ${withAlpha(accent, 0)}`,
                    ],
                  }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    display: "inline-block",
                    padding: "0.04em 0.5em",
                    margin: "0 0.12em",
                    borderRadius: "0.4rem",
                    background: withAlpha(accent, 0.16),
                    border: `1px solid ${withAlpha(accent, 0.5)}`,
                    color: "var(--accent-bright, var(--accent))",
                    fontWeight: 700,
                  }}
                >
                  {nameToken}
                </motion.span>
              ) : null}
            </span>
          ))}
        </div>
      </motion.div>

      {/* caption */}
      <div
        style={{
          textAlign: "center",
          margin: "clamp(0.5rem, 1.3vh, 0.9rem) 0",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(0.88rem, 1.1vw, 1.08rem)",
          color: "var(--text-muted)",
          flexShrink: 0,
        }}
      >
        Samma prompt. Bara{" "}
        <span style={{ color: accent, fontStyle: "normal", fontWeight: 600 }}>
          namnet
        </span>{" "}
        bytt.
      </div>

      {/* korten */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${sides.length || 1}, 1fr)`,
          gap: "clamp(1.2rem, 3vw, 3rem)",
          alignItems: "start",
          justifyItems: "center",
          minHeight: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {sides.map((s, i) => (
          <SideCard
            key={i}
            side={s}
            revealed={sideRevealed(i)}
            accent={accent}
            diffSec={diffSec}
            onOpen={() => setLightboxImage(s.image)}
          />
        ))}
      </div>

      {/* blottläggning */}
      {landing ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={landingRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            textAlign: "center",
            marginTop: "clamp(0.7rem, 1.8vh, 1.3rem)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.05rem, 1.65vw, 1.55rem)",
            fontWeight: 600,
            lineHeight: 1.25,
            color: "var(--text)",
            maxWidth: "46em",
            marginLeft: "auto",
            marginRight: "auto",
            flexShrink: 0,
          }}
        >
          {renderLanding(landing)}
        </motion.div>
      ) : null}

      <Lightbox
        open={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        image={lightboxImage ?? ""}
        caption=""
      />
    </div>
  );
}

function SideCard({
  side,
  revealed,
  accent,
  diffSec,
  onOpen,
}: {
  side: Side;
  revealed: boolean;
  accent: string;
  diffSec: number;
  onOpen: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "clamp(0.55rem, 1.3vh, 0.95rem)",
        width: "100%",
        maxWidth: "min(40vw, 470px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={revealed ? { opacity: 1, y: 0 } : { opacity: 0.45, y: -6 }}
        transition={{ duration: 0.5 }}
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
          color: "var(--text-muted)",
          letterSpacing: "-0.01em",
        }}
      >
        som heter{" "}
        <span style={{ color: revealed ? accent : "var(--text-muted)", fontWeight: 700 }}>
          {side.name}
        </span>
      </motion.div>

      <div
        onClick={(e) => {
          if (!revealed) return;
          e.stopPropagation();
          onOpen();
        }}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: "0.8rem",
          overflow: "hidden",
          background: "rgba(20,18,16,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: revealed
            ? `0 24px 60px rgba(0,0,0,0.5), 0 0 70px ${withAlpha(accent, 0.12)}`
            : "0 12px 30px rgba(0,0,0,0.3)",
          transition: "box-shadow 400ms ease",
          cursor: revealed ? "zoom-in" : "default",
        }}
      >
        {!revealed ? (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(135deg, ${withAlpha(accent, 0.08)}, transparent 30%, ${withAlpha(accent, 0.08)} 70%, transparent)`,
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            src={side.image}
            alt={`Karaktärskort: ${side.name}`}
            initial={{
              opacity: 0.15,
              filter: "blur(40px) saturate(0.2) brightness(0.6)",
            }}
            animate={{
              opacity: [0.15, 0.55, 0.85, 1],
              filter: [
                "blur(40px) saturate(0.2) brightness(0.6)",
                "blur(20px) saturate(0.55) brightness(0.85)",
                "blur(8px) saturate(0.85) brightness(0.95)",
                "blur(0px) saturate(1) brightness(1)",
              ],
            }}
            transition={{
              duration: diffSec,
              times: [0, 0.35, 0.7, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
        {revealed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: diffSec + 0.2 }}
            aria-hidden
            style={{
              position: "absolute",
              bottom: "0.5rem",
              right: "0.5rem",
              padding: "0.24rem 0.5rem",
              borderRadius: "0.4rem",
              background: "rgba(10,9,8,0.62)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.6rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(245,246,250,0.6)",
              pointerEvents: "none",
            }}
          >
            ⤢ Förstora
          </motion.div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          justifyContent: "center",
        }}
      >
        {side.pills.map((p, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={revealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0 }}
            transition={{
              duration: 0.4,
              delay: revealed ? diffSec * 0.7 + i * 0.08 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.9rem)",
              padding: "0.26rem 0.7rem",
              borderRadius: "9999px",
              background: withAlpha(accent, 0.1),
              border: `1px solid ${withAlpha(accent, 0.35)}`,
              color: "var(--text)",
              whiteSpace: "nowrap",
            }}
          >
            {p}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
