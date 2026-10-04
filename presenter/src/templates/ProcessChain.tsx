"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ProcessNode {
  label: string;
  hint?: string;
  kind?: "text" | "image" | "audio" | "video" | "code" | "story";
  image?: string;
}

interface ProcessChainProps {
  kicker?: string;
  title?: string;
  body?: string;
  background?: string;
  accent?: string;
  overlay?: number | string;
  direction?: "horizontal" | "vertical";
  /**
   * Markdown-lista i children, format:
   * - **Label** · hint-text · kind[:image-url]
   * Exempel: `- **Podcast** · NotebookLM · audio`
   */
  children?: ReactNode;
}

function resolveBackground(bg: string | undefined, overlay: number | string = 0.55): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const n = typeof overlay === "string" ? parseFloat(overlay) : overlay;
    const safe = Number.isFinite(n) ? n : 0.55;
    const a = Math.max(0, Math.min(1, safe));
    const b = Math.min(1, a + 0.18);
    return `linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${b})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
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

function parseNodes(children: ReactNode): ProcessNode[] {
  const nodes: ProcessNode[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children);
    // Splitta på · separator
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    // Första delen kan vara **Label** eller vanlig text
    const labelMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const label = labelMatch ? labelMatch[1] : parts[0];
    const rest = parts.slice(1);
    let hint: string | undefined;
    let kind: ProcessNode["kind"] = "text";
    let image: string | undefined;
    for (const p of rest) {
      const kindMatch = p.match(/^(text|image|audio|video|code|story)(?::(.+))?$/);
      if (kindMatch) {
        kind = kindMatch[1] as ProcessNode["kind"];
        if (kindMatch[2]) image = kindMatch[2].trim();
      } else if (!hint) {
        hint = p;
      }
    }
    nodes.push({ label, hint, kind, image });
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
  return nodes;
}

const KIND_GLYPH: Record<NonNullable<ProcessNode["kind"]>, string> = {
  text: "¶",
  image: "◩",
  audio: "♪",
  video: "▶",
  code: "{}",
  story: "✦",
};

/**
 * Transformationskedja — 3–5 noder i rad med linjer som ritas in mellan dem.
 * Varje nod avslöjas i sekvens via slide-steg (space).
 */
export function ProcessChain({
  kicker,
  title,
  body,
  background,
  accent = "#B4763A",
  overlay,
  direction = "horizontal",
  children,
}: ProcessChainProps) {
  const nodes = parseNodes(children);
  // Step 0 visar första noden, step N visar alla noder + alla kopplingar
  const activeStep = useSlideSteps(Math.max(nodes.length, 1));
  // Step 0: bara text synlig
  // Step 1..n: n:te noden synlig

  const horizontal = direction === "horizontal";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: resolveBackground(background, overlay),
      }}
    >
      {/* Subtil glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% 60%, ${withAlpha(accent, 0.06)} 0%, transparent 70%)`,
        }}
      />

      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(3rem, 5vw, 6rem)",
          zIndex: 2,
        }}
      >
        {/* Text-intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "40em" }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(2.5rem, 5.5vw, 5rem)",
                lineHeight: 1.02,
                letterSpacing: "-0.025em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {body ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                lineHeight: 1.55,
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              <EditableText path="body" value={body ?? ""}>{body}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Kedjan */}
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            marginTop: "clamp(2rem, 4vh, 4rem)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: horizontal ? "row" : "column",
              alignItems: "center",
              justifyContent: "center",
              gap: horizontal ? "clamp(1rem, 2vw, 2.5rem)" : "1.5rem",
              width: "100%",
              maxWidth: "100%",
            }}
          >
            {nodes.map((node, i) => {
              const revealed = i <= activeStep;
              const showConnector = i < nodes.length - 1;
              const connectorRevealed = i < activeStep;
              const glyph = KIND_GLYPH[node.kind ?? "text"];

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: horizontal ? "row" : "column",
                    alignItems: "center",
                    flex: horizontal ? "0 1 auto" : undefined,
                  }}
                >
                  {/* Nod */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.92 }}
                    animate={
                      revealed
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 20, scale: 0.92 }
                    }
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.75rem",
                      minWidth: "8rem",
                      maxWidth: "12rem",
                    }}
                  >
                    <div
                      style={{
                        width: "clamp(5rem, 8vw, 7rem)",
                        height: "clamp(5rem, 8vw, 7rem)",
                        borderRadius: "1.2rem",
                        background: node.image
                          ? "#0a0908"
                          : "var(--bg-elevated)",
                        border: `1px solid ${withAlpha(accent, 0.33)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        boxShadow: `0 20px 40px -20px ${withAlpha(accent, 0.31)}, inset 0 1px 0 ${withAlpha(accent, 0.08)}`,
                      }}
                    >
                      {node.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={node.image}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: "clamp(1.5rem, 2.5vw, 2.3rem)",
                            color: accent,
                          }}
                        >
                          {glyph}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 600,
                          fontSize: "clamp(0.95rem, 1.1vw, 1.2rem)",
                          color: "var(--text)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {node.label}
                      </div>
                      {node.hint ? (
                        <div
                          style={{
                            fontFamily: "var(--font-body)",
                            fontStyle: "italic",
                            fontSize: "clamp(0.75rem, 0.85vw, 0.9rem)",
                            color: "var(--text-muted)",
                            marginTop: "0.25rem",
                            lineHeight: 1.3,
                            maxWidth: "12em",
                          }}
                        >
                          {node.hint}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>

                  {/* Linje mellan noder */}
                  {showConnector ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: horizontal ? "clamp(2rem, 4vw, 4rem)" : "2px",
                        height: horizontal ? "2px" : "clamp(2rem, 4vh, 3rem)",
                        position: "relative",
                        alignSelf: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: `${withAlpha(accent, 0.15)}`,
                          position: "absolute",
                          inset: 0,
                        }}
                      />
                      <motion.div
                        initial={{
                          [horizontal ? "scaleX" : "scaleY"]: 0,
                        }}
                        animate={{
                          [horizontal ? "scaleX" : "scaleY"]: connectorRevealed
                            ? 1
                            : 0,
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{
                          width: "100%",
                          height: "100%",
                          background: accent,
                          position: "absolute",
                          inset: 0,
                          transformOrigin: horizontal ? "left" : "top",
                          boxShadow: `0 0 8px ${withAlpha(accent, 0.5)}`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
