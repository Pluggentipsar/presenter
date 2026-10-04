"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { inlineMarkdown } from "@/lib/mini-markdown";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ImplicitContext ★ — allt kollegan redan vet, och som AI:n inte vet.
 *
 * "Dum kollega" är en bra tankemodell och en usel slide, för den säger
 * ingenting om VARFÖR. Svaret är inte att modellen är dum — det är att
 * den saknar allt det underförstådda som gör en kollega användbar på
 * tre sekunder. Er skola, er elevgrupp, förra veckan, vad ni menar med
 * "lagom svår". Ingen skriver ner det, för ingen har behövt.
 *
 * Vänsterspalten fylls av sig själv — det var alltid där. Högerspalten
 * står tom tills du skriver, och det enda som hamnar där är det du
 * faktiskt skrev. Asymmetrin är hela poängen och den syns på en sekund.
 *
 * Steg 1 lägger in prompt-remsan i den tomma spalten. Låt tomheten stå
 * en stund först — det är den som gör intryck.
 *
 * ```mdx
 * <ImplicitContext
 *   chapter="§ Om AI · Tankemodellen"
 *   title="Genial på det den kan. Men den vet ingenting om er."
 *   leftLabel="Din kollega"
 *   leftMeta="vet redan"
 *   rightLabel="AI:n"
 *   rightEmpty="Tomt. Varje gång."
 *   typed="Skriv en uppgift om andra världskriget till åk 9."
 *   landing="Skillnaden är inte intelligens. Det är **allt du aldrig behövt säga.**"
 * >
 * - er skola
 * - era elever
 * - vad ni gjorde förra veckan
 * - vad du menar med ”lagom svår”
 * - kursplanen ni tolkat ihop
 * - att Kevin har det tufft hemma
 * </ImplicitContext>
 * ```
 */

interface ImplicitContextProps {
  chapter?: string;
  kicker?: string;
  title?: string;
  /** Rubrik över vänsterspalten. */
  leftLabel?: string;
  /** Liten etikett under vänsterrubriken. */
  leftMeta?: string;
  rightLabel?: string;
  /** Texten i den tomma högerspalten, innan prompten skrivs. */
  rightEmpty?: string;
  /** Det du faktiskt skriver — dyker upp på steg 1. */
  typed?: string;
  /** Etikett över prompt-remsan. */
  typedLabel?: string;
  /** Landningsraden. Stödjer **fet**. */
  landing?: string;
  accent?: string;
  /** Markdown-lista: det underförstådda kollegan redan bär. 5–7 rader. */
  children?: ReactNode;
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

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const el = child as ReactElement<{ children?: ReactNode }>;
      if (el.type === "li") {
        const text = extractText(el.props.children).trim();
        if (text) out.push(text);
        return;
      }
      walk(el.props.children);
    });
  };
  walk(children);
  return out;
}

