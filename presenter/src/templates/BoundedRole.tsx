"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { glassCardStyle, SpecularHighlight } from "./_decorations/GlassDecorations";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BoundedRole ★ — före, AI, efter. Mittspalten är fysiskt inramad.
 *
 * Ytterspalterna går kant till kant: det är elevens mark. Mittspalten är
 * kortare, indragen uppifrån och nerifrån, och ligger som en frostad ruta
 * ovanpå en obruten linje som löper genom alla tre. Linjen är elevens
 * tänkande — den slutar aldrig, AI läggs bara ovanpå ett stycke av den.
 *
 * Avgränsningen ÄR svaret på frågan i mitten. "Var släpper du in AI — och
 * vilken roll får den" besvaras av formen: i ett avgränsat fack, med ett
 * namngivet uppdrag. Rollerna ligger som brickor inuti facket.
 *
 * MDX-format — `etikett · fråga · roller`. Den post som har roller blir
 * det inramade facket; rollerna separeras med komma.
 * ```mdx
 * <BoundedRole chapter="§ Din tur" title="Tänk på en lektion du har snart.">
 * - Före · Vad gör eleverna *utan* AI för att bygga grunden?
 * - AI · Var släpper du in AI — och vilken roll får den? · handledare, motpart, redaktör
 * - Efter · Vad ska eleven kunna *visa* att hen tänkt?
 * </BoundedRole>
 * ```
 * Text mellan asterisker får accentfärg.
 */

interface BoundedRoleProps {
  chapter?: string;
  kicker?: string;
  /** Ramen som gör frågorna konkreta att svara på. */
  title?: string;
  /** Diskret rad längst ned, t.ex. arbetsform eller tid. */
  footnote?: string;
  accent?: string;
  children?: ReactNode;
}

interface Phase {
  label: string;
  question: string;
  roles: string[];
}

/** Behåller *kursiv* som markdown så betoningen kan färgas. */
function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "em") return `*${inner}*`;
    if (el.type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

function parsePhases(children: ReactNode): Phase[] {
  const out: Phase[] = [];
  const add = (raw: string) => {
    const p = raw.split("·").map((s) => s.trim());
    if (!p[0]) return;
    out.push({
      label: p[0].replace(/\*\*/g, ""),
      question: p[1] ?? "",
      roles: (p[2] ?? "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
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

/** Betonad text (mellan asterisker) får accenten. */
function emphasised(text: string, accent: string) {
  const parts: ReactNode[] = [];
  const re = /\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    parts.push(
      <span key={k++} style={{ color: accent, fontWeight: 700 }}>
        {m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts;
}

export function BoundedRole({
  chapter,
  kicker,
  title,
  footnote,
  accent = "var(--accent)",
  children,
}: BoundedRoleProps) {
  const phases = parsePhases(children);
  const step = useSlideSteps(phases.length);

  if (phases.length === 0) return null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background: `radial-gradient(50% 52% at 50% 56%, ${withAlpha(accent, 0.13)} 0%, transparent 68%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(1.8rem, 3.6vh, 2.8rem) clamp(2.2rem, 4.5vw, 4.5rem)",
        }}
      >
        {chapter || kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path={chapter ? "chapter" : "kicker"} value={chapter ?? kicker}>
              {chapter ?? kicker}
            </EditableText>
          </div>
        ) : null}

        {title ? (
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              fontSize: "clamp(1.5rem, 2.6vw, 2.6rem)",
              letterSpacing: "var(--heading-tracking)",
              lineHeight: 1.12,
              color: "var(--text)",
              margin: "clamp(0.4rem, 1vh, 0.8rem) 0 0",
              maxWidth: "30ch",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        ) : null}

        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            marginTop: "clamp(1rem, 2.4vh, 1.8rem)",
            display: "grid",
            gridTemplateColumns: `repeat(${phases.length}, 1fr)`,
            gap: "clamp(1rem, 2.4vw, 2.4rem)",
            alignItems: "stretch",
          }}
        >
          {/* Elevens tänkande — en obruten linje genom alla faserna. Den
              passerar BAKOM det inramade facket; AI läggs ovanpå ett stycke
              av den, den bryts inte av. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: "1px",
              background: `linear-gradient(90deg, transparent 0%, ${withAlpha(accent, 0.35)} 12%, ${withAlpha(accent, 0.35)} 88%, transparent 100%)`,
              zIndex: 0,
            }}
          />

          {phases.map((p, i) => {
            const on = i <= step;
            const bounded = p.roles.length > 0;
            const fade = {
              opacity: on ? 1 : 0.2,
              transition: "opacity 600ms var(--motion-ease, cubic-bezier(0.22,1,0.36,1))",
            };

            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    ...(bounded
                      ? {
                          ...glassCardStyle({
                            radius: "1.25rem",
                            blur: 26,
                            padding: "clamp(1rem, 2vw, 1.7rem)",
                          }),
                          borderColor: withAlpha(accent, 0.5),
                          boxShadow: `var(--glass-card-shadow), 0 26px 60px -32px ${withAlpha(accent, 0.8)}`,
                        }
                      : {}),
                    ...fade,
                    display: "flex",
                    flexDirection: "column",
                    gap: "clamp(0.5rem, 1.2vh, 0.9rem)",
                    // Ingen height: 100% på facket. Det ska vara exakt så
                    // stort som sitt innehåll och därmed synligt kortare än
                    // elevens öppna spalter — det är avgränsningen som är
                    // svaret på frågan i mitten. Fyllde det spalten skulle
                    // AI i stället dominera sliden, vilket vore raka motsatsen.
                    justifyContent: "center",
                  }}
                >
                  {bounded ? <SpecularHighlight intensity={0.2} /> : null}

                  <div
                    style={{
                      position: "relative",
                      zIndex: 1,
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "clamp(1.6rem, 3vw, 3rem)",
                      lineHeight: 1,
                      letterSpacing: "-0.03em",
                      color: bounded ? accent : "var(--text)",
                    }}
                  >
                    {p.label}
                  </div>

                  <p
                    style={{
                      position: "relative",
                      zIndex: 1,
                      margin: 0,
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(1rem, 1.55vw, 1.42rem)",
                      lineHeight: 1.4,
                      color: "var(--text-muted)",
                    }}
                  >
                    {emphasised(p.question, accent)}
                  </p>

                  {/* Rollerna — de namngivna uppdragen AI kan få inuti facket */}
                  {bounded ? (
                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.4rem",
                        marginTop: "clamp(0.2rem, 0.6vh, 0.4rem)",
                      }}
                    >
                      {p.roles.map((r) => (
                        <span
                          key={r}
                          style={{
                            padding: "0.24rem 0.62rem",
                            borderRadius: "999px",
                            border: `1px solid ${withAlpha(accent, 0.45)}`,
                            background: withAlpha(accent, 0.1),
                            fontFamily: "var(--font-mono)",
                            fontSize: "clamp(0.75rem, 1.15vw, 1.1rem)",
                            letterSpacing: "0.06em",
                            color: accent,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {footnote ? (
          <div
            style={{
              marginTop: "clamp(0.6rem, 1.6vh, 1.1rem)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.68rem, 0.9vw, 0.88rem)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="footnote" value={footnote}>
              {footnote}
            </EditableText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
