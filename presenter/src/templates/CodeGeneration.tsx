"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText, EditableMedia } from "@/lib/inline-edit";

interface CodeGenerationProps {
  /** Kort eyebrow ovanför titeln (stödjer **bold** för accent). */
  eyebrow?: string;
  /** Titeln som visas stort. Stödjer **bold** för accent. */
  title?: string;
  /** Undertitel. Stödjer **bold** för accent. */
  subtitle?: string;
  /** Rendera undertiteln i bionic reading-stil (fet första halva av varje ord) — sliden demonstrerar sig själv. */
  bionicSubtitle?: boolean;
  /** Prompten som animeras fram i input-bar först. */
  prompt?: string;
  /**
   * Kod-strängen som skrivs ut bokstav för bokstav efter prompten.
   * Stödjer flera rader (newlines).
   * Om utelämnad extraheras kod från children (MDX code fences eller plain text).
   */
  code?: string;
  /** Alternativ: MDX-innehåll (code fences) i stället för `code`-prop. */
  children?: ReactNode;
  /** Tecken per sekund när koden skrivs. Default 55. */
  codeSpeed?: number;
  /** Bakgrundsbild. */
  background?: string;
  /** Video som ligger på höger sida (tar halva ytan om satt). */
  videoSrc?: string;
  /** Video-aspect om videon visas i 16:9-box. */
  videoAspect?: string;
  /**
   * Layout-variant:
   *  - "split" (default) — prompt/kod vänster, video höger
   *  - "fullbg" — kod täcker hela bakgrunden, transparent/dimmad, titeln centrerat över
   */
  variant?: "split" | "fullbg";
  /** Accentfärg. Default cyan. */
  accent?: string;
}

function extractCode(node: ReactNode): string {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractCode).join("");
  if (isValidElement(node)) {
    return extractCode((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function renderBold(text: string, accent: string, dim: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} style={{ color: accent, fontWeight: 600 }}>
          {part.slice(2, -2)}
        </span>
      );
    }
    return (
      <span key={i} style={{ color: dim }}>
        {part}
      </span>
    );
  });
}

/** Bionic reading-rendering: fet första halva av varje ord — samma algoritm som demo-koden på sliden. */
function renderBionic(text: string) {
  return text.split(/(\s+)/).map((part, i) => {
    if (!part.trim()) return <span key={i}>{part}</span>;
    const n = Math.ceil(part.length / 2);
    return (
      <span key={i} style={{ whiteSpace: "nowrap" }}>
        <span style={{ fontWeight: 700, color: "var(--text)" }}>{part.slice(0, n)}</span>
        <span style={{ color: "var(--text-muted)" }}>{part.slice(n)}</span>
      </span>
    );
  });
}

function parseAspect(s?: string): number {
  if (!s) return 9 / 16;
  const p = s.split("/").map((x) => parseFloat(x.trim()));
  if (p.length === 2 && p[0] > 0 && p[1] > 0) return p[0] / p[1];
  return 9 / 16;
}

/**
 * Slide som visar prompt → genererad kod (typewriter-effekt) → ev. video.
 * Används för "AI-kodar-åt-mig"-exempel.
 *
 * Steg-för-steg (space): step 0 = bara titel, step 1 = prompt, step 2 = kod börjar skrivas.
 * I "fullbg"-varianten ligger koden som transparent bakgrund och titeln är centrerad över.
 */
