"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * NewsMontage — nyhetsklipp (skärmdumpar) som pinnas upp på en korktavla via
 * STAGED REVEAL: varje pil-/space-tryck nålar upp nästa klipp, tills ramen är
 * full av motsägelsefulla AI-rubriker. Byggd som viskeral uppladdning till
 * "AI är inte en sak till"-payoffen — publiken SER att AI är allt på en gång
 * (räddar, hotar, felar, tar jobb, kraschar).
 *
 * Klippen visas i ORIGINALSTORLEK (natural aspect, ingen beskärning) — de är
 * skärmdumpade och olika stora, och den variationen är poängen. Varje klipp
 * har en egen bredd (%); höjden följer bildens naturliga proportion.
 *
 * Ljus-native (dagsljus): vita klipp med hårfin kant + sval mjuk skugga +
 * lätt lutning, scattered och överlappande. Stapelordning efter y-position
 * (klipp längre ner ligger överst).
 *
 * MDX-format — en rad per klipp, `Sökväg · valfri alt-text`:
 * ```mdx
 * <NewsMontage>
 * - /bilder/mitt-deck/superintelligens-hot.png · SVT: superintelligens hotar
 * - /bilder/mitt-deck/ai-svar-fel.png · Aftonbladet: hälften av AI-svaren fel
 * - ...
 * </NewsMontage>
 * ```
 */

interface NewsMontageProps {
  /** Liten mono-kicker uppe till vänster (valfri). */
  kicker?: string;
  children?: ReactNode;
}

interface Clip {
  src: string;
  alt: string;
}

interface Slot {
  top: string;
  left: string;
  width: string;
  rot: number;
}

/**
 * Scatter-positioner + individuella bredder (procent av 16:9-ytan). Ordningen
 * = avtäckningsordning (staged) och hoppar medvetet runt i ramen. Bredderna
 * varierar (breda = liggande klipp, smala = stående) så originalproportionen
 * håller sig inom ramen. Höjden sätts av bildens naturliga aspect.
 */
const SLOTS: Slot[] = [
  { top: "2%", left: "0%", width: "28%", rot: -4 }, // 0 superintelligens (L) top-vänster
  { top: "30%", left: "74%", width: "20%", rot: 3 }, // 1 nvidia-slår (P) mitt-höger
  { top: "0%", left: "69%", width: "27%", rot: -3 }, // 2 jobben (L) top-höger
  { top: "56%", left: "34%", width: "18%", rot: 2 }, // 3 musikelever (P) botten-mitt
  { top: "31%", left: "0%", width: "27%", rot: 4 }, // 4 förbud (L) mitt-vänster
  { top: "2%", left: "36%", width: "18%", rot: 3 }, // 5 ai-svar-fel (P) top-mitt
  { top: "55%", left: "56%", width: "28%", rot: -3 }, // 6 nvidia-ras (L) botten-höger
  { top: "30%", left: "37%", width: "19%", rot: -2 }, // 7 mythos (P) mitt-mitt
  { top: "56%", left: "1%", width: "28%", rot: 4 }, // 8 oligarkin (L) botten-vänster
];

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

function parseClips(children: ReactNode): Clip[] {
  const out: Clip[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const src = (parts[0] ?? "").trim();
    if (!src) return;
    out.push({ src, alt: parts.slice(1).join(" · ").trim() });
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

export function NewsMontage({ kicker, children }: NewsMontageProps) {
  const clips = useMemo(() => parseClips(children), [children]);
  // Staged reveal: step 0 = första klippet, varje klick nålar upp nästa.
  const step = useSlideSteps(clips.length);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 120% 90% at 50% 42%, color-mix(in srgb, var(--accent) 6%, var(--bg)) 0%, var(--bg) 70%)",
      }}
    >
      {kicker ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.5vh, 2.6rem)",
            left: "clamp(2rem, 4vw, 3.2rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 200,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}

      {clips.map((clip, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const visible = step >= i;
        // Stapelordning efter y-position (klipp längre ner överst) → rubriker
        // (som sitter i klippets topp) begravs inte av klipp under dem.
        const zIndex = 10 + Math.round(parseFloat(slot.top));
        return (
          <motion.div
            key={clip.src + i}
            initial={{ opacity: 0, scale: 0.86, y: 42, rotate: slot.rot * 0.3 }}
            animate={{
              opacity: visible ? 1 : 0,
              scale: visible ? 1 : 0.86,
              y: visible ? 0 : 42,
              rotate: visible ? slot.rot : slot.rot * 0.3,
            }}
            transition={{ duration: 0.7, ease: [0.22, 1.12, 0.36, 1] }}
            style={{
              position: "absolute",
              top: slot.top,
              left: slot.left,
              width: slot.width,
              zIndex,
              pointerEvents: visible ? "auto" : "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clip.src}
              alt={clip.alt}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                borderRadius: "0.5rem",
                background: "#ffffff",
                border: "1px solid rgba(22,27,38,0.14)",
                boxShadow:
                  "0 26px 50px -18px rgba(24,34,58,0.32), 0 6px 14px -6px rgba(24,34,58,0.22)",
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
