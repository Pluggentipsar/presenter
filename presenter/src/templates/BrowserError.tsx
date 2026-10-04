"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

/**
 * BrowserError — webbläsarens "Webbplatsen kan inte nås"-sida.
 *
 * Till skillnad från ErrorSlide, som är en stiliserad och glitchande
 * satirsida, är den här trogen mot Chromes faktiska felsida. Poängen är
 * igenkänningen: publiken ska läsa den som en riktig sida i en halv sekund
 * innan de ser vad det står i domännamnet.
 *
 * Därför sitter den medvetet UTANFÖR temat — den använder Chromes egna
 * färger och systemtypsnitt, inte presentationens. Ett dagsljus-tema
 * runt en Chrome-sida hade brutit illusionen.
 *
 * ```mdx
 * <BrowserError
 *   domain="JoelsföreläsningomAI"
 *   errorCode="DNS_PROBE_STARTED"
 * />
 * ```
 */

interface BrowserErrorProps {
  /** Domänen som inte kunde nås. Bryts över flera rader om den är lång. */
  domain?: string;
  /** Rubriken. Default är Chromes svenska formulering. */
  title?: string;
  /** Felkoden längst ned. */
  errorCode?: string;
  /** Raden om vad webbläsaren gör just nu. */
  status?: string;
  /** Stilla och större text för projektion i en föreläsningssal. */
  presentation?: boolean;
}

const SANS =
  '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

export function BrowserError({
  domain = "exempel.se",
  title = "Webbplatsen kan inte nås",
  errorCode = "DNS_PROBE_STARTED",
  status = "Diagnostiserar problemet.",
  presentation = false,
}: BrowserErrorProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#ffffff",
        color: "#202124",
        fontFamily: SANS,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Chromes felsida är vänsterställd i en smal spalt, inte centrerad. */}
      <div style={{ width: presentation ? "76%" : "min(52rem, 74%)", marginRight: "auto", marginLeft: "12%" }}>
        {/* Den trasiga sid-ikonen */}
        <motion.svg
          width={presentation ? "96" : "72"}
          height={presentation ? "96" : "72"}
          viewBox="0 0 72 72"
          fill="none"
          initial={presentation ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: "2rem" }}
          aria-hidden
        >
          <path
            d="M14 8h28l16 16v40a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
            stroke="#9aa0a6"
            strokeWidth="3"
            fill="none"
          />
          <path d="M42 8v16h16" stroke="#9aa0a6" strokeWidth="3" fill="none" />
          <path d="M26 40l20 16M46 40L26 56" stroke="#9aa0a6" strokeWidth="3" />
        </motion.svg>

        <motion.h1
          initial={presentation ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          style={{
            fontFamily: SANS,
            fontSize: presentation ? "3.3cqw" : "clamp(1.6rem, 2.3vw, 2.1rem)",
            textTransform: "none",
            fontWeight: 400,
            lineHeight: 1.3,
            color: "#202124",
            margin: "0 0 1.4rem",
            letterSpacing: 0,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h1>

        <motion.p
          initial={presentation ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          style={{
            fontSize: presentation ? "1.85cqw" : "clamp(0.95rem, 1.25vw, 1.15rem)",
            lineHeight: 1.6,
            color: "#5f6368",
            margin: "0 0 0.6rem",
            // Domännamnet kan vara absurt långt — det är hela poängen.
            // overflowWrap ser till att det bryts i stället för att spilla ut.
            overflowWrap: "anywhere",
          }}
        >
          Det gick inte att hitta{" "}
          <span style={{ color: "#202124", fontWeight: 500 }}>
            <EditableText path="domain" value={domain}>
              {domain}
            </EditableText>
          </span>{" "}
          DNS-adress. {status}
        </motion.p>

        <motion.p
          initial={presentation ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{
            fontSize: presentation ? "1.1cqw" : "clamp(0.8rem, 1.05vw, 0.95rem)",
            color: "#5f6368",
            margin: "2.2rem 0 0",
            fontFamily: SANS,
          }}
        >
          <EditableText path="errorCode" value={errorCode}>
            {errorCode}
          </EditableText>
        </motion.p>

        {/* Chromes "Ladda om"-knapp — inaktiv, bara för igenkänningen. */}
        <motion.div
          initial={presentation ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.62 }}
          style={{
            marginTop: "2.4rem",
            display: "inline-block",
            background: "#1a73e8",
            color: "#ffffff",
            fontSize: presentation ? "1.3cqw" : "clamp(0.82rem, 1.05vw, 0.95rem)",
            fontWeight: 500,
            padding: "0.6rem 1.1rem",
            borderRadius: "0.25rem",
          }}
        >
          Ladda om
        </motion.div>
      </div>
    </div>
  );
}
