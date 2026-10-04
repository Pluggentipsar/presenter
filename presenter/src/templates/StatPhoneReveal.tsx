"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * StatPhoneReveal ★ — en siffra i taget, med beviset i en telefon.
 *
 * Vänster: siffran stor, påståendet under. Höger: en telefon som visar
 * exakt det innehåll siffran handlar om — en film, en skärmdump eller en
 * chatt. Hela telefonen byts ut mellan stegen, inte bara innehållet i den,
 * så publiken läser det som "ny telefon, ny sak" i stället för en
 * fortsättning.
 *
 * Poängen med formatet: siffrorna är inte statistik för statistikens skull,
 * de är inramningen. Det här är den vardag eleverna redan står i.
 *
 * Telefonens proportion (`phoneAspect`) ska matcha materialet som ska visas
 * — default 376/846, alltså en inspelning från en modern telefon. Filmer
 * fyller ytan (cover), bilder skalas in hela (contain), eftersom en
 * skärmdump av en artikel tappar sin poäng om kanterna kapas.
 *
 * MDX-format — en siffra per stycke, fält separerade med `·`:
 * ```mdx
 * <StatPhoneReveal chapter="§ ..." title="...">
 * - 20% · av allt innehåll på Instagram tros vara AI-genererat · /bilder/x/insta.mp4 · Instagram
 * - 5/10 · ungdomar söker med AI i stället för att googla · · Copilot
 *   - Elev: vem var selma lagerlöf
 *   - AI: Svensk författare (1858–1940) …
 * ```
 * Rad 1 är `siffra · påstående · källa · appnamn`. Lämnas källan tom visas
 * i stället chattraderna som listas under, som `- Avsändare: text`.
 */

interface StatPhoneRevealProps {
  /** Liten etikett uppe till vänster. */
  chapter?: string;
  /** Rubrik som ramar in hela sliden. */
  title?: string;
  /** Rad som fälls in under kolumnerna på sista steget. */
  payoff?: string;
  /** Telefonens proportion. Default matchar en modern telefoninspelning. */
  phoneAspect?: string;
  children?: ReactNode;
}

interface ChatLine {
  sender: string;
  text: string;
  isUser: boolean;
}

interface Stat {
  figure: string;
  statement: string;
  src: string;
  appName: string;
  chat: ChatLine[];
}

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
const VIDEO_RE = /\.(mp4|webm|mov|m4v)$/i;

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function addStat(stats: Stat[], text: string) {
  const parts = text.split("·").map((p) => p.trim());
  stats.push({
    figure: parts[0] ?? "",
    statement: parts[1] ?? "",
    src: parts[2] ?? "",
    appName: parts[3] ?? "",
    chat: [],
  });
}

function addChatLine(stats: Stat[], text: string) {
  if (stats.length === 0) return;
  const idx = text.indexOf(":");
  if (idx === -1) return;
  const sender = text.slice(0, idx).trim();
  stats[stats.length - 1].chat.push({
    sender,
    text: text.slice(idx + 1).trim(),
    // Allt som inte är en AI-avsändare räknas som eleven.
    isUser: !/^(ai|copilot|chatgpt|gemini|assistent)/i.test(sender),
  });
}

/**
 * MDX levererar children olika beroende på väg: presentationsvyn renderar
 * via MDXRemote och ger React-noder, medan editorns SlideRenderer skickar
 * råtexten. Båda måste fungera.
 */
