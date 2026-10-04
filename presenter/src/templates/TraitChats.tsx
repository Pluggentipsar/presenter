"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { extractText, unwrapLazy } from "@/lib/extract-text";

/**
 * TraitChats ★ — egenskapen till vänster, beviset till höger.
 *
 * En abstrakt egenskap ("den minns", "den anpassar sig") blir konkret i exakt
 * samma ögonblick som den nämns: kortet tänds i vänsterspalten, och två
 * repliker skrivs fram i högerspalten som visar egenskapen i handling. Byggd
 * för elevhälsopasset "Det de pratar med", akt 3 (identiteten) — men fungerar
 * överallt där en lista med egenskaper riskerar att bli fyra ord som publiken
 * nickar åt utan att se.
 *
 * Ersätter inte `HumanCapacities` — den mallen bor kvar i sina egna arton
 * presentationer och rörs inte.
 *
 * Raderna skrivs som en punktlista i tre delar separerade med ` · `:
 *
 *   rubrik · beskrivning · Du: text || AI: text
 *
 * Tredje fältet är valfritt — en rad utan minichatt visar bara kortet, och
 * högerspalten står då medvetet tom (fel bevis under rätt ord är värre än
 * inget bevis). Avsändarnamnen före kolon är fria: allt som börjar på
 * du/jag/elev/hon/han/hen/användar läses som användarsidan, resten som AI.
 * Fler än två repliker går bra, separerade med `||`.
 *
 * ```mdx
 * <TraitChats
 *   chapter="§ 03 · Identiteten"
 *   kicker="Fiktiva exempel"
 *   title="Identitetsarbetet pågår nu delvis i en chatt"
 *   source="Fiktiva samtal, konstruerade för illustration"
 *   footer="Ett samtal som saknar ambivalens saknar en del av materialet."
 *   register="glod"
 * >
 * - Minns · Samtalet fortsätter där det slutade. · Du: tänker fortfarande på det där || AI: Det med Alva?
 * - Alltid · Ingen väntetid, ingen som tröttnar. · Du: sover du? || AI: Jag är här. Vad tänker du på?
 * </TraitChats>
 * ```
 *
 * **Steg:** ett per rad, och steg 0 är rad ett tänd — inget tomt utgångsläge.
 * PDF-export och tumnaglar (som alltid står på steg 0) får därmed en färdig,
 * läsbar slide i stället för en halv.
 */

type Side = "user" | "ai";

interface Reply {
  speaker: string;
  text: string;
  side: Side;
  /** Sant när repliken saknade kolon och avsändaren kom ur userLabel/aiLabel. */
  fromProp: boolean;
}

interface Row {
  word: string;
  body: string;
  replies: Reply[];
}

interface TraitChatsProps {
  /** §-markören uppe till vänster, i accent. */
  chapter?: string;
  /** Brasklappen uppe till höger, rakt ovanför chatten. Utan chapter hamnar den vänster. */
  kicker?: string;
  title?: string;
  /** Kolumnrubrik vänster. Default "Egenskapen". */
  traitLabel?: string;
  /** Kolumnrubrik höger. Default "Så låter det". */
  chatLabel?: string;
  /** Avsändarnamn när en replik saknar kolon. Default "Du". */
  userLabel?: string;
  /** Avsändarnamn när en replik saknar kolon. Default "AI". */
  aiLabel?: string;
  /** Mono-rad längst ned i högerspalten. */
  source?: string;
  /** Rad längst ned på sliden. Tänds på sista steget. */
  footer?: string;
  /** Hur länge skrivpunkterna ligger kvar innan AI-svaret syns. Default 420. */
  typingMs?: number;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Praktiska tak — bortom dem krymper ordet snabbare än det blir läsbart. */
const MAX_ROWS = 6;
const MAX_REPLIES = 6;

/** Tecken per rad i beskrivningen, används för att reservera dess höjd. */
const CH_PER_LINE = 46;

const BUBBLE_PADDING = "clamp(0.6rem, 1.1vh, 0.95rem) clamp(0.75rem, 1.2vw, 1.15rem)";

/** Bubbelgraderna, från störst till minst. Väljs EN gång ur hela uppsättningen. */
const BUBBLE_SIZES = [
  "clamp(0.92rem, 1.28vw, 1.55rem)",
  "clamp(0.86rem, 1.14vw, 1.38rem)",
  "clamp(0.80rem, 1.00vw, 1.20rem)",
  "clamp(0.76rem, 0.90vw, 1.08rem)",
];

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.56rem, 0.92vw, 0.98rem)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