export function CodeGeneration({
  eyebrow,
  title,
  subtitle,
  bionicSubtitle = false,
  prompt,
  code,
  codeSpeed = 55,
  background,
  videoSrc,
  videoAspect,
  variant = "split",
  accent = "#67D4CD",
  children,
}: CodeGenerationProps) {
  const resolvedCode =
    (typeof code === "string" && code.length > 0
      ? code
      : extractCode(children).trim()) || "";
  // Split-variant: prompten syns direkt, koden börjar skrivas efter en kort delay.
  // fullbg: titeln är centrerad, koden rullar redan i bakgrunden.
  const activeStep = useSlideSteps(variant === "fullbg" ? 1 : 1);
  const codeStarted = true;
  const promptVisible = variant === "fullbg" ? false : true;

  const [typedChars, setTypedChars] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!codeStarted || !resolvedCode) return;
    startTimeRef.current = null;
    setTypedChars(0);
    const step = (ts: number) => {
      if (startTimeRef.current == null) startTimeRef.current = ts;
      const elapsed = (ts - startTimeRef.current) / 1000;
      const target = Math.min(Math.floor(elapsed * codeSpeed), resolvedCode.length);
      setTypedChars(target);
      if (target < resolvedCode.length) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [codeStarted, resolvedCode, codeSpeed]);

  const typedCode = resolvedCode.slice(0, typedChars);
  const caret = typedChars < resolvedCode.length;
  const videoLandscape = parseAspect(videoAspect) >= 1;

  const codeBlock = (
    <pre
      style={{
        fontFamily: "var(--font-mono)",
        fontSize:
          variant === "fullbg"
            ? "clamp(0.7rem, 0.95vw, 1rem)"
            : "clamp(0.85rem, 1.05vw, 1.15rem)",
        lineHeight: 1.55,
        color:
          variant === "fullbg" ? "rgba(103,212,205,0.35)" : "rgba(245,246,250,0.92)",
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {typedCode}
      {caret ? (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{ color: accent, fontWeight: 700 }}
        >
          ▍
        </motion.span>
      ) : null}
    </pre>
  );

  if (variant === "fullbg") {
    // Titel/eyebrow/subtitle ligger PÅ en bild-bakgrund → fast ljus text + mörk
    // scrim (oavsett tema). Utan bild följer texten temat (var(--text)).
    const onImg = !!background;
    const fbText = onImg ? "rgba(245,246,250,0.96)" : "var(--text)";
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        style={{ background: background ? undefined : "var(--slide-base, var(--bg))" }}
      >
        {background ? (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={background}
              alt=""
              className="h-full w-full object-cover"
            />
            {/* Mörk scrim för läsbarhet — texten ligger ovanpå (zIndex 2) */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.44) 55%, rgba(0,0,0,0.56) 100%)",
              }}
            />
          </div>
        ) : null}

        {/* Kod som rullar i bakgrunden */}
        <div
          aria-hidden
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{
            padding: "2rem",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
          }}
        >
          {codeBlock}
        </div>

        {/* Titel centrerat */}
        <div
          className="relative flex flex-col items-center justify-center h-full w-full"
          style={{ padding: "clamp(2rem, 4vw, 5rem)", zIndex: 2 }}
        >
          {eyebrow ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.25rem, 2vw, 2rem)",
                marginBottom: "1rem",
                textAlign: "center",
                color: fbText,
              }}
            >
              <EditableText path="eyebrow" value={eyebrow ?? ""}>{renderBold(eyebrow, accent, fbText)}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h1
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(3rem, 7vw, 7rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                color: fbText,
                margin: 0,
                textAlign: "center",
                maxWidth: "18em",
                textShadow: "0 6px 40px rgba(0,0,0,0.6)",
              }}
            >
              <EditableText path="title" value={title ?? ""}>{renderBold(title, accent, fbText)}</EditableText>
            </motion.h1>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                marginTop: "1rem",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                textAlign: "center",
                maxWidth: "32em",
                color: fbText,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{bionicSubtitle ? renderBionic(subtitle) : renderBold(subtitle, accent, fbText)}</EditableText>
            </motion.p>
          ) : null}
        </div>
      </div>
    );
  }

  // SPLIT-variant
  return (
    <div className="relative h-full w-full overflow-hidden">
      {background ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={background}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div
        className="relative grid h-full w-full"
        style={{ gridTemplateColumns: videoSrc ? "55% 45%" : "1fr" }}
      >
        {/* Vänster: titel + prompt + kod — start from top so long code fits */}
        <div
          className="flex flex-col"
          style={{
            padding: "clamp(1.5rem, 3vw, 3rem)",
            paddingTop: "clamp(2rem, 4vh, 3.5rem)",
            gap: "0.8rem",
            zIndex: 2,
            minHeight: 0,
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          {eyebrow ? (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "var(--display-italic, italic)",
                fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
              }}
            >
              <EditableText path="eyebrow" value={eyebrow ?? ""}>{renderBold(eyebrow, accent, "var(--text)")}</EditableText>
            </div>
          ) : null}
          {title ? (
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(2.5rem, 5vw, 5rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </h1>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "var(--display-italic, italic)",
                fontSize: "clamp(0.95rem, 1.25vw, 1.3rem)",
                lineHeight: 1.45,
                color: "var(--text-muted)",
                margin: 0,
                maxWidth: "30em",
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{bionicSubtitle ? renderBionic(subtitle) : renderBold(subtitle, accent, "var(--text-muted)")}</EditableText>
            </motion.p>
          ) : null}

          {prompt ? (
            <motion.div
              data-card="flat"
              initial={{ opacity: 0, y: 14 }}
              animate={promptVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "var(--text)",
                color: "var(--bg)",
                padding: "0.8rem 1.1rem",
                borderRadius: "1.5rem",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.9rem, 1.05vw, 1.05rem)",
                lineHeight: 1.4,
                boxShadow: "0 18px 40px -18px rgba(0,0,0,0.5)",
                maxWidth: "36em",
              }}
            >
              <EditableText path="prompt" value={prompt ?? ""}>{prompt}</EditableText>
            </motion.div>
          ) : null}

          {resolvedCode ? (
            <motion.div
              data-card="flat"
              initial={{ opacity: 0 }}
              animate={codeStarted ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                background: "rgba(14,14,18,0.85)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "0.7rem",
                padding: "0.9rem 1.05rem",
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "hidden",
                boxShadow: "0 18px 40px -18px rgba(0,0,0,0.6)",
              }}
            >
              {/* Fade-masken ligger INNANFÖR kortet — annars tonas kortets egen
                  underkant (data-card-ramen) bort tillsammans med koden. */}
              <div
                style={{
                  height: "100%",
                  overflow: "hidden",
                  maskImage: "linear-gradient(to bottom, black 0%, black 85%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 85%, transparent 100%)",
                }}
              >
                {codeBlock}
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Höger: video (om satt) */}
        {videoSrc ? (
          <div
            className="relative flex items-center justify-center"
            style={{ padding: "clamp(1.5rem, 3vw, 3rem)" }}
          >
            <div
              data-card=""
              className="relative overflow-hidden"
              style={{
                aspectRatio: videoAspect ?? "9 / 16",
                ...(videoLandscape
                  ? { width: "94%", height: "auto", maxHeight: "86%" }
                  : { height: "86%", width: "auto", maxWidth: "92%" }),
                borderRadius: "0.75rem",
                boxShadow:
                  "0 40px 80px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06) inset",
                background: "#0a0908",
              }}
            >
              <EditableMedia path="videoSrc" value={videoSrc ?? ""} mediaType="video" label="Demo-video">
                <video
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </EditableMedia>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
