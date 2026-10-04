"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";
import { useSlideNotes } from "@/lib/slide-notes";

/**
 * Utkast — planeringslagret, mellan kartan och det byggda decket.
 *
 * ⚠️ UNDANTAG FRÅN DESIGN.md. Detta är den enda templaten i katalogen som
 * medvetet INTE är byggd för att visas för en publik. Den är ett arbetsverktyg,
 * och den ska se ut som ett arbetsverktyg: ritningsestetik, streckad ram,
 * monospace-etiketter. Det är ett designbeslut, inte slarv — ett utkast som
 * kan förväxlas med en färdig slide är farligt, för då hamnar det på duken.
 *
 * Poängen med att göra planeringen till en TEMPLATE i stället för en separat
 * fil är att utkastet bor i samma .mdx som det färdiga decket. Parser, editor,
 * storyboard, inline-redigering, sparning, revisioner och cuts fungerar direkt.
 * Framför allt finns det aldrig två sanningar som kan glida isär.
 *
 * Arbetsgången: skriv hela decket som `<Utkast>`, läs igenom det i manusläget,
 * redigera formuleringarna, och konvertera sedan en slide i taget till riktig
 * template. Räknaren i manusläget visar hur många utkast som återstår.
 *
 * ```mdx
 * <Utkast
 *   syfte="Visa att spannet glider från vardag till relation"
 *   mall="StatsTriptych"
 *   tid="2 min"
 *   visuell="Staplar som sjunker, understa glöder i accent"
 *   kalla="Mediemyndigheten 2026, n=1745"
 * >
 * 52 % råd om vardagsproblem. 24 % hur de mår. **15 % som sällskap.**
 * </Utkast>
 *
 * <Notes>
 * Det som ska SÄGAS. Läggs i <Notes> efter sluttaggen, aldrig som en
 * {/* MANUS: *\/}-kommentar inuti utkastet — kommentarer inne i children
 * strippas inte av parsern och hamnar då i texten på duken.
 * </Notes>
 * ```
 *
 * Manuset renderas som eget block på utkastsliden (via `useSlideNotes`), så att
 * en genomklickning i presentationsläget visar text och manus samtidigt.
 *
 * Sätt `mall="NY: Namn"` för en template som inte finns än. Manusläget samlar
 * alla sådana i en lista överst, så att templatediskussionen får en egen plats.
 */

interface UtkastProps {
  /** Vad sliden gör i bågen. En rad. */
  syfte?: string;
  /** Planerad template. Prefixa med `NY:` för en som ska byggas. */
  mall?: string;
  /** Uppskattad tid, t.ex. "90 sek" eller "2 min". */
  tid?: string;
  /** Hur den ska se ut — visuell intention, rörelse, vad kod-fördelen är. */
  visuell?: string;
  /** Källa som ska stå på sliden eller i Notes. */
  kalla?: string;
  /**
   * Instruktion till Claude för nästa byggpass — det enda fältet som är en
   * uppmaning och inte en beskrivning. Ligger som prop och inte som sidecar-tagg,
   * så att den följer med sliden när utkastet konverteras till riktig template
   * och fortfarande finns kvar där när instruktionen ska utföras.
   */
  claude?: string;
  /**
   * Media som övervägs för sliden, på en rad:
   * `url :: hur den ska användas ;; url2 :: hur2`.
   * Redigeras enklast i manusläget, där länkar kan dras och klistras in.
   */
  media?: string;
  /** Orden som faktiskt ska stå på sliden. Stödjer **fet**. */
  children?: ReactNode;
  accent?: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** MDX-barn → ren text, med <strong> återställd till **…**. */
function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (typeof node === "object" && "props" in (node as object)) {
    const el = node as { props?: { children?: ReactNode } };
    const inner = toText(el.props?.children);
    return (node as { type?: unknown }).type === "strong" ? `**${inner}**` : inner;
  }
  return "";
}

/** Etikett i versal monospace — ritningens fältnamn. */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(0.58rem, 0.72vw, 0.72rem)",
        letterSpacing: "0.26em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        opacity: 0.75,
      }}
    >
      {children}
    </span>
  );
}