/* ————————————————————— Parsning ————————————————————— */

function sideOf(speaker: string): Side {
  // "elev" fångar även "Eleven", i linje med ChatArtifact.
  return /^(du|jag|elev|hon|han|hen|användar)/i.test(speaker.trim()) ? "user" : "ai";
}

function parseReplies(raw: string, userLabel: string, aiLabel: string): Reply[] {
  if (!raw.trim()) return [];
  return raw
    .split(/\s*\|\|\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_REPLIES)
    .map((chunk, i) => {
      const m = chunk.match(/^([^:]{1,24}):\s*([\s\S]*)$/);
      if (m && m[2].trim()) {
        const speaker = m[1].trim();
        return { speaker, text: m[2].trim(), side: sideOf(speaker), fromProp: false };
      }
      // Utan kolon: alternerande sidor med användaren först.
      const side: Side = i % 2 === 0 ? "user" : "ai";
      return {
        speaker: side === "user" ? userLabel : aiLabel,
        text: chunk,
        side,
        fromProp: true,
      };
    });
}

function parseRows(children: ReactNode, userLabel: string, aiLabel: string): Row[] {
  const out: Row[] = [];
  const add = (raw: string) => {
    const parts = raw.split(" · ").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    // Fält tre är allt efter andra separatorn — ett `·` inuti en replik överlever.
    const chatRaw = parts.slice(2).join(" · ");
    out.push({
      word: parts[0],
      body: parts[1] ?? "",
      replies: parseReplies(chatRaw, userLabel, aiLabel),
    });
  };
  const walk = (node: ReactNode) => {
    // unwrapLazy är obligatoriskt: utan den ser servern noll rader och
    // klienten alla, och hydreringen spricker.
    const n = unwrapLazy(node);
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ children?: ReactNode }>;
    if (el.type === "li") return add(extractText(el.props.children).trim());
    Children.forEach(el.props.children, walk);
  };
  walk(children);
  return out.slice(0, MAX_ROWS);
}

/* ————————————————————— Emfas ————————————————————— */

/** `**ord**` i beskrivningen: accent OCH fetare snitt — aldrig bara färg. */
function boldAccent(text: string): ReactNode {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p, i) => {
      const m = p.match(/^\*\*([\s\S]+)\*\*$/);
      return m ? (
        <strong key={i} style={{ color: "var(--accent)", fontWeight: 700, fontStretch: "112%" }}>
          {m[1]}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      );
    });
}

/**
 * `**ord**` i en bubbla: bara vikt. Accenten är reserverad för den aktiva
 * egenskapen, och accent på en användarbubbla vars fyllning är var(--text)
 * blir oläsligt i de varma registren.
 */
function boldPlain(text: string): ReactNode {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p, i) => {
      const m = p.match(/^\*\*([\s\S]+)\*\*$/);
      return m ? (
        <strong key={i} style={{ fontWeight: 700, fontStretch: "112%" }}>
          {m[1]}
        </strong>
      ) : (
        <span key={i}>{p}</span>
      );
    });
}

/** Tre pulserande punkter — AI:n "skriver" inne i den redan fullstora bubblan. */
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: "0.3rem" }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          style={{
            width: "0.42rem",
            height: "0.42rem",
            borderRadius: "var(--radius)",
            // Skrivindikatorn är gränssnitt, inte blottläggning.
            background: "var(--text-muted)",
          }}
        />
      ))}
    </div>
  );
}

/* ————————————————————— Mallen ————————————————————— */

