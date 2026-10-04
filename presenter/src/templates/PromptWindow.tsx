"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AiArBackdrop, AiArLabel, Spotlight } from "./AiArMedia";
import { unwrapLazy } from "@/lib/extract-text";

interface PromptWindowProps {
  /** Prompten som typas in i chattfönstret. Alternativt: lägg texten som children. */
  promptText?: string;
  /** Ms per tecken, default 8 (snabbt) */
  typeSpeed?: number;
  /** "AI är…"-ankare. Sätt till "" för att dölja. */
  label?: string;
  /** Modell-namn i headern */
  modelName?: string;
  /** Texten kan också läggas som body mellan taggar (MDX-vänligt för långa texter) */
  children?: ReactNode;
  /** Valfritt porträtt som visas till vänster om chattfönstret */
  portrait?: string;
  /** Alt-text till porträttet */
  portraitAlt?: string;
  /** Text under porträttet (t.ex. "William") */
  portraitCaption?: string;
  /** Fotobakgrund (path) som ersätter AiArBackdrop — t.ex. /bilder/min-bild.jpg */
  background?: string;
  /** Overlay-mörker 0-1 när bakgrund används, default 0.6 */
  darken?: number;
}

/** Plocka ut ren text ur MDX-children (paragrafer, textnoder, etc). */
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

function extractParagraphs(children: ReactNode): string {
  const paragraphs: string[] = [];
  Children.forEach(children, (child) => {
    const text = extractText(child).trim();
    if (text) paragraphs.push(text);
  });
  return paragraphs.join("\n\n");
}

/**
 * Fejk-ChatGPT-fönster där en lång prompt typas in snabbt i input-fältet.
 * Syftet är att visualisera "eleven fuskar" — ingen AI-respons; bara
 * prompten som rullar in. Send-knappen pulsar när typningen är klar.
 */
