"use client";

import { useEffect, useState } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { glassCardStyle, AmbientBackdrop } from "./_decorations/GlassDecorations";

/**
 * BaraTask ★ — den för grova frågan, som formulär.
 *
 * Uppgiften stor i mitten. Under den ett binärt val: AI tillåtet /
 * AI förbjudet — formulärets hela världsbild. Sista klicket stämplar en
 * varningstriangel på BÅDA knapparna: vilket svar man än väljer är det
 * fel fråga, för uppgiften rymmer flera helt olika arbeten.
 *
 *   0 · Uppgiften + frågan.
 *   1 · De två knapparna glider in som ett formulär.
 *   2 · Trianglarna stämplas på båda — knapparna mattas.
 *
 * ```mdx
 * <BaraTask
 *   kicker="7–9 · Svenska"
 *   task="Skriv en argumenterande text om mobilförbud."
 *   question="Får AI användas?"
 *   leftLabel="AI tillåtet"
 *   rightLabel="AI förbjudet"
 * />
 * ```
 */

interface BaraTaskProps {
  kicker?: string;
  task: string;
  question?: string;
  leftLabel?: string;
  rightLabel?: string;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const POP = "cubic-bezier(0.34, 1.4, 0.64, 1)";

function WarnTriangle({ on }: { on: boolean }) {
  return (
    <span
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "scale(1) rotate(0deg)" : "scale(1.7) rotate(-10deg)",
        transition: "opacity 0.3s ease, transform 0.5s " + POP,
        position: "absolute",
        top: "-0.85rem",
        right: "-0.85rem",
        width: "1.9rem",
        height: "1.9rem",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 2px 6px rgba(16,20,28,0.18))",
      }}
      aria-label="Varning"
    >
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none">
        <path
          d="M12 3.2 22 20.4H2Z"
          fill="var(--bg)"
          stroke="var(--accent-alert)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M12 9.4v5" stroke="var(--accent-alert)" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="12" cy="17.2" r="1.1" fill="var(--accent-alert)" />
      </svg>
    </span>
  );
}

export function BaraTask({
  kicker,
  task,
  question = "Får AI användas?",
  leftLabel = "AI tillåtet",
  rightLabel = "AI förbjudet",
}: BaraTaskProps) {
  const step = useSlideSteps(3);
  const buttonsOn = step >= 1;
  const warned = step >= 2;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    const fallback = setTimeout(() => setMounted(true), 120);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(fallback);
    };
  }, []);

  const button = (label: string, path: string) => (
    <div
      style={{
        position: "relative",
        opacity: buttonsOn ? 1 : 0,
        transform: buttonsOn ? "translateY(0)" : "translateY(24px)",
        filter: warned ? "saturate(0.55)" : "saturate(1)",
        ...glassCardStyle({ padding: "clamp(0.9rem, 1.9vh, 1.35rem) clamp(2rem, 3.6vw, 3.4rem)", withShadow: false }),
        borderRadius: "999px",
        fontFamily: "var(--font-body)",
        fontWeight: 600,
        fontSize: "clamp(1.05rem, 1.8vw, 1.7rem)",
        color: warned ? "var(--text-muted)" : "var(--text)",
        transition:
          "opacity 0.6s " + EASE + ", transform 0.6s " + EASE + ", filter 0.5s ease, color 0.5s ease",
        whiteSpace: "nowrap",
      }}
    >
      <EditableText path={path} value={label}>
        {label}
      </EditableText>
      <WarnTriangle on={warned} />
    </div>
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <AmbientBackdrop />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1.6rem, 3.6vh, 2.8rem)",
          padding: "clamp(2rem, 4vh, 3rem) clamp(2.5rem, 5vw, 5rem)",
          textAlign: "center",
        }}
      >
        {kicker ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.7s " + EASE + ", transform 0.7s " + EASE,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            letterSpacing: "var(--heading-tracking)",
            fontSize: "clamp(1.9rem, 4vw, 3.9rem)",
            lineHeight: 1.18,
            color: "var(--text)",
            maxWidth: "24ch",
          }}
        >
          <EditableText path="task" value={task}>
            &rdquo;{task}&rdquo;
          </EditableText>
        </div>

        <div
          style={{
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.7s ease 0.35s",
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "clamp(1.25rem, 2.3vw, 2.2rem)",
            color: "var(--accent-ink, var(--accent))",
          }}
        >
          <EditableText path="question" value={question}>
            {question}
          </EditableText>
        </div>

        <div
          style={{
            display: "flex",
            gap: "clamp(1.2rem, 3vw, 2.6rem)",
            alignItems: "center",
          }}
        >
          {button(leftLabel, "leftLabel")}
          {button(rightLabel, "rightLabel")}
        </div>
      </div>
    </div>
  );
}
