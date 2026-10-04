"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TypedChat — en konversation som TYPAS FRAM automatiskt, meddelande för
 * meddelande, bredvid (valfri) prompt. Visar "så här svarar AI:n" live.
 *
 * Bubblor skiljs åt på sida + färg + namn: användaren till höger (accent),
 * AI:n till vänster (aiAccent). Radbrytning i ett meddelande med `||`
 * (dubbelt = blankrad).
 *
 * ```mdx
 * <TypedChat chapter="§ …" title="…" tool="Copilot" prompt="…" userLabel="Eleven" aiLabel="Copilot">
 * - **Copilot:** Du vaknar i en skog. || 1. Spring || 2. Göm dig
 * - **Eleven:** 2
 * - **Copilot:** Du gömmer dig …
 * </TypedChat>
 * ```
 */

interface Msg { label?: string; text: string; }

interface TypedChatProps {
  chapter?: string;
  title?: string;
  tool?: string;
  prompt?: string;
  userLabel?: string;
  aiLabel?: string;
  /** ms per tecken. Default 20. */
  typeSpeed?: number;
  accent?: string;
  aiAccent?: string;
  background?: string;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

function parseMsgs(children: ReactNode): Msg[] {
  const out: Msg[] = [];
  // markdown gör `**Namn:**` till <strong> innan vi ser det
  const splitBold = (kids: ReactNode): { label: string; text: string } | null => {
    let arr = Children.toArray(kids);
    if (arr.length === 1 && isValidElement(arr[0]) && (arr[0] as ReactElement).type === "p") {
      arr = Children.toArray((arr[0] as ReactElement<{ children?: ReactNode }>).props.children);
    }
    const first = arr[0];
    if (isValidElement(first) && ((first as ReactElement).type === "strong" || (first as ReactElement).type === "b")) {
      const label = extractText((first as ReactElement<{ children?: ReactNode }>).props.children).replace(/[:：]\s*$/, "").trim();
      const text = extractText(arr.slice(1)).replace(/^\s+/, "");
      return { label, text };
    }
    return null;
  };
  const nl = (s: string) => s.replace(/\s*\|\|\s*/g, "\n").trim();
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const bold = splitBold(li.props.children);
    if (bold && bold.label) { out.push({ label: bold.label, text: nl(bold.text) }); return; }
    const colon = raw.match(/^([^:]{1,16}):\s+(.+)$/s);
    if (colon) { out.push({ label: colon[1].trim(), text: nl(colon[2].trim()) }); return; }
    out.push({ text: nl(raw) });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") walkLi(li as ReactElement<{ children?: ReactNode }>);
      });
    } else if (el.type === "li") walkLi(el);
  });
  return out;
}

