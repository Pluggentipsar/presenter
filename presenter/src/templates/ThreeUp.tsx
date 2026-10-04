"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { Lightbox } from "./Lightbox";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface ThreeUpItem {
  image?: string;
  video?: string;
  label: string;
  hint?: string;
  tag?: string;
}

interface ThreeUpProps {
  kicker?: string;
  title: string;
  body?: string;
  background?: string;
  accent?: string;
  stepped?: boolean;
  /** "cover" beskär till cellen (default). "contain" visar hela bilden —
   * använd när bildernas aspect ratio inte matchar cellerna. */
  imageFit?: "cover" | "contain";
  /**
   * Markdown-lista i children, format:
   * - **Label** · hint-text · /path/to/image.png · tag:TagText
   * (tag och image är valfria)
   */
  children?: ReactNode;
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

function parseItems(children: ReactNode): ThreeUpItem[] {
  const items: ThreeUpItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children);
    const parts = raw.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const labelMatch = parts[0].match(/^\*\*(.+?)\*\*$/);
    const label = labelMatch ? labelMatch[1] : parts[0];
    const rest = parts.slice(1);
    let hint: string | undefined;
    let image: string | undefined;
    let video: string | undefined;
    let tag: string | undefined;
    for (const p of rest) {
      if (p.startsWith("video:")) video = p.slice(6).trim();
      else if (p.startsWith("/") || p.startsWith("http")) {
        // Auto-detektera video via filändelse
        if (/\.(mp4|webm|mov)$/i.test(p)) video = p;
        else image = p;
      }
      else if (p.startsWith("tag:")) tag = p.slice(4).trim();
      else if (!hint) hint = p;
    }
    items.push({ label, hint, image, video, tag });
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
  return items;
}

/**
 * Ren editorial 3-kolumners grid för att visa tre jämförbara exempel.
 * Staggered reveal som default.
 */
export function ThreeUp({
  kicker,
  title,
  body,
  background,
  accent = "#B4763A",
  stepped = true,
  imageFit = "cover",
  children,
}: ThreeUpProps) {
  const items = parseItems(children);
  const activeStep = useSlideSteps(stepped ? Math.max(items.length, 1) : 0);
  const [lightbox, setLightbox] = useState<ThreeUpItem | null>(null);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: background ?? "var(--slide-base, var(--bg))",
      }}
    >
      <div
        className="relative flex flex-col h-full"
        style={{
          padding: "clamp(3rem, 5vw, 6rem)",
          zIndex: 2,
          gap: "clamp(1.5rem, 3vh, 3rem)",
        }}
      >
        {/* Intro */}
        <div className="flex flex-col gap-3" style={{ maxWidth: "42em" }}>
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
              <EditableText path="kicker" value={kicker}>
                {kicker}
              </EditableText>
            </motion.div>
          ) : null}
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
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
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
              <EditableText path="body" value={body}>
                {body}
              </EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Grid */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${items.length}, 1fr)`,
            gap: "clamp(1rem, 2vw, 2rem)",
            alignItems: "stretch",
          }}
        >
          {items.map((item, i) => {
            const revealed = stepped ? i <= activeStep : true;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={
                  revealed
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 30 }
                }
                transition={{
                  duration: 0.7,
                  delay: stepped ? 0 : 0.4 + i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <button
                  onClick={() => {
                    if (item.image || item.video) setLightbox(item);
                  }}
                  disabled={!item.image && !item.video}
                  style={{
                    all: "unset",
                    flex: 1,
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    background: "var(--bg-surface)",
                    border: `1px solid ${withAlpha(accent, 0.2)}`,
                    boxShadow:
                      "0 30px 60px -30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(0,0,0,0.06)",
                    position: "relative",
                    cursor: item.image || item.video ? "zoom-in" : "default",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (item.image || item.video) {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = `0 40px 80px -30px rgba(0,0,0,0.3), 0 0 0 1px ${withAlpha(accent, 0.4)} inset, 0 0 30px -10px ${withAlpha(accent, 0.5)}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 30px 60px -30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(0,0,0,0.06)";
                  }}
                >
                  {item.video ? (
                    <>
                      <video
                        src={item.video}
                        muted
                        loop
                        autoPlay
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: imageFit,
                          display: "block",
                          position: "absolute",
                          inset: 0,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          bottom: "0.6rem",
                          right: "0.6rem",
                          width: "2.2rem",
                          height: "2.2rem",
                          borderRadius: "50%",
                          background: "rgba(10,9,8,0.7)",
                          color: "rgba(245,246,250,0.92)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        ▶
                      </div>
                    </>
                  ) : item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt={item.label}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: imageFit,
                        display: "block",
                        position: "absolute",
                        inset: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                        color: `${withAlpha(accent, 0.4)}`,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  )}
                </button>
                <div>
                  {item.tag ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.65rem, 0.8vw, 0.8rem)",
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: accent,
                        marginBottom: "0.4rem",
                      }}
                    >
                      {item.tag}
                    </div>
                  ) : null}
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.1rem, 1.5vw, 1.6rem)",
                      color: "var(--text)",
                      letterSpacing: "-0.015em",
                      lineHeight: 1.1,
                    }}
                  >
                    {item.label}
                  </div>
                  {item.hint ? (
                    <div
                      style={{
                        marginTop: "0.4rem",
                        fontFamily: "var(--font-body)",
                        fontStyle: "italic",
                        fontSize: "clamp(0.85rem, 0.95vw, 1rem)",
                        color: "var(--text-muted)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.hint}
                    </div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Lightbox
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        image={lightbox?.image}
        video={lightbox?.video}
        caption={lightbox ? [lightbox.tag, lightbox.label, lightbox.hint].filter(Boolean).join(" · ") : undefined}
      />
    </div>
  );
}
