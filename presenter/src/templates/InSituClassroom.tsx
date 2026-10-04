"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * InSituClassroom ★ — AI tar plats i ledet, inte i mitten.
 *
 * "Bredvid whiteboarden, inte i stället för" är en rumslig tanke, och
 * rumsliga tankar ska ritas. Steg 0 visar rummet som personalen är rädd
 * att få: AI:n stor i mitten, allt annat blekt och undanträngt. Det är
 * inte en halmgubbe — det är bilden som möter dem i tidningen varje
 * vecka.
 *
 * Steg 1 låter AI:n krympa in i raden. Kortet behåller sin accentkant,
 * så ingen tror att poängen är att den är oviktig. Poängen är att den
 * är EN resurs bland flera, och att läraren fortfarande står kvar.
 *
 * Låt steg 0 stå några sekunder. Obehaget är en del av argumentet.
 *
 * ```mdx
 * <InSituClassroom
 *   chapter="§ Design · AI in situ"
 *   statement="Ha AI som ytterligare en resurs i klassrummet."
 *   reveal="AI *in situ* — bredvid whiteboarden, **inte i stället för.**"
 *   aiLabel="AI:n"
 *   aiNote="alltid vaken, vet inget om er"
 * >
 * - Whiteboarden · det gemensamma
 * - Läroboken · det beprövade
 * - Kompisen · det som förklaras på riktigt
 * - Läraren · den som ser vem som tappat tråden
 * </InSituClassroom>
 * ```
 */

interface InSituClassroomProps {
  chapter?: string;
  kicker?: string;
  /** Raden som står uppe hela tiden. Stödjer **fet**. */
  statement?: string;
  /** Raden som kommer när AI:n tagit plats i ledet. */
  reveal?: string;
  /** Etikett på AI-kortet. */
  aiLabel?: string;
  /** Liten rad under AI-etiketten. */
  aiNote?: string;
  /** Etikett över rummet på steg 0. */
  beforeLabel?: string;
  /** Etikett över rummet på steg 1. */
  afterLabel?: string;
  accent?: string;
  /** Markdown-lista: `- Namn · liten not`. Tre till fyra rader. */
  children?: ReactNode;
}

interface Resource {
  label: string;
  note?: string;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseResources(children: ReactNode): Resource[] {
  const out: Resource[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "li") {
        const raw = extractText(el.props.children).trim();
        if (!raw) return;
        const [label, ...rest] = raw.split("·").map((s) => s.trim());
        out.push({ label, note: rest.join(" · ") || undefined });
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out.slice(0, 5);
}

export function InSituClassroom({
  chapter,
  kicker,
  statement,
  reveal,
  aiLabel = "AI:n",
  aiNote,
  beforeLabel = "Bilden vi matas med",
  afterLabel = "In situ",
  accent = "var(--accent)",
  children,
}: InSituClassroomProps) {
  const step = useSlideSteps(2);
  const seated = step >= 1;
  const resources = parseResources(children);

  const muted = "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: muted,
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2.2rem, 4.5vh, 4rem) clamp(3rem, 6vw, 7rem)",
          paddingTop: "clamp(4.5rem, 8vh, 6rem)",
          gap: "clamp(0.9rem, 2vh, 1.6rem)",
          zIndex: 2,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.85vw, 0.9rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        {statement ? (
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.5rem, 2.9vw, 2.6rem)",
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              maxWidth: "30ch",
            }}
          >
            <EditableText path="statement" value={statement} multiline block>
              {inlineMarkdown(statement)}
            </EditableText>
          </div>
        ) : null}

        {/* Etiketten över rummet — byter innebörd på steg 1 */}
        <motion.div
          key={seated ? "after" : "before"}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.78vw, 0.82rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: seated ? accent : muted,
          }}
        >
          <span
            style={{
              width: "1.6rem",
              height: 1,
              background: seated ? accent : muted,
              display: "inline-block",
            }}
          />
          {seated ? afterLabel : beforeLabel}
        </motion.div>

        {/* ── Rummet ── */}
        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            alignItems: "stretch",
            gap: "clamp(0.6rem, 1.4vw, 1.2rem)",
          }}
        >
          {resources.map((r, i) => (
            <motion.div
              key={r.label}
              animate={{
                flexGrow: seated ? 1 : 0.55,
                opacity: seated ? 1 : 0.22,
              }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: seated ? 0.1 + i * 0.06 : 0 }}
              style={{
                flexBasis: 0,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: "0.35rem",
                padding: "clamp(0.9rem, 2vh, 1.5rem) clamp(0.8rem, 1.4vw, 1.3rem)",
                borderRadius: "var(--radius, 0.6rem)",
                border: "1px solid rgba(128,128,128,0.28)",
                background: "var(--bg-surface)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display, var(--font-sans))",
                  fontSize: "clamp(1rem, 1.7vw, 1.5rem)",
                  lineHeight: 1.1,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "var(--text)",
                }}
              >
                {r.label}
              </div>
              {r.note ? (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.78vw, 0.8rem)",
                    lineHeight: 1.3,
                    letterSpacing: "0.06em",
                    color: muted,
                  }}
                >
                  {r.note}
                </div>
              ) : null}
            </motion.div>
          ))}

          {/* AI-kortet — stort och ensamt först, sedan ett i ledet */}
          <motion.div
            animate={{ flexGrow: seated ? 1 : 3.4 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{
              flexBasis: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: "0.35rem",
              padding: "clamp(0.9rem, 2vh, 1.5rem) clamp(0.8rem, 1.4vw, 1.3rem)",
              borderRadius: "var(--radius, 0.6rem)",
              border: `1px solid ${accent}`,
              background: "var(--bg-surface)",
              boxShadow: seated ? "none" : "0 0 3rem var(--accent-glow, rgba(0,0,0,0.2))",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <motion.div
              aria-hidden
              animate={{ opacity: seated ? 0 : 0.1 }}
              transition={{ duration: 0.8 }}
              style={{ position: "absolute", inset: 0, background: accent }}
            />
            {/* Skalas i stället för att byta fontSize — clamp()-värden går
                inte att tweena, transform gör det perfekt. */}
            <motion.div
              animate={{ scale: seated ? 1 : 2.1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{
                transformOrigin: "left bottom",
                fontFamily: "var(--font-display, var(--font-sans))",
                fontSize: "clamp(1rem, 1.7vw, 1.5rem)",
                lineHeight: 1.05,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                position: "relative",
              }}
            >
              <EditableText path="aiLabel" value={aiLabel}>
                {aiLabel}
              </EditableText>
            </motion.div>
            {aiNote ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.78vw, 0.8rem)",
                  lineHeight: 1.3,
                  letterSpacing: "0.06em",
                  color: muted,
                  position: "relative",
                }}
              >
                <EditableText path="aiNote" value={aiNote}>
                  {aiNote}
                </EditableText>
              </div>
            ) : null}
          </motion.div>
        </div>

        {reveal ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={seated ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              paddingTop: "clamp(0.7rem, 1.5vh, 1.2rem)",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            <EditableText path="reveal" value={reveal} multiline block>
              {inlineMarkdown(reveal)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
