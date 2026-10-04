"use client";

import { motion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

interface Platform {
  name: string;
  role: string;
  url: string;
}

interface PromptItem {
  name: string;
  text: string;
}

interface SycophancyTestProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Stor rubrik. */
  title?: string;
  /** Definition / underrubrik (kort, en mening). */
  subtitle?: string;
  /** Första plattform att testa. */
  platformA?: Platform;
  /** Andra plattform att jämföra med. */
  platformB?: Platform;
  /** 4 instruktionssteg. */
  steps?: string[];
  /**
   * Markdown-lista med kopierbara prompter.
   * Format: `- NAMN · PROMPT-TEXT`
   */
  children?: ReactNode;
  /** Footer-text längst ner. */
  footer?: string;
}

function extractTextNode(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextNode).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractTextNode(el.props.children);
  }
  return "";
}

function parsePrompts(children: ReactNode): PromptItem[] {
  const out: PromptItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractTextNode(li.props.children).trim();
    if (!raw) return;
    const ix = raw.indexOf("·");
    if (ix === -1) {
      out.push({ name: "", text: raw });
      return;
    }
    const name = raw.slice(0, ix).trim();
    const text = raw.slice(ix + 1).trim();
    out.push({ name, text });
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

/**
 * SycophancyTest — handout-stil övningsslide där deltagaren testar samma
 * prompt på två chattbotar för att se vilken som är mest sykofantisk.
 *
 * Allt på en slide: definition, två plattform-länkar, 4 stegsinstruktioner
 * och 3 kopierbara prompter med inbyggd clipboard-knapp. Tema-agnostisk.
 */
export function SycophancyTest({
  kicker,
  chapter,
  title = "Testa själv: hur sykofantisk är AI:n?",
  subtitle = "Sykofantism = AI:n håller med dig — också när du har fel.",
  platformA = {
    name: "Grok",
    role: "Testa här först",
    url: "https://grok.com",
  },
  platformB = {
    name: "Copilot",
    role: "Jämför sedan här",
    url: "https://copilot.microsoft.com",
  },
  steps = [
    "Kopiera en av prompterna nedan",
    "Testa den på Grok och notera svaret",
    "Testa samma prompt på Copilot",
    "Jämför: vilken var mest sykofantisk?",
  ],
  children,
  footer = "Leta efter: håller AI:n med utan att ifrågasätta? Ger den balanserad kritik — eller bara smicker?",
}: SycophancyTestProps) {
  const prompts = parsePrompts(children);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--bg) 80%)",
      }}
    >
      {/* Kicker */}
      {kicker ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 600,
            zIndex: 3,
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            position: "absolute",
            top: "clamp(1.5rem, 3vh, 2.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </motion.div>
      ) : null}

      {/* Innehåll */}
      <div
        className="relative flex h-full w-full flex-col items-center"
        style={{
          padding: "clamp(1.5rem, 3vw, 3rem) clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(3.5rem, 6vh, 5rem)",
          paddingBottom: "clamp(2rem, 4vh, 3rem)",
          gap: "clamp(0.9rem, 1.8vh, 1.4rem)",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {/* Title + def */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(0.3rem, 0.8vh, 0.6rem)",
            textAlign: "center",
            maxWidth: "min(48rem, 100%)",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.9rem, 1.15vw, 1.1rem)",
              lineHeight: 1.4,
              color: "var(--text-muted)",
              margin: 0,
              maxWidth: "32em",
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </motion.p>
        </div>

        {/* Plattformar + instruktioner i en horisontell zon */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            gap: "clamp(1rem, 2.5vw, 2rem)",
            width: "100%",
            maxWidth: "min(60rem, 100%)",
            alignItems: "center",
          }}
        >
          <PlatformCard platform={platformA} delay={0.7} />
          <ArrowGlyph delay={0.95} />
          <PlatformCard platform={platformB} delay={0.85} />
        </div>

        {/* Stegen */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05 }}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
            gap: "clamp(0.6rem, 1.5vw, 1.2rem)",
            width: "100%",
            maxWidth: "min(60rem, 100%)",
          }}
        >
          {steps.map((step, i) => (
            <StepCell key={i} step={step} index={i} />
          ))}
        </motion.div>

        {/* Prompter — kopierbara */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.5rem, 1vh, 0.8rem)",
            width: "100%",
            maxWidth: "min(60rem, 100%)",
            marginTop: "clamp(0.3rem, 0.8vh, 0.6rem)",
          }}
        >
          {prompts.map((p, i) => (
            <PromptRow
              key={i}
              prompt={p}
              index={i}
              delay={1.25 + i * 0.15}
            />
          ))}
        </div>

        {/* Footer */}
        {footer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.7,
              delay: 1.25 + prompts.length * 0.15 + 0.3,
            }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.78vw, 0.78rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: "44em",
              lineHeight: 1.6,
            }}
          >
            <EditableText path="footer" value={footer}>
              {footer}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  delay,
}: {
  platform: Platform;
  delay: number;
}) {
  return (
    <motion.a
      href={platform.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "clamp(0.2rem, 0.5vh, 0.4rem)",
        padding:
          "clamp(0.9rem, 1.6vh, 1.3rem) clamp(1rem, 2vw, 1.6rem)",
        background:
          "color-mix(in srgb, var(--accent) 6%, var(--bg-surface))",
        border:
          "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: "var(--radius)",
        textDecoration: "none",
        cursor: "pointer",
        transition: "border-color 0.2s ease, background 0.2s ease",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.1rem, 1.5vw, 1.4rem)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        {platform.name}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.62rem, 0.75vw, 0.75rem)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        {platform.role}
      </div>
    </motion.a>
  );
}

