"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

type Size = "sm" | "md" | "lg" | "xl";

interface AiConversationProps {
  /** Rubrik ovanför konversationen */
  title?: string;
  /** Visas som en liten tag ovanför (tex "CASE" eller "DIALOG") */
  tag?: string;
  /** Etikett för användarens meddelanden (default "Du") */
  userLabel?: string;
  /** Etikett för AI:ns meddelanden (default "AI") */
  aiLabel?: string;
  /** Ms per tecken när användaren skriver. Default 8 (snabbt). */
  userSpeed?: number;
  /** Ms per tecken när AI skriver. Default 12 (lite långsammare). */
  aiSpeed?: number;
  /** Ms för typing-indikator innan AI börjar svara. Default 700. */
  thinkingDelay?: number;
  /** Ms paus efter att ett meddelande är klart innan nästa börjar (auto-mode). Default 500. */
  betweenDelay?: number;
  /** Stega fram manuellt med space/pil. Default false = auto-play. */
  stepped?: boolean;
  titleSize?: Size;
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.25rem, 2.5vw, 1.875rem)",
  md: "clamp(1.75rem, 3.5vw, 2.75rem)",
  lg: "clamp(2.5rem, 5vw, 4rem)",
  xl: "clamp(3rem, 6vw, 5rem)",
};

interface Message {
  role: "user" | "ai";
  /** Ev. override-label från markdown (tex **ChatGPT:** -> "ChatGPT") */
  label?: string;
  text: string;
}

/**
 * Simulerar en konversation med en AI (eller mellan roller). Meddelanden
 * typas fram tecken-för-tecken med typing-indikator mellan, auto-scroll
 * till senaste. Alternerar user/ai automatiskt (rad 1 = user, rad 2 = ai).
 *
 * Två lägen:
 * - Auto-play (default): hela konversationen spelas upp sekventiellt.
 * - Stepped: space/pil triggar varje nytt meddelande.
 *
 * <AiConversation title="Min dialog" stepped>
 * - **Du:** Hur förklarar jag fotosyntes för sjuåringar?
 * - **ChatGPT:** Tänk dig att bladet är en kock som lagar mat av solsken,
 *   vatten och luft. Receptet heter "klorofyll" och är grönt.
 * - **Du:** Gör en uppgift av det här
 * - **ChatGPT:** Perfekt! Barnen kan rita "bladet som kock" och märka
 *   ingredienserna. Låt dem hitta på egna recept som använder sol och vatten.
 * </AiConversation>
 */
function parseMessages(children: ReactNode): Message[] {
  const messages: Message[] = [];

  const extractText = (rawNode: ReactNode): string => {
    const node = unwrapLazy(rawNode);
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (isValidElement(node)) {
      return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
    }
    return "";
  };

  const parseLine = (text: string, index: number): Message => {
    // Leta efter **Label:** i början
    const labelMatch = text.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    let label: string | undefined;
    let body = text;
    if (labelMatch) {
      label = labelMatch[1].trim();
      body = labelMatch[2].trim();
    }
    // Rollen bestäms av position (alternerande), label är visningsetikett
    const role: "user" | "ai" = index % 2 === 0 ? "user" : "ai";
    return { role, label, text: body };
  };

  let idx = 0;
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const text = extractText(li.props.children);
    messages.push(parseLine(text, idx++));
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode }>;
    const type = element.type;
    if (type === "ul" || type === "ol") {
      Children.forEach(element.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (type === "li") {
      walkLi(element as ReactElement<{ children?: ReactNode }>);
    }
  });
  return messages;
}

