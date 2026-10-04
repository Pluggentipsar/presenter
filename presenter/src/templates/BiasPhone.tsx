"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BiasPhone ★ — en kognitiv genväg i taget, illustrerad i en telefon.
 *
 * Vänster: biasens namn och en kort förklaring.
 * Höger: en telefon som visar exakt den chatt där genvägen slår till.
 *
 * Varje steg byter BÅDA sidorna samtidigt och skiftar accentfärg, så
 * publiken ser att det är en ny mekanism — inte en fortsättning på den
 * förra. Sista steget kan bära en payoff-rad under kolumnerna.
 *
 * MDX-format — en bias per stycke, fält separerade med `·`:
 * ```mdx
 * <BiasPhone
 *   chapter="§ Vännen · Genvägarna"
 *   title="AI möter inte ett rationellt huvud."
 *   payoff="AI skapade inte våra genvägar. Men tekniken kan **skala** dem."
 * >
 * - Auktoritetsbias · ett säkert och välformulerat svar känns som ett expertsvar · #E8B44A
 *   - Du: Stämmer det att Vasaloppet går mellan Mora och Sälen?
 *   - AI: Ja — loppet går från Sälen till Mora, en sträcka på 90 kilometer …
 * ```
 * Rad 1 i varje stycke är `namn · förklaring · accentfärg`, därefter
 * chattrader som `- Avsändare: text`.
 */

interface BiasPhoneProps {
  chapter?: string;
  title?: string;
  /** Rad som visas under kolumnerna på sista steget. */
  payoff?: string;
  /** Etikett i telefonens statusrad. */
  appName?: string;
  children?: ReactNode;
}

interface ChatLine {
  sender: string;
  text: string;
  isUser: boolean;
}

interface Bias {
  name: string;
  explanation: string;
  accent: string;
  chat: ChatLine[];
}

/** Fallback-accenter om MDX inte anger färg — håller sig inom temats palett. */
const DEFAULT_ACCENTS = ["var(--accent)", "#E8B44A", "#7ED957"];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function addBias(biases: Bias[], text: string) {
  const parts = text.split("·").map((p) => p.trim());
  biases.push({
    name: parts[0] ?? "",
    explanation: parts[1] ?? "",
    accent: parts[2] || DEFAULT_ACCENTS[biases.length % DEFAULT_ACCENTS.length],
    chat: [],
  });
}

function addChatLine(biases: Bias[], text: string) {
  if (biases.length === 0) return;
  const idx = text.indexOf(":");
  if (idx === -1) return;
  const sender = text.slice(0, idx).trim();
  biases[biases.length - 1].chat.push({
    sender,
    text: text.slice(idx + 1).trim(),
    // Allt som inte är AI/Copilot/ChatGPT räknas som användaren.
    isUser: !/^(ai|copilot|chatgpt|gemini|assistent)/i.test(sender),
  });
}

/**
 * MDX levererar children olika beroende på väg: presentationsvyn renderar
 * via MDXRemote och ger React-noder (ul → li, med nästlad ul för chatten),
 * medan editorns SlideRenderer skickar råtexten. Båda måste fungera.
 */
function parseBiases(children: ReactNode): Bias[] {
  const biases: Bias[] = [];

  if (typeof children === "string") {
    for (const raw of children.split("\n")) {
      const line = raw.trimEnd();
      if (!line.trim()) continue;
      const nested = /^\s+-\s+(.*)$/.exec(line);
      if (nested) addChatLine(biases, nested[1]);
      else {
        const top = /^-\s+(.*)$/.exec(line);
        if (top) addBias(biases, top[1]);
      }
    }
    return biases;
  }

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    // Ett li kan innehålla både sin egen text och en nästlad lista med chatten.
    let ownText = "";
    const nestedLists: ReactElement<{ children?: ReactNode }>[] = [];
    Children.forEach(li.props.children, (part) => {
      if (isValidElement(part) && ((part as ReactElement).type === "ul" || (part as ReactElement).type === "ol")) {
        nestedLists.push(part as ReactElement<{ children?: ReactNode }>);
      } else {
        ownText += extractText(part);
      }
    });

    if (ownText.trim()) addBias(biases, ownText.trim());
    for (const list of nestedLists) {
      Children.forEach(list.props.children, (child) => {
        if (isValidElement(child) && (child as ReactElement).type === "li") {
          addChatLine(biases, extractText((child as ReactElement<{ children?: ReactNode }>).props.children).trim());
        }
      });
    }
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });

  return biases;
}

