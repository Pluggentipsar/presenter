"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RoleSelector — fyra bra roller att ge AI, som knappar man faktiskt kan
 * trycka på.
 *
 * Mellanslag stegar igenom rollerna i ordning, men knapparna är också
 * klickbara: pekar någon i publiken på "Utmana" går det att hoppa dit direkt
 * och sedan fortsätta stega. Ett klick tar över tills nästa steg, då
 * stegordningen återtar kommandot.
 *
 * Under knapparna står elevprompten som faktiskt ger rollen. Det är den som
 * är undervisningsbar — inte rollnamnet.
 *
 * ```mdx
 * <RoleSelector
 *   kicker="§ 2 · Fyra bra roller för AI"
 *   bottomLine="Rollen är din att bestämma. Varje gång."
 * >
 * - Förklara · Förklara detta med en liknelse från fotboll.
 * - Förhöra · Ställ fem frågor, en i taget.
 * </RoleSelector>
 * ```
 *
 * Per rad: `Rollnamn · Elevprompten som ger rollen`.
 */

interface RoleSelectorProps {
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Rubrik ovanför knapparna. */
  title?: string;
  /** Etikett ovanför promptrutan. */
  promptLabel?: string;
  /** Slutrad under promptrutan. */
  bottomLine?: string;
  children?: ReactNode;
}

interface Role {
  name: string;
  prompt: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const inner = extractText(el.props.children);
    if (el.type === "strong") return `**${inner}**`;
    if (el.type === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseRoles(children: ReactNode): Role[] {
  const out: Role[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    out.push({
      name: parts[0].trim(),
      prompt: parts.slice(1).join(" · ").trim(),
    });
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
  return out;
}

export function RoleSelector({
  chapter,
  kicker,
  title,
  promptLabel = "Så säger eleven",
  bottomLine,
  children,
}: RoleSelectorProps) {
  const roles = useMemo(() => parseRoles(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  const step = useSlideSteps(roles.length);
  // Klick vinner tills stegordningen rör sig igen. Vi sparar vilket steg valet
  // gjordes på — då blir det självutgående när steget ändras, utan effect som
  // måste nollställa state.
  const [picked, setPicked] = useState<{ atStep: number; index: number } | null>(
    null,
  );

  const stepIndex = Math.min(step, Math.max(roles.length - 1, 0));
  const active = picked && picked.atStep === step ? picked.index : stepIndex;
  const current = roles[active];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 20%, var(--bg-surface) 0%, var(--bg) 72%)",
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "clamp(1.1rem, 2.8vh, 2rem)",
          padding: "clamp(2.2rem, 4.5vw, 4.5rem)",
          maxWidth: "var(--slide-max-width)",
          margin: "0 auto",
        }}
      >
        {/* ————— Topprad ————— */}
        {kicker || chapter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "1rem",
            }}
          >
            {kicker ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.65rem, 0.85vw, 0.85rem)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "var(--accent)",
                }}
              >
                <EditableText path="kicker" value={kicker}>
                  {kicker}
                </EditableText>
              </span>
            ) : null}
            {chapter ? (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.6rem, 0.8vw, 0.8rem)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--text) 45%, transparent)",
                  marginLeft: "auto",
                }}
              >
                <EditableText path="chapter" value={chapter}>
                  {chapter}
                </EditableText>
              </span>
            ) : null}
          </div>
        ) : null}

        {title ? (
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(1.6rem, 2.9vw, 2.8rem)",
              letterSpacing: "-0.02em",
              color: "var(--text)",
            }}
          >
            <EditableText path="title" value={title}>
              {title}
            </EditableText>
          </h2>
        ) : null}

        {/* ————— Knapparna ————— */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(0.5rem, 1.2vw, 1rem)",
          }}
        >
          {roles.map((role, i) => {
            const isActive = i === active;
            const reached = i <= Math.max(stepIndex, active);
            return (
              <motion.button
                key={i}
                type="button"
                data-tag={isActive ? "solid" : ""}
                onClick={() => setPicked({ atStep: step, index: i })}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{
                  opacity: reached ? 1 : 0.32,
                  y: 0,
                }}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : 0.1 + i * 0.08,
                  ease: EASE,
                }}
                style={{
                  cursor: "pointer",
                  padding:
                    "clamp(0.55rem, 1.1vh, 0.85rem) clamp(1rem, 2vw, 1.7rem)",
                  borderRadius: "999px",
                  border: `1.5px solid ${
                    isActive
                      ? "var(--accent)"
                      : "color-mix(in srgb, var(--text) 18%, transparent)"
                  }`,
                  background: isActive
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--text) 4%, transparent)",
                  color: isActive ? "var(--bg)" : "var(--text)",
                  fontFamily: "var(--font-display)",
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "clamp(0.85rem, 1.2vw, 1.15rem)",
                  letterSpacing: "-0.01em",
                  boxShadow: isActive ? "0 10px 30px -14px var(--accent-glow)" : "none",
                  transition: reduceMotion
                    ? "none"
                    : "background 0.35s, color 0.35s, border-color 0.35s, box-shadow 0.35s",
                }}
              >
                {role.name}
              </motion.button>
            );
          })}
        </div>

        {/* ————— Prompten som ger rollen ————— */}
        <div
          data-card=""
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid color-mix(in srgb, var(--text) 12%, transparent)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            boxShadow:
              "0 28px 65px -40px color-mix(in srgb, var(--accent) 40%, transparent)",
          }}
        >
          <div
            style={{
              padding: "clamp(0.45rem, 1vh, 0.7rem) clamp(0.9rem, 1.6vw, 1.4rem)",
              borderBottom:
                "1px solid color-mix(in srgb, var(--text) 10%, transparent)",
              background: "var(--bg-surface)",
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.56rem, 0.75vw, 0.75rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="promptLabel" value={promptLabel}>
              {promptLabel}
            </EditableText>
          </div>
          <div
            style={{
              padding: "clamp(1.1rem, 2.2vw, 1.9rem)",
              minHeight: "clamp(4.5rem, 12vh, 7rem)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={active}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: -10,
                  transition: { duration: reduceMotion ? 0 : 0.2 },
                }}
                transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE }}
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(0.95rem, 1.4vw, 1.4rem)",
                  lineHeight: 1.55,
                  color: "var(--text)",
                }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                  {"› "}
                </span>
                {current?.prompt}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {bottomLine ? (
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              fontSize: "clamp(0.9rem, 1.25vw, 1.25rem)",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="bottomLine" value={bottomLine}>
              {bottomLine}
            </EditableText>
          </div>
        ) : null}
      </div>
    </div>
  );
}
