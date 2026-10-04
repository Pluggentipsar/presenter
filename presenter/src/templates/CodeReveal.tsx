"use client";

import { motion } from "framer-motion";
import { Children, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

interface CodeRevealProps {
  code?: string;
  children?: ReactNode;
  language?: string;
  title?: string;
  caption?: string;
  speed?: number | string;
  mode?: "typewriter" | "instant";
}

/**
 * Extrahera text ur children - MDX renderar ofta en <pre><code> eller <p> med text.
 */
function extractCodeText(children: ReactNode): string {
  let result = "";
  const walk = (node: ReactNode): void => {
    if (typeof node === "string") {
      result += node;
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (
      node &&
      typeof node === "object" &&
      "props" in node &&
      node.props &&
      typeof node.props === "object" &&
      "children" in node.props
    ) {
      walk((node.props as { children: ReactNode }).children);
    }
  };
  Children.forEach(children, walk);
  return result.trim();
}

/**
 * Kod som avslöjas antingen typewriter-style eller direkt.
 *
 * Användning 1 (kort kod via prop):
 * <CodeReveal code="print('hello')" language="python" />
 *
 * Användning 2 (längre kod via children):
 * <CodeReveal language="prompt">
 *   Skapa ett Jeopardy-spel om Sveriges historia.
 *   5 kategorier, 5 frågor per kategori.
 * </CodeReveal>
 */
export function CodeReveal({
  code,
  children,
  language = "text",
  title,
  caption,
  speed = 15,
  mode = "typewriter",
}: CodeRevealProps) {
  const source = code ?? extractCodeText(children);
  const speedNum = typeof speed === "string" ? parseFloat(speed) : speed;

  const [typed, setTyped] = useState(mode === "instant" ? source : "");
  const [done, setDone] = useState(mode === "instant");

  useEffect(() => {
    if (mode === "instant") {
      setTyped(source);
      setDone(true);
      return;
    }
    setTyped("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(source.slice(0, i));
      if (i >= source.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speedNum);
    return () => clearInterval(interval);
  }, [source, speedNum, mode]);

  return (
    <div className="slide-container">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        {title && (
          <motion.h2
            className="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}
        <motion.div
          className="overflow-hidden rounded-lg border border-accent-dim bg-bg-surface/90"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ boxShadow: "0 0 32px var(--accent-dim)" }}
        >
          <div className="flex items-center justify-between border-b border-accent-dim px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-text-muted">
            <div className="flex items-center gap-2">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              </span>
            </div>
            <span>{language}</span>
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-6 font-mono text-[clamp(0.75rem,1.25vw,1rem)] leading-relaxed text-text">
            <code>{typed}</code>
            {!done && (
              <motion.span
                className="ml-[1px] inline-block h-[1em] w-[0.5em] translate-y-[1px] bg-accent"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            )}
          </pre>
        </motion.div>
        {caption && (
          <motion.p
            className="text-sm text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: done ? 1 : 0.3 }}
            transition={{ duration: 0.4 }}
          >
            <EditableText path="caption" value={caption ?? ""}>{caption}</EditableText>
          </motion.p>
        )}
      </div>
    </div>
  );
}
