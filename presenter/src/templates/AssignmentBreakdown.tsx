"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * AssignmentBreakdown ★ — uppgiften tas isär, och ansvaret fördelas.
 *
 * Pedagogiskt grepp: en skriftlig uppgift ser ut som EN sak när den delas ut,
 * och det är precis därför "får man använda AI?" är en omöjlig fråga. Bryter
 * man ner den i sina moment blir frågan besvarbar — för den ställs då en gång
 * per moment i stället för en gång per uppgift.
 *
 * Bygget går i fyra steg, och ordningen ÄR argumentet:
 *
 * - Steg 0 · Uppgiften hel, stor, mitt på ytan — så som eleven får den.
 * - Steg 1 · Den faller isär i sina moment. Nu finns det något att besluta om.
 * - Steg 2 · Varje moment får en ägare, visad som en tregradig mätare:
 *            eleven bär (0/3) → AI stödjer (2/3) → AI producerar (3/3).
 *            Mätaren bär "och i vilken mån" utan att någon behöver läsa den.
 * - Steg 3 · Där AI släpps in räcker det inte att säga ja. Rollen måste
 *            namnges — forskarassistent, djävulens advokat, redaktör — med
 *            ett promptexempel som visar hur den rollen faktiskt låter.
 * - Steg 4 · Landningen.
 *
 * MDX-format — ett moment per rad, `fas · ägare · roll · promptexempel`:
 * ```mdx
 * <AssignmentBreakdown
 *   title="Bryt ner uppgiften. Bestäm vem som bär vad."
 *   assignment="Utredande text · Är sociala medier ett hot mot demokratin?"
 *   payoff="Frågan är inte **om** AI får användas. Den är **var, hur mycket och som vad**."
 * >
 * - Brainstorma · sjalv · — · Den första tanken måste vara elevens egen.
 * - Söka och värdera källor · stod · Forskarassistenten · Ge mig tre källor som säger emot mig.
 * - Språkgranska · producera · Redaktören · Rätta stavning — ändra inte mina formuleringar.
 * </AssignmentBreakdown>
 * ```
 *
 * Ägare: `sjalv` (eleven bär) · `stod` (AI stödjer) · `producera` (AI producerar).
 * Sätt roll till `—` på moment eleven bär själv; fältet döljs då i steg 3.
 */

type Owner = "sjalv" | "stod" | "producera";

interface AssignmentBreakdownProps {
  chapter?: string;
  kicker?: string;
  title?: string;
  /** Uppgiften som helhet — den som visas stor i steg 0. */
  assignment?: string;
  /** Liten metarad under uppgiften (ämne, tidsomfång, inlämningsform). */
  assignmentMeta?: string;
  /** Landningsrad på sista steget. Stödjer **fetstil**. */
  payoff?: string;
  /** Etiketter för de tre ägarnivåerna, i ordningen sjalv | stod | producera. */
  ownerLabels?: string;
  accent?: string;
  children?: ReactNode;
}

interface Phase {
  name: string;
  owner: Owner;
  role: string;
  prompt: string;
}

const FILLED: Record<Owner, number> = { sjalv: 0, stod: 2, producera: 3 };

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parseOwner(raw: string | undefined): Owner {
  const v = (raw ?? "").trim().toLowerCase();
  if (/^prod/.test(v)) return "producera";
  if (/^(stod|stöd|med)/.test(v)) return "stod";
  return "sjalv";
}

function parsePhases(children: ReactNode): Phase[] {
  const out: Phase[] = [];
  const add = (raw: string) => {
    const p = raw.split("·").map((s) => s.trim());
    if (!p[0]) return;
    const role = (p[2] ?? "").replace(/\*\*/g, "").trim();
    out.push({
      name: p[0].replace(/\*\*/g, ""),
      owner: parseOwner(p[1]),
      // "—", "-" och tomt betyder alla "ingen roll".
      role: /^[—–-]?$/.test(role) ? "" : role,
      prompt: p.slice(3).join(" · ").trim(),
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
          add(
            extractText(
              (li as ReactElement<{ children?: ReactNode }>).props.children,
            ).trim(),
          );
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children).trim());
    }
  });
  return out;
}

function renderBold(text: string, accent: string, dim: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span key={i} style={{ color: accent, fontWeight: 700 }}>
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i} style={{ color: dim }}>
        {part}
      </span>
    ),
  );
}

