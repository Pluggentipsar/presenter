"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { buildBackgroundCss } from "@/lib/background";
import { MemphisDecorations } from "./_decorations/MemphisDecorations";

interface VoiceCallAIProps {
  /** Stora frågan/texten i mitten/vänster. Default "Vad är AI?". */
  question?: string;
  /** Klocktid i status bar. Default "09:42". */
  clockTime?: string;
  /** Frivillig label uppe vänster. */
  eyebrow?: string;
  /** Bakgrund — bild eller CSS-värde. Default: temats --bg. */
  background?: string;
  /** Overlay opacity 0-1 ovanpå bakgrund. */
  overlay?: number | string;
  /** Overlay-färg. */
  overlayMode?: "dark" | "light";
  /** Stäng av neuralt nätverk i bakgrunden. */
  hideNetwork?: boolean;
}

interface NetNode {
  id: number;
  x: number;
  y: number;
  layer: number;
  delay: number;
}

interface NetEdge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
}

// ChatGPT-blob och iPhone-mockup använder fasta färger eftersom de
// representerar ChatGPT Voice-UI:t — inte presentations-temat.
const CHATGPT_PINK = "#FF4F8B";
const CHATGPT_BLUE = "#2E5FFF";

function buildNetwork(): { nodes: NetNode[]; edges: NetEdge[] } {
  const layers = [3, 5, 6, 5, 3];
  const layerXs = layers.map((_, i) => 12 + (i * 76) / (layers.length - 1));

  const nodes: NetNode[] = [];
  let nodeId = 0;
  const layerNodes: NetNode[][] = [];

  layers.forEach((count, layerIdx) => {
    const arr: NetNode[] = [];
    for (let i = 0; i < count; i++) {
      const yPct = ((i + 1) / (count + 1)) * 100;
      const jitter = ((i * 31 + layerIdx * 17) % 11) - 5;
      const node: NetNode = {
        id: nodeId++,
        x: layerXs[layerIdx],
        y: yPct + jitter * 0.4,
        layer: layerIdx,
        delay: (layerIdx * 0.18 + i * 0.09) % 1.8,
      };
      nodes.push(node);
      arr.push(node);
    }
    layerNodes.push(arr);
  });

  const edges: NetEdge[] = [];
  for (let l = 0; l < layerNodes.length - 1; l++) {
    const a = layerNodes[l];
    const b = layerNodes[l + 1];
    a.forEach((n1, i) => {
      b.forEach((n2, j) => {
        if (Math.abs(i - j) <= 2) {
          edges.push({
            id: `${n1.id}-${n2.id}`,
            x1: n1.x,
            y1: n1.y,
            x2: n2.x,
            y2: n2.y,
            delay: (l * 0.4 + (i + j) * 0.13) % 2.4,
          });
        }
      });
    });
  }

  return { nodes, edges };
}

const AUDIO_BARS = [
  { delay: 0, dur: 0.7, max: 0.9 },
  { delay: 0.1, dur: 0.55, max: 0.6 },
  { delay: 0.05, dur: 0.45, max: 1.0 },
  { delay: 0.2, dur: 0.6, max: 0.85 },
  { delay: 0.0, dur: 0.5, max: 0.75 },
  { delay: 0.15, dur: 0.65, max: 0.55 },
  { delay: 0.08, dur: 0.5, max: 0.7 },
];

/**
 * Voice-demo-slide.
 *
 * Layout: stor titel vänster + iPhone-mockup höger med ChatGPT Voice-skärm.
 * Bakgrund: subtilt neuralt nätverk (text-färg, opacity-pulserande).
 *
 * Visuella effekter (offset-skuggor, riso-noise, memphis-ornament,
 * cremvit spotlight) styrs av temat. På memphis_riso ser sliden helt ut
 * som tidigare. På andra teman (konjak, minimal) faller
 * dekorationerna bort automatiskt.
 *
 * iPhone:n och ChatGPT-bloben behåller sina pink/blå färger eftersom de
 * representerar ChatGPT Voice — inte presentations-temat.
 */
