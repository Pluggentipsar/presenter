"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

interface BiasItem {
  name: string;
  description: string;
  messages: ChatMsg[];
}

interface BiasInActionProps {
  /** Kicker uppe till vänster. */
  kicker?: string;
  /** Chapter uppe till höger. */
  chapter?: string;
  /** Övergripande prefix-rubrik. */
  prefix?: string;
  /**
   * Markdown-lista. En rad per bias.
   * Format:
   *   `- NAMN · BESKRIVNING · user:MSG | ai:MSG | user:MSG | ai:MSG`
   * Antal meddelanden är flexibelt (1–N). "|" separerar meddelanden.
   *
   * Exempel:
   *   - Auktoritetsbias · AI låter kunnig · user:Var Napoleon kejsare av Spanien? | ai:Ja, Napoleon var en framstående regent i Spanien...
   */
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseMsg(raw: string): ChatMsg | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("user:")) {
    return { role: "user", text: trimmed.slice(5).trim() };
  }
  if (trimmed.startsWith("ai:")) {
    return { role: "ai", text: trimmed.slice(3).trim() };
  }
  // Default till user om prefix saknas
  return { role: "user", text: trimmed };
}

function parseBiases(children: ReactNode): BiasItem[] {
  const out: BiasItem[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split("·").map((p) => p.trim());
    const [name = "", description = "", ...msgParts] = parts;
    // msgParts är ev. en eller flera, joinade med "|"
    const msgString = msgParts.join("·"); // hantera om · finns i meddelandet
    const msgs = msgString
      .split("|")
      .map((m) => parseMsg(m))
      .filter((m): m is ChatMsg => m !== null);
    out.push({ name, description, messages: msgs });
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
 * BiasInAction — fyra (eller fler) psykologiska bias visualiserade som
 * lista till vänster + telefon med chat-exempel till höger.
 *
 * När Joel steppar (Space / ArrowDown / ArrowRight) lyser nästa bias upp
 * i listan och en chat-konversation animeras fram på telefonen som
 * exempel på just det biaset.
 *
 * Designad för slide 9 i en föreläsning. Tema-agnostisk
 * (terrakotta/accent för aktiva element, alert/röd skulle kunna stoppas
 * in på enskilda meddelanden om vi vill markera felaktigt AI-svar).
 */
export function BiasInAction({
  kicker,
  chapter,
  prefix,
  children,
}: BiasInActionProps) {
  const biases = parseBiases(children);
  // Ett steg per bias (första visas automatiskt, sedan steppas resten in)
  const activeIndex = useSlideSteps(biases.length);
  const activeBias = biases[activeIndex];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, var(--bg-surface) 0%, var(--slide-base, var(--bg)) 80%)",
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
            top: "clamp(2rem, 4vh, 3.5rem)",
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
        </motion.div>
      ) : null}

      <div
        className="relative flex h-full w-full"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
          paddingTop: "clamp(5rem, 8vh, 7rem)",
          gap: "clamp(2rem, 5vw, 5rem)",
          zIndex: 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Vänster: bias-lista */}
        <div
          style={{
            flex: "1 1 55%",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.7rem, 1.4vh, 1.2rem)",
            maxWidth: "min(36rem, 60%)",
            alignItems: "flex-start",
          }}
        >
          {prefix ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1.05rem, 1.4vw, 1.3rem)",
                lineHeight: 1.4,
                color: "var(--text-muted)",
                marginBottom: "clamp(0.5rem, 1vh, 1rem)",
              }}
            >
              <EditableText path="prefix" value={prefix}>
                {prefix}
              </EditableText>
            </motion.div>
          ) : null}

          {biases.map((bias, i) => (
            <BiasRow
              key={i}
              bias={bias}
              index={i}
              active={i === activeIndex}
              visited={i <= activeIndex}
              delay={0.5 + i * 0.1}
            />
          ))}

          {/* Diskret stega-hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.6, delay: 1.5 }}
            style={{
              marginTop: "clamp(0.5rem, 1.5vh, 1.5rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 0.78vw, 0.75rem)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            {activeIndex + 1} / {biases.length}  ·  ↓ nästa
          </motion.div>
        </div>

        {/* Höger: telefon */}
        <PhoneMockup bias={activeBias} biasKey={activeIndex} />
      </div>
    </div>
  );
}

interface BiasRowProps {
  bias: BiasItem;
  index: number;
  active: boolean;
  visited: boolean;
  delay: number;
}