function parseStats(children: ReactNode): Stat[] {
  const stats: Stat[] = [];

  if (typeof children === "string") {
    for (const raw of children.split("\n")) {
      const line = raw.trimEnd();
      if (!line.trim()) continue;
      const nested = /^\s+-\s+(.*)$/.exec(line);
      if (nested) addChatLine(stats, nested[1]);
      else {
        const top = /^-\s+(.*)$/.exec(line);
        if (top) addStat(stats, top[1]);
      }
    }
    return stats;
  }

  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    let ownText = "";
    const nestedLists: ReactElement<{ children?: ReactNode }>[] = [];
    Children.forEach(li.props.children, (part) => {
      const type = isValidElement(part) ? (part as ReactElement).type : null;
      if (type === "ul" || type === "ol") {
        nestedLists.push(part as ReactElement<{ children?: ReactNode }>);
      } else {
        ownText += extractText(part);
      }
    });

    if (ownText.trim()) addStat(stats, ownText.trim());
    for (const list of nestedLists) {
      Children.forEach(list.props.children, (child) => {
        if (isValidElement(child) && (child as ReactElement).type === "li") {
          addChatLine(
            stats,
            extractText((child as ReactElement<{ children?: ReactNode }>).props.children).trim(),
          );
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

  return stats;
}

export function StatPhoneReveal({
  chapter,
  title,
  payoff,
  phoneAspect = "376 / 846",
  children,
}: StatPhoneRevealProps) {
  const stats = parseStats(children);
  const step = useSlideSteps(stats.length);
  const current = stats[Math.min(step, stats.length - 1)];
  const isLast = step >= stats.length - 1;

  if (!current) return null;

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden"
      // Smalare marginal upptill och nedtill än i sidled: varje pixel där
      // blir telefonhöjd, och sidled har den gott om ändå.
      style={{ padding: "clamp(1.2rem, 2.4vh, 2rem) clamp(2.5rem, 5vw, 5rem)" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(1.6rem, 3.4vh, 2.8rem)",
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

      <div
        style={{
          display: "grid",
          // Textspalten krymper till sitt innehåll i stället för att ta all
          // ledig bredd. Med 1fr blev vänsterkolumnen 857 px medan texten bara
          // använde 420 — telefonen trycktes ut till slidens kant och det låg
          // nästan 500 px dött utrymme mellan dem. Nu står de bredvid varandra
          // och överskottet hamnar till höger.
          gridTemplateColumns: "auto 1fr",
          columnGap: "clamp(1.5rem, 4vw, 3.5rem)",
          alignItems: "center",
        }}
      >
        {/* Vänster: siffran och påståendet */}
        <div>
          {title ? (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                fontSize: "clamp(1.15rem, 1.7vw, 1.7rem)",
                letterSpacing: "var(--heading-tracking)",
                lineHeight: 1.2,
                color: "var(--text-muted)",
                margin: "0 0 clamp(1.2rem, 2.4vh, 2rem)",
                maxWidth: "26ch",
              }}
            >
              <EditableText path="title" value={title}>
                {title}
              </EditableText>
            </h2>
          ) : null}

          {/* Stegräknare — visar hur många siffror som återstår */}
          <div
            style={{
              display: "flex",
              gap: "0.4rem",
              marginBottom: "clamp(1rem, 2vh, 1.6rem)",
            }}
          >
            {stats.map((s, i) => (
              <span
                key={s.figure}
                style={{
                  width: i === step ? "2.2rem" : "0.5rem",
                  height: "0.5rem",
                  borderRadius: "999px",
                  background: i === step ? "var(--accent)" : "var(--text-muted)",
                  opacity: i === step ? 1 : 0.3,
                  transition: "all 320ms var(--motion-ease)",
                }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.figure}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "clamp(3.4rem, 7.5vw, 7.5rem)",
                  lineHeight: 0.92,
                  letterSpacing: "-0.04em",
                  color: "var(--accent)",
                  marginBottom: "clamp(0.9rem, 1.8vh, 1.4rem)",
                }}
              >
                {current.figure}
              </div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(1.05rem, 1.6vw, 1.6rem)",
                  lineHeight: 1.4,
                  color: "var(--text)",
                  margin: 0,
                  maxWidth: "22ch",
                }}
              >
                {current.statement}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Höger: telefonen. Hela enheten byts mellan stegen — "ny telefon,
            ny sak" — inte bara innehållet bakom glaset. */}
        {/* start, inte center: telefonen ska stå intill texten, inte i mitten
            av den tomma ytan till höger om den. */}
        <div style={{ justifySelf: "start" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`phone-${step}`}
              initial={{ opacity: 0, y: 26, rotateZ: -1.5 }}
              animate={{ opacity: 1, y: 0, rotateZ: 0 }}
              exit={{ opacity: 0, y: -22, rotateZ: 1.5 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "relative",
                // Höjden styr, inte bredden: en smal hög telefon som fyller
                // kolumnens bredd blir högre än sliden och spiller över.
                aspectRatio: phoneAspect,
                // Telefonen ÄR sliden — den ska ta så mycket höjd som
                // dukens övriga innehåll tillåter. Begränsningen är slidens
                // höjd, inte bredden: en 9:20-telefon blir aldrig bred.
                height: "min(82vh, 44rem)",
                width: "auto",
                borderRadius: "min(2.2rem, 7%)",
                background: "#0b0b0e",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow:
                  "0 22px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
                padding: "min(0.55rem, 2.4%)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "100%",
                  width: "100%",
                  borderRadius: "min(1.8rem, 5.5%)",
                  background: "#000",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <PhoneScreen stat={current} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Payoff — bara på sista steget */}
      {payoff ? (
        <motion.div
          initial={false}
          animate={{ opacity: isLast ? 1 : 0, y: isLast ? 0 : 10 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "clamp(1.2rem, 2.6vh, 2rem)",
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

function PhoneScreen({ stat }: { stat: Stat }) {
  if (VIDEO_RE.test(stat.src)) {
    return (
      <video
        src={stat.src}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }

  if (IMAGE_RE.test(stat.src)) {
    return (
      // contain, inte cover: en skärmdump av en artikel tappar sin poäng om
      // kanterna kapas. De tunna kanterna läses som telefonens egen ram.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={stat.src}
        alt={stat.statement}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    );
  }

  return <PhoneChat stat={stat} />;
}

function PhoneChat({ stat }: { stat: Stat }) {
  return (
    <>
      {stat.appName ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.7rem 0.8rem 0.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "0.42rem",
              height: "0.42rem",
              borderRadius: "50%",
              background: "var(--accent)",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.5rem, 0.66vw, 0.64rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {stat.appName}
          </span>
        </div>
      ) : null}

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
        {stat.chat.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.34,
              delay: 0.3 + i * 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              alignSelf: line.isUser ? "flex-end" : "flex-start",
              maxWidth: "88%",
              borderRadius: line.isUser
                ? "0.85rem 0.85rem 0.2rem 0.85rem"
                : "0.85rem 0.85rem 0.85rem 0.2rem",
              padding: "0.5rem 0.65rem",
              background: line.isUser
                ? "rgba(255,255,255,0.11)"
                : "color-mix(in srgb, var(--accent) 22%, transparent)",
              border: line.isUser
                ? "1px solid rgba(255,255,255,0.1)"
                : "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
              color: "rgba(255,255,255,0.94)",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.58rem, 0.8vw, 0.78rem)",
              lineHeight: 1.4,
            }}
          >
            {line.text}
          </motion.div>
        ))}
      </div>
    </>
  );
}
