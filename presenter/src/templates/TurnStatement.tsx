"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TurnStatement — tvåstegs-påstående där VÄNDNINGEN är bilden.
 *
 * En retorisk vändning har tre delar: ett påstående, en logisk koppling och
 * en slutsats. `HookStatement` med `reveal` visar första och tredje delen men
 * lämnar kopplingen osynlig — publiken hör den bara om föreläsaren säger den.
 *
 * Här hänger båda leden på en lodrät accentlinje. Vid klicket **växer linjen
 * nedåt**, kopplingsordet tänds i marginalen och slutsatsen stiger in medan
 * första ledet backar till muted. Rörelsen ÄR argumentet: läsaren följer
 * tanken nedför linjen.
 *
 * ```mdx
 * <TurnStatement chapter="§ Blinkningen" turn="Alltså"
 *   reveal="Det är **kompensatoriskt arbete** att undervisa om AI.">
 * En elev som inte förstår vad AI **är** — är mer utsatt för den.
 * </TurnStatement>
 * ```
 *
 * Första ledet backar med FÄRG, inte opacitet: på ljust tema läser sänkt
 * opacitet som "trasig text", medan muted läser som "avklarad".
 */

interface TurnStatementProps {
  /** Kapitelmarkör uppe till vänster. */
  chapter?: string;
  /** Kopplingsordet i marginalen — "Alltså", "Nu", "För", "Svaret". */
  turn?: string;
  /** Slutsatsen. Stödjer **fet** → accentfärg. */
  reveal: string;
  /** Påståendet. Stödjer **fet** → accentfärg. */
  children: ReactNode;
  accent?: string;
  /** Hold the text on the quiet left side of a photographic background. */
  photoLayout?: boolean;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function renderInline(node: ReactNode, dimmed: boolean): ReactNode {
  if (typeof node !== "string") return node;
  return node.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <span
        key={i}
        style={{
          color: dimmed ? "inherit" : "var(--accent)",
          fontWeight: 700,
          transition: "color 0.6s",
        }}
      >
        {part.slice(2, -2)}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Plockar ut ren text ur MDX-barn så **fet** kan tolkas. */
function toText(rawNode: ReactNode): string {
  // Flight-referens (react.lazy) från server→klient-gränsen måste packas
  // upp först — annars är "props" inte där och texten blir "". Se extract-text.ts.
  const node = unwrapLazy(rawNode);
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { props?: { children?: ReactNode } };
    // <strong> i MDX → återställ till **…** så renderInline kan accentfärga
    const inner = toText(el.props?.children);
    const type = (node as { type?: unknown }).type;
    if (type === "strong") return `**${inner}**`;
    return inner;
  }
  return "";
}

export function TurnStatement({
  chapter,
  turn,
  reveal,
  children,
  accent = "var(--accent)",
  photoLayout = false,
}: TurnStatementProps) {
  const step = useSlideSteps(2);
  const turned = step >= 1;
  const statement = toText(children);
  // Fallback (2026-09-03): vid upprepade besök på samma slide
  // kom MDX-barnen ibland som element utan läsbara props (RSC-lat chunk), så
  // toText gav "" och påståendet försvann helt. Visa då barnen som de är —
  // **fet** blir vanlig <strong> i stället för accentfärg, men texten finns.
  const body: ReactNode = statement ? renderInline(statement, turned) : children;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.2rem)",
            left: "clamp(2.5rem, 6vw, 6rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 3,
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "clamp(3rem, 7vh, 6rem) clamp(2.5rem, 6vw, 6rem)",
        }}
      >
        {/* Rännan: lodrät linje + kopplingsord */}
        <div
          style={{
            position: "relative",
            alignSelf: "stretch",
            width: photoLayout ? "4vw" : "clamp(7rem, 12vw, 13rem)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Linjen — växer nedåt vid vändningen. transformOrigin top gör
              att den läser som att tanken rinner nedåt, inte som att den
              expanderar från mitten. */}
          <motion.div
            aria-hidden
            initial={false}
            animate={{ scaleY: turned ? 1 : 0.42 }}
            transition={{ duration: 0.9, ease: EASE }}
            style={{
              position: "absolute",
              right: 0,
              top: "8%",
              height: "84%",
              width: "2px",
              transformOrigin: "top",
              background: `linear-gradient(180deg, ${withAlpha(accent, 0.85)} 0%, ${withAlpha(accent, 0.15)} 100%)`,
              boxShadow: `0 0 18px ${withAlpha(accent, 0.3)}`,
              borderRadius: "999px",
            }}
          />

          {turn ? (
            <motion.div
              initial={false}
              animate={{
                opacity: turned ? 1 : 0,
                x: turned ? 0 : -10,
              }}
              transition={{ duration: 0.7, delay: turned ? 0.35 : 0, ease: EASE }}
              style={{
                position: "absolute",
                right: "clamp(1rem, 1.8vw, 1.8rem)",
                top: "50%",
                transform: "translateY(-50%)",
                textAlign: "right",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.95rem, 1.45vw, 1.6rem)",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: accent,
                whiteSpace: "nowrap",
              }}
            >
              <EditableText path="turn" value={turn}>
                {turn}
              </EditableText>
            </motion.div>
          ) : null}
        </div>

        {/* Leden */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingLeft: photoLayout ? "2vw" : "clamp(2rem, 4vw, 4rem)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.6rem, 4vh, 3rem)",
            // Procent, aldrig em. Kolumnen ärver rotens 16 px, så "26em" blev
            // 416 px — en tredjedel av ytan — och pressade displaytexten till
            // en smal remsa. Procent räknas mot flex-containerns innerbredd
            // och ger ~30 tecken per rad, vilket är rätt mått för den här graden.
            maxWidth: photoLayout ? "53%" : "62%",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{
              opacity: 1,
              y: 0,
              color: turned ? "var(--text-muted)" : "var(--text)",
            }}
            transition={{ duration: 0.8, ease: EASE }}
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: turned
                ? "clamp(1.5rem, 2.6vw, 2.4rem)"
                : "clamp(2rem, 3.6vw, 3.4rem)",
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
              transition: "font-size 0.7s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <EditableText path="content" block value={statement}>
              {body}
            </EditableText>
          </motion.div>

          {turned ? (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.2, ease: EASE }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "clamp(2rem, 3.6vw, 3.4rem)",
                lineHeight: 1.18,
                letterSpacing: "-0.02em",
                color: "var(--text)",
              }}
            >
              <EditableText path="reveal" value={reveal}>
                {renderInline(reveal, false)}
              </EditableText>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