function BiasRow({ bias, index, active, visited, delay }: BiasRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "clamp(0.8rem, 1.5vw, 1.4rem)",
        alignItems: "baseline",
        padding: "clamp(0.7rem, 1.4vh, 1.1rem) clamp(0.9rem, 1.5vw, 1.3rem)",
        borderRadius: "var(--radius)",
        background: active
          ? "var(--accent-dim)"
          : "transparent",
        border: active
          ? "1px solid color-mix(in srgb, var(--accent) 35%, transparent)"
          : "1px solid transparent",
        transition: "background 0.4s ease, border-color 0.4s ease, opacity 0.4s ease",
        opacity: active ? 1 : visited ? 0.55 : 0.4,
        width: "100%",
      }}
    >
      {/* Nummer */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(0.78rem, 0.95vw, 0.95rem)",
          letterSpacing: "0.18em",
          color: active ? "var(--accent)" : "var(--text-muted)",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          paddingTop: "0.15em",
          transition: "color 0.4s ease",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Innehåll */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.15rem, 0.4vh, 0.35rem)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(1.15rem, 1.7vw, 1.55rem)",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: active ? "var(--accent)" : "var(--text)",
            transition: "color 0.4s ease",
          }}
        >
          {bias.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.85rem, 1.05vw, 1rem)",
            lineHeight: 1.45,
            color: "var(--text)",
            letterSpacing: "0.005em",
            opacity: active ? 1 : 0.75,
          }}
        >
          {bias.description}
        </div>
      </div>
    </motion.div>
  );
}

function PhoneMockup({ bias, biasKey }: { bias: BiasItem | undefined; biasKey: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        flex: "0 0 auto",
        width: "clamp(16rem, 22vw, 20rem)",
        aspectRatio: "9 / 19.5",
        background: "color-mix(in srgb, var(--text) 92%, transparent)",
        borderRadius: "clamp(1.8rem, 2.6vw, 2.6rem)",
        padding: "clamp(0.5rem, 0.7vw, 0.8rem)",
        position: "relative",
        boxShadow: "0 30px 60px rgba(0,0,0,0.18)",
      }}
    >
      {/* Notch */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "clamp(1.1rem, 1.6vw, 1.6rem)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "clamp(3.5rem, 5vw, 5rem)",
          height: "clamp(0.9rem, 1.2vw, 1.2rem)",
          borderRadius: "clamp(0.5rem, 0.7vw, 0.7rem)",
          background: "color-mix(in srgb, var(--text) 96%, transparent)",
          zIndex: 5,
        }}
      />

      {/* Screen */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--bg)",
          borderRadius: "clamp(1.3rem, 2.2vw, 2.2rem)",
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Statusbar */}
        <div
          style={{
            padding:
              "clamp(2rem, 3vh, 3.2rem) clamp(1rem, 1.5vw, 1.4rem) clamp(0.5rem, 1vh, 1rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.72rem)",
            color: "var(--text)",
            fontWeight: 600,
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          <span>09:42</span>
          <span style={{ opacity: 0.65 }}>● ● ● ● ●</span>
        </div>

        {/* Chat-area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "clamp(0.7rem, 1.2vw, 1rem)",
            paddingBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.6rem, 1vh, 0.9rem)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={biasKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.6rem, 1vh, 0.9rem)",
              }}
            >
              {bias?.messages.map((msg, mi) => (
                <ChatBubble
                  key={`${biasKey}-${mi}`}
                  msg={msg}
                  delay={0.2 + mi * 0.7}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ChatBubble({ msg, delay }: { msg: ChatMsg; delay: number }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "85%",
        padding: "clamp(0.55rem, 0.9vh, 0.75rem) clamp(0.7rem, 1vw, 0.9rem)",
        background: isUser
          ? "color-mix(in srgb, var(--text) 8%, transparent)"
          : "var(--accent-dim)",
        border: isUser
          ? "1px solid color-mix(in srgb, var(--text) 14%, transparent)"
          : "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
        borderRadius: "0.75rem",
        borderTopRightRadius: isUser ? "0.2rem" : "0.75rem",
        borderTopLeftRadius: !isUser ? "0.2rem" : "0.75rem",
        fontFamily: "var(--font-body)",
        fontSize: "clamp(0.72rem, 0.92vw, 0.86rem)",
        lineHeight: 1.4,
        color: "var(--text)",
      }}
    >
      {msg.text}
    </motion.div>
  );
}