export function PromptWindow({
  promptText,
  typeSpeed = 8,
  label = "AI är…",
  modelName = "ChatGPT",
  children,
  portrait,
  portraitAlt = "",
  portraitCaption,
  background,
  darken = 0.6,
}: PromptWindowProps) {
  const fullText = useMemo(() => {
    if (promptText && promptText.length > 0) return promptText;
    return extractParagraphs(children);
  }, [promptText, children]);

  const [typedCount, setTypedCount] = useState(0);

  useEffect(() => {
    if (!fullText) return;
    setTypedCount(0);

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startTimeout = setTimeout(() => {
      if (cancelled) return;
      intervalId = setInterval(() => {
        setTypedCount((prev) => {
          const next = prev + 1;
          if (next >= fullText.length) {
            if (intervalId) clearInterval(intervalId);
            return fullText.length;
          }
          return next;
        });
      }, typeSpeed);
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [fullText, typeSpeed]);

  const typedText = fullText.slice(0, typedCount);
  const done = fullText.length > 0 && typedCount >= fullText.length;

  return (
    <div
      className="relative h-full w-full flex flex-col"
      style={{
        background: "var(--slide-base, var(--bg))",
        color: "var(--text)",
        padding: "clamp(2.5rem, 4vw, 4rem)",
        paddingBottom: portrait ? 0 : undefined,
        overflow: "hidden",
      }}
    >
      {background ? (
        <>
          <img
            src={background}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: "cover" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, rgba(10,9,8,${Math.max(0, darken - 0.15)}) 0%, rgba(10,9,8,${darken}) 65%, rgba(10,9,8,${Math.min(0.9, darken + 0.12)}) 100%)`,
            }}
          />
        </>
      ) : (
        <AiArBackdrop />
      )}

      {label ? (
        <div style={{ position: "relative", zIndex: 2 }}>
          <AiArLabel>{label}</AiArLabel>
        </div>
      ) : null}

      {/* Split-layout när porträtt finns: porträtt botten-vänster, chattfönster centrerat */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex"
        style={{
          minHeight: 0,
          marginTop: label ? "1rem" : 0,
          position: "relative",
          zIndex: 2,
          gap: portrait ? "clamp(1.5rem, 3vw, 3rem)" : undefined,
          flexDirection: "row",
          alignItems: portrait ? "stretch" : "center",
          justifyContent: "center",
        }}
      >
        {portrait ? (
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.85, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              maxWidth: "35%",
            }}
          >
            <img
              src={portrait}
              alt={portraitAlt}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </motion.div>
        ) : null}

        <div style={{
          position: "relative",
          width: portrait ? "min(60%, 820px)" : "min(92%, 1080px)",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          flex: portrait ? "0 1 auto" : undefined,
          alignSelf: portrait ? "center" : undefined,
          marginBottom: portrait ? "clamp(2.5rem, 4vw, 4rem)" : undefined,
        }}>
          <Spotlight size={100} />
          <div
          style={{
            width: "100%",
            maxHeight: "100%",
            background: "#1c1a18",
            borderRadius: "1rem",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow:
              "0 50px 100px -20px rgba(0,0,0,0.7), 0 20px 40px -10px rgba(0,0,0,0.5)",
            border: "1px solid rgba(247,241,230,0.08)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.9rem 1.25rem",
              borderBottom: "1px solid rgba(247,241,230,0.08)",
              background: "#17150f",
            }}
          >
            <span style={{ display: "flex", gap: "0.4rem" }}>
              <TrafficDot color="#ff5f57" />
              <TrafficDot color="#febc2e" />
              <TrafficDot color="#28c840" />
            </span>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                color: "rgba(245,246,250,0.6)",
                letterSpacing: "0.02em",
                marginLeft: "0.5rem",
              }}
            >
              {modelName}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-body)",
                fontSize: "0.72rem",
                color: "rgba(245,246,250,0.6)",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Ny chatt
            </span>
          </div>

          {/* Empty chat area */}
          <div
            style={{
              padding: "1.5rem 1.5rem 0.5rem 1.5rem",
              minHeight: "4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(247,241,230,0.35)",
              fontFamily: "var(--font-body)",
              fontSize: "0.85rem",
              fontStyle: "italic",
            }}
          >
            Vad kan jag hjälpa dig med?
          </div>

          {/* Input-fält */}
          <div style={{ padding: "1rem 1.25rem 1.25rem 1.25rem" }}>
            <div
              style={{
                position: "relative",
                background: "#26221d",
                borderRadius: "1rem",
                padding: "1rem 3.5rem 1rem 1.25rem",
                border: "1px solid rgba(247,241,230,0.1)",
                minHeight: "3.5rem",
                maxHeight: "50vh",
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.95rem, 1.25vw, 1.12rem)",
                  lineHeight: 1.55,
                  color: "rgba(245,246,250,0.92)",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                }}
              >
                {typedText}
                {!done ? (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    style={{
                      display: "inline-block",
                      width: "0.55ch",
                      height: "1.1em",
                      background: "#B4763A",
                      marginLeft: "1px",
                      verticalAlign: "text-bottom",
                    }}
                  />
                ) : null}
              </p>

              {/* Send-knapp */}
              <motion.div
                animate={
                  done
                    ? { scale: [1, 1.12, 1], boxShadow: ["0 0 0 rgba(180,118,58,0.5)", "0 0 18px rgba(180,118,58,0.8)", "0 0 0 rgba(180,118,58,0.5)"] }
                    : {}
                }
                transition={
                  done
                    ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0 }
                }
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  bottom: "0.75rem",
                  width: "2.25rem",
                  height: "2.25rem",
                  borderRadius: "9999px",
                  background: done ? "#B4763A" : "rgba(247,241,230,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.3s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 19V5M12 5L5 12M12 5L19 12"
                    stroke={done ? "#17150f" : "rgba(245,246,250,0.6)"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>
        </div>
      </motion.div>
    </div>
  );
}

function TrafficDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: "0.75rem",
        height: "0.75rem",
        borderRadius: "9999px",
        background: color,
        display: "inline-block",
      }}
    />
  );
}