export function Utkast({
  syfte,
  mall,
  tid,
  visuell,
  kalla,
  media,
  claude,
  children,
  accent = "var(--accent)",
}: UtkastProps) {
  const text = toText(children).trim();
  const manus = (useSlideNotes() ?? "").trim();
  const mediaEntries = (media ?? "")
    .split(";;")
    .map((chunk) => {
      const [url, ...rest] = chunk.split("::");
      return { url: (url ?? "").trim(), hur: rest.join("::").trim() };
    })
    .filter((entry) => entry.url || entry.hur);
  const isNewTemplate = Boolean(mall && /^ny\s*:/i.test(mall.trim()));
  const templateLabel = isNewTemplate
    ? mall!.trim().replace(/^ny\s*:\s*/i, "")
    : mall?.trim();

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {/* Rutnätspapper — signalerar ritning, inte färdig slide. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${withAlpha(
            "var(--text-muted)",
            0.05,
          )} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(
            "var(--text-muted)",
            0.05,
          )} 1px, transparent 1px)`,
          backgroundSize: "2.5rem 2.5rem",
          opacity: 0.6,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1rem, 2.2vh, 1.6rem)",
          padding: "clamp(2.2rem, 5vh, 3.6rem) clamp(2.5rem, 6vw, 5rem)",
          zIndex: 2,
        }}
      >
        {/* Ritningshuvud — UTKAST-stämpel, mall, tid */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(0.7rem, 1.4vw, 1.2rem)",
            flexWrap: "wrap",
            paddingBottom: "clamp(0.7rem, 1.4vh, 1rem)",
            borderBottom: `1px dashed ${withAlpha("var(--text-muted)", 0.35)}`,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.6rem, 0.78vw, 0.76rem)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "var(--bg)",
              background: accent,
              padding: "0.32em 0.7em",
              borderRadius: "2px",
              fontWeight: 700,
            }}
          >
            Utkast
          </span>

          {templateLabel ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.8vw, 0.8rem)",
                letterSpacing: "0.1em",
                color: isNewTemplate ? accent : "var(--text-muted)",
                border: `1px ${isNewTemplate ? "solid" : "dashed"} ${withAlpha(
                  isNewTemplate ? accent : "var(--text-muted)",
                  isNewTemplate ? 0.7 : 0.4,
                )}`,
                padding: "0.3em 0.65em",
                borderRadius: "2px",
              }}
            >
              <EditableText path="mall" value={mall}>
                {isNewTemplate ? `NY TEMPLATE · ${templateLabel}` : templateLabel}
              </EditableText>
            </span>
          ) : null}

          {tid ? (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.62rem, 0.8vw, 0.8rem)",
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              <EditableText path="tid" value={tid}>
                {tid}
              </EditableText>
            </span>
          ) : null}
        </div>

        {/* Syftet — vad sliden gör i bågen */}
        {syfte ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <FieldLabel>Syfte</FieldLabel>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.9rem, 1.15vw, 1.1rem)",
                lineHeight: 1.45,
                color: "var(--text-muted)",
              }}
            >
              <EditableText path="syfte" value={syfte}>
                {syfte}
              </EditableText>
            </div>
          </div>
        ) : null}

        {/* Texten — det som faktiskt ska stå på sliden. Störst, för det är
            det Joel redigerar mest. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            flex: 1,
            minHeight: 0,
          }}
        >
          <FieldLabel>Text på sliden</FieldLabel>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "clamp(1.4rem, 2.6vw, 2.4rem)",
              lineHeight: 1.22,
              letterSpacing: "-0.015em",
              color: "var(--text)",
              overflowY: "auto",
            }}
          >
            <EditableText
              path="content"
              block
              value={text}
              placeholder="Vad ska stå på sliden?"
            >
              {text ? renderInline(text) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  Ingen text skriven än
                </span>
              )}
            </EditableText>
          </div>
        </div>

        {/* Manuset — det som SÄGS, inte det som står på duken. Kommer från
            <Notes> via kontext, inte från en prop, så att det följer med när
            sliden konverteras till en riktig template.

            Kursivt, mindre och indraget bakom en linje: skillnaden mot
            slidetexten ovanför ska gå att se på en halv sekund, annars är det
            ingen hjälp när man klickar igenom passet. Taket är satt så att
            ett långt manus scrollar i stället för att tränga undan texten. */}
        {manus ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              flex: "0 1 auto",
              minHeight: 0,
              maxHeight: "34%",
            }}
          >
            <FieldLabel>Manus</FieldLabel>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "clamp(0.78rem, 0.98vw, 0.96rem)",
                lineHeight: 1.5,
                color: "var(--text-muted)",
                whiteSpace: "pre-line",
                borderLeft: `2px solid ${withAlpha("var(--text-muted)", 0.3)}`,
                paddingLeft: "clamp(0.6rem, 1vw, 0.9rem)",
                overflowY: "auto",
              }}
            >
              {manus}
            </div>
          </div>
        ) : null}

        {/* Till Claude — en obesvarad instruktion, inte en beskrivning.
            Accentram och egen etikett, för när man klickar igenom passet ska
            det synas direkt vilka slides som har ett öppet ärende. */}
        {claude ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              flex: "0 0 auto",
              border: `1px solid ${withAlpha(accent, 0.5)}`,
              borderRadius: "3px",
              padding: "clamp(0.5rem, 1.1vh, 0.8rem) clamp(0.7rem, 1.2vw, 1rem)",
            }}
          >
            <FieldLabel>Till Claude/Codex</FieldLabel>
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "clamp(0.82rem, 1vw, 0.98rem)",
                lineHeight: 1.45,
                color: accent,
              }}
            >
              <EditableText path="claude" value={claude} multiline>
                {claude}
              </EditableText>
            </div>
          </div>
        ) : null}

        {/* Media som övervägs — url plus HUR den ska användas */}
        {mediaEntries.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <FieldLabel>Media</FieldLabel>
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {mediaEntries.map((entry, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.6rem",
                    alignItems: "baseline",
                    fontSize: "clamp(0.72rem, 0.9vw, 0.88rem)",
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: accent,
                      flexShrink: 0,
                      maxWidth: "42%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ◆ {entry.url || "(ingen url)"}
                  </span>
                  {entry.hur ? (
                    <span style={{ color: "var(--text-muted)" }}>{entry.hur}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Visuell intention + källa — foten på ritningen */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: kalla ? "1fr auto" : "1fr",
            gap: "clamp(0.8rem, 2vw, 2rem)",
            alignItems: "end",
            paddingTop: "clamp(0.7rem, 1.4vh, 1rem)",
            borderTop: `1px dashed ${withAlpha("var(--text-muted)", 0.35)}`,
          }}
        >
          {visuell ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <FieldLabel>Visuellt</FieldLabel>
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.82rem, 1vw, 0.98rem)",
                  lineHeight: 1.45,
                  color: "var(--text-muted)",
                }}
              >
                <EditableText path="visuell" value={visuell} multiline>
                  {visuell}
                </EditableText>
              </div>
            </div>
          ) : (
            <span />
          )}

          {kalla ? (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.6rem, 0.76vw, 0.74rem)",
                color: "var(--text-muted)",
                opacity: 0.8,
                textAlign: "right",
                maxWidth: "22rem",
              }}
            >
              <EditableText path="kalla" value={kalla}>
                {kalla}
              </EditableText>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
