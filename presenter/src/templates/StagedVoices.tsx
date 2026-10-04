"use client";

import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";
import { useSlideSteps } from "@/lib/slide-steps";
import { FloatingPhone } from "./FloatingPhone";

/**
 * StagedVoices ★ — röster som klickas fram en i taget, var och en med en
 * telefon som visar hur samtalet kan ha sett ut.
 *
 * Byggd för öppningen av elevhälsopasset: fyra ordagranna barnröster ur en
 * enkät. Talaren läser en röst i taget, och medan han läser skrivs en
 * REKONSTRUERAD konversation fram i telefonen till höger — samma telefonmall
 * som `FloatingPhone`, i samma läge som nästa slides telefon, så att bilden
 * står kvar över klippet. En rad utan telefondel ger en mörk, tom telefon —
 * bara klockslaget lyser. Det är avsiktligt: den rösten får sitt samtal på
 * nästa slide.
 *
 * Rader som punktlista. Vänster om ` :: ` samma format som `StudentVoices`,
 * höger om det telefonen: `App · HH:MM · Du: text || AI: text`. Avsändare som
 * börjar på du/jag/user blir användarbubblor, allt annat AI. `:screenshot`
 * först i en replik ger en mockad skärmdumpsbilaga.
 *
 * ```mdx
 * <StagedVoices
 *   kicker="Internetstiftelsen · Barnen och internet 2025"
 *   title="Fyra svar ur en enkät"
 *   body="Ordagrant, med sidnummer. Telefonerna är rekonstruktioner."
 * >
 * - **Pojke, 10 år · s. 141:** När jag har tråkigt brukar jag använda ChatGPT som kompis. :: ChatGPT · 16:20 · Du: hej är du där || AI: Hej! Vad vill du hitta på?
 * - **Flicka, 11 år · s. 141:** Om jag inte kan sova … :: My AI · 23:41
 * </StagedVoices>
 * ```
 *
 * **Steg:** ett per röst; steg 0 är första rösten tänd. Telefonen monteras om
 * vid varje steg (`key`), så dess skrivanimation börjar om.
 */

interface PhoneLine {
  label: string;
  text: string;
}

interface Voice {
  attribution: string;
  quote: string;
  app: string;
  time: string;
  lines: PhoneLine[];
  hasPhone: boolean;
}