/** Tregradig mätare: hur stor del av momentet som lämnas till maskinen. */
function OwnerMeter({ owner, lit }: { owner: Owner; lit: boolean }) {
  const filled = FILLED[owner];
  return (
    <span style={{ display: "inline-flex", gap: "0.22rem" }} aria-hidden>
      {[0, 1, 2].map((i) => {
        const on = lit && i < filled;
        return (
          <motion.span data-glow=""
            key={i}
            initial={false}
            animate={{
              backgroundColor: on
                ? "var(--accent)"
                : "color-mix(in srgb, var(--text) 14%, transparent)",
              boxShadow: on
                ? "0 0 10px color-mix(in srgb, var(--accent) 55%, transparent)"
                : "0 0 0 rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.4, delay: 0.06 * i }}
            style={{
              width: "clamp(0.5rem, 0.85vw, 0.8rem)",
              height: "clamp(0.5rem, 0.85vw, 0.8rem)",
              borderRadius: "2px",
              border:
                "1px solid color-mix(in srgb, var(--text) 22%, transparent)",
            }}
          />
        );
      })}
    </span>
  );
}

export function AssignmentBreakdown({
  chapter,
  kicker,
  title,
  assignment,
  assignmentMeta,
  payoff,
  ownerLabels = "Eleven bär | AI stödjer | AI producerar",
  accent = "var(--accent)",
  children,
}: AssignmentBreakdownProps) {
  const phases = parsePhases(children);
  const step = useSlideSteps(5);

  const showPhases = step >= 1;
  const showOwners = step >= 2;
  const showRoles = step >= 3;
  const showPayoff = step >= 4;

  const [labelSjalv, labelStod, labelProducera] = ownerLabels
    .split("|")
    .map((s) => s.trim());
  const OWNER_LABEL: Record<Owner, string> = {
    sjalv: labelSjalv ?? "Eleven bär",
    stod: labelStod ?? "AI stödjer",
    producera: labelProducera ?? "AI producerar",
  };

  if (phases.length === 0) return null;

  const eyebrow = kicker ?? chapter;

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        padding: "clamp(1.6rem, 3.4vh, 2.8rem) clamp(2rem, 4.5vw, 4.5rem)",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.9vw, 0.9rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path={kicker ? "kicker" : "chapter"} value={eyebrow}>
            {eyebrow}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.4rem, 2.5vw, 2.5rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.1,
            color: "var(--text)",
            margin: "clamp(0.35rem, 1vh, 0.7rem) 0 0",
            maxWidth: "30ch",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </h2>
      ) : null}

      {/* Uppgiftskortet. Steg 0: stort och ensamt mitt på ytan — så som
          eleven möter den. Från steg 1: en smal remsa högst upp, medan
          momenten tar över ytan. layout-animationen gör förvandlingen. */}
      <motion.div
        layout
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: showPhases ? "flex-start" : "center",
          justifyContent: "center",
          textAlign: showPhases ? "left" : "center",
          gap: "0.4rem",
          margin: showPhases
            ? "clamp(0.9rem, 2vh, 1.4rem) 0 clamp(0.6rem, 1.4vh, 1rem)"
            : "auto",
          padding: showPhases
            ? "clamp(0.7rem, 1.5vh, 1rem) clamp(1rem, 2vw, 1.5rem)"
            : "clamp(1.8rem, 4vh, 3rem) clamp(2rem, 4vw, 3.5rem)",
          width: showPhases ? "100%" : "min(88%, 46rem)",
          alignSelf: showPhases ? "stretch" : "center",
          borderRadius: "var(--radius, 0.75rem)",
          border: `1px solid color-mix(in srgb, ${accent} ${
            showPhases ? 26 : 45
          }%, transparent)`,
          background: `color-mix(in srgb, ${accent} ${
            showPhases ? 5 : 9
          }%, transparent)`,
        }}
      >
        <motion.div
          layout="position"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.6rem, 0.75vw, 0.75rem)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          Uppgiften
        </motion.div>
        <motion.div
          layout="position"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: showPhases
              ? "clamp(0.95rem, 1.5vw, 1.35rem)"
              : "clamp(1.5rem, 3vw, 2.8rem)",
            lineHeight: 1.2,
            letterSpacing: "var(--heading-tracking)",
            color: "var(--text)",
          }}
        >
          <EditableText path="assignment" value={assignment ?? ""}>
            {assignment}
          </EditableText>
        </motion.div>
        {assignmentMeta ? (
          <motion.div
            layout="position"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.62rem, 0.8vw, 0.8rem)",
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
            }}
          >
            <EditableText path="assignmentMeta" value={assignmentMeta}>
              {assignmentMeta}
            </EditableText>
          </motion.div>
        ) : null}
      </motion.div>

      {/* Momenten */}
      <div
        style={{
          flex: showPhases ? "1 1 auto" : "0 0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.28rem, 0.7vh, 0.55rem)",
          minHeight: 0,
        }}
      >
        <AnimatePresence>
          {showPhases &&
            phases.map((phase, i) => {
              const hasRole = phase.owner !== "sjalv" && phase.role;
              return (
                <motion.div
                  key={phase.name}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    delay: 0.07 * i,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "auto minmax(0, 1.05fr) auto minmax(0, 1.5fr)",
                    alignItems: "center",
                    gap: "clamp(0.5rem, 1.4vw, 1.2rem)",
                    padding:
                      "clamp(0.3rem, 0.85vh, 0.6rem) clamp(0.6rem, 1.2vw, 1rem)",
                    borderRadius: "var(--radius, 0.75rem)",
                    borderLeft: `3px solid ${
                      showOwners && phase.owner !== "sjalv"
                        ? accent
                        : "color-mix(in srgb, var(--text) 30%, transparent)"
                    }`,
                    background:
                      showOwners && phase.owner !== "sjalv"
                        ? `color-mix(in srgb, ${accent} 6%, transparent)`
                        : "color-mix(in srgb, var(--text) 3.5%, transparent)",
                    transition: "background 0.5s ease, border-color 0.5s ease",
                  }}
                >
                  {/* Nummer */}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(0.62rem, 0.8vw, 0.82rem)",
                      color: "var(--text-muted)",
                      opacity: 0.7,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Momentets namn */}
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: "var(--heading-weight)",
                      fontSize: "clamp(0.85rem, 1.3vw, 1.25rem)",
                      lineHeight: 1.2,
                      letterSpacing: "var(--heading-tracking)",
                      color: "var(--text)",
                    }}
                  >
                    {phase.name}
                  </span>

                  {/* Mätare + ägaretikett */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      opacity: showOwners ? 1 : 0,
                      transition: "opacity 0.45s ease",
                    }}
                  >
                    <OwnerMeter owner={phase.owner} lit={showOwners} />
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "clamp(0.58rem, 0.75vw, 0.76rem)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        color:
                          phase.owner === "sjalv"
                            ? "var(--text-muted)"
                            : accent,
                      }}
                    >
                      {OWNER_LABEL[phase.owner]}
                    </span>
                  </span>

                  {/* Högerkolumnen fylls i två omgångar: elevmomenten får sitt
                      skäl redan när ägarskapet sätts (steg 2) — "varför är just
                      det här skyddat?" — medan AI-momenten står tomma tills
                      rollen namnges (steg 3). Det gör steg 3 till en egen
                      händelse i stället för en rad text till. */}
                  <span style={{ minWidth: 0 }}>
                    <AnimatePresence>
                      {showOwners && !hasRole && phase.prompt ? (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, delay: 0.05 * i }}
                          style={{
                            fontFamily: "var(--font-body)",
                            fontStyle: "italic",
                            fontSize: "clamp(0.62rem, 0.85vw, 0.88rem)",
                            lineHeight: 1.35,
                            color: "var(--text-muted)",
                          }}
                        >
                          {phase.prompt}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                    <AnimatePresence>
                      {showRoles && hasRole ? (
                        <motion.span
                          initial={{ opacity: 0, x: 18 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.45,
                            delay: 0.06 * i,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.1rem",
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 700,
                              fontSize: "clamp(0.78rem, 1.1vw, 1.05rem)",
                              color: accent,
                              lineHeight: 1.15,
                            }}
                          >
                            {phase.role}
                          </span>
                          {phase.prompt ? (
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "clamp(0.55rem, 0.72vw, 0.74rem)",
                                lineHeight: 1.35,
                                color: "var(--text-muted)",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              ”{phase.prompt}”
                            </span>
                          ) : null}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      {/* Landningen */}
      <div style={{ minHeight: "clamp(1.8rem, 4.5vh, 3rem)" }}>
        <AnimatePresence>
          {showPayoff && payoff ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              style={{
                marginTop: "clamp(0.5rem, 1.2vh, 0.9rem)",
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1rem, 1.6vw, 1.5rem)",
                lineHeight: 1.3,
                textAlign: "center",
              }}
            >
              <EditableText path="payoff" value={payoff}>
                {renderBold(payoff, accent, "var(--text)")}
              </EditableText>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