export function ImplicitContext({
  chapter,
  kicker,
  title,
  leftLabel = "Din kollega",
  leftMeta = "vet redan",
  rightLabel = "AI:n",
  rightEmpty = "Tomt. Varje gång.",
  typed,
  typedLabel = "det du skrev",
  landing,
  accent = "var(--accent)",
  children,
}: ImplicitContextProps) {
  const step = useSlideSteps(2);
  const typedIn = step >= 1;
  const items = parseItems(children);

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
            color: "var(--text-muted)",
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

        {title ? (
          <div
            style={{
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.4rem, 2.7vw, 2.4rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              maxWidth: "34ch",
            }}
          >
            <EditableText path="title" value={title} multiline block>
              {inlineMarkdown(title)}
            </EditableText>
          </div>
        ) : null}

        <div
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1.5rem, 3.5vw, 3.5rem)",
            alignItems: "stretch",
          }}
        >
          {/* ══ VÄNSTER · det underförstådda ══ */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <PanelHead label={leftLabel} meta={leftMeta} color="var(--text-muted)" path="left" />
            <div
              style={{
                flex: "1 1 auto",
                display: "flex",
                flexWrap: "wrap",
                alignContent: "flex-start",
                gap: "clamp(0.45rem, 1vh, 0.7rem)",
                paddingTop: "clamp(0.8rem, 1.8vh, 1.2rem)",
              }}
            >
              {items.map((it, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, delay: 0.5 + i * 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    padding: "0.5rem 0.9rem",
                    borderRadius: 999,
                    border: "1px solid rgba(128,128,128,0.28)",
                    background: "var(--bg-surface)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(0.85rem, 1.25vw, 1.15rem)",
                    lineHeight: 1.2,
                    color: "var(--text)",
                  }}
                >
                  {inlineMarkdown(it)}
                </motion.span>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 + items.length * 0.28 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.65rem, 0.8vw, 0.82rem)",
                letterSpacing: "0.14em",
                color: "var(--text-muted)",
                paddingTop: "clamp(0.6rem, 1.4vh, 1rem)",
              }}
            >
              — och ingen har behövt skriva ner det
            </motion.div>
          </div>

          {/* ══ HÖGER · tomheten ══ */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <PanelHead label={rightLabel} meta="vet" color={accent} path="right" />
            <div
              style={{
                flex: "1 1 auto",
                marginTop: "clamp(0.8rem, 1.8vh, 1.2rem)",
                border: "1px dashed rgba(128,128,128,0.4)",
                borderRadius: "var(--radius, 0.6rem)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(0.8rem, 1.8vh, 1.3rem)",
                padding: "clamp(1rem, 2.4vh, 1.8rem)",
                minHeight: 0,
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: typedIn ? 0.3 : 1 }}
                transition={{ duration: 0.7, delay: typedIn ? 0 : 1.1 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.8rem, 1.1vw, 1.05rem)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                <EditableText path="rightEmpty" value={rightEmpty}>
                  {rightEmpty}
                </EditableText>
              </motion.div>

              {typed ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={typedIn ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{ width: "100%", maxWidth: "34ch" }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.6rem, 0.75vw, 0.78rem)",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      color: accent,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {typedLabel}
                  </div>
                  <div
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "var(--radius, 0.5rem)",
                      background: "var(--bg-surface)",
                      borderLeft: `2px solid ${accent}`,
                      fontFamily: "var(--font-sans)",
                      fontSize: "clamp(0.9rem, 1.3vw, 1.2rem)",
                      lineHeight: 1.35,
                      color: "var(--text)",
                    }}
                  >
                    <EditableText path="typed" value={typed} multiline block>
                      {inlineMarkdown(typed)}
                    </EditableText>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
                      letterSpacing: "0.14em",
                      color: "var(--text-muted)",
                      marginTop: "0.6rem",
                    }}
                  >
                    — och ingenting mer
                  </div>
                </motion.div>
              ) : null}
            </div>
          </div>
        </div>

        {landing ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={typedIn ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              paddingTop: "clamp(0.8rem, 1.8vh, 1.4rem)",
              borderTop: "1px solid rgba(128,128,128,0.2)",
              fontFamily: "var(--font-display, var(--font-sans))",
              fontSize: "clamp(1.25rem, 2.3vw, 2.1rem)",
              lineHeight: 1.22,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            <EditableText path="landing" value={landing} multiline block>
              {inlineMarkdown(landing)}
            </EditableText>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

function PanelHead({
  label,
  meta,
  color,
  path,
}: {
  label?: string;
  meta?: string;
  color: string;
  path: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem" }}>
      {label ? (
        <span
          style={{
            fontFamily: "var(--font-display, var(--font-sans))",
            fontSize: "clamp(1.15rem, 2vw, 1.8rem)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text)",
          }}
        >
          <EditableText path={`${path}Label`} value={label}>
            {label}
          </EditableText>
        </span>
      ) : null}
      {meta ? (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.62rem, 0.78vw, 0.8rem)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color,
          }}
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}
