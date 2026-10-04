"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * CenterStage ★ — en fråga i taget, mitt på scenen, som sedan reser till sin
 * plats i formationen.
 *
 * Varje påstående kommer först ensamt och stort. När nästa kommer krymper det
 * förra och flyttar till sitt fält — samma element, animerat hela vägen, så
 * publiken SER samlingen byggas i stället för att den bara dyker upp. På
 * sista steget står alla fyra på plats med ramen i mitten.
 *
 * Byggd för de fyra designfrågorna, som är förhållningssättet publiken ska ta
 * med sig hem. De tål inte att renderas som en punktlista: varje fråga behöver
 * ett eget ögonblick, och sedan behöver de ses tillsammans.
 *
 * Ordet inom ** i varje rad får accentfärg och tyngd — det är det ordet frågan
 * hänger på.
 *
 * MDX-format — ett påstående per rad:
 * ```mdx
 * <CenterStage chapter="§ Designfrågorna" prefix="Då blir frågorna:">
 * - Vad ska AI **avlasta**?
 * - Vad ska AI **utmana**?
 * - Vad ska eleven **bära själv**?
 * - När ska AI **inte** in alls?
 * </CenterStage>
 * ```
 */

interface CenterStageProps {
  chapter?: string;
  /** Ramen som sätter frågorna. Står uppe under uppbyggnaden. */
  prefix?: string;
  /** Rad som visas i mitten när alla står på plats. Stödjer **fetstil**. */
  center?: string;
  accent?: string;
  children?: ReactNode;
}

/** Behåller **fetstil** som markdown så accentordet går att plocka ut. */
function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
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

function parseItems(children: ReactNode): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim();
    if (t) out.push(t);
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

/** Delar texten i segment så det fetade ordet kan bära accenten. */
function segments(text: string): Array<{ t: string; strong: boolean }> {
  const out: Array<{ t: string; strong: boolean }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), strong: false });
    out.push({ t: m[1], strong: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), strong: false });
  return out;
}