export function VoiceCallAI({
  question = "Vad är AI?",
  clockTime = "09:42",
  eyebrow,
  background,
  overlay,
  overlayMode = "light",
  hideNetwork = false,
}: VoiceCallAIProps) {
  const reduce = useReducedMotion();
  const network = useMemo(buildNetwork, []);

  const bgStyle: React.CSSProperties = {
    background: buildBackgroundCss(background, overlay, overlayMode),
  };

  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle}>
      <MemphisDecorations variant="voice" />

      {/* Neuralt nätverk — använder text-färgen så det fungerar på alla teman */}
      {!hideNetwork && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: "30%",
            right: "5%",
            top: "10%",
            bottom: "10%",
            opacity: 0.45,
            color: "var(--text)",
          }}
          aria-hidden
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            {network.edges.map((edge) => (
              <motion.line
                key={edge.id}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                stroke="currentColor"
                strokeWidth={0.15}
                vectorEffect="non-scaling-stroke"
                initial={{ opacity: 0.18 }}
                animate={
                  reduce ? { opacity: 0.28 } : { opacity: [0.15, 0.42, 0.15] }
                }
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: 3.4,
                        repeat: Infinity,
                        delay: edge.delay,
                        ease: "easeInOut",
                      }
                }
              />
            ))}
            {network.nodes.map((node) => (
              <motion.circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={1.1}
                fill="currentColor"
                vectorEffect="non-scaling-stroke"
                initial={{ opacity: 0.45 }}
                animate={
                  reduce
                    ? { opacity: 0.65 }
                    : { opacity: [0.35, 0.95, 0.35] }
                }
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: 2.4,
                        repeat: Infinity,
                        delay: node.delay,
                        ease: "easeInOut",
                      }
                }
              />
            ))}
          </svg>
        </div>
      )}

      {/* Spotlight: cremvit radial från vänster — synlig bara på memphis_riso */}
      <div
        className="memphis-voice-spotlight pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div className="relative z-10 grid h-full w-full grid-cols-12 items-center gap-8 px-12 lg:px-20">
        <div className="col-span-7 flex h-full flex-col justify-center">
          {eyebrow && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 inline-block self-start font-mono text-xs uppercase tracking-[0.25em]"
              style={{ color: "var(--text-muted)" }}
            >
              {eyebrow}
            </motion.div>
          )}
          <motion.h1
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.85,
              delay: 0.2,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="leading-[0.92] tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: "var(--heading-weight)" as unknown as number,
              fontSize: "clamp(4rem, 11vw, 11rem)",
              color: "var(--text)",
              textShadow: "var(--title-shadow, none)",
            }}
          >
            {question}
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 1, ease: "easeOut" }}
            className="mt-8"
            style={{
              height: "8px",
              width: "min(20vw, 220px)",
              background: "var(--ornament-color)",
              transformOrigin: "left",
              borderRadius: "4px",
            }}
            aria-hidden
          />
        </div>

        <div className="col-span-5 flex h-full items-center justify-center">
          <Phone clockTime={clockTime} reduce={!!reduce} />
        </div>
      </div>
    </div>
  );
}

