"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * DiscourseSpread ★ — en händelse, många berättelser (betong_natt, 2026-09-04).
 *
 * Byggd för öppningen av "Vem skrev din kurs?": Hugging Face-intrånget i juli
 * 2026 tolkades av nio namngivna röster, från "någon konfigurerade fel" till
 * "vi är halvvägs till maktövertagande". Sliden visar EN röst i taget, stort
 * nog för projektor, medan en markör vandrar längs en axel mellan polerna.
 * Efter sista klicket står alla nio prickarna kvar — spännvidden som bild.
 *
 * Rösterna skrivs som en punktlista, tre delar separerade med ` · `:
 *
 *   namn, roll · sammanfattning · citat
 *
 * Sammanfattningen är din egen etikett (visas i mono under namnet), citatet
 * är det som står stort. Utelämna citatet så visas sammanfattningen stort i
 * stället — bra för röster du refererar men inte citerar ordagrant.
 *
 * Lägg till `:: 0.72` sist på raden för att placera rösten manuellt på axeln
 * (0 = vänster pol, 1 = höger). Utan siffra fördelas rösterna jämnt.
 *
 * ```mdx
 * <DiscourseSpread
 *   kicker="§ 0 · Samma händelse"
 *   event="Hugging Face · juli 2026"
 *   poleLeft="Någon konfigurerade fel"
 *   poleRight="Halvvägs till maktövertagande"
 *   register="tavla"
 * >
 * - Dan Guido, Trail of Bits · Ingen AI-händelse · "a containment failure with the safeties turned off"
 * - Ajeya Cotra, forskare · Nära maktövertagande · "more than 50% of the way to full-blown AI takeover"
 * </DiscourseSpread>
 * ```
 */

interface Voice {
  name: string;
  gist: string;
  quote: string;
  x?: number;
}

interface DiscourseSpreadProps {
  /** Mono-etikett uppe till vänster. */
  kicker?: string;
  /** Mono-rad uppe till höger — händelsen rösterna talar om. */
  event?: string;
  /** Etikett vid axelns vänstra ände (den nedtonande läsningen). */
  poleLeft?: string;
  /** Etikett vid axelns högra ände (den mest dramatiska läsningen). */
  poleRight?: string;
  /** Rad som ligger kvar under axeln hela tiden. */
  footer?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(0.62rem, 1.02vw, 1.1rem)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 600,
  lineHeight: 1.5,
};

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function parseVoices(children: ReactNode): Voice[] {
  const out: Voice[] = [];
  const add = (raw: string) => {
    // Positionen ligger sist: "… :: 0.72"
    const [body, pos] = raw.split("::").map((s) => s.trim());
    if (!body) return;
    const parts = body.split(" · ").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const x = pos ? parseFloat(pos) : NaN;
    out.push({
      name: parts[0],
      gist: parts[1] ?? "",
      quote: parts.slice(2).join(" · "),
      x: isNaN(x) ? undefined : Math.min(1, Math.max(0, x)),
    });
  };
  const walk = (node: ReactNode) => {
    const n = unwrapLazy(node);
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ children?: ReactNode }>;
    if (el.type === "li") return add(extractText(el.props.children));
    Children.forEach(el.props.children, walk);
  };
  walk(children);
  return out;
}

