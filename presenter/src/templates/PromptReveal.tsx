"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { glassCardStyle, AmbientBackdrop } from "./_decorations/GlassDecorations";

/**
 * PromptReveal ★ — elevsvaret krymper, prompten glider in under.
 *
 * Avslöjandet i öppningsakten: den starka elevprodukten visar sig vila på
 * en enda mening. Tre steg:
 *
 *   0 · Elevsvaret fyller ytan som ett dokument (samma kort som `still`-sliden före).
 *   1 · Dokumentet krymper och glider upp. En chattbubbla glider in under
 *       och prompten SKRIVS ut tecken för tecken.
 *   2 · En tunn linje TECKNAS från prompten till produkten, och fotnoten
 *       landar. Så lite → så mycket.
 *
 * Med `still` fryses mallen på steg 0 — dokumentet ensamt, ingen prompt,
 * ingen linje, inget klick. För uppsättningssliden före avtäckningen.
 *
 * ```mdx
 * <PromptReveal
 *   kicker="Samma inlämning"
 *   answer="De viktigaste orsakerna var statens ekonomiska kris, de stora skillnaderna mellan stånden och upplysningens idéer. Den ekonomiska krisen var särskilt viktig eftersom…"
 *   prompt="Gör uppgiften åt mig. Skriv som en elev i åk 8."
 *   promptLabel="Prompten"
 *   footnote="Fiktivt exempel."
 * />
 * ```
 */