function ArrowGlyph({ delay }: { delay: number }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay }}
      style={{
        fontFamily: "var(--font-display)",
        fontSize: "clamp(1.5rem, 2.5vw, 2.2rem)",
        color: "var(--accent)",
        lineHeight: 1,
        opacity: 0.6,
        userSelect: "none",
      }}
    >
      →
    </motion.div>
  );
}

function StepCell({ step, index }: { step: string; index: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "clamp(0.2rem, 0.4vh, 0.35rem)",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.72rem, 0.9vw, 0.85rem)",
          letterSpacing: "0.2em",
          color: "var(--accent)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(0.78rem, 0.95vw, 0.92rem)",
          lineHeight: 1.35,
          color: "var(--text)",
          letterSpacing: "0.005em",
        }}
      >
        {step}
      </div>
    </div>
  );
}

function PromptRow({
  prompt,
  index,
  delay,
}: {
  prompt: PromptItem;
  index: number;
  delay: number;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt.text);
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignorera
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "clamp(0.8rem, 1.5vw, 1.3rem)",
        alignItems: "center",
        padding:
          "clamp(0.7rem, 1.2vh, 1rem) clamp(1rem, 1.8vw, 1.4rem)",
        background:
          "color-mix(in srgb, var(--accent) 4%, var(--bg-surface))",
        border:
          "1px solid color-mix(in srgb, var(--accent) 18%, transparent)",
        borderRadius: "var(--radius)",
      }}
    >
      {/* Numrering + namn */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.05rem, 0.2vh, 0.15rem)",
          minWidth: "clamp(7rem, 12vw, 10rem)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.72vw, 0.7rem)",
            letterSpacing: "0.2em",
            color: "var(--accent)",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          PROMPT {String(index + 1).padStart(2, "0")}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
            color: "var(--text)",
            lineHeight: 1.25,
            letterSpacing: "-0.005em",
          }}
        >
          {prompt.name}
        </div>
      </div>

      {/* Prompttext */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.78rem, 0.95vw, 0.92rem)",
          lineHeight: 1.45,
          color: "var(--text-muted)",
          letterSpacing: "0.005em",
        }}
      >
        “{prompt.text}”
      </div>

      {/* Kopieringsknapp */}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Kopierat" : "Kopiera prompt"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4em",
          padding: "0.45em 0.85em",
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.62rem, 0.75vw, 0.74rem)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: copied ? "var(--bg-surface)" : "var(--accent)",
          background: copied ? "var(--accent)" : "transparent",
          border: "1px solid var(--accent)",
          borderRadius: "999px",
          cursor: "pointer",
          fontWeight: 600,
          transition:
            "background 0.2s ease, color 0.2s ease, transform 0.15s ease",
          whiteSpace: "nowrap",
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform =
            "scale(0.97)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {copied ? "Kopierat ✓" : "Kopiera"}
      </button>
    </motion.div>
  );
}
