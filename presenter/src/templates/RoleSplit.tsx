"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { glassCardStyle, SpecularHighlight } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RoleSplit ★ — samma verktyg, två roller, två utfall.
 *
 * Två frostade paneler sida vid sida. Den vänstra är DRÄNERAD PÅ FÄRG —
 * gråskala, kall glaston, ingen glöd. Den högra bär temats accent och ett
 * varmt sken. Det är hela argumentet, sagt utan ord: samma AI, samma
 * gränssnitt, men den ena vägen har ingen färg kvar i sig.
 *
 * Meddelandena kommer ett i taget i den ordning de står. Vänstersidan fylls
 * först — genvägen som är lätt att ta — och först därefter svarar högersidan.
 *
 * Drop-in-ersättare för ChatMockup med `split`: samma props och samma
 * barn-format. ChatMockup är orörd, den används i åtta presentationer.
 *
 * MDX-format — `L` eller `R` först, sedan avsändare i fetstil:
 * ```mdx
 * <RoleSplit leftApp="Gör åt mig" rightApp="Lär mig" title="…">
 * - L **Du:** Skriv klart min inlämning. 600 ord.
 * - L **Copilot:** Självklart! Här kommer …
 * - R **Du:** Förhör mig steg för steg — ge inte svaren.
 * - R **Copilot:** Vi kör. Första frågan …
 * </RoleSplit>
 * ```
 */

interface RoleSplitProps {
  eyebrow?: string;
  chapter?: string;
  title?: string;
  /** Rubrik över vänsterpanelen — genvägen. */
  leftApp?: string;
  /** Vad genvägen kostar. Landar när vänstersidan är klar. */
  leftCaption?: string;
  /** Rubrik över högerpanelen — den designade rollen. */
  rightApp?: string;
  /** Vad den designade rollen ger. */
  rightCaption?: string;
  /** Landningsrad längst ned. Stödjer **fetstil**. */
  bottomLine?: string;
  accent?: string;
  children?: ReactNode;
}

interface Msg {
  side: "L" | "R";
  sender: string;
  text: string;
  /** AI-svar ligger till vänster i bubbelflödet, användaren till höger. */
  isUser: boolean;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parseMessages(children: ReactNode): Msg[] {
  const out: Msg[] = [];
  const add = (raw: string) => {
    const m = /^\s*([LR])\s+\*\*(.+?):\*\*\s*(.*)$/.exec(raw.trim());
    if (!m) return;
    const sender = m[2].trim();
    out.push({
      side: m[1] as "L" | "R",
      sender,
      text: m[3].trim(),
      isUser: !/^(ai|copilot|chatgpt|gemini|assistent)/i.test(sender),
    });
  };

  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) add(m[1]);
    }
    return out;
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(extractText((li as ReactElement<{ children?: ReactNode }>).props.children));
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

/** Den kalla sidan har ingen accent — bara grått glas. */
const COLD = "rgb(122, 134, 152)";

