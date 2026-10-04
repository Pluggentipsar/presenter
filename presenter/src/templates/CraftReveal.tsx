"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CraftReveal — stegat "galleri" där publiken klickar fram en AI-genererad
 * artefakt i taget: en bild, en video eller ett chattflöde. Byggt för
 * cold-open-poängen "maskinen gör produkten på tjugo sekunder" — varje hantverk
 * (journalistik, grafisk form, musik, text) får sin egen reveal i glas-ram med
 * etikett, bildtext och en progress-rail i botten.
 *
 * Stegsystem: ett steg per artefakt. Artefakt 0 syns direkt, sedan klickar man
 * fram resten. Bara den aktiva artefakten är monterad (AnimatePresence mode
 * "wait") — så video spelar/pausar och chatten typas om vid varje reveal.
 *
 * MDX-format — en rad per artefakt:
 *   `kind · label · title · caption · payload`
 *   kind = image | video | chat
 *   payload (image/video) = sökväg
 *   payload (chat) = `Prompt :: Svar` (svaret typas fram)
 *
 * ```mdx
 * <CraftReveal kicker="§ Igår kväll" title="Tjugo sekunder. Fyra hantverk." stampLabel="≈20 sek">
 * - image · Journalistik · Nyhetsartikeln · Rubrik, ingress, citat. · /bilder/folkhogskola/nyhetsartikel.png
 * - video · Musik · Låten · Text, melodi och sång. · /bilder/folkhogskola/pa-allman-linje.mp4
 * - chat · Allmän linje · Uppsatsen · Inlämning på fredag. · Skriv en uppsats om X :: Folkbildningen föddes ur…
 * </CraftReveal>
 * ```
 */

type CraftKind = "image" | "video" | "chat";

interface Craft {
  kind: CraftKind;
  label: string;
  title: string;
  caption: string;
  src?: string;
  prompt?: string;
  response?: string;
}

