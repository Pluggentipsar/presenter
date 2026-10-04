"use client";

import { motion, useReducedMotion } from "framer-motion";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";

interface Modality {
  icon: string;
  label: string;
  example?: string;
  src?: string;
}

interface ModalityGridProps {
  title?: string;
  subtitle?: string;
  bottomLine?: string;
  /** 6 rutor — text, bild, ljud, video, kod, agenter. */
  items?: Modality[];
  background?: string;
  overlay?: number | string;
  overlayMode?: "dark" | "light";
}

const DEFAULT_ITEMS: Modality[] = [
  { icon: "💬", label: "Text", example: "ChatGPT, Gemini, Claude" },
  { icon: "🖼️", label: "Bilder", example: "Midjourney, Sora, Nano Banana" },
  { icon: "🎵", label: "Musik", example: "Suno, Udio" },
  { icon: "🎬", label: "Video", example: "Sora, Veo, Runway" },
  { icon: "</>", label: "Kod", example: "Cursor, Copilot, Claude Code" },
  { icon: "🤖", label: "Agenter", example: "AI som klickar åt dig" },
];

/**
 * Bredd-slide: alla modaliteter generativ AI kan producera.
 *
 * Visuella effekter (offset-skuggor, chunky borders, riso-noise, ornament)
 * styrs av temat. Memphis-riso ger fullt utbyggd grafik; andra teman ger
 * en neutral grid.
 */
export function ModalityGrid({
  title = "AI kan göra typ allt.",
  subtitle = "Inte bara text. Bilder, musik, video, kod — och saker som klickar åt dig.",
  bottomLine = "En sak gemensamt: du säger vad du vill ha. AI:n försöker göra det.",
  items = DEFAULT_ITEMS,
  background,
  overlay,
  overlayMode = "light",
}: ModalityGridProps) {
  const reduce = useReducedMotion();

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  const grid = [...items];
  while (grid.length < 6) grid.push(DEFAULT_ITEMS[grid.length]);
  const visible = grid.slice(0, 6);

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="grid" />

      <div className="relative z-10 flex h-full w-full flex-col px-12 pt-10 pb-8 lg:px-20 lg:pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="leading-[0.92] tracking-tight"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: "var(--heading-weight)" as unknown as number,
            fontSize: "clamp(2.6rem, 6.5vw, 6.5rem)",
            color: "var(--text)",
            textShadow: "var(--title-shadow, none)",
          }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-3 mb-6 lg:mb-8 max-w-[80%]"
            style={{
              fontSize: "clamp(1rem, 1.55vw, 1.5rem)",
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {subtitle}
          </motion.p>
        )}

        <div className="grid flex-1 grid-cols-3 grid-rows-2 gap-4 lg:gap-6">
          {visible.map((item, i) => (
            <ModalityTile
              key={i}
              item={item}
              index={i}
              delay={0.6 + i * 0.12}
              reduce={!!reduce}
            />
          ))}
        </div>

        {bottomLine && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: reduce ? 0 : 0.6 + 6 * 0.12 + 0.4,
              ease: "easeOut",
            }}
            className="mt-6 flex items-center justify-center"
          >
            <div
              className="px-6 py-3 text-center"
              style={{
                fontSize: "clamp(1.05rem, 1.55vw, 1.5rem)",
                fontWeight: 600,
                color: "var(--text)",
                borderTop: "4px solid var(--ornament-color)",
                borderBottom: "4px solid var(--ornament-color)",
              }}
            >
              {bottomLine}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ModalityTile({
  item,
  index,
  delay,
  reduce,
}: {
  item: Modality;
  index: number;
  delay: number;
  reduce: boolean;
}) {
  // Alternering primary/alt skugga via CSS-vars. Faller tillbaka till
  // mjuk drop-shadow på teman som inte definierar dekorationer.
  const shadowVar = index % 2 === 0 ? "--card-shadow" : "--card-shadow-alt";
  // Lekfull lutning på memphis_riso, rakt på andra teman.
  // Lutning är okej även utan memphis-stil men dämpas eftersom dekorationen
  // är "off" — slipsen mellan tema och rendering blir tydligare visuellt.
  const tilts = [-1.2, 1.4, -0.8, 1.1, -1.5, 0.9];
  const tilt = reduce ? 0 : tilts[index % tilts.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotate: tilt - 4 }}
      animate={{ opacity: 1, scale: 1, rotate: tilt }}
      transition={{
        duration: 0.55,
        delay: reduce ? 0 : delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="relative flex flex-col items-center justify-center"
      style={{
        background: "var(--bg-surface)",
        border: "var(--card-border, 1px solid var(--text-muted))",
        borderRadius: "var(--radius)",
        boxShadow: `var(${shadowVar}, 0 4px 16px rgba(0,0,0,0.08))`,
        padding: "clamp(0.8rem, 1.4vw, 1.4rem)",
      }}
    >
      {item.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt={item.label}
          style={{
            width: "clamp(2.5rem, 4.5vw, 4.5rem)",
            height: "clamp(2.5rem, 4.5vw, 4.5rem)",
            objectFit: "contain",
          }}
        />
      ) : (
        <span
          className="select-none leading-none"
          style={{
            fontSize: "clamp(2.2rem, 4.5vw, 4.5rem)",
            fontFamily: 'var(--font-display)',
          }}
        >
          {item.icon}
        </span>
      )}

      <div
        className="mt-2 text-center"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: "var(--heading-weight)" as unknown as number,
          fontSize: "clamp(1.05rem, 1.85vw, 1.85rem)",
          color: "var(--text)",
          lineHeight: 1.05,
        }}
      >
        {item.label}
      </div>

      {item.example && (
        <div
          className="mt-1 text-center"
          style={{
            fontSize: "clamp(0.7rem, 0.95vw, 1rem)",
            color: "var(--text-muted)",
            fontWeight: 500,
            lineHeight: 1.25,
          }}
        >
          {item.example}
        </div>
      )}
    </motion.div>
  );
}

export default ModalityGrid;