export function DiscourseSpread({
  kicker,
  event,
  poleLeft = "Ingenting hände",
  poleRight = "Allt förändras",
  footer,
  children,
}: DiscourseSpreadProps) {
  const voices = parseVoices(children);
  // Klick 0 = tom axel med polerna. Klick 1..n = röst 1..n.
  const step = useSlideSteps(voices.length + 1);
  const index = Math.min(step, voices.length) - 1;
  const current = index >= 0 ? voices[index] : undefined;

  const posOf = (v: Voice, i: number) =>
    typeof v.x === "number" ? v.x : voices.length > 1 ? i / (voices.length - 1) : 0.5;

  // Det stora fältet: citatet om det finns, annars sammanfattningen.
  const big = current ? (current.quote || current.gist) : "";
  // Långa citat tappar en grad så att inget hamnar utanför duken.
  const bigSize =
    big.length > 190 ? "2.1vw" : big.length > 120 ? "2.6vw" : big.length > 70 ? "3.2vw" : "4vw";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* Mono-hörnen */}
      {kicker ? (
        <div style={{ ...mono, position: "absolute", top: "4.5vh", left: "5vw", zIndex: 6, color: "var(--accent)" }}>
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}
      {event ? (
        <div
          style={{
            ...mono,
            position: "absolute",
            top: "4.5vh",
            right: "5vw",
            zIndex: 6,
            textAlign: "right",
            opacity: 0.75,
          }}
        >
          <EditableText path="event" value={event}>
            {event}
          </EditableText>
        </div>
      ) : null}

      {/* Citatfältet */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          right: "5vw",
          top: "21vh",
          height: "48vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          zIndex: 5,
        }}
      >
        {current ? (
          <div key={index} style={{ animation: `spread-in 0.55s ${EASE} both` }}>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: bigSize,
                lineHeight: 1.22,
                letterSpacing: "-0.01em",
                maxWidth: "84%",
                textWrap: "balance",
              }}
            >
              {current.quote ? `”${current.quote.replace(/^["”“]|["”“]$/g, "")}”` : current.gist}
            </div>
            <div style={{ marginTop: "3.2vh", display: "flex", alignItems: "baseline", gap: "1.4vw", flexWrap: "wrap" }}>
              <span style={{ ...mono, color: "var(--accent)", fontSize: "clamp(0.7rem, 1.18vw, 1.25rem)" }}>
                {current.name}
              </span>
              {current.quote && current.gist ? (
                <span style={{ ...mono, opacity: 0.62, letterSpacing: "0.14em", textTransform: "none" }}>
                  {current.gist}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              textTransform: "uppercase",
              fontSize: "5.4vw",
              lineHeight: 0.94,
              letterSpacing: "-0.02em",
              opacity: 0.9,
            }}
          >
            Samma händelse.
            <br />
            <span className="slide-skift" data-word={`${voices.length} berättelser.`}>
              {voices.length} berättelser.
            </span>
          </div>
        )}
      </div>

      {/* Axeln */}
      <div style={{ position: "absolute", left: "5vw", right: "5vw", bottom: "13vh", zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.6vh" }}>
          <span style={{ ...mono, opacity: 0.6, maxWidth: "34%" }}>{poleLeft}</span>
          <span style={{ ...mono, color: "var(--accent-alert)", maxWidth: "34%", textAlign: "right" }}>{poleRight}</span>
        </div>

        <div style={{ position: "relative", height: "2.6vh" }}>
          {/* Linjen */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: "2px",
              background: "var(--text)",
              opacity: 0.42,
            }}
          />
          {/* Den passerade delen fylls */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              height: "2px",
              background: "var(--accent)",
              width: current ? `${posOf(current, index) * 100}%` : "0%",
              transition: `width 0.55s ${EASE}`,
            }}
          />
          {/* Prickarna */}
          {voices.map((v, i) => {
            const seen = i <= index;
            const active = i === index;
            const p = posOf(v, i);
            const size = active ? "2.2vh" : "1.3vh";
            return (
              <span
                key={i}
                aria-hidden
                style={{
                  position: "absolute",
                  left: `${p * 100}%`,
                  top: "50%",
                  width: size,
                  height: size,
                  transform: `translate(-50%, -50%) rotate(${active ? "45deg" : "0deg"})`,
                  background: active ? "var(--accent)" : seen ? "var(--text)" : "transparent",
                  border: `2px solid ${seen ? (active ? "var(--accent)" : "var(--text)") : "var(--text)"}`,
                  opacity: seen ? 1 : 0.4,
                  transition: `all 0.45s ${EASE}`,
                }}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "2vh" }}>
          <span style={{ ...mono, opacity: 0.5 }}>{footer ?? ""}</span>
          <span style={{ ...mono, opacity: 0.5 }}>
            {current ? `${index + 1} / ${voices.length}` : `${voices.length} röster`}
          </span>
        </div>
      </div>

      <style>{`@keyframes spread-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