export function TraitChats({
  chapter,
  kicker,
  title,
  traitLabel = "Egenskapen",
  chatLabel = "Så låter det",
  userLabel = "Du",
  aiLabel = "AI",
  source,
  footer,
  typingMs = 420,
  children,
}: TraitChatsProps) {
  const rows = useMemo(
    () => parseRows(children, userLabel, aiLabel),
    [children, userLabel, aiLabel],
  );
  const reduceMotion = useReducedMotion() ?? false;

  // ETT steg per rad. Steg 0 = rad ett aktiv, så PDF och tumnagel får en
  // färdig slide i stället för ett tomt utgångsläge.
  const step = useSlideSteps(Math.max(rows.length, 1));
  // Klick vinner tills stegningen rör sig igen — samma mönster som
  // SupportDial/RoleSelector, så Joel kan hoppa när publiken ropar på en rad.
  const [picked, setPicked] = useState<{ atStep: number; index: number } | null>(null);
  const stepIndex = Math.min(step, Math.max(rows.length - 1, 0));
  const active = picked && picked.atStep === step ? picked.index : stepIndex;

  const count = rows.length;
  const slots = Math.max(count, 1);
  const current = rows[active];
  const replies = current?.replies ?? [];
  const hasChat = replies.length > 0;

  /* ——— Fit-to-box: beskrivningens höjd reserveras, resten går till ordet ———
   *
   * Beskrivningen klampas till det antal rader den längsta beskrivningen i
   * uppsättningen kräver, så radhöjderna aldrig kan divergera och plattans
   * resa förblir uniform. Det som blir över är ordets låda. Ordet multipliceras
   * medvetet INTE med var(--display-scale) — betongtemanas 1,35 skulle spränga
   * lådan.
   */
  const maxDescLen = Math.max(...rows.map((r) => r.body.length), 1);
  const maxWordLen = Math.max(...rows.map((r) => r.word.length), 1);
  const descLines = Math.min(3, Math.max(1, Math.ceil(maxDescLen / CH_PER_LINE)));
  const descFs =
    slots >= 5 ? "clamp(0.72rem, 0.86vw, 0.95rem)" : "clamp(0.78rem, 0.95vw, 1.06rem)";
  const descH = `calc(${descLines} * 1.42 * ${descFs})`;
  const wordBox = `calc((59vh / ${slots}) - 3vh - 0.9vh - ${descH})`;
  // 40,3vw textbredd, ~0,62 em medelbredd per versal i Archivo.
  const wCapVw = Math.min(5.4, 40.3 / (0.62 * maxWordLen));
  const wordFontSize = `max(1.05rem, min(${wCapVw.toFixed(2)}vw, ${wordBox}))`;

  /* ——— Bubbelgraden räknas EN gång ur hela uppsättningen ———
   * Graderna får aldrig ändras mellan steg; då läser bytet som en omlayout.
   */
  const maxReplyLen = Math.max(
    ...rows.flatMap((r) => r.replies.map((x) => x.text.length)),
    1,
  );
  const maxReplies = Math.max(...rows.map((r) => r.replies.length), 1);
  let tier = maxReplyLen <= 55 ? 0 : maxReplyLen <= 90 ? 1 : maxReplyLen <= 140 ? 2 : 3;
  if (maxReplies >= 5) tier += 2;
  else if (maxReplies >= 3) tier += 1;
  const bubbleFs = BUBBLE_SIZES[Math.min(tier, BUBBLE_SIZES.length - 1)];
  const replyGap = maxReplies >= 5 ? "1vh" : "1.5vh";

  /* ——— Skrivindikatorn ———
   * Timeouten mäts från SISTA bubblans ankomst, inte från klicket — annars
   * hinner punkterna knappt synas. typedFor initieras till 0 så att PDF och
   * tumnagel (där timeouten aldrig hinner köra) får text i stället för punkter.
   */
  const lastIsAi = replies.length > 0 && replies[replies.length - 1].side === "ai";
  const lastDelay = Math.round((0.26 + Math.max(replies.length - 1, 0) * 0.13) * 1000);
  const [typedFor, setTypedFor] = useState<number | null>(0);
  const typing = !reduceMotion && lastIsAi && typedFor !== active;
  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(() => setTypedFor(active), lastDelay + typingMs);
    return () => clearTimeout(timer);
  }, [active, reduceMotion, typingMs, lastDelay]);

  const hairline = "color-mix(in srgb, var(--text) 22%, transparent)";
  const leftSlot = chapter ?? kicker;
  const rightSlot = chapter ? kicker : undefined;
  const traitTransition = reduceMotion
    ? "opacity 0.15s linear"
    : `color 0.4s ${EASE}, opacity 0.4s ${EASE}, font-stretch 0.4s ${EASE}`;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* ————— Topprad ————— */}
      {leftSlot ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "4.5vh",
            left: "5vw",
            zIndex: 6,
            color: "var(--accent)",
          }}
        >
          <EditableText path={chapter ? "chapter" : "kicker"} value={leftSlot}>
            {leftSlot}
          </EditableText>
        </div>
      ) : null}
      {rightSlot ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "4.5vh",
            right: "5vw",
            zIndex: 6,
            opacity: 0.62,
            textAlign: "right",
          }}
        >
          <EditableText path="kicker" value={rightSlot}>
            {rightSlot}
          </EditableText>
        </div>
      ) : null}

      {/* ————— Titelbandet: två rader reserverat, toppställt ————— */}
      {title ? (
        <div
          style={{
            position: "absolute",
            left: "5vw",
            right: "5vw",
            top: "10.8vh",
            height: "14.4vh",
            zIndex: 5,
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
              textTransform: "var(--heading-case)" as "normal" | "uppercase",
              fontSize:
                title.length > 58
                  ? "calc(clamp(0.95rem, 2vw, 2.1rem) * var(--display-scale, 1))"
                  : "calc(clamp(1.1rem, 2.35vw, 2.5rem) * var(--display-scale, 1))",
              lineHeight: 0.96,
              margin: 0,
              maxWidth: "62vw",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        </div>
      ) : null}

      {/* ————— Kolumnetiketterna + reglarna, samma baslinje ————— */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          width: "43vw",
          top: "25.2vh",
          height: "2.2vh",
          zIndex: 6,
          display: "flex",
          alignItems: "flex-end",
          borderBottom: `1px solid ${hairline}`,
        }}
      >
        <span style={{ ...mono, opacity: 0.55 }}>
          <EditableText path="traitLabel" value={traitLabel}>
            {traitLabel}
          </EditableText>
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: "51.5vw",
          right: "5vw",
          top: "25.2vh",
          height: "2.2vh",
          zIndex: 6,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1vw",
          // Alltid 2px så ingenting flyttar; bara färgen skiljer. Den tjocka
          // accentlinjen markerar den levande kolumnen — saknar raden chatt
          // går den till samma hårlinje som vänsterspalten.
          borderBottom: `2px solid ${hasChat ? "var(--accent)" : hairline}`,
          transition: `border-color 0.3s ${EASE}`,
        }}
      >
        <span
          style={{
            ...mono,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <span style={{ color: "var(--accent)" }}>{current?.word ?? ""}</span>
          <span style={{ opacity: hasChat ? 0.55 : 0.4 }}>
            {current ? " · " : ""}
            <EditableText path="chatLabel" value={chatLabel}>
              {chatLabel}
            </EditableText>
          </span>
        </span>
        {count > 0 ? (
          <span style={{ ...mono, opacity: 0.5, whiteSpace: "nowrap" }}>
            {`${String(active + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`}
          </span>
        ) : null}
      </div>

      {/* ————— Vänsterspalten: kartan ————— */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          width: "43vw",
          top: "29vh",
          bottom: "12vh",
          zIndex: 5,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Plattan glider mellan raderna — EN sak rör sig, inte fyra opaciteter.
            color-mix på --text i stället för --bg-surface: registren sätter
            surface och elevated till samma värde, 7 % bläck är förutsägbart. */}
        {count > 0 ? (
          <div
            data-row=""
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              zIndex: 0,
              height: `calc(100% / ${slots})`,
              transform: `translateY(calc(${active} * 100%))`,
              transition: reduceMotion ? "none" : `transform 0.52s ${EASE}`,
              background: "color-mix(in srgb, var(--text) 7%, transparent)",
              borderRadius: "var(--radius)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "clamp(3px, 0.32vw, 5px)",
                background: "var(--accent)",
              }}
            />
          </div>
        ) : null}

        {rows.map((r, i) => {
          const isActive = i === active;
          const isPassed = i < active;
          return (
            <div
              key={i}
              onClick={() => setPicked({ atStep: step, index: i })}
              style={{
                flex: 1,
                minHeight: 0,
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "0.9vh",
                padding: "1.5vh 1.2vw 1.5vh 1.7vw",
                borderBottom: i < rows.length - 1 ? "1px solid color-mix(in srgb, var(--text) 16%, transparent)" : "none",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  // Versalt hårdsatt: passningsformeln räknar på versalhöjd.
                  textTransform: "uppercase",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  fontSize: wordFontSize,
                  fontStretch: isActive ? "112%" : "100%",
                  color: isActive ? "var(--accent)" : "var(--text)",
                  opacity: isActive ? 1 : isPassed ? 0.85 : 0.5,
                  transition: traitTransition,
                }}
              >
                {r.word}
              </span>
              {r.body ? (
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: descFs,
                    lineHeight: 1.42,
                    maxWidth: "46ch",
                    // Skyddsnätet: en beskrivning som spränger reserven
                    // trunkeras i stället för att växa in i grannraden.
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: descLines,
                    overflow: "hidden",
                    opacity: isActive ? 0.92 : isPassed ? 0.55 : 0.38,
                    transition: traitTransition,
                  }}
                >
                  {boldAccent(r.body)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ————— Högerspalten: beviset ————— */}
      <div
        style={{
          position: "absolute",
          left: "51.5vw",
          right: "5vw",
          top: "29vh",
          bottom: "12vh",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Trådfacket har fast höjd. Varje tråd är permanent monterad och
            självcentrerad i sitt eget fack — omcentrering blir därför aldrig
            en synlig rörelse, och snabbklick kan inte lämna spöken kvar. */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {rows.map((r, i) => {
            const shownThread = i === active;
            return (
              <div
                key={i}
                aria-hidden={!shownThread}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: replyGap,
                  pointerEvents: "none",
                }}
              >
                {r.replies.map((reply, j) => {
                  const isUser = reply.side === "user";
                  const prev = j > 0 ? r.replies[j - 1] : undefined;
                  const showLabel = !prev || prev.speaker.trim().toLowerCase() !== reply.speaker.trim().toLowerCase();
                  const isLast = j === r.replies.length - 1;
                  const dotsHere = shownThread && typing && isLast && !isUser;
                  // Vilolägets translateY är detsamma åt båda hållen, så
                  // bakåtstegning ser likadan ut som framåtstegning.
                  const inDelay = 0.26 + j * 0.13;
                  const outDelay = (r.replies.length - 1 - j) * 0.045;
                  return (
                    <div
                      key={j}
                      style={{
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        maxWidth: "82%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                        opacity: shownThread ? 1 : 0,
                        transform: shownThread ? "none" : "translateY(8px)",
                        transition: reduceMotion
                          ? "opacity 0.15s linear"
                          : shownThread
                            ? `opacity 0.34s ${EASE} ${inDelay}s, transform 0.34s ${EASE} ${inDelay}s`
                            : `opacity 0.19s ${EASE} ${outDelay}s, transform 0.19s ${EASE} ${outDelay}s`,
                      }}
                    >
                      {showLabel ? (
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "clamp(0.5rem, 0.66vw, 0.68rem)",
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            fontWeight: 600,
                            opacity: 0.55,
                            marginBottom: "0.45vh",
                          }}
                        >
                          {reply.fromProp ? (
                            <EditableText
                              path={isUser ? "userLabel" : "aiLabel"}
                              value={isUser ? userLabel : aiLabel}
                            >
                              {reply.speaker}
                            </EditableText>
                          ) : (
                            reply.speaker
                          )}
                        </span>
                      ) : null}
                      {/* Kontrasten bärs av fyllning mot kontur, inte av nyans:
                          människan är det fasta, maskinen det genomskinliga.
                          data-row (aldrig data-card) — fyra bubblor med hård
                          offsetskugga blir en hög knappar i joelsai. */}
                      <div
                        data-row=""
                        style={{
                          position: "relative",
                          background: isUser
                            ? "var(--text)"
                            : "color-mix(in srgb, var(--text) 9%, transparent)",
                          color: isUser ? "var(--bg)" : "var(--text)",
                          border: isUser
                            ? "none"
                            : "1.5px solid color-mix(in srgb, var(--text) 24%, transparent)",
                          borderRadius: "var(--radius)",
                          // Svanshörnet. I kobolt är --radius 0, så det
                          // försvinner av sig självt.
                          borderBottomRightRadius: isUser ? "calc(var(--radius) / 4)" : undefined,
                          borderBottomLeftRadius: isUser ? undefined : "calc(var(--radius) / 4)",
                          padding: BUBBLE_PADDING,
                          fontFamily: "var(--font-body)",
                          fontSize: bubbleFs,
                          lineHeight: 1.45,
                        }}
                      >
                        {dotsHere ? (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              padding: BUBBLE_PADDING,
                            }}
                          >
                            <TypingDots />
                          </div>
                        ) : null}
                        <span
                          style={{
                            opacity: dotsHere ? 0 : 1,
                            transition: `opacity 0.22s ${EASE}`,
                          }}
                        >
                          {boldPlain(reply.text)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {source ? (
          <div style={{ ...mono, marginTop: "1.2vh", opacity: 0.5, textTransform: "none" }}>
            <EditableText path="source" value={source}>
              {source}
            </EditableText>
          </div>
        ) : null}
      </div>

      {/* ————— Footern tänds på sista steget, utan att kosta en klickning ————— */}
      {footer ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            left: "5vw",
            right: "5vw",
            bottom: "4vh",
            zIndex: 6,
            letterSpacing: "0.14em",
            textTransform: "none",
            opacity: count > 0 && active === count - 1 ? 0.85 : 0.5,
            transition: `opacity 0.5s ${EASE} 0.3s`,
          }}
        >
          <EditableText path="footer" value={footer}>
            {footer}
          </EditableText>
        </div>
      ) : null}
    </div>
  );
}