interface StagedVoicesProps {
  kicker?: string;
  title?: string;
  body?: string;
  /** Telefonens läge, i procent av sliden. Default matchar öppningens FloatingPhone. */
  phoneX?: string;
  phoneY?: string;
  phoneWidth?: string;
  /** Färg på användarbubblorna. Default temats accent. */
  accent?: string;
  /** ms mellan meddelandena i telefonen. Default 1900. */
  beat?: number | string;
  children?: ReactNode;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parseVoices(children: ReactNode): Voice[] {
  const out: Voice[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const [left, right = ""] = raw.split(/\s*::\s*/);
    const m = left.match(/^\*\*([^*]+):\*\*\s*(.*)$/s);
    const attribution = m ? m[1].trim() : "";
    const quote = (m ? m[2] : left).trim();

    let app = "";
    let time = "";
    const lines: PhoneLine[] = [];
    if (right) {
      const parts = right.split(/\s*·\s*/);
      app = (parts[0] ?? "").trim();
      time = (parts[1] ?? "").trim();
      const rest = parts.slice(2).join(" · ");
      for (const chunk of rest.split(/\s*\|\|\s*/)) {
        const lm = chunk.match(/^([^:]{1,24}):\s*(.*)$/s);
        if (lm && lm[2].trim()) lines.push({ label: lm[1].trim(), text: lm[2].trim() });
      }
    }
    out.push({ attribution, quote, app, time, lines, hasPhone: !!right });
  };
  // unwrapLazy på båda nivåerna — annars ser servern noll rader.
  Children.forEach(children, (rawChild) => {
    const child = unwrapLazy(rawChild);
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (rawLi) => {
        const li = unwrapLazy(rawLi);
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (el.type === "li") {
      walkLi(el);
    }
  });
  return out;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function StagedVoices({
  kicker,
  title,
  body,
  phoneX = "68.5%",
  phoneY = "11%",
  phoneWidth = "23%",
  accent = "var(--accent)",
  beat = 1900,
  children,
}: StagedVoicesProps) {
  const voices = useMemo(() => parseVoices(children), [children]);
  const step = useSlideSteps(Math.max(voices.length, 1));
  const active = Math.min(step, Math.max(voices.length - 1, 0));
  const current = voices[active];

  // FloatingPhone läser sina repliker ur en punktlista — vi bygger samma
  // struktur i JSX så att dess parser (strong-etikett + text) känner igen den.
  const phoneChildren = current && current.lines.length ? (
    <ul>
      {current.lines.map((l, i) => (
        <li key={i}>
          <strong>{l.label}:</strong> {l.text}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* ————— Rubrikblocket ————— */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          top: "7vh",
          width: "56vw",
          display: "flex",
          flexDirection: "column",
          gap: "1.2vh",
          zIndex: 4,
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="kicker" value={kicker}>{kicker}</EditableText>
          </div>
        ) : null}
        {title ? (
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight, 700)" as unknown as number,
              textTransform: "var(--heading-case, none)" as React.CSSProperties["textTransform"],
              fontSize: "clamp(2.2rem, 4.6vw, 4.4rem)",
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              margin: 0,
            }}
          >
            <EditableText path="title" value={title}>{title}</EditableText>
          </h2>
        ) : null}
        {body ? (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.95rem, 1.1vw, 1.15rem)",
              lineHeight: 1.5,
              color: "var(--text-muted)",
              maxWidth: "32em",
              margin: 0,
            }}
          >
            <EditableText path="body" value={body}>{body}</EditableText>
          </p>
        ) : null}
      </div>

      {/* ————— Rösterna, en i taget ————— */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          width: "56vw",
          top: "31vh",
          bottom: "8vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: "2.2vh",
          zIndex: 4,
        }}
      >
        {voices.map((v, i) => {
          const isActive = i === active;
          const isPassed = i < active;
          const shown = i <= active;
          return (
            <div
              key={i}
              data-sv-card=""
              style={{
                padding: "1.6vh 1.6vw 1.7vh",
                background: "var(--bg-elevated, var(--bg-surface))",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "var(--radius, 0.85rem)",
                opacity: shown ? (isActive ? 1 : 0.42) : 0,
                transform: shown
                  ? `translateY(0) rotate(${isActive ? 0 : i % 2 ? 0.6 : -0.5}deg) scale(${isActive ? 1 : 0.985})`
                  : "translateY(14px)",
                transition: `opacity 0.55s ${EASE}, transform 0.55s ${EASE}`,
                display: "flex",
                flexDirection: "column",
                gap: "0.6vh",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.68rem, 0.85vw, 0.9rem)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--accent)" : "var(--text-muted)",
                  fontWeight: 600,
                  transition: `color 0.4s ${EASE}`,
                }}
              >
                {v.attribution}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: isActive
                    ? "clamp(1.25rem, 2vw, 2.3rem)"
                    : "clamp(1rem, 1.45vw, 1.6rem)",
                  lineHeight: 1.28,
                  letterSpacing: "-0.01em",
                  transition: `font-size 0.45s ${EASE}`,
                }}
              >
                <span style={{ color: "var(--accent)", marginRight: "0.15em" }}>“</span>
                {v.quote}
              </div>
              {/* Den passerade raden behåller sin plats men tappar sin tyngd —
                  rösterna ska ackumuleras, inte försvinna. */}
              {isPassed ? null : null}
            </div>
          );
        })}
      </div>

      {/* ————— Telefonen ————— */}
      {current && current.hasPhone ? (
        <FloatingPhone
          key={active}
          x={phoneX}
          y={phoneY}
          width={phoneWidth}
          rotation={-3}
          appName={current.app}
          time={current.time}
          accent={accent}
          beat={beat}
          initialDelay={1100}
        >
          {phoneChildren}
        </FloatingPhone>
      ) : null}
    </div>
  );
}

export default StagedVoices;
