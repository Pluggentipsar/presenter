"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

interface BollplankProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  background?: string;
  accent?: string;
  prompt?: string;
  aiResponse?: string;
  aiSpeed?: number;
  thinkingDelay?: number;
  children?: ReactNode;
}

interface Elev {
  name: string;
  diagnos: string;
  styrkor: string;
  utmaningar: string;
  behov: string;
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,0.6), rgba(10,9,8,0.75)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
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

function parseElever(children: ReactNode): Elev[] {
  const out: Elev[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    const parts = raw.split(/\s*·\s*/);
    if (parts.length < 2) return;
    const nameRaw = parts[0].trim();
    const nameMatch = nameRaw.match(/^\*\*(.+?)\*\*$/);
    const name = nameMatch ? nameMatch[1] : nameRaw;
    out.push({
      name,
      diagnos: parts[1]?.trim() ?? "",
      styrkor: parts[2]?.trim() ?? "",
      utmaningar: parts[3]?.trim() ?? "",
      behov: parts[4]?.trim() ?? "",
    });
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

const DEFAULT_RESPONSE = `Hmm, en klurig grupp — låt mig tänka högt.

För Elev 1 (ADHD) blir uppgiften svår om momenten är för långa utan paus. Jag skulle dela upp i tre delmoment med 10-minuters rörelsepaus mellan. Använd gärna fotboll eller YouTube-klipp som ingångsexempel — det fångar intresset.

För Elev 2 (dyslexi) behövs talsyntes tillgänglig för längre texter, plus en ordlista med svåra begrepp INNAN läsningen börjar. Fundera också på om provet kan göras muntligt — det minskar stavningsstressen utan att sänka kravnivån.`;

export function Bollplank({
  kicker,
  title,
  subtitle,
  background,
  accent = "var(--accent)",
  prompt = "Hur tror du att denna uppgift kommer att funka för en klass med dessa elever?",
  aiResponse = DEFAULT_RESPONSE,
  aiSpeed = 18,
  thinkingDelay = 2000,
  children,
}: BollplankProps) {
  const elever = parseElever(children);
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState("");
  const [answerDone, setAnswerDone] = useState(false);

  useEffect(() => {
    const promptDelay = 1200;
    const thinkStart = setTimeout(() => setThinking(true), promptDelay);
    const respondStart = setTimeout(() => {
      setThinking(false);
      let i = 0;
      const iv = setInterval(() => {
        i++;
        if (i > aiResponse.length) {
          clearInterval(iv);
          setAnswerDone(true);
          return;
        }
        setTyped(aiResponse.slice(0, i));
      }, aiSpeed);
    }, promptDelay + thinkingDelay);
    return () => {
      clearTimeout(thinkStart);
      clearTimeout(respondStart);
    };
  }, [thinkingDelay, aiResponse, aiSpeed]);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 3.5rem)",
          zIndex: 2,
          gap: "clamp(1rem, 2vh, 1.5rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1.5" style={{ flexShrink: 0 }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.7rem, 3vw, 2.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.05vw, 1.1rem)",
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.35,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Grid: prompt+svar | elev-kort */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "58% 42%",
            gap: "clamp(1rem, 2vw, 2rem)",
            minHeight: 0,
          }}
        >
          {/* VÄNSTER: prompt + AI-svar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {/* ChatGPT-prompt-bar */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "var(--text)",
                borderRadius: "1.1rem",
                padding: "0.95rem 1.15rem",
                boxShadow:
                  "0 20px 50px -15px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                  color: "var(--bg)",
                  lineHeight: 1.4,
                }}
              >
                <EditableText path="prompt" value={prompt ?? ""}>{prompt}</EditableText>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  paddingTop: "0.3rem",
                  borderTop: `1px solid ${withAlpha("var(--bg)", 0.12)}`,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    fontSize: "1.2rem",
                    color: withAlpha("var(--bg)", 0.55),
                    fontWeight: 300,
                  }}
                >
                  +
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: "#2563EB",
                  }}
                >
                  <motion.div
                    aria-hidden
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: "13px",
                      height: "13px",
                      borderRadius: "50%",
                      border: "1.5px solid currentColor",
                      borderTopColor: "transparent",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                    }}
                  >
                    Tänker
                  </span>
                </div>
              </div>
            </motion.div>

            {/* AI-svar */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              style={{
                padding: "clamp(0.95rem, 1.3vw, 1.3rem) clamp(1.1rem, 1.5vw, 1.5rem)",
                borderRadius: "1rem",
                borderTopLeftRadius: "0.35rem",
                background: "rgba(20, 18, 15, 0.72)",
                backdropFilter: "blur(18px) saturate(140%)",
                WebkitBackdropFilter: "blur(18px) saturate(140%)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow:
                  "0 18px 40px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.88rem, 1vw, 1rem)",
                lineHeight: 1.5,
                color: "rgba(245,246,250,0.92)",
                whiteSpace: "pre-wrap",
                flex: 1,
                minHeight: 0,
                overflow: "auto",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: accent,
                  marginBottom: "0.6rem",
                  fontWeight: 700,
                }}
              >
                ChatGPT
              </div>
              {thinking ? (
                <div style={{ display: "flex", gap: "0.4rem", padding: "0.2rem 0" }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                      style={{
                        display: "inline-block",
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "50%",
                        background: "rgba(245,246,250,0.6)",
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  {typed}
                  {typed.length < aiResponse.length ? (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                      style={{
                        display: "inline-block",
                        width: "0.5ch",
                        height: "1em",
                        background: accent,
                        marginLeft: "0.08em",
                        verticalAlign: "middle",
                      }}
                    />
                  ) : null}
                </div>
              )}
            </motion.div>
          </div>

          {/* HÖGER: elev-kort — kommer in EFTER AI-svar klart */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "clamp(0.6rem, 1vh, 0.85rem)",
              justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: answerDone ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
                marginBottom: "0.2rem",
              }}
            >
              ↳ Elevgruppen
            </motion.div>
            {elever.map((elev, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={
                  answerDone
                    ? { opacity: 1, x: 0, scale: 1 }
                    : { opacity: 0, x: 30, scale: 0.95 }
                }
                transition={{
                  duration: 0.6,
                  delay: answerDone ? i * 0.18 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  padding: "clamp(0.8rem, 1.1vw, 1.1rem) clamp(1rem, 1.3vw, 1.3rem)",
                  borderRadius: "0.75rem",
                  background: "var(--bg-elevated)",
                  backdropFilter: "blur(18px) saturate(140%)",
                  WebkitBackdropFilter: "blur(18px) saturate(140%)",
                  border: `1px solid ${withAlpha(accent, 0.27)}`,
                  boxShadow:
                    "0 12px 30px -10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.7rem" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1rem, 1.25vw, 1.2rem)",
                      color: "var(--text)",
                    }}
                  >
                    {elev.name}
                  </div>
                  {elev.diagnos ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: accent,
                        fontWeight: 600,
                        padding: "0.15rem 0.5rem",
                        border: `1px solid ${withAlpha(accent, 0.31)}`,
                        borderRadius: "0.3rem",
                      }}
                    >
                      {elev.diagnos}
                    </div>
                  ) : null}
                </div>
                {elev.styrkor ? (
                  <MiniField label="Styrkor" value={elev.styrkor} accent={accent} />
                ) : null}
                {elev.utmaningar ? (
                  <MiniField label="Utmaningar" value={elev.utmaningar} accent={accent} />
                ) : null}
                {elev.behov ? (
                  <MiniField label="Behov" value={elev.behov} accent={accent} />
                ) : null}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 600,
          flexShrink: 0,
          width: "4.5rem",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "clamp(0.78rem, 0.9vw, 0.92rem)",
          color: "var(--text)",
          lineHeight: 1.35,
        }}
      >
        {value}
      </span>
    </div>
  );
}