interface CraftRevealProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  stampLabel?: string;
  accent?: string;
  background?: string;
  overlay?: number | string;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseCrafts(children: ReactNode): Craft[] {
  const out: Craft[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const kind = (parts[0] ?? "").trim().toLowerCase() as CraftKind;
    const label = (parts[1] ?? "").trim();
    const title = (parts[2] ?? "").trim();
    const caption = (parts[3] ?? "").trim();
    const payload = parts.slice(4).join(" · ").trim();
    if (!title) return;
    if (kind === "chat") {
      const [prompt, response] = payload.split(/\s*::\s*/);
      out.push({
        kind: "chat",
        label,
        title,
        caption,
        prompt: (prompt ?? "").trim(),
        response: (response ?? "").trim(),
      });
    } else {
      out.push({ kind: kind === "video" ? "video" : "image", label, title, caption, src: payload });
    }
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

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = Number.isFinite(overlay) ? Math.max(0, Math.min(1, overlay)) : 0.6;
    return `linear-gradient(rgba(6,7,12,${a}), rgba(6,7,12,${Math.min(1, a + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function renderInline(text: string, accent: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <span key={i} style={{ color: accent, fontWeight: 700 }}>
          {p.slice(2, -2)}
        </span>
      );
    if (p.startsWith("*") && p.endsWith("*"))
      return (
        <em key={i} style={{ fontStyle: "italic" }}>
          {p.slice(1, -1)}
        </em>
      );
    return <span key={i}>{p}</span>;
  });
}

// ── Glas-ram runt en artefakt ────────────────────────────────────────────────
function glassFrameStyle(accent: string): CSSProperties {
  return {
    position: "relative",
    borderRadius: 20,
    padding: 14,
    background: `linear-gradient(135deg, ${withAlpha(accent, 0.06)} 0%, rgba(127,127,127,0.04) 50%, ${withAlpha(accent, 0.05)} 100%)`,
    backdropFilter: "blur(22px) saturate(170%)",
    WebkitBackdropFilter: "blur(22px) saturate(170%)",
    border: "1px solid rgba(127,127,127,0.22)",
    borderTopColor: withAlpha(accent, 0.3),
    boxShadow: `0 30px 80px -28px rgba(0,0,0,0.35), 0 0 60px -10px ${withAlpha(accent, 0.35)}, inset 0 1px 0 rgba(255,255,255,0.18)`,
  };
}

function Specular() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "inherit",
        background:
          "linear-gradient(120deg, rgba(255,255,255,0.16) 0%, transparent 30%, transparent 72%, rgba(122,168,255,0.10) 100%)",
        pointerEvents: "none",
      }}
    />
  );
}

// ── Artefakt: video ──────────────────────────────────────────────────────────
function VideoArtifact({ src, accent }: { src: string; accent: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    try {
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* autoplay kan blockeras — controls finns som fallback */
    }
  }, [src]);
  return (
    <div style={{ ...glassFrameStyle(accent), maxWidth: "min(78%, 1080px)", maxHeight: "100%" }}>
      <Specular />
      <video
        ref={ref}
        src={src}
        controls
        playsInline
        autoPlay
        style={{
          display: "block",
          maxHeight: "62vh",
          maxWidth: "100%",
          borderRadius: 12,
          background: "#000",
        }}
      />
    </div>
  );
}

// ── Artefakt: bild ───────────────────────────────────────────────────────────
function ImageArtifact({ src, alt, accent }: { src: string; alt: string; accent: string }) {
  return (
    <div style={{ ...glassFrameStyle(accent), maxWidth: "min(72%, 920px)", maxHeight: "100%" }}>
      <Specular />
      <img
        src={src}
        alt={alt}
        style={{
          display: "block",
          maxHeight: "64vh",
          maxWidth: "100%",
          borderRadius: 12,
          objectFit: "contain",
        }}
      />
    </div>
  );
}

// ── Artefakt: chattflöde (svaret typas fram) ─────────────────────────────────
function ChatArtifact({
  prompt,
  response,
  accent,
}: {
  prompt: string;
  response: string;
  accent: string;
}) {
  const [typed, setTyped] = useState("");
  const [thinking, setThinking] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    setTyped("");
    setThinking(true);
    const startId = setTimeout(() => {
      setThinking(false);
      let i = 0;
      intervalId = setInterval(() => {
        i += 1;
        setTyped(response.slice(0, i));
        if (i >= response.length && intervalId) clearInterval(intervalId);
      }, 13);
    }, 750);
    return () => {
      clearTimeout(startId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [response]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [typed, thinking]);

  const done = typed.length >= response.length;

  return (
    <div
      style={{
        ...glassFrameStyle(accent),
        width: "min(680px, 84%)",
        maxHeight: "66vh",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
      }}
    >
      <Specular />
      {/* fönsterlist */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid rgba(127,127,127,0.2)",
          flexShrink: 0,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 99, background: withAlpha(accent, 0.55) }} />
        <span style={{ width: 10, height: 10, borderRadius: 99, background: withAlpha(accent, 0.38) }} />
        <span style={{ width: 10, height: 10, borderRadius: 99, background: withAlpha(accent, 0.24) }} />
        <span
          style={{
            marginLeft: 8,
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          AI · uppsats
        </span>
      </div>

      {/* meddelanden */}
      <div
        ref={scrollRef}
        style={{
          padding: "18px 18px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {/* prompt (höger, accent) */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              maxWidth: "82%",
              padding: "11px 15px",
              borderRadius: "16px 16px 4px 16px",
              background: withAlpha(accent, 0.16),
              border: `1px solid ${withAlpha(accent, 0.32)}`,
              color: "var(--text)",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.92rem, 1.1vw, 1.05rem)",
              lineHeight: 1.45,
            }}
          >
            {prompt}
          </div>
        </div>

        {/* svar (vänster, glas) */}
        <div style={{ display: "flex", justifyContent: "flex-start", gap: 10, alignItems: "flex-end" }}>
          <span
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              borderRadius: 99,
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: accent,
              background: withAlpha(accent, 0.14),
              border: `1px solid ${withAlpha(accent, 0.3)}`,
            }}
          >
            AI
          </span>
          <div
            style={{
              maxWidth: "88%",
              padding: "12px 16px",
              borderRadius: "16px 16px 16px 4px",
              background: "rgba(127,127,127,0.1)",
              border: "1px solid rgba(127,127,127,0.18)",
              color: "var(--text)",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.92rem, 1.1vw, 1.05rem)",
              lineHeight: 1.55,
              minHeight: "1.4em",
            }}
          >
            {thinking ? (
              <span style={{ display: "inline-flex", gap: 5, padding: "2px 0" }}>
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                    transition={{ duration: 1, repeat: Infinity, delay: d * 0.18 }}
                    style={{ width: 7, height: 7, borderRadius: 99, background: accent }}
                  />
                ))}
              </span>
            ) : (
              <>
                {typed}
                {!done && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: "1.05em",
                      marginLeft: 2,
                      verticalAlign: "text-bottom",
                      background: accent,
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CraftReveal({
  kicker,
  title,
  subtitle,
  stampLabel = "≈20 sek",
  accent = "var(--accent)",
  background,
  overlay = 0.6,
  children,
}: CraftRevealProps) {
  const crafts = useMemo(() => parseCrafts(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;
  const step = useSlideSteps(Math.max(1, crafts.length));
  const active = Math.min(Math.max(step, 0), Math.max(0, crafts.length - 1));
  const current = crafts[active];

  // En bild-bakgrund får ett mörkt scrim (se resolveBackground) — då måste
  // texten ovanpå vara fast ljus oavsett tema. Utan bild följer texten temat.
  const onPhoto = !!background && (background.startsWith("/") || background.startsWith("http"));
  const textColor = onPhoto ? "rgba(245,246,250,0.92)" : "var(--text)";
  const mutedColor = onPhoto ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "clamp(2rem, 4.5vh, 3.4rem)",
          left: "clamp(2.5rem, 5vw, 5rem)",
          right: "clamp(2.5rem, 5vw, 5rem)",
          zIndex: 3,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "2rem",
        }}
      >
        <div style={{ maxWidth: "70%" }}>
          {kicker ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.92rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: accent,
                marginBottom: "0.6rem",
              }}
            >
              {kicker}
            </div>
          ) : null}
          {title ? (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.7rem, 3vw, 2.7rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                color: textColor,
                margin: 0,
              }}
            >
              {renderInline(title, accent)}
            </h2>
          ) : null}
          {subtitle ? (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.15vw, 1.15rem)",
                color: mutedColor,
                marginTop: "0.45rem",
              }}
            >
              {renderInline(subtitle, accent)}
            </div>
          ) : null}
        </div>

        {/* Stämpel */}
        {stampLabel ? (
          <div
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 99,
              background: withAlpha(accent, 0.12),
              border: `1px solid ${withAlpha(accent, 0.3)}`,
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.85vw, 0.85rem)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: accent,
              backdropFilter: "blur(10px)",
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1], scale: [1, 0.82, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: 99, background: accent }}
            />
            {stampLabel}
          </div>
        ) : null}
      </div>

      {/* Mitten: etikett + scen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: "clamp(8rem, 18vh, 11rem)",
          paddingBottom: "clamp(5.5rem, 12vh, 7.5rem)",
          paddingLeft: "clamp(2.5rem, 5vw, 5rem)",
          paddingRight: "clamp(2.5rem, 5vw, 5rem)",
          display: "grid",
          gridTemplateColumns: "minmax(220px, 300px) 1fr",
          gap: "clamp(1.5rem, 3vw, 3rem)",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        {/* Etikett-kolumn */}
        <div style={{ position: "relative", minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(4rem, 9vw, 8rem)",
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              color: withAlpha(accent, 0.16),
              marginBottom: "0.4rem",
            }}
          >
            0{active + 1}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.72rem, 0.95vw, 0.95rem)",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: accent,
                  marginBottom: "0.5rem",
                }}
              >
                {current?.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(1.7rem, 2.6vw, 2.6rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: textColor,
                  marginBottom: "0.7rem",
                }}
              >
                {current?.title}
              </div>
              {current?.caption ? (
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(0.95rem, 1.2vw, 1.15rem)",
                    fontStyle: "italic",
                    lineHeight: 1.45,
                    color: mutedColor,
                    borderLeft: `2px solid ${withAlpha(accent, 0.5)}`,
                    paddingLeft: "0.8rem",
                  }}
                >
                  {current.caption}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scen */}
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 26, scale: 0.95, rotate: -0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, y: -18, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {current?.kind === "video" && current.src ? (
                <VideoArtifact src={current.src} accent={accent} />
              ) : current?.kind === "chat" ? (
                <ChatArtifact
                  prompt={current.prompt ?? ""}
                  response={current.response ?? ""}
                  accent={accent}
                />
              ) : current?.src ? (
                <ImageArtifact src={current.src} alt={current.title} accent={accent} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress-rail */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(1.8rem, 4vh, 2.8rem)",
          left: "clamp(2.5rem, 5vw, 5rem)",
          right: "clamp(2.5rem, 5vw, 5rem)",
          zIndex: 3,
          display: "flex",
          gap: "clamp(0.5rem, 1.2vw, 1rem)",
        }}
      >
        {crafts.map((c, i) => {
          const isActive = i === active;
          const isDone = i < active;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  height: 3,
                  borderRadius: 99,
                  background: isActive
                    ? accent
                    : isDone
                    ? withAlpha(accent, 0.5)
                    : onPhoto
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(127,127,127,0.25)",
                  boxShadow: isActive ? `0 0 12px ${withAlpha(accent, 0.7)}` : "none",
                  transition: "background 0.4s, box-shadow 0.4s",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  opacity: isActive ? 1 : isDone ? 0.6 : 0.32,
                  transition: "opacity 0.4s",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    color: isActive ? accent : mutedColor,
                  }}
                >
                  0{i + 1}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "clamp(0.85rem, 1.05vw, 1.05rem)",
                    color: isActive ? textColor : mutedColor,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