export function BiasPhone({
  chapter,
  title,
  payoff,
  appName = "Copilot",
  children,
}: BiasPhoneProps) {
  const biases = parseBiases(children);
  const step = useSlideSteps(biases.length);
  const current = biases[Math.min(step, biases.length - 1)];
  const isLast = step >= biases.length - 1;

  if (!current) return null;

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden"
      style={{ padding: "clamp(2.5rem, 5vw, 5rem)" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            left: "clamp(2.5rem, 5vw, 5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.6rem, 2.6vw, 2.6rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.15,
            color: "var(--text)",
            margin: "0 0 clamp(1.5rem, 3vh, 2.5rem)",
            maxWidth: "22ch",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </h2>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "clamp(2rem, 5vw, 4.5rem)",
          alignItems: "center",
        }}
      >
        {/* Vänster: biasens namn och förklaring */}
        <div>
          {/* Stegräknare — visar hur många genvägar som återstår */}
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              marginBottom: "clamp(1rem, 2vh, 1.6rem)",
            }}
          >
            {biases.map((b, i) => (
              <span
                key={b.name}
                style={{
                  width: i === step ? "2.2rem" : "0.5rem",
                  height: "0.5rem",
                  borderRadius: "999px",
                  background: i === step ? current.accent : "var(--text-muted)",
                  opacity: i === step ? 1 : 0.3,
                  transition: "all 320ms var(--motion-ease)",
                }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(2rem, 3.6vw, 3.6rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  color: current.accent,
                  marginBottom: "clamp(0.8rem, 1.6vh, 1.2rem)",
                }}
              >
                {current.name}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
                  lineHeight: 1.5,
                  color: "var(--text-muted)",
                  margin: 0,
                  maxWidth: "26ch",
                }}
              >
                {current.explanation}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Höger: telefonen */}
        <div
          style={{
            position: "relative",
            // Höjden styr, inte bredden: en 9/17-telefon som fyller kolumnens
            // bredd blir högre än sliden och spiller över nederkanten.
            aspectRatio: "9 / 17",
            height: "min(58vh, 30rem)",
            width: "auto",
            justifySelf: "center",
            borderRadius: "min(2.4rem, 8%)",
            background: "#0d0d10",
            border: `1px solid ${current.accent}`,
            boxShadow: `0 18px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 40px -18px ${current.accent}`,
            padding: "min(0.7rem, 3%)",
            transition: "border-color 400ms var(--motion-ease), box-shadow 400ms var(--motion-ease)",
          }}
        >
          <div
            style={{
              position: "relative",
              height: "100%",
              width: "100%",
              borderRadius: "min(2rem, 6.5%)",
              background: "var(--bg-surface, #131318)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Statusrad */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.7rem 0.8rem 0.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span
                style={{
                  width: "0.42rem",
                  height: "0.42rem",
                  borderRadius: "50%",
                  background: current.accent,
                  transition: "background 400ms var(--motion-ease)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.5rem, 0.66vw, 0.64rem)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                {appName}
              </span>
            </div>

            {/* Chatten */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "0.75rem",
                justifyContent: "center",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                >
                  {current.chat.map((line, i) => (
                    <motion.div
                      key={`${current.name}-${i}`}
                      initial={{ opacity: 0, y: 10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.34,
                        delay: 0.16 + i * 0.42,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        alignSelf: line.isUser ? "flex-end" : "flex-start",
                        maxWidth: "88%",
                        borderRadius: line.isUser
                          ? "0.85rem 0.85rem 0.2rem 0.85rem"
                          : "0.85rem 0.85rem 0.85rem 0.2rem",
                        padding: "0.45rem 0.6rem",
                        background: line.isUser
                          ? "rgba(255,255,255,0.09)"
                          : `color-mix(in srgb, ${current.accent} 20%, transparent)`,
                        border: line.isUser
                          ? "1px solid rgba(255,255,255,0.08)"
                          : `1px solid color-mix(in srgb, ${current.accent} 45%, transparent)`,
                        color: "var(--text)",
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.56rem, 0.78vw, 0.76rem)",
                        lineHeight: 1.4,
                      }}
                    >
                      {line.text}
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Payoff — bara på sista steget */}
      {payoff ? (
        <motion.div
          initial={false}
          animate={{ opacity: isLast ? 1 : 0, y: isLast ? 0 : 10 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "clamp(1.5rem, 3vh, 2.5rem)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.05rem, 1.7vw, 1.6rem)",
            lineHeight: 1.35,
            color: "var(--text)",
            maxWidth: "44ch",
          }}
          dangerouslySetInnerHTML={{
            __html: payoff.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
          }}
        />
      ) : null}
    </div>
  );
}