export function RoleSplit({
  eyebrow,
  chapter,
  title,
  leftApp,
  leftCaption,
  rightApp,
  rightCaption,
  bottomLine,
  accent = "var(--accent)",
  children,
}: RoleSplitProps) {
  const msgs = parseMessages(children);
  // Ett steg per meddelande, plus ett sista där landningsraden kommer.
  const step = useSlideSteps(msgs.length + 1);
  const done = step >= msgs.length;

  if (msgs.length === 0) return null;

  const shown = (side: "L" | "R") =>
    msgs.map((m, i) => ({ ...m, i })).filter((m) => m.side === side && m.i <= step);
  const sideStarted = (side: "L" | "R") => shown(side).length > 0;
  const sideComplete = (side: "L" | "R") =>
    shown(side).length === msgs.filter((m) => m.side === side).length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Gradientaxeln: kall till vänster, varm till höger. Sliden lutar åt
          samma håll som argumentet. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: `
            radial-gradient(58% 66% at 20% 42%, ${withAlpha(COLD, 0.14)} 0%, transparent 64%),
            radial-gradient(58% 66% at 80% 58%, ${withAlpha(accent, 0.16)} 0%, transparent 64%)
          `,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1.6rem, 3.4vh, 2.6rem) clamp(2rem, 4vw, 4rem)",
        }}
      >
        {eyebrow || chapter ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.68rem, 0.9vw, 0.9rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path={eyebrow ? "eyebrow" : "chapter"} value={eyebrow ?? chapter}>
              {eyebrow ?? chapter}
            </EditableText>
          </div>
        ) : null}

        {title ? (
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: "clamp(1.5rem, 2.7vw, 2.7rem)",
              letterSpacing: "var(--heading-tracking)",
              lineHeight: 1.1,
              color: "var(--text)",
              margin: "clamp(0.4rem, 1vh, 0.7rem) 0 0",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        ) : null}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "clamp(1rem, 2.4vw, 2.4rem)",
            marginTop: "clamp(0.8rem, 2vh, 1.4rem)",
          }}
        >
          <Panel
            side="L"
            app={leftApp}
            caption={leftCaption}
            captionVisible={sideComplete("L")}
            started={sideStarted("L")}
            msgs={shown("L")}
            tone={COLD}
            drained
          />
          <Panel
            side="R"
            app={rightApp}
            caption={rightCaption}
            captionVisible={sideComplete("R")}
            started={sideStarted("R")}
            msgs={shown("R")}
            tone={accent}
          />
        </div>

        {bottomLine ? (
          <motion.div
            initial={false}
            animate={{ opacity: done ? 1 : 0, y: done ? 0 : 8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              marginTop: "clamp(0.7rem, 1.8vh, 1.2rem)",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 1.6vw, 1.5rem)",
              lineHeight: 1.3,
              color: "var(--text)",
            }}
            dangerouslySetInnerHTML={{
              __html: bottomLine.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  side,
  app,
  caption,
  captionVisible,
  started,
  msgs,
  tone,
  drained = false,
}: {
  side: "L" | "R";
  app?: string;
  caption?: string;
  captionVisible: boolean;
  started: boolean;
  msgs: Array<Msg & { i: number }>;
  tone: string;
  drained?: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: started ? 1 : 0.35 }}
      transition={{ duration: 0.5 }}
      style={{
        ...glassCardStyle({
          radius: "1.25rem",
          blur: 26,
          padding: "clamp(0.9rem, 1.8vw, 1.5rem)",
        }),
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        borderColor: withAlpha(tone, drained ? 0.22 : 0.5),
        boxShadow: drained
          ? "var(--glass-card-shadow)"
          : `var(--glass-card-shadow), 0 24px 60px -30px ${withAlpha(tone, 0.8)}`,
      }}
    >
      {drained ? null : <SpecularHighlight intensity={0.2} />}

      {/* Apprubrik */}
      {app ? (
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            paddingBottom: "clamp(0.5rem, 1.2vh, 0.8rem)",
            borderBottom: `1px solid ${withAlpha(tone, 0.22)}`,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: tone,
              opacity: drained ? 0.5 : 1,
              boxShadow: drained ? "none" : `0 0 12px ${withAlpha(tone, 0.8)}`,
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1rem, 1.6vw, 1.5rem)",
              letterSpacing: "-0.01em",
              color: drained ? "var(--text-muted)" : tone,
            }}
          >
            <EditableText path={side === "L" ? "leftApp" : "rightApp"} value={app}>
              {app}
            </EditableText>
          </span>
        </div>
      ) : null}

      {/* Bubblorna. Den kalla sidan renderas i gråskala — samma gränssnitt,
          all färg borta. Det är billigare än en förklaring. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.4rem, 1vh, 0.7rem)",
          paddingTop: "clamp(0.6rem, 1.4vh, 1rem)",
          justifyContent: "center",
          filter: drained ? "grayscale(1)" : "none",
        }}
      >
        {msgs.map((m) => (
          <motion.div
            key={m.i}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{
              alignSelf: m.isUser ? "flex-end" : "flex-start",
              maxWidth: "92%",
              borderRadius: m.isUser
                ? "1rem 1rem 0.25rem 1rem"
                : "1rem 1rem 1rem 0.25rem",
              padding: "clamp(0.55rem, 1.2vh, 0.8rem) clamp(0.7rem, 1.4vw, 1rem)",
              background: m.isUser
                ? "var(--glass-tint, rgba(120,135,160,0.12))"
                : withAlpha(tone, 0.16),
              border: `1px solid ${m.isUser ? "var(--glass-border, rgba(16,20,28,0.12))" : withAlpha(tone, 0.34)}`,
              color: "var(--text)",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.85rem, 1.22vw, 1.14rem)",
              lineHeight: 1.42,
            }}
          >
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.55rem, 0.7vw, 0.68rem)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "0.2rem",
              }}
            >
              {m.sender}
            </span>
            {m.text}
          </motion.div>
        ))}
      </div>

      {/* Vad sidan kostar respektive ger — landar när sidan är färdig */}
      {caption ? (
        <motion.div
          initial={false}
          animate={{ opacity: captionVisible ? 1 : 0, y: captionVisible ? 0 : 6 }}
          transition={{ duration: 0.5, delay: captionVisible ? 0.25 : 0 }}
          style={{
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
            marginTop: "clamp(0.5rem, 1.2vh, 0.9rem)",
            paddingTop: "clamp(0.5rem, 1.2vh, 0.8rem)",
            borderTop: `1px solid ${withAlpha(tone, 0.22)}`,
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(0.92rem, 1.4vw, 1.32rem)",
            lineHeight: 1.3,
            color: drained ? "var(--text-muted)" : tone,
          }}
        >
          <EditableText
            path={side === "L" ? "leftCaption" : "rightCaption"}
            value={caption}
          >
            {caption}
          </EditableText>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