export function TypedChat({
  chapter,
  title,
  tool = "Copilot",
  prompt,
  userLabel = "Du",
  aiLabel = "Copilot",
  typeSpeed = 20,
  accent = "var(--accent)",
  aiAccent = "var(--accent-2, #9D7AFF)",
  background,
  children,
}: TypedChatProps) {
  const msgs = parseMsgs(children);
  const isUser = (label?: string) => !!label && label.toLowerCase().startsWith((userLabel ?? "").toLowerCase());

  const [doneCount, setDoneCount] = useState(0);
  const [partial, setPartial] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let idx = 0;
    const typeNext = () => {
      if (cancelled) return;
      if (idx >= msgs.length) return;
      const text = msgs[idx].text;
      let c = 0;
      const tick = () => {
        if (cancelled) return;
        c += 1;
        setPartial(text.slice(0, c));
        if (c < text.length) { timer = setTimeout(tick, typeSpeed); }
        else { setDoneCount(idx + 1); setPartial(""); idx += 1; timer = setTimeout(typeNext, 600); }
      };
      timer = setTimeout(tick, 450);
    };
    typeNext();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // synliga bubblor
  const rawBubbles: { text: string; user: boolean; typing: boolean }[] = [];
  msgs.forEach((m, i) => {
    if (i < doneCount) rawBubbles.push({ text: m.text, user: isUser(m.label), typing: false });
    else if (i === doneCount && partial) rawBubbles.push({ text: partial, user: isUser(m.label), typing: true });
  });
  let prevUser: boolean | null = null;
  const bubbles = rawBubbles.map((x, i) => {
    const showName = prevUser !== x.user;
    prevUser = x.user;
    return { ...x, showName, name: x.user ? userLabel : aiLabel };
  });

  const hasImageBg =
    !!background &&
    (background.startsWith("/") || background.startsWith("http"));

  const bg = background
    ? hasImageBg
      ? `linear-gradient(rgba(10,9,8,0.72), rgba(10,9,8,0.84)), url('${background}') center/cover no-repeat`
      : background
    : "var(--slide-base, var(--bg))";

  // Med en dark-scrim-foto-bakgrund måste titel/kicker stå fixed-light för
  // läsbarhet oavsett tema; annars följ tema-tokens.
  const headingColor = hasImageBg ? "rgba(245,246,250,0.92)" : "var(--text)";
  const kickerColor = hasImageBg ? "rgba(245,246,250,0.6)" : "var(--text-muted)";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      <div className="relative flex h-full w-full flex-col" style={{ padding: "clamp(2rem, 4vw, 4rem)", gap: "clamp(0.9rem, 2vh, 1.5rem)", zIndex: 2 }}>
        {(chapter || title) ? (
          <div className="flex flex-col" style={{ gap: "0.4rem", maxWidth: "46em" }}>
            {chapter ? <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)", letterSpacing: "0.3em", textTransform: "uppercase", color: kickerColor }}>{chapter}</div> : null}
            {title ? <h2 style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)", fontSize: "clamp(1.6rem, 3vw, 2.6rem)", lineHeight: 1.05, letterSpacing: "-0.02em", color: headingColor, margin: 0 }}>{title}</h2> : null}
          </div>
        ) : null}

        <div className="flex-1" style={{ display: "flex", flexWrap: "wrap", gap: "clamp(1rem, 2.5vw, 2rem)", alignItems: "stretch", minHeight: 0 }}>
          {/* PROMPT */}
          {prompt ? (
            <div style={{ flex: "1 1 16rem", minWidth: "14rem", maxWidth: "30rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div
                style={{
                  borderRadius: "var(--radius)",
                  border: `1px solid ${withAlpha(accent, 0.4)}`,
                  background: "color-mix(in srgb, var(--bg-surface) 66%, transparent)",
                  backdropFilter: "blur(8px)",
                  padding: "clamp(1.1rem, 1.8vw, 1.6rem)",
                }}
              >
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", letterSpacing: "0.2em", textTransform: "uppercase", color: accent, marginBottom: "0.7rem" }}>Prompt · {tool}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(0.82rem, 1vw, 1rem)", lineHeight: 1.55, color: "var(--text)", whiteSpace: "pre-wrap" }}>{prompt}</div>
              </div>
            </div>
          ) : null}

          {/* CHAT */}
          <div style={{ flex: "2 1 22rem", minWidth: "18rem", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "0.55rem", overflow: "hidden" }}>
            <AnimatePresence initial={false}>
              {bubbles.map((b, i) => {
                const col = b.user ? accent : aiAccent;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: "flex", flexDirection: "column", alignItems: b.user ? "flex-end" : "flex-start", alignSelf: b.user ? "flex-end" : "flex-start", maxWidth: "88%" }}
                  >
                    {b.showName ? (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase", color: col, margin: b.user ? "0 0.35rem 0.16rem 0" : "0 0 0.16rem 0.35rem" }}>{b.name}</span>
                    ) : null}
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.9rem, 1.1vw, 1.08rem)",
                        lineHeight: 1.45,
                        padding: "0.6rem 0.9rem",
                        borderRadius: "1.1rem",
                        whiteSpace: "pre-wrap",
                        color: b.user ? "var(--bg)" : hasImageBg ? "rgba(245,246,250,0.92)" : "var(--text)",
                        background: b.user ? col : withAlpha(col, 0.16),
                        border: b.user ? "none" : `1px solid ${withAlpha(col, 0.4)}`,
                        borderBottomRightRadius: b.user ? "0.3rem" : "1.1rem",
                        borderBottomLeftRadius: b.user ? "1.1rem" : "0.3rem",
                      }}
                    >
                      {b.text}{b.typing ? <span style={{ opacity: 0.6 }}>▍</span> : null}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
