"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CharacterAiScene — dramatiserad chat-sekvens för Character.ai-anslaget.
 *
 * Flöde:
 *  1. Öppningskonversationen TYPAS FRAM automatiskt, meddelande för meddelande.
 *  2. När den är klar poppar en `modal` (eleven vänder sig till läraren IRL) — en paus.
 *  3. Klick → modalen försvinner, nästa Max-meddelande typas, sedan Natalies "…".
 *  4. Klick → hela sliden LÖSES UPP (chatten blur/skala/fade bort) och `reveal`-raden
 *     växer fram och typas i mörk/röd ton.
 *
 * Children — en rad per element, i ordning:
 *   - **Max:** ¡Hola!
 *   - **Natalie:** ¡Hola!
 *   - modal :: Joel… hur säger man "du är snygg"?
 *   - **Max:** Tú eres guapa…
 *   - **Natalie:** …
 *   - reveal :: Din jävla f…
 */

interface SceneItem { kind: "msg" | "modal" | "reveal"; label?: string; text: string; }

interface CharacterAiSceneProps {
  app?: string;
  aiLabel?: string;
  userLabel?: string;
  modalCaption?: string;
  /** ms per tecken i chatten. Default 26. */
  typeSpeed?: number;
  accent?: string;
  /** Färg för AI-personan (Natalie). Default: lila andra-accent. */
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

function parseItems(children: ReactNode): SceneItem[] {
  const out: SceneItem[] = [];
  // Markdown gör `**Max:**` till ett <strong>-element INNAN vi ser det, så
  // vi kan inte matcha på literala asterisker. Plocka etiketten ur <strong>.
  const splitBold = (children: ReactNode): { label: string; text: string } | null => {
    let arr = Children.toArray(children);
    if (arr.length === 1 && isValidElement(arr[0]) && (arr[0] as ReactElement).type === "p") {
      arr = Children.toArray((arr[0] as ReactElement<{ children?: ReactNode }>).props.children);
    }
    const first = arr[0];
    if (isValidElement(first) && ((first as ReactElement).type === "strong" || (first as ReactElement).type === "b")) {
      const label = extractText((first as ReactElement<{ children?: ReactNode }>).props.children).replace(/[:：]\s*$/, "").trim();
      const text = extractText(arr.slice(1)).replace(/^\s+/, "").trim();
      return { label, text };
    }
    return null;
  };
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const sp = raw.match(/^(modal|reveal)\s*::\s*(.*)$/s);
    if (sp) { out.push({ kind: sp[1] as "modal" | "reveal", text: sp[2].trim() }); return; }
    const bold = splitBold(li.props.children);
    if (bold && bold.label) { out.push({ kind: "msg", label: bold.label, text: bold.text }); return; }
    const m = raw.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    if (m) { out.push({ kind: "msg", label: m[1].trim(), text: m[2].trim() }); return; }
    const colon = raw.match(/^([^:]{1,16}):\s+(.+)$/s);
    if (colon) { out.push({ kind: "msg", label: colon[1].trim(), text: colon[2].trim() }); return; }
    out.push({ kind: "msg", text: raw });
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

interface Bubble { label?: string; text: string; user: boolean; }

export function CharacterAiScene({
  app = "Character.ai",
  aiLabel = "Natalie",
  userLabel = "Max",
  modalCaption,
  typeSpeed = 26,
  accent = "var(--accent)",
  aiAccent = "var(--accent-2, #9D7AFF)",
  background,
  children,
}: CharacterAiSceneProps) {
  const items = parseItems(children);
  const modalIdx = items.findIndex((i) => i.kind === "modal");
  const opening = (modalIdx >= 0 ? items.slice(0, modalIdx) : items).filter((i) => i.kind === "msg");
  const modalItem = modalIdx >= 0 ? items[modalIdx] : null;
  const post = (modalIdx >= 0 ? items.slice(modalIdx + 1) : []).filter((i) => i.kind === "msg");
  const revealItem = items.find((i) => i.kind === "reveal") ?? null;

  const isUser = (label?: string) => (label ?? "").toLowerCase().startsWith((userLabel ?? "").toLowerCase());

  // 3 lägen → useSlideSteps(3) ger steg 0,1,2 (2 interna klick; 3:e byter slide):
  // 0 = öppning + modal, 1 = guapa + …, 2 = upplösning
  const activeStep = useSlideSteps(3);
  const revealActive = activeStep >= 2;
  const modalActive = activeStep === 0;

  // --- Öppningens auto-typning ---
  const [openDoneCount, setOpenDoneCount] = useState(0);
  const [openPartial, setOpenPartial] = useState("");
  const [openFinished, setOpenFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let idx = 0;
    const typeNext = () => {
      if (cancelled) return;
      if (idx >= opening.length) { setOpenFinished(true); return; }
      const text = opening[idx].text;
      let c = 0;
      const tick = () => {
        if (cancelled) return;
        c += 1;
        setOpenPartial(text.slice(0, c));
        if (c < text.length) { timer = setTimeout(tick, typeSpeed); }
        else { setOpenDoneCount(idx + 1); setOpenPartial(""); idx += 1; timer = setTimeout(typeNext, 650); }
      };
      timer = setTimeout(tick, 350);
    };
    typeNext();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Post-modal (guapa + …) när steg 1 ---
  const [postDoneCount, setPostDoneCount] = useState(0);
  const [postPartial, setPostPartial] = useState("");
  useEffect(() => {
    if (activeStep < 1) { setPostDoneCount(0); setPostPartial(""); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let idx = 0;
    const typeNext = () => {
      if (cancelled) return;
      if (idx >= post.length) return;
      const text = post[idx].text;
      let c = 0;
      const tick = () => {
        if (cancelled) return;
        c += 1;
        setPostPartial(text.slice(0, c));
        if (c < text.length) { timer = setTimeout(tick, typeSpeed); }
        else { setPostDoneCount(idx + 1); setPostPartial(""); idx += 1; timer = setTimeout(typeNext, 650); }
      };
      timer = setTimeout(tick, 250);
    };
    typeNext();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // --- Reveal-typning ---
  // OBS: bero på den stabila STRÄNGEN, inte på revealItem-objektet (som
  // återskapas varje render av parseItems → annars nollställs typningen i loop).
  const revealText = revealItem?.text ?? "";
  const [revTyped, setRevTyped] = useState(0);
  useEffect(() => {
    if (!revealActive || !revealText) { setRevTyped(0); return; }
    let c = 0;
    const id = setInterval(() => { c += 1; setRevTyped(c); if (c >= revealText.length) clearInterval(id); }, 65);
    return () => clearInterval(id);
  }, [revealActive, revealText]);

  // Bygg synliga bubblor
  const raw: { b: Bubble; typing: boolean }[] = [];
  opening.forEach((m, i) => {
    if (i < openDoneCount || openFinished || activeStep >= 1) raw.push({ b: { label: m.label, text: m.text, user: isUser(m.label) }, typing: false });
    else if (i === openDoneCount && openPartial) raw.push({ b: { label: m.label, text: openPartial, user: isUser(m.label) }, typing: true });
  });
  if (activeStep >= 1) {
    post.forEach((m, i) => {
      if (i < postDoneCount) raw.push({ b: { label: m.label, text: m.text, user: isUser(m.label) }, typing: false });
      else if (i === postDoneCount && postPartial) raw.push({ b: { label: m.label, text: postPartial, user: isUser(m.label) }, typing: true });
    });
  }
  // markera när avsändaren byts → visa namn-etikett
  let prevUser: boolean | null = null;
  const bubbles = raw.map((x) => {
    const showName = prevUser !== x.b.user;
    prevUser = x.b.user;
    return { ...x, showName };
  });

  const bg = background
    ? (background.startsWith("/") || background.startsWith("http")
        ? `linear-gradient(rgba(10,9,8,0.7), rgba(10,9,8,0.82)), url('${background}') center/cover no-repeat`
        : background)
    : "var(--slide-base, var(--bg))";

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: bg }}>
      {/* CHAT — löses upp vid reveal */}
      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center"
        style={{ padding: "clamp(2rem, 4vw, 4rem)", zIndex: 2 }}
        animate={{
          opacity: revealActive ? 0 : modalActive && openFinished ? 0.4 : 1,
          filter: revealActive ? "blur(26px)" : modalActive && openFinished ? "blur(2px)" : "blur(0px)",
          scale: revealActive ? 1.18 : 1,
        }}
        transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          style={{
            width: "min(34rem, 92%)",
            borderRadius: "var(--radius)",
            border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
            background: "color-mix(in srgb, var(--bg-surface) 72%, transparent)",
            backdropFilter: "blur(10px)",
            boxShadow: `0 30px 70px -30px ${withAlpha(accent, 0.35)}`,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", padding: "0.85rem 1.1rem", borderBottom: "1px solid color-mix(in srgb, var(--text) 10%, transparent)" }}>
            <div style={{ width: "2.1rem", height: "2.1rem", borderRadius: "999px", background: `linear-gradient(135deg, ${aiAccent}, ${withAlpha(aiAccent, 0.4)})`, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontWeight: 700, fontFamily: "var(--font-display)" }}>{(aiLabel || "?").slice(0, 1)}</div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--text)", fontSize: "1rem" }}>{aiLabel}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>{app}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "1.1rem", minHeight: "16rem", justifyContent: "flex-end" }}>
            <AnimatePresence initial={false}>
              {bubbles.map(({ b, typing, showName }, i) => {
                const col = b.user ? accent : aiAccent;
                return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: "flex", flexDirection: "column", alignItems: b.user ? "flex-end" : "flex-start", alignSelf: b.user ? "flex-end" : "flex-start", maxWidth: "80%" }}
                >
                  {showName ? (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.64rem", letterSpacing: "0.16em", textTransform: "uppercase", color: col, margin: b.user ? "0 0.35rem 0.18rem 0" : "0 0 0.18rem 0.35rem" }}>{b.user ? userLabel : aiLabel}</span>
                  ) : null}
                  <div
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.95rem, 1.15vw, 1.1rem)",
                      lineHeight: 1.4,
                      padding: "0.6rem 0.9rem",
                      borderRadius: "1.1rem",
                      color: b.user ? "var(--bg)" : "var(--text)",
                      background: b.user ? col : withAlpha(col, 0.18),
                      border: b.user ? "none" : `1px solid ${withAlpha(col, 0.45)}`,
                      borderBottomRightRadius: b.user ? "0.3rem" : "1.1rem",
                      borderBottomLeftRadius: b.user ? "1.1rem" : "0.3rem",
                    }}
                  >
                    {b.text}{typing ? <span style={{ opacity: 0.6 }}>▍</span> : null}
                  </div>
                </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* MODAL */}
      <AnimatePresence>
        {modalActive && openFinished && modalItem ? (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 20, padding: "2rem" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.34, 1.4, 0.64, 1] }}
              style={{
                maxWidth: "30rem",
                textAlign: "center",
                borderRadius: "var(--radius)",
                border: `1px solid ${withAlpha(accent, 0.5)}`,
                background: "color-mix(in srgb, var(--bg-surface) 92%, transparent)",
                backdropFilter: "blur(14px)",
                boxShadow: `0 40px 90px -30px ${withAlpha(accent, 0.5)}`,
                padding: "clamp(1.6rem, 3vw, 2.4rem)",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", letterSpacing: "0.26em", textTransform: "uppercase", color: accent, marginBottom: "0.9rem" }}>{userLabel} · på riktigt</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: "var(--heading-weight)", fontSize: "clamp(1.4rem, 2.6vw, 2.1rem)", lineHeight: 1.25, color: "var(--text)" }}>
                {modalItem.text}
              </div>
              {modalCaption ? (
                <div style={{ fontFamily: "var(--font-body)", fontStyle: "italic", fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "1rem" }}>{modalCaption}</div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* REVEAL — upplösning */}
      <AnimatePresence>
        {revealActive && revealItem ? (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 30, padding: "clamp(2rem, 6vw, 6rem)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
          >
            <motion.div
              aria-hidden
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0 }}
              style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(120,22,34,0.45) 0%, #070406 70%)" }}
            />
            <motion.div
              initial={{ scale: 0.7, opacity: 0, filter: "blur(16px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "clamp(2.4rem, 7.5vw, 6.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "#fff",
                textAlign: "center",
                textShadow: "0 0 50px rgba(220,40,60,0.55)",
              }}
            >
              {revealText.slice(0, revTyped)}
              <span style={{ opacity: 0.7, fontWeight: 300 }}>{revTyped < revealText.length ? "▍" : ""}</span>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
