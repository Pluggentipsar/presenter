"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { AiForm, CENTER, SLOTS } from "./RoleOrbit";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * RolesReleased — finalen där rollerna tas TILLBAKA.
 *
 * Sliden öppnar med exakt samma bild som `RoleOrbit` gav i akt 0: fyra roller
 * i omloppsbana runt den abstrakta AI-formen, kontaktlinjerna dragna. Publiken
 * känner igen den.
 *
 * Sedan lossas en roll per klick. Kontaktlinjen dras tillbaka, punkten slocknar,
 * namnet stryks över och föreställningen byts mot sitt förnekande. Korten
 * blir kvar som spöken i hörnen — det ska synas VAD som togs bort.
 *
 * Kvar står mitten: oförändrad, neutral, varken orakel eller vän. Först då
 * landar vändningen.
 *
 * Geometrin och mittformen importeras från `RoleOrbit` i stället för att
 * återskapas. Rollerna MÅSTE hamna på samma punkter som i akt 0, annars
 * uteblir återkopplingen — och en kopia skulle glida isär vid första ändring.
 *
 * ```mdx
 * <RolesReleased
 *   kicker="§ Final · Vad är AI då?"
 *   turn="Det är roller vi ger den."
 * >
 * - Oraklet · Den vet. · Inte ett orakel.
 * - Tjänaren · Den gör arbetet åt mig. · Inte en tjänare.
 * </RolesReleased>
 * ```
 *
 * Per rad: `Rollnamn · Föreställningen · Förnekandet`.
 *
 * Steg: 0 visar bilden intakt, 1–4 lossar var sin roll, sista klicket
 * landar vändningen.
 */

interface RolesReleasedProps {
  /** Liten kicker uppe till vänster. */
  kicker?: string;
  /** Kapitelmarkör uppe till höger. */
  chapter?: string;
  /** Vändningen som landar när alla roller lossats. */
  turn?: string;
  children?: ReactNode;
}

interface Role {
  name: string;
  belief: string;
  denial: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
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
      name: (parts[0] ?? "").trim(),
      belief: (parts[1] ?? "").trim(),
      denial: parts.slice(2).join(" · ").trim(),
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
  // Fyra platser i omloppsbanan — fler roller får inte plats.
  return out.slice(0, SLOTS.length);
}