export function AiConversation({
  title,
  tag,
  userLabel = "Du",
  aiLabel = "AI",
  userSpeed = 8,
  aiSpeed = 12,
  thinkingDelay = 700,
  betweenDelay = 500,
  stepped = false,
  titleSize = "md",
  children,
}: AiConversationProps) {
  // Memoisera så messages-arrayens referens är stabil mellan renders. Utan
  // detta triggar useEffect cleanup+setup-loopen vid varje render och
  // auto-play-timern hinner aldrig avfyra.
  const messages = useMemo(() => parseMessages(children), [children]);
  const activeStep = useSlideSteps(stepped ? messages.length : 0);
  const [autoIndex, setAutoIndex] = useState(-1); // -1 = ingen visad än
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-play-drivare: vänta tills CURRENT meddelande typats klart innan
  // nästa visas. Vi räknar tiden baserat på det meddelande som just nu är
  // i fokus (autoIndex), inte nästa — så Läscoachens thinking + typing
  // hinner avfyra innan dess animate-prop blir false.
  useEffect(() => {
    if (stepped) return;
    if (autoIndex >= messages.length - 1) return;

    // Initial: visa första meddelandet efter kort delay
    if (autoIndex === -1) {
      const timer = setTimeout(() => setAutoIndex(0), 400);
      return () => clearTimeout(timer);
    }

    // Vänta tills current meddelande är klart, sedan visa nästa
    const currentMsg = messages[autoIndex];
    const speed = currentMsg.role === "ai" ? aiSpeed : userSpeed;
    const thinking = currentMsg.role === "ai" ? thinkingDelay : 0;
    const typingTime = currentMsg.text.length * speed;
    const total = thinking + typingTime + betweenDelay;

    const timer = setTimeout(() => {
      setAutoIndex(autoIndex + 1);
    }, total);

    return () => clearTimeout(timer);
  }, [autoIndex, messages, stepped, thinkingDelay, betweenDelay, aiSpeed, userSpeed]);

  const visibleIndex = stepped ? activeStep : autoIndex;

  // Auto-scroll till botten när nytt meddelande dyker upp
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visibleIndex]);

  return (
    <div className="slide-container">
      <div
        className="flex h-full w-full flex-col gap-4"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {(tag || title) && (
          <div className="flex flex-col gap-2">
            {tag && (
              <motion.div
                className="text-xs uppercase tracking-[0.3em] text-accent md:text-sm"
                style={{ fontWeight: 600 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
              </motion.div>
            )}
            {title && (
              <motion.h2
                className="leading-tight"
                style={{
                  fontSize: TITLE_SIZES[titleSize],
                  fontFamily: "var(--font-display)",
                  fontWeight: "var(--heading-weight)",
                  letterSpacing: "var(--heading-tracking)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <EditableText path="title" value={title ?? ""}>{title}</EditableText>
              </motion.h2>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className="flex flex-col gap-4 overflow-y-auto px-1 py-2"
          style={{ maxHeight: "calc(100vh - 260px)", scrollBehavior: "smooth" }}
        >
          {messages.map((msg, i) => {
            if (i > visibleIndex) return null;
            const isLatest = i === visibleIndex;
            const speed = msg.role === "ai" ? aiSpeed : userSpeed;
            return (
              <MessageBubble
                key={i}
                message={msg}
                userLabel={userLabel}
                aiLabel={aiLabel}
                typeSpeed={speed}
                thinkingDelay={msg.role === "ai" ? thinkingDelay : 0}
                animate={isLatest}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  userLabel: string;
  aiLabel: string;
  typeSpeed: number;
  thinkingDelay: number;
  /** Om true: typa fram texten. Om false: visa direkt (för redan sedda meddelanden). */
  animate: boolean;
}

function MessageBubble({
  message,
  userLabel,
  aiLabel,
  typeSpeed,
  thinkingDelay,
  animate,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const displayLabel = message.label ?? (isUser ? userLabel : aiLabel);
  const [thinking, setThinking] = useState(animate && !isUser);
  const [typed, setTyped] = useState(animate ? "" : message.text);

  // Typing-indikator fas
  useEffect(() => {
    if (!animate || isUser) {
      setThinking(false);
      return;
    }
    setThinking(true);
    const timer = setTimeout(() => setThinking(false), thinkingDelay);
    return () => clearTimeout(timer);
  }, [animate, isUser, thinkingDelay]);

  // Typa fram text
  useEffect(() => {
    if (!animate) return;
    if (thinking) return;
    if (typed.length >= message.text.length) return;
    const timer = setTimeout(() => {
      setTyped(message.text.slice(0, typed.length + 1));
    }, typeSpeed);
    return () => clearTimeout(timer);
  }, [animate, thinking, typed, message.text, typeSpeed]);

  const isTypingDone = !animate || (!thinking && typed.length >= message.text.length);

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`flex max-w-[82%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      >
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-text-muted md:text-xs">
          {displayLabel}
        </div>
        <div
          className={`rounded-2xl px-5 py-3 text-[clamp(1rem,1.8vw,1.375rem)] leading-relaxed md:px-6 md:py-4 ${
            isUser
              ? "bg-accent/20 text-text"
              : "bg-bg-surface/60 text-text"
          }`}
          style={{
            border: isUser ? undefined : "1px solid rgba(0,0,0,0.1)",
            borderRadius: isUser ? "1.25rem 1.25rem 0.25rem 1.25rem" : "1.25rem 1.25rem 1.25rem 0.25rem",
            fontFamily: "var(--font-body)",
          }}
        >
          <AnimatePresence mode="wait">
            {thinking ? (
              <motion.div
                key="thinking"
                className="flex items-center gap-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block h-2 w-2 rounded-full bg-text-muted"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                <span className="whitespace-pre-wrap">{typed}</span>
                {!isTypingDone && (
                  <motion.span
                    className="ml-0.5 inline-block h-[1em] w-[0.45ch] align-middle bg-accent"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