function Phone({ clockTime, reduce }: { clockTime: string; reduce: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
      style={{
        width: "min(28vw, 380px)",
        aspectRatio: "9 / 19.5",
        filter:
          "drop-shadow(8px 8px 0 var(--text)) drop-shadow(0 30px 50px rgba(0,0,0,0.25))",
      }}
    >
      <div
        className="absolute inset-0 rounded-[14%]"
        style={{
          background:
            "linear-gradient(135deg, #2a2a2e 0%, #1a1a1e 25%, #3a3a40 50%, #1a1a1e 75%, #2a2a2e 100%)",
          padding: "3.5%",
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden rounded-[11%]"
          style={{
            background: "#000",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 24px rgba(0,0,0,0.6)",
          }}
        >
          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-[8%] pt-[5%] text-white">
            <span className="text-[clamp(0.7rem,1vw,1rem)] font-semibold tracking-tight">
              {clockTime}
            </span>
            <div className="flex items-center gap-[6px]">
              <svg width="16" height="10" viewBox="0 0 16 10" fill="white">
                <rect x="0" y="6" width="3" height="4" rx="0.5" />
                <rect x="4" y="4" width="3" height="6" rx="0.5" />
                <rect x="8" y="2" width="3" height="8" rx="0.5" />
                <rect x="12" y="0" width="3" height="10" rx="0.5" />
              </svg>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="white">
                <path d="M7 9.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3.5-3a4.5 4.5 0 0 1 7 0l1.4-1.4a6.5 6.5 0 0 0-9.8 0L3.5 6.5zm-2.5-2.5a8 8 0 0 1 12 0l1.4-1.4A10 10 0 0 0 0 2.6L1 4z" />
              </svg>
              <div className="flex items-center">
                <div
                  className="relative rounded-[2px] border"
                  style={{
                    width: "22px",
                    height: "10px",
                    borderColor: "rgba(255,255,255,0.5)",
                  }}
                >
                  <div
                    className="absolute left-[1px] top-[1px] bottom-[1px] rounded-[1px] bg-white"
                    style={{ width: "calc(80% - 2px)" }}
                  />
                </div>
                <div
                  className="bg-white/50"
                  style={{
                    width: "1.5px",
                    height: "4px",
                    marginLeft: "1px",
                    borderRadius: "0 1px 1px 0",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-black"
            style={{
              top: "2.8%",
              width: "32%",
              height: "4.2%",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          />

          <VoiceScreen reduce={reduce} />

          <div
            className="absolute bottom-[1.2%] left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/85"
            style={{ width: "34%", height: "0.6%" }}
          />
        </div>
      </div>

      <div
        className="absolute -left-[1.5%] rounded-full bg-[#15151a]"
        style={{ top: "16%", width: "1.5%", height: "5%" }}
      />
      <div
        className="absolute -left-[1.5%] rounded-full bg-[#15151a]"
        style={{ top: "24%", width: "1.5%", height: "8%" }}
      />
      <div
        className="absolute -left-[1.5%] rounded-full bg-[#15151a]"
        style={{ top: "34%", width: "1.5%", height: "8%" }}
      />
      <div
        className="absolute -right-[1.5%] rounded-full bg-[#15151a]"
        style={{ top: "22%", width: "1.5%", height: "12%" }}
      />
    </motion.div>
  );
}

function VoiceScreen({ reduce }: { reduce: boolean }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-between pb-[10%] pt-[16%]">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="text-[clamp(0.75rem,1.1vw,1.1rem)] font-medium tracking-wide text-white/80"
      >
        ChatGPT
      </motion.div>

      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "220%",
            aspectRatio: "1",
            background: `radial-gradient(circle, ${CHATGPT_PINK}40 0%, transparent 70%)`,
            filter: "blur(20px)",
          }}
          animate={
            reduce ? undefined : { scale: [1, 1.18, 1], opacity: [0.4, 0.85, 0.4] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "150%",
            aspectRatio: "1",
            background: `radial-gradient(circle, ${CHATGPT_BLUE}80 0%, ${CHATGPT_PINK}40 50%, transparent 75%)`,
            filter: "blur(10px)",
          }}
          animate={reduce ? undefined : { scale: [1, 1.1, 1] }}
          transition={
            reduce
              ? undefined
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.div
          className="relative"
          style={{
            width: "min(14vw, 180px)",
            aspectRatio: "1",
            background: `radial-gradient(circle at 35% 30%, #ffe8f1 0%, ${CHATGPT_PINK} 30%, ${CHATGPT_BLUE} 75%, #1a3d99 100%)`,
            boxShadow: `inset -8px -8px 24px rgba(20,40,90,0.5), inset 8px 8px 16px rgba(255,255,255,0.3), 0 0 50px ${CHATGPT_PINK}80`,
          }}
          animate={
            reduce
              ? { borderRadius: "50%" }
              : {
                  borderRadius: [
                    "50% 50% 50% 50%",
                    "55% 45% 50% 50%",
                    "47% 53% 48% 52%",
                    "52% 48% 55% 45%",
                    "50% 50% 50% 50%",
                  ],
                  scale: [1, 1.05, 0.97, 1.06, 1],
                }
          }
          transition={
            reduce
              ? undefined
              : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <div
            className="absolute rounded-full"
            style={{
              top: "12%",
              left: "20%",
              width: "30%",
              aspectRatio: "1",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.65) 0%, transparent 60%)",
              filter: "blur(4px)",
            }}
          />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          className="flex items-end gap-[3px]"
          style={{ height: "clamp(16px, 2.4vw, 32px)" }}
        >
          {AUDIO_BARS.map((bar, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: "clamp(2px, 0.35vw, 4px)",
                height: "100%",
                background: "#fff",
                originY: 1,
              }}
              animate={
                reduce
                  ? { scaleY: 0.5 }
                  : {
                      scaleY: [0.2, bar.max, 0.35, bar.max * 0.8, 0.25, bar.max * 0.95, 0.3],
                    }
              }
              transition={
                reduce
                  ? undefined
                  : {
                      duration: bar.dur,
                      repeat: Infinity,
                      delay: bar.delay,
                      ease: "easeInOut",
                    }
              }
            />
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-[clamp(0.7rem,0.95vw,0.95rem)] tracking-wide text-white/70"
        >
          Lyssnar…
        </motion.div>

        <div className="mt-2 flex items-center gap-[clamp(8px,1.2vw,18px)]">
          <div
            className="flex items-center justify-center rounded-full bg-white/15 backdrop-blur"
            style={{
              width: "clamp(32px, 4vw, 56px)",
              aspectRatio: "1",
            }}
          >
            <div className="flex gap-[2px]">
              <div
                className="rounded-sm bg-white"
                style={{ width: "3px", height: "clamp(10px,1.4vw,18px)" }}
              />
              <div
                className="rounded-sm bg-white"
                style={{ width: "3px", height: "clamp(10px,1.4vw,18px)" }}
              />
            </div>
          </div>
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: "clamp(32px, 4vw, 56px)",
              aspectRatio: "1",
              background: `radial-gradient(circle at 35% 30%, #ff8b8b 0%, ${CHATGPT_PINK} 70%)`,
              boxShadow: `inset -2px -2px 6px rgba(120,0,40,0.5), inset 2px 2px 4px rgba(255,255,255,0.3), 0 4px 12px ${CHATGPT_PINK}66`,
            }}
          >
            <svg
              width="50%"
              height="50%"
              viewBox="0 0 24 24"
              fill="white"
              style={{ transform: "rotate(135deg)" }}
            >
              <path d="M21 15.5a13 13 0 0 1-7.5 2.4 13 13 0 0 1-7.5-2.4c-.4-.3-.7-.7-.7-1.2v-2.5c0-.5.3-1 .8-1.2 1-.5 2-.9 3.1-1.2.5-.1 1 .1 1.3.6l1.3 2c2.2-1 4.7-1 6.9 0l1.3-2c.3-.5.8-.7 1.3-.6 1.1.3 2.1.7 3.1 1.2.5.2.8.7.8 1.2v2.5c0 .5-.3.9-.7 1.2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceCallAI;