export function RolesReleased({
  kicker,
  chapter,
  turn,
  children,
}: RolesReleasedProps) {
  const roles = useMemo(() => parseRoles(children), [children]);
  const reduceMotion = useReducedMotion() ?? false;

  // Steg 0 = bilden intakt. Sedan en roll per klick. Sist vändningen.
  const step = useSlideSteps(roles.length + (turn ? 2 : 1));
  const released = Math.min(step, roles.length);
  const turnOut = Boolean(turn) && step > roles.length;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, var(--bg-surface) 0%, var(--bg) 70%)",
      }}
    >
      {/* ————— Topprad ————— */}
      {kicker || chapter ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1rem",
            zIndex: 4,
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
        </motion.div>
      ) : null}

      {/* ————— Omloppsbanan ————— */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop: "clamp(4rem, 9vh, 6rem)",
          paddingBottom: turn ? "clamp(5rem, 11vh, 7.5rem)" : "clamp(2rem, 4vh, 3rem)",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* Kontaktlinjerna — dras tillbaka när rollen lossas */}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            {roles.map((_, i) => {
              const slot = SLOTS[i];
              if (!slot) return null;
              const gone = i < released;
              return (
                <motion.line
                  key={i}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={CENTER.x + (slot.x - CENTER.x) * 0.6}
                  y2={CENTER.y + (slot.y - CENTER.y) * 0.6}
                  stroke="var(--accent)"
                  strokeWidth={0.3}
                  strokeDasharray="1.6 1.6"
                  vectorEffect="non-scaling-stroke"
                  initial={false}
                  animate={{ pathLength: gone ? 0 : 1, opacity: gone ? 0 : 0.6 }}
                  transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
                />
              );
            })}
          </svg>

          {/* Mittformen — orörd hela vägen. Det är poängen. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 1.1, ease: EASE }}
            style={{
              position: "absolute",
              left: `${CENTER.x}%`,
              top: `${CENTER.y}%`,
              // x/y i stället för CSS-transform — se samma lösning i RoleOrbit.
              x: "-50%",
              y: "-50%",
              zIndex: 2,
            }}
          >
            <AiForm reduceMotion={reduceMotion} />
          </motion.div>

          {/* Rollkorten */}
          {roles.map((role, i) => {
            const slot = SLOTS[i];
            if (!slot) return null;
            const gone = i < released;
            // Kortet driver en aning utåt när det lossnar — bort från mitten.
            const drift = 3;
            const dx = slot.x < CENTER.x ? -drift : drift;
            const dy = slot.y < CENTER.y ? -drift * 0.5 : drift * 0.5;

            return (
              <motion.div
                key={i}
                initial={false}
                animate={{
                  opacity: gone ? 0.34 : 1,
                  left: `${gone ? slot.x + dx : slot.x}%`,
                  top: `${gone ? slot.y + dy : slot.y}%`,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.75, ease: EASE }}
                style={{
                  position: "absolute",
                  x: "-50%",
                  y: "-50%",
                  width: "clamp(11rem, 25vw, 21rem)",
                  textAlign: "center",
                  zIndex: 3,
                }}
              >
                {/* Anslutningspunkten slocknar */}
                <motion.span
                  aria-hidden
                  initial={false}
                  animate={{
                    backgroundColor: gone
                      ? "rgba(0,0,0,0)"
                      : "var(--accent)",
                    boxShadow: gone
                      ? "0 0 0 rgba(0,0,0,0)"
                      : "0 0 12px var(--accent-glow)",
                    scale: gone ? 0.8 : 1,
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.5 }}
                  style={{
                    display: "block",
                    width: "0.5rem",
                    height: "0.5rem",
                    margin: "0 auto clamp(0.5rem, 1.1vh, 0.8rem)",
                    borderRadius: "50%",
                    border: "1.5px solid var(--accent)",
                  }}
                />

                {/* Namnet, med överstrykning som ritas när rollen lossas */}
                <span style={{ position: "relative", display: "inline-block" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: "clamp(1.55rem, 2.95vw, 2.85rem)",
                      lineHeight: 1.12,
                      letterSpacing: "-0.025em",
                      color: "var(--text)",
                    }}
                  >
                    {role.name}
                  </span>
                  <motion.span
                    aria-hidden
                    initial={false}
                    animate={{ scaleX: gone ? 1 : 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.45,
                      ease: EASE,
                      delay: reduceMotion ? 0 : 0.15,
                    }}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "52%",
                      height: "2px",
                      background: "var(--accent)",
                      transformOrigin: "left",
                    }}
                  />
                </span>

                {/* Föreställningen byts mot sitt förnekande */}
                <div
                  style={{
                    position: "relative",
                    marginTop: "clamp(0.3rem, 0.75vh, 0.55rem)",
                    // Reserverar plats för båda raderna så korten inte hoppar
                    // när texten byts.
                    minHeight: "2.7em",
                  }}
                >
                  {role.belief ? (
                    <motion.div
                      initial={false}
                      animate={{ opacity: gone ? 0 : 1 }}
                      transition={{ duration: reduceMotion ? 0 : 0.4 }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                        fontSize: "clamp(1rem, 1.5vw, 1.45rem)",
                        lineHeight: 1.35,
                        color: "var(--text-muted)",
                      }}
                    >
                      {role.belief}
                    </motion.div>
                  ) : null}
                  {role.denial ? (
                    <motion.div
                      initial={false}
                      animate={{ opacity: gone ? 1 : 0 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.5,
                        delay: reduceMotion ? 0 : 0.25,
                      }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        fontFamily: "var(--font-display)",
                        fontWeight: 600,
                        fontSize: "clamp(1.05rem, 1.6vw, 1.6rem)",
                        lineHeight: 1.3,
                        color: "var(--accent)",
                      }}
                    >
                      {role.denial}
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ————— Vändningen ————— */}
      {turn ? (
        <motion.div
          initial={false}
          animate={{ opacity: turnOut ? 1 : 0, y: turnOut ? 0 : 12 }}
          transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
          style={{
            position: "absolute",
            bottom: "clamp(2rem, 5vh, 3.6rem)",
            left: "clamp(2rem, 4vw, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            textAlign: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "clamp(1.5rem, 2.5vw, 2.5rem)",
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            color: "var(--accent)",
            zIndex: 4,
          }}
        >
          <EditableText path="turn" value={turn}>
            {turn}
          </EditableText>
        </motion.div>
      ) : null}
    </div>
  );
}