interface PromptRevealProps {
  kicker?: string;
  /** Dokumentets rubrikrad, t.ex. "Inlämning · Historia". */
  answerTag?: string;
  /** Elevsvaret. Klipps med fade i botten — det får gärna vara långt. */
  answer: string;
  promptLabel?: string;
  /** Prompten som typas fram i bubblan. Krävs inte när `still`. */
  prompt?: string;
  footnote?: string;
  /** Fryser mallen på steg 0 — dokumentet ensamt, ingen prompt, ingen linje.
      För uppsättningssliden före den riktiga avtäckningen. */
  still?: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function PromptReveal({
  kicker,
  answerTag = "Inlämning",
  answer,
  promptLabel = "Det eleven skrev",
  prompt,
  footnote,
  still,
}: PromptRevealProps) {
  const step = useSlideSteps(still ? 0 : 3);
  const revealed = !still && step >= 1;
  const linked = !still && step >= 2;

  const promptChars = Array.from(prompt ?? "");

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
          gap: "clamp(1rem, 2.4vh, 1.8rem)",
          padding: "clamp(2rem, 4vh, 3rem) clamp(2.5rem, 5vw, 5rem)",
        }}
      >
        {kicker ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
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
          </motion.div>
        ) : null}

        {/* ─── Dokumentet — elevsvaret. Krympningen är CSS-driven. ─── */}
        <div
          style={{
            ...glassCardStyle({ padding: "clamp(1.5rem, 2.6vh, 2.2rem) clamp(1.7rem, 2.6vw, 2.4rem)" }),
            width: "min(78ch, 88%)",
            transformOrigin: "top center",
            transform: revealed ? "scale(0.68)" : "scale(1)",
            opacity: revealed ? 0.82 : 1,
            transition:
              "transform 0.8s cubic-bezier(0.22,1,0.36,1), opacity 0.8s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
              marginBottom: "1rem",
            }}
          >
            <span
              aria-hidden
              style={{
                width: "0.55rem",
                height: "0.55rem",
                borderRadius: "50%",
                background: "var(--accent-bright, var(--accent))",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.78vw, 0.78rem)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {answerTag}
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: revealed ? "clamp(0.9rem, 1.35vw, 1.3rem)" : "clamp(1.05rem, 1.7vw, 1.6rem)",
              lineHeight: 1.62,
              color: "var(--text)",
              maxHeight: revealed ? "9.2em" : "12.5em",
              overflow: "hidden",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 62%, transparent 97%)",
              maskImage: "linear-gradient(to bottom, black 62%, transparent 97%)",
              transition: "font-size 0.8s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <EditableText path="answer" value={answer}>
              {answer}
            </EditableText>
          </div>
        </div>

        {/* ─── Linjen — tecknas från prompt till produkt.
            Ren CSS: pathLength-normaliserad dashoffset som transitionar,
            så tecknandet överlever frusna rAF-bildrutor. ─── */}
        <div
          aria-hidden
          style={{
            height: "clamp(2.2rem, 5vh, 3.6rem)",
            marginTop: "-0.4rem",
            marginBottom: "-0.4rem",
            opacity: revealed ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <svg width="40" height="100%" viewBox="0 0 40 64" fill="none" preserveAspectRatio="none">
            <path
              d="M20 62 C 20 40, 20 24, 20 2"
              pathLength={1}
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: linked ? 0 : 1,
                opacity: linked ? 1 : 0,
                transition:
                  "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease",
              }}
            />
            <path
              d="M14 10 L20 2 L26 10"
              stroke="var(--accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                opacity: linked ? 1 : 0,
                transition: "opacity 0.4s ease 0.75s",
              }}
            />
          </svg>
        </div>

        {/* ─── Prompten — en enda bubbla ───
            Opaciteten går via CSS-transition, inte Framer: skrivs målvärdet
            direkt i stilen syns bubblan även om rAF-bildrutor uteblivit
            (jfr CarryAxis-kommentaren om exakt det här felläget). */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.8rem",
            width: "min(56ch, 82%)",
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0) scale(1)" : "translateY(34px) scale(0.94)",
            transition:
              "opacity 0.75s cubic-bezier(0.22,1,0.36,1) 0.35s, transform 0.75s cubic-bezier(0.22,1,0.36,1) 0.35s",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.62rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--accent-ink, var(--accent))",
            }}
          >
            {promptLabel}
          </div>
          <div
            style={{
              ...glassCardStyle({
                padding: "clamp(0.9rem, 1.8vh, 1.3rem) clamp(1.3rem, 2.2vw, 2rem)",
                radius: "1.4rem",
              }),
              // Svanshörnet följer temats radie: 0.35rem på glasteman, 0 där
              // --glass-radius är nollad (kobolt) så bubblan förblir fyrkantig.
              borderBottomLeftRadius: "var(--glass-radius, 0.35rem)",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                fontSize: "clamp(1.25rem, 2.5vw, 2.35rem)",
                lineHeight: 1.3,
                color: "var(--text)",
                fontStyle: "italic",
              }}
            >
              {promptChars.map((ch, i) => (
                <span
                  key={i}
                  style={{
                    opacity: revealed ? 1 : 0,
                    transition: revealed
                      ? `opacity 0.04s linear ${0.55 + i * 0.028}s`
                      : "opacity 0.1s linear",
                  }}
                >
                  {ch}
                </span>
              ))}
              <motion.span
                aria-hidden
                initial={false}
                animate={revealed && !linked ? { opacity: [0, 1, 0] } : { opacity: 0 }}
                transition={{
                  duration: 0.9,
                  repeat: revealed && !linked ? Infinity : 0,
                  delay: revealed ? 0.55 + promptChars.length * 0.028 : 0,
                }}
                style={{
                  display: "inline-block",
                  width: "2px",
                  height: "1em",
                  marginLeft: "2px",
                  verticalAlign: "-0.12em",
                  background: "var(--accent)",
                }}
              />
            </div>
          </div>
        </div>

        {footnote ? (
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.7rem, 0.9vw, 0.9rem)",
              color: "var(--text-muted)",
              opacity: linked ? 1 : 0,
              transform: linked ? "translateY(0)" : "translateY(8px)",
              transition:
                "opacity 0.6s cubic-bezier(0.22,1,0.36,1) 0.5s, transform 0.6s cubic-bezier(0.22,1,0.36,1) 0.5s",
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
