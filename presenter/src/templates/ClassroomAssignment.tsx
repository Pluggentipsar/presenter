"use client";

import { Children, isValidElement, useEffect, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { glassCardStyle, AmbientBackdrop } from "./_decorations/GlassDecorations";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * ClassroomAssignment ★ — bookenden: en vanlig skoluppgift i LMS-kostym.
 *
 * En ren uppgiftsvy som liknar Teams/Classroom. Ingen AI-symbol någonstans —
 * publiken ska först tänka undervisning, inte teknik.
 *
 * Två lägen, samma kort (exakt visuellt eko):
 *
 * REN (öppningen) — inga children. Kortet glider in, står stilla. Klart.
 *
 * LAGRAD (landningen) — children med arbetsmoment. Steg 0 visar kortet
 * exakt som i öppningen. Varje klick tänder ett moment runt kortet med
 * BÄRA-status. Sista klicket: allt tonas bort utom slutfrågan.
 *
 * All stegkritisk reveal går via CSS-transitions, inte Framer — målvärdet
 * skrivs direkt i stilen och överlever uteblivna rAF-bildrutor (jfr
 * CarryAxis-kommentaren om felläget).
 *
 * ```mdx
 * <ClassroomAssignment
 *   kicker="Historia · åk 8"
 *   due="Inlämning fredag"
 *   task="Förklara orsakerna till franska revolutionen och resonera om vilken orsak som var viktigast."
 * />
 *
 * <ClassroomAssignment
 *   kicker="Historia · åk 8"
 *   due="Inlämning fredag"
 *   task="Förklara orsakerna till franska revolutionen och resonera om vilken orsak som var viktigast."
 *   question="Vad är eleven redo att **bära**?"
 *   questionPre="Samma uppgift. Ny fråga."
 * >
 * - Kunskap · Kunna något om orsakerna. · bar
 * - Samband · Se hur de hänger ihop. · bar
 * - Värdering · Avgöra vad som väger tyngst. · stodjer
 * - Formulering · Skriva resonemanget. · utfor
 * </ClassroomAssignment>
 * ```
 *
 * Status per moment: `bar` · `stodjer` · `utfor` · `kontroll` — samma
 * palett som BaraWorkmap så att mönstret läses som ETT system.
 */

type Status = "bar" | "stodjer" | "utfor" | "kontroll";

interface Moment {
  title: string;
  blurb: string;
  status: Status;
}

interface ClassroomAssignmentProps {
  /** Ämnesrad i kortets topp, t.ex. "Historia · åk 8". */
  kicker?: string;
  /** Deadline-chip, t.ex. "Inlämning fredag". */
  due?: string;
  /** Lärarinitialer i avataren. */
  teacher?: string;
  /** Själva uppgiftstexten. **fet** blir accent. */
  task: string;
  /** Lagrad form: liten rad ovanför slutfrågan. */
  questionPre?: string;
  /** Lagrad form: slutfrågan som blir kvar när allt annat tonas. */
  question?: string;
  /** BÄRA-paletten — samma defaults som BaraWorkmap. */
  colorBar?: string;
  colorStodjer?: string;
  colorUtfor?: string;
  colorKontroll?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const STATUS_LABEL: Record<Status, string> = {
  bar: "Eleven bär",
  stodjer: "AI stödjer",
  utfor: "AI utför",
  kontroll: "Kontrollpunkt",
};

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return "";
}

function parseMoments(children: ReactNode): Moment[] {
  const out: Moment[] = [];
  const add = (raw: string) => {
    const p = raw.split("·").map((s) => s.trim());
    if (!p[0]) return;
    const s = (p[2] ?? "bar").trim().toLowerCase();
    out.push({
      title: p[0].replace(/\*\*/g, ""),
      blurb: (p[1] ?? "").replace(/\*\*/g, ""),
      status:
        s === "stodjer" || s === "stödjer" ? "stodjer"
        : s === "utfor" || s === "utför" ? "utfor"
        : s === "kontroll" ? "kontroll"
        : "bar",
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

/** **fet** → accent-färgad span. */
function renderRich(text: string, accent = "var(--accent)") {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 650 }}>
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** Momentens fasta platser runt kortet — två per sida, växelvis. */
const SLOTS: CSSProperties[] = [
  { top: "6%", left: "2%" },
  { top: "6%", right: "2%" },
  { bottom: "9%", left: "2%" },
  { bottom: "9%", right: "2%" },
  { top: "42%", left: "0%" },
  { top: "42%", right: "0%" },
];

export function ClassroomAssignment({
  kicker,
  due,
  teacher = "JL",
  task,
  questionPre,
  question,
  colorBar = "#3E4C8C",
  colorStodjer = "#1F6B4A",
  colorUtfor = "#B0713A",
  colorKontroll = "#2F7D5B",
  children,
}: ClassroomAssignmentProps) {
  const moments = parseMoments(children);
  const layered = moments.length > 0 && !!question;
  // Lagrad: läge 0 är kortet ensamt (exakt eko av öppningen), därefter ett
  // läge per moment, sist finalen där frågan blir ensam kvar.
  const step = useSlideSteps(layered ? moments.length + 2 : 0);
  const finale = layered && step >= moments.length + 1;

  // Entré via CSS: mounted flippar efter första målningen.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    const fallback = setTimeout(() => setMounted(true), 120);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(fallback);
    };
  }, []);

  const colorOf = (s: Status) =>
    s === "bar" ? colorBar : s === "stodjer" ? colorStodjer : s === "utfor" ? colorUtfor : colorKontroll;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      {/* Ljuset vandrar mot mitten när frågan blir ensam kvar. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(46% 40% at 50% 52%, var(--accent-dim) 0%, transparent 70%)",
          opacity: finale ? 1 : 0,
          transition: `opacity 1.1s ${EASE}`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(2rem, 4vh, 3rem) clamp(2.5rem, 5vw, 5rem)",
        }}
      >
        {/* ─── Uppgiftskortet — bookendens kärna, exakt lika i båda ändar ─── */}
        <div
          style={{
            ...glassCardStyle({ padding: "0" }),
            width: "min(58ch, 78%)",
            overflow: "hidden",
            opacity: !mounted ? 0 : finale ? 0.1 : 1,
            transform: !mounted ? "scale(0.96)" : finale ? "scale(0.94)" : "scale(1)",
            filter: !mounted ? "blur(6px)" : finale ? "blur(7px)" : "blur(0px)",
            transition: `opacity 0.85s ${EASE}, transform 0.85s ${EASE}, filter 0.85s ${EASE}`,
          }}
        >
          {/* Toppraden — LMS-kostymen. Medvetet vardaglig. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.9rem",
              padding: "clamp(0.9rem, 1.6vh, 1.2rem) clamp(1.4rem, 2.2vw, 2rem)",
              borderBottom: "2px solid var(--glass-border, rgba(16,20,28,0.10))",
            }}
          >
            <div
              aria-hidden
              style={{
                width: "2.2rem",
                height: "2.2rem",
                borderRadius: "0",
                border: "2px solid var(--text)",
                display: "grid",
                placeItems: "center",
                background: "transparent",
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                fontWeight: 650,
                fontSize: "0.8rem",
                letterSpacing: "0.02em",
                flexShrink: 0,
              }}
            >
              {teacher}
            </div>
            {kicker ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.68rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </div>
            ) : null}
            <div style={{ flex: 1 }} />
            {due ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.32rem 0.7rem",
                  borderRadius: "0",
                  border: "1px solid var(--glass-border, rgba(16,20,28,0.12))",
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.66rem, 0.82vw, 0.82rem)",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6 3.2V6l1.9 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <EditableText path="due" value={due}>
                  {due}
                </EditableText>
              </div>
            ) : null}
          </div>

          {/* Uppgiften själv. */}
          <div style={{ padding: "clamp(1.6rem, 3vh, 2.4rem) clamp(1.4rem, 2.2vw, 2rem)" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.78vw, 0.78rem)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: "0.9rem",
              }}
            >
              Uppgift
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                letterSpacing: "var(--heading-tracking)",
                fontSize: "clamp(1.35rem, 2.5vw, 2.3rem)",
                lineHeight: 1.28,
                color: "var(--text)",
              }}
            >
              <EditableText path="task" value={task}>
                {renderRich(task)}
              </EditableText>
            </div>
          </div>

          {/* Fotraden — bilaga + inlämningsknapp. Rekvisita, inte interaktion. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              padding: "clamp(0.8rem, 1.4vh, 1.1rem) clamp(1.4rem, 2.2vw, 2rem)",
              borderTop: "2px solid var(--glass-border, rgba(16,20,28,0.10))",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden style={{ color: "var(--text-muted)" }}>
              <path
                d="M9.5 4.2 5.6 8.1a1.6 1.6 0 1 0 2.3 2.3l4.2-4.2a3 3 0 1 0-4.3-4.3L3.6 6.1"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.7rem, 0.88vw, 0.88rem)",
                color: "var(--text-muted)",
              }}
            >
              Instruktion-och-bedomning.pdf
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                padding: "0.42rem 1rem",
                borderRadius: "0",
                background: "var(--text)",
                color: "var(--bg)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "clamp(0.7rem, 0.88vw, 0.88rem)",
              }}
            >
              Lämna in
            </span>
          </div>
        </div>

        {/* ─── Lagret: arbetsmomenten tänds runt kortet ─── */}
        {layered
          ? moments.map((m, i) => {
              const on = !finale && step >= i + 1;
              const c = colorOf(m.status);
              return (
                <div
                  key={m.title}
                  style={{
                    ...glassCardStyle({ padding: "0.9rem 1.1rem", withShadow: false }),
                    // Efter glas-spreaden — den sätter position:relative och
                    // skulle annars äta upp absolut-positioneringen.
                    position: "absolute",
                    zIndex: 2,
                    maxWidth: "17rem",
                    ...SLOTS[i % SLOTS.length],
                    borderLeft: `3px solid ${c}`,
                    pointerEvents: "none",
                    opacity: on ? 1 : 0,
                    transform: on ? "scale(1)" : "scale(0.84)",
                    filter: finale ? "blur(6px)" : "blur(0px)",
                    transition: `opacity 0.55s ${EASE}, transform 0.55s ${EASE}, filter 0.7s ${EASE}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.6rem",
                      marginBottom: m.blurb ? "0.3rem" : 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "clamp(0.95rem, 1.35vw, 1.3rem)",
                        color: "var(--text)",
                      }}
                    >
                      {m.title}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.56rem, 0.68vw, 0.68rem)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: c,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </div>
                  {m.blurb ? (
                    <div
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "clamp(0.72rem, 0.92vw, 0.92rem)",
                        lineHeight: 1.45,
                        color: "var(--text-muted)",
                      }}
                    >
                      {m.blurb}
                    </div>
                  ) : null}
                </div>
              );
            })
          : null}

        {/* ─── Finalen: frågan ensam kvar ─── */}
        {layered ? (
          <div
            style={{
              position: "absolute",
              zIndex: 3,
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "0 clamp(2rem, 8vw, 8rem)",
              pointerEvents: "none",
              opacity: finale ? 1 : 0,
              transform: finale ? "translateY(0)" : "translateY(26px)",
              filter: finale ? "blur(0px)" : "blur(8px)",
              transition: `opacity 0.9s ${EASE} 0.25s, transform 0.9s ${EASE} 0.25s, filter 0.9s ${EASE} 0.25s`,
            }}
          >
            {questionPre ? (
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.72rem, 1vw, 1rem)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: "1.4rem",
                }}
              >
                {questionPre}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)" as unknown as number,
                letterSpacing: "var(--heading-tracking)",
                fontSize: "clamp(2.4rem, 5.4vw, 5.2rem)",
                lineHeight: 1.12,
                color: "var(--text)",
                textShadow: `0 0 60px ${withAlpha("#34c759", 0.18)}`,
              }}
            >
              {renderRich(question ?? "")}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