function Statement({
  text,
  accent,
  big,
}: {
  text: string;
  accent: string;
  big: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: "var(--heading-weight)",
        fontSize: big ? "clamp(2.6rem, 6.2vw, 6.2rem)" : "clamp(1.05rem, 1.85vw, 1.75rem)",
        lineHeight: big ? 1.02 : 1.25,
        letterSpacing: big ? "-0.03em" : "-0.01em",
        color: "var(--text)",
        display: "block",
      }}
    >
      {segments(text).map((s, i) =>
        s.strong ? (
          <span key={i} style={{ color: accent, fontWeight: 800 }}>
            {s.t}
          </span>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </span>
  );
}

function ordinal(i: number): string {
  return String(i + 1).padStart(2, "0");
}

export function CenterStage({
  chapter,
  prefix,
  center,
  accent = "var(--accent)",
  children,
}: CenterStageProps) {
  const items = parseItems(children);
  // Ett steg per påstående, plus ett sista där alla står tillsammans.
  const step = useSlideSteps(items.length + 1);
  const assembled = step >= items.length;

  if (items.length === 0) return null;

  const cols = 2;
  const col = (i: number) => i % cols;
  const row = (i: number) => Math.floor(i / cols);

  // Ljuset ligger där frågan ska landa — en förvarning om vart den är på väg.
  const glowX = assembled ? 50 : col(step) === 0 ? 27 : 73;
  const glowY = assembled ? 56 : row(step) === 0 ? 40 : 74;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      <motion.div
        aria-hidden
        animate={{
          background: `radial-gradient(46% 52% at ${glowX}% ${glowY}%, ${withAlpha(accent, 0.16)} 0%, transparent 68%)`,
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "clamp(2rem, 4vh, 3.2rem) clamp(2.5rem, 5vw, 5rem)",
        }}
      >
        {chapter ? (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.7rem, 0.92vw, 0.92rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            <EditableText path="chapter" value={chapter}>
              {chapter}
            </EditableText>
          </div>
        ) : null}

        {prefix ? (
          <motion.p
            animate={{ opacity: assembled ? 0.45 : 1 }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(1rem, 1.42vw, 1.32rem)",
              lineHeight: 1.35,
              color: "var(--text-muted)",
              margin: "clamp(0.5rem, 1.2vh, 0.9rem) 0 0",
              maxWidth: "46ch",
            }}
          >
            <EditableText path="prefix" value={prefix}>
              {prefix}
            </EditableText>
          </motion.p>
        ) : null}

        {/* Formationen. Varje fråga har sitt fält och hamnar där till slut.
            Medan en fråga har scenen ligger de redan landade dämpade — de ska
            anas, inte konkurrera. På sista steget tänds allt. */}
        <motion.div
          animate={{ opacity: assembled ? 1 : 0.16 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            flex: 1,
            marginTop: "clamp(0.8rem, 2vh, 1.6rem)",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(items.length / cols)}, 1fr)`,
            columnGap: "clamp(3rem, 12vw, 12rem)",
            rowGap: "clamp(1rem, 2.4vh, 2rem)",
          }}
        >
          {/* Korset mellan fälten — dras fram i takt med att de fylls */}
          <motion.div
            aria-hidden
            initial={false}
            animate={{ opacity: step > 0 ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={false}
              animate={{ scaleX: step >= 2 ? 1 : 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: "1px",
                background: withAlpha(accent, 0.3),
                transformOrigin: "center",
              }}
            />
            <motion.div
              initial={false}
              animate={{ scaleY: step >= 1 ? 1 : 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                width: "1px",
                background: withAlpha(accent, 0.3),
                transformOrigin: "center",
              }}
            />
          </motion.div>

          {items.map((text, i) => {
            const settled = i < step;
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "clamp(0.4rem, 1vh, 0.7rem)",
                  // Fälten hugger yttermarginalerna och lämnar en fri kanal i
                  // mitten. Annars lade sig centerscenens stora text rakt över
                  // de landade frågorna — vänsterställda kolumner började
                  // precis vid mittlinjen.
                  alignItems: col(i) === 0 ? "flex-start" : "flex-end",
                  textAlign: col(i) === 0 ? "left" : "right",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(0.6rem, 0.8vw, 0.78rem)",
                    letterSpacing: "0.28em",
                    color: settled ? accent : "var(--text-muted)",
                    opacity: settled ? 1 : 0.35,
                    transition: "opacity 400ms ease, color 400ms ease",
                  }}
                >
                  {ordinal(i)}
                </div>

                {settled ? (
                  <motion.div layoutId={`centerstage-${i}`} layout>
                    <Statement text={text} accent={accent} big={false} />
                  </motion.div>
                ) : (
                  // Tomma fält syns svagt, så publiken vet att det kommer fler.
                  <div
                    aria-hidden
                    style={{
                      height: "2px",
                      width: "clamp(2rem, 5vw, 4rem)",
                      background: "var(--text-muted)",
                      opacity: 0.18,
                    }}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Ramen i mitten när allt står på plats */}
        {center && assembled ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 3,
              padding: "clamp(0.5rem, 1.2vh, 0.9rem) clamp(1rem, 2.4vw, 2rem)",
              borderRadius: "999px",
              background: "var(--bg)",
              border: `1px solid ${withAlpha(accent, 0.4)}`,
              boxShadow: `0 12px 40px -18px ${withAlpha(accent, 0.6)}`,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(0.95rem, 1.5vw, 1.45rem)",
              color: "var(--text)",
              whiteSpace: "nowrap",
            }}
            dangerouslySetInnerHTML={{
              __html: center.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        ) : null}
      </div>

      {/*
        Centerscenen. INGEN AnimatePresence här med flit: under en exit skulle
        samma layoutId finnas både i overlayen och i fältet, och då tappar
        Framer Motion kopplingen och elementet hoppar i stället för att resa.
        Wrappern står kvar; det är barnet som byts, och det är just bytet som
        gör att frågan flyttar sig från mitten till sitt fält.

        Ingen täckande bakgrund heller — formationen ska anas bakom, annars
        ser man aldrig samlingen byggas.
      */}
      {!assembled ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(1.5rem, 4vw, 4rem)",
            pointerEvents: "none",
          }}
        >
          <motion.div
            layoutId={`centerstage-${step}`}
            layout
            initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            // Bredden i px, inte ch. ch räknas mot elementets EGEN font-size,
            // och den stora typgraden sitter på span:en inuti — 18ch löste
            // därför ut mot 16 px och pressade frågan till en avlång remsa.
            // Bred nog att rymma den längsta frågan på EN rad. Två rader hade
            // ätit upp luften mot den övre fältraden.
            style={{ width: "min(92vw, 70rem)", textAlign: "center" }}
          >
            <Statement text={items[step]} accent={accent} big />
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
