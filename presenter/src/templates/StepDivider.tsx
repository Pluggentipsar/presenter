"use client";

import { Children, isValidElement, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * StepDivider ★ — aktdivider med stegade rader. Gångjärnets mall.
 *
 * SectionDivider klarar tvåstegs titleReveal och kaskad — men inte rader
 * som avslöjas klick för klick. Den här varianten gör exakt det: nummer +
 * titel står still, raderna under landar en i taget. Byggd för dividers
 * som är växlar snarare än rubriker ("Hittills… / Men… / Ni hörde dem.").
 *
 * Radernas vikt styrs per rad: `lead` (bärande sats), `soft` (dämpad
 * följdrad), `land` (callback/payoff — accent, störst, och de tidigare
 * raderna dämpas när den landat).
 *
 * ```mdx
 * <StepDivider number="03" title="Lära **MOT** AI">
 * - Hittills har vi pratat om AI som ni designar. :: lead
 * - Men eleverna möter redan AI som ingen har designat. :: soft
 * - Ni hörde dem i början. :: land
 * </StepDivider>
 * ```
 */

type Weight = "lead" | "soft" | "land";

interface Line {
  text: string;
  weight: Weight;
}

interface StepDividerProps {
  number?: string;
  /** Titeln. **fet** blir accent. */
  title: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

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

function parseLines(children: ReactNode): Line[] {
  const out: Line[] = [];
  const add = (raw: string) => {
    const p = raw.split("::").map((s) => s.trim());
    if (!p[0]) return;
    const w = (p[1] ?? "lead").toLowerCase();
    out.push({
      text: p[0].replace(/\*\*/g, ""),
      weight: w === "soft" ? "soft" : w === "land" ? "land" : "lead",
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

function renderRich(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <span key={i} style={{ color: "var(--accent-ink, var(--accent))" }}>
        {p.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const WEIGHT_STYLE: Record<Weight, { size: string; color: string; weight: number; style?: "italic" }> = {
  lead: { size: "clamp(1.35rem, 2.6vw, 2.5rem)", color: "var(--text)", weight: 550 },
  soft: { size: "clamp(1.05rem, 1.9vw, 1.8rem)", color: "var(--text-muted)", weight: 420 },
  land: { size: "clamp(1.5rem, 3vw, 2.9rem)", color: "var(--accent-ink, var(--accent))", weight: 600 },
};

export function StepDivider({ number, title, children }: StepDividerProps) {
  const lines = parseLines(children);
  // Läge 0: nummer + titel + första raden · +1 per ytterligare rad.
  const step = useSlideSteps(Math.max(lines.length, 1));
  const landIndex = lines.findIndex((l) => l.weight === "land");
  const landOn = landIndex >= 0 && step >= landIndex;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    const fallback = setTimeout(() => setMounted(true), 120);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Ljuset tätnar mot mitten när callbacken landat. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(50% 44% at 50% 56%, var(--accent-dim) 0%, transparent 72%)",
          opacity: landOn ? 1 : 0.4,
          transition: "opacity 1.1s ease",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(1.1rem, 2.6vh, 2rem)",
          padding: "clamp(2rem, 4vh, 3rem) clamp(2.5rem, 6vw, 6rem)",
          textAlign: "center",
        }}
      >
        {number ? (
          <div
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.85)",
              transition: "opacity 0.8s " + EASE + ", transform 0.8s " + EASE,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(3rem, 7vw, 6rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: "var(--accent)",
              textShadow: "0 0 40px var(--accent-glow)",
            }}
          >
            <EditableText path="number" value={number}>
              {number}
            </EditableText>
          </div>
        ) : null}

        <h1
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.8s " + EASE + " 0.15s, transform 0.8s " + EASE + " 0.15s",
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)" as unknown as number,
            letterSpacing: "var(--heading-tracking)",
            fontSize: "clamp(2.2rem, 4.6vw, 4.4rem)",
            lineHeight: 1.12,
            color: "var(--text)",
            margin: 0,
          }}
        >
          <EditableText path="title" value={title}>
            {renderRich(title)}
          </EditableText>
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.7rem, 1.8vh, 1.3rem)",
            marginTop: "clamp(0.4rem, 1.2vh, 0.9rem)",
            maxWidth: "56ch",
          }}
        >
          {lines.map((l, i) => {
            const on = step >= i;
            const dimmed = landOn && l.weight !== "land";
            const s = WEIGHT_STYLE[l.weight];
            return (
              <div
                key={i}
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: s.weight,
                  fontSize: s.size,
                  lineHeight: 1.3,
                  color: s.color,
                  opacity: on ? (dimmed ? 0.45 : 1) : 0,
                  transform: on ? "translateY(0)" : "translateY(18px)",
                  transition: "opacity 0.75s " + EASE + ", transform 0.75s " + EASE,
                }}
              >
                {l.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
