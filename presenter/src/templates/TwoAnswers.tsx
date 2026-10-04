"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { extractText, unwrapLazy } from "@/lib/extract-text";

/**
 * TwoAnswers ★ — samma prompt, två modeller, olika svar (2026-09-04).
 *
 * Byggd för akt 3 "Medhåll" i elevhälsopasset: en desperat prompt möter ett
 * översvallande medhåll från en modell och ett vänligt men bestämt motstånd
 * från en annan. Poängen är att rummet ska hinna reagera på *frågan* innan
 * något svar syns, och sedan känna skillnaden själv innan Joel förklarar den.
 *
 * **Prompten är ankaret.** Den föds som affisch och dör som bildtext, men
 * lämnar aldrig 5vw-ryggraden och försvinner aldrig. Den flyttas aldrig med
 * `transform` eller `scale` — den typograferas om.
 *
 * **Panelerna etableras en gång och rör sig sedan aldrig.** Båda ramarna
 * kommer på plats samtidigt i klick 2 — den vänstra fylld, den högra som
 * spöke med sitt appnamn i. Klick 3 *tänder* höger; det är ingen entré. Då
 * kan salen jämföra något rörligt mot något redan läst och stilla.
 *
 * **Ordningen är innehållslig:** vänster = det översvallande svaret, som ska
 * mötas innan publiken hunnit tänka efter. Vänd inte på det.
 *
 * Tre typografiska nivåer, tre publiker — svaren kan aldrig läsas av hela
 * salen, och det är premissen, inte en bugg:
 *
 *   A (1,9–4,2vw)  hela salen      prompten, appnamnen, titeln, slutraden
 *   B (~1vw mono)  mittenraderna   omdömena + `**fetade**` fraser i svaren
 *   C (0,85–1,45vw) främre raderna själva svaren
 *
 * Nivå B är designens nyckel: 3–5 markerade fraser per panel bildar en
 * ryggrad som mittenraderna skummar medan Joel läser resten högt.
 *
 * Raderna skrivs som en punktlista med prefix `L ` eller `R `. Rader utan
 * prefix hamnar till vänster. `**fet**` blir markerad fras.
 *
 * ```mdx
 * <TwoAnswers
 *   kicker="§ 04 · Medhåll"
 *   chapter="Fiktiv prompt · riktiga svar"
 *   title="Samma fråga. Två svar."
 *   promptLabel="Prompten"
 *   prompt="Jag har länge velat flytta till Norrland …"
 *   leftApp="Grok" leftCaption="4 september 2026"
 *   leftVerdict="Peppar. Ger en plan." leftMore="[Svaret fortsätter]"
 *   rightApp="ChatGPT" rightCaption="4 september 2026"
 *   rightVerdict="Vägrar. Frågar varför."
 *   bottomLine="Samma fråga. Skillnaden ligger i vad svaret gör med nästa steg."
 *   register="kobalt"
 * >
 * - L Hej! Wow, vilken **eld i blicken** du har — drömmen om Norrlands vidder!
 * - L Steg 1: Reflektera och kicka igång separationen. Prata öppet, sök gratis stöd.
 * - R Jag förstår att du längtar, men jag måste vara ärlig: **planen oroar mig**.
 * - R Kanske är det inte vildmarken du behöver. Vad händer i ditt liv just nu?
 * </TwoAnswers>
 * ```
 *
 * **Steg:** 0) prompten ensam och stor · 1) vänstra svaret, prompten krymper
 * till bildtext, högra panelen står som spöke · 2) högra panelen tänds ·
 * 3) omdömena i panelheadrarna + slutraden, prompten sjunker undan.
 *
 * Villkorliga lager äter sina steg: utan prompt börjar sliden på vänstra
 * svaret, utan högersida försvinner klick 3, utan omdömen/slutrad klick 4.
 */

interface TwoAnswersProps {
  kicker?: string;
  /** Mono-rad uppe till höger. */
  chapter?: string;
  title?: string;
  /** Etikett över prompten. Default "Prompten". */
  promptLabel?: string;
  prompt?: string;
  leftApp?: string;
  leftCaption?: string;
  /** Domen, i panelheadern bredvid appnamnet. Faller i sista klicket. */
  leftVerdict?: string;
  /** Mono-rad längst ned i vänster panel — gör avklippningen explicit. */
  leftMore?: string;
  rightApp?: string;
  rightCaption?: string;
  rightVerdict?: string;
  rightMore?: string;
  bottomLine?: string;
  children?: ReactNode;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Durationer och fördröjningar går via rotens variabler, så att
 *  prefers-reduced-motion kan nolla dem utan hooks (funkar i SSR och PDF). */
const dur = (s: number) => `calc(var(--ta-dur, 1) * ${s}s)`;
const lag = (s: number) => `calc(var(--ta-lag, 1) * ${s}s)`;

const mono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  fontWeight: 600,
};

/** Masken är färgoberoende — ett gradientöverlägg i `--bg` skulle synas som
 *  en fyrkant på `natt` och `glod`, där bakgrunden är en radial. */
const FADE = "linear-gradient(to bottom, #000 94%, transparent 100%)";

type Answers = { left: string[]; right: string[] };

const PREFIX = /^([LR])\s+([\s\S]*)$/;

function parseLines(children: ReactNode): Answers {
  const left: string[] = [];
  const right: string[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const m = PREFIX.exec(t);
    if (m) (m[1] === "R" ? right : left).push(m[2].trim());
    else left.push(t); // utan prefix → vänster
  };
  const walk = (node: ReactNode) => {
    const n = unwrapLazy(node);
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const el = n as ReactElement<{ children?: ReactNode }>;
    // extractText går transparent genom loose lists (li > p) och behåller **fet**.
    if (el.type === "li") return add(extractText(el.props.children));
    Children.forEach(el.props.children, walk);
  };
  walk(children);
  return { left, right };
}

/**
 * Fetstil som markeringspenna, inte som accentfärgad text. Husets vanliga
 * `color: var(--accent)`-idiom är oläsligt i kobalt — accenten är `#0f0f0e`
 * mot `#1533ff`, kontrastkvot ~2,4:1. Markeringen fungerar i alla fjorton
 * register (accent 22 % är en synlig ton oavsett om accenten är svart, gul
 * eller röd) och texten behåller full `--text`-kontrast.
 */
function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong
        key={i}
        style={{
          fontWeight: 700,
          color: "var(--text)",
          background: "color-mix(in srgb, var(--accent) 22%, transparent)",
          padding: "0 0.18em",
          // Ingen borderRadius → inget för brutalistkontraktet att platta ut.
        }}
      >
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/** Prompten i affischläge. Ingen `--display-scale`-multiplikator — betongs
 *  1,35 spränger en 300-teckensprompt. */
function promptScale(len: number): { fontSize: string; lineHeight: number } {
  if (len <= 110) return { fontSize: "clamp(2rem, 4.2vw, 4.6rem)", lineHeight: 1.12 };
  if (len <= 200) return { fontSize: "clamp(1.7rem, 3.4vw, 3.7rem)", lineHeight: 1.16 };
  if (len <= 320) return { fontSize: "clamp(1.45rem, 2.8vw, 3rem)", lineHeight: 1.2 };
  if (len <= 460) return { fontSize: "clamp(1.25rem, 2.3vw, 2.5rem)", lineHeight: 1.26 };
  return { fontSize: "clamp(1.05rem, 1.9vw, 2.05rem)", lineHeight: 1.3 };
}

/** En radbrytning kostar ungefär 45 teckens vertikalbudget. */
function mass(lines: string[]): number {
  return lines.reduce((n, l) => n + l.length + 45, 0);
}

/**
 * Svarens typgrad. **Identisk i båda panelerna**, härledd ur det längsta
 * svaret. Skalar man varje panel efter sitt eget innehåll blir det korta
 * svaret automatiskt större och läses som "det rätta" — det ser ut som en
 * förbättring, men är en värdering förklädd till typografi. Rör inte.
 */
function answerScale(m: number, roomFactor: number): { fontSize: string; lineHeight: number } {
  const f = roomFactor;
  if (m <= 420 * f) return { fontSize: "clamp(0.95rem, 1.45vw, 1.5rem)", lineHeight: 1.5 };
  if (m <= 620 * f) return { fontSize: "clamp(0.88rem, 1.25vw, 1.3rem)", lineHeight: 1.48 };
  if (m <= 860 * f) return { fontSize: "clamp(0.82rem, 1.08vw, 1.14rem)", lineHeight: 1.46 };
  if (m <= 1150 * f) return { fontSize: "clamp(0.76rem, 0.95vw, 1rem)", lineHeight: 1.43 };
  return { fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)", lineHeight: 1.4 };
}

export function TwoAnswers({
  kicker,
  chapter,
  title,
  promptLabel = "Prompten",
  prompt,
  leftApp,
  leftCaption,
  leftVerdict,
  leftMore,
  rightApp,
  rightCaption,
  rightVerdict,
  rightMore,
  bottomLine,
  children,
}: TwoAnswersProps) {
  const { left, right } = parseLines(children);

  const hasPrompt = !!prompt?.trim();
  const hasRight = right.length > 0 || !!rightApp;
  const hasJudge = !!(leftVerdict || rightVerdict || bottomLine);

  // Varje villkorligt lager äter sitt eget steg — namngivna konstanter i
  // stället för inline-aritmetik utspridd i JSX.
  const S_LEFT = hasPrompt ? 1 : 0;
  const S_RIGHT = hasRight ? S_LEFT + 1 : -1;
  const S_JUDGE = hasJudge ? (hasRight ? S_RIGHT : S_LEFT) + 1 : -1;

  const step = useSlideSteps(Math.max(S_LEFT, S_RIGHT, S_JUDGE) + 1);

  const docked = hasPrompt && step >= S_LEFT;
  const leftShown = step >= S_LEFT;
  const rightShown = hasRight && step >= S_RIGHT;
  const judged = hasJudge && step >= S_JUDGE;

  // Spökpanelen: den tomma högerhalvan blir en instruktion ("läs det här
  // först, det kommer ett till") i stället för en designmiss.
  const rightOpacity = !hasRight ? 0 : rightShown ? 1 : leftShown ? 0.22 : 0;

  const pScale = promptScale(prompt?.trim().length ?? 0);
  // Ensam panel = 90vw i stället för 43,7 → dubbel kapacitet. Utan prompt
  // växer bodyn från 38,8vh till 51,3vh → faktor 1,32.
  const roomFactor = (hasRight ? 1 : 2) * (hasPrompt ? 1 : 1.32);
  const aScale = answerScale(Math.max(mass(left), mass(right)), roomFactor);

  const rootStyle = {
    background: "var(--slide-base, var(--bg))",
    color: "var(--text)",
    "--ta-dur": "1",
    "--ta-lag": "1",
  } as React.CSSProperties;

  const panelStyle: React.CSSProperties = {
    // Den mjuka versionen skrivs inline; `data-card` är kroken som
    // brutalistkontraktet drar i (2px ram, radie 0, hård offsetskugga).
    background: "var(--bg-elevated)",
    border: "1px solid color-mix(in srgb, var(--text) 14%, transparent)",
    borderRadius: "var(--radius)",
    boxShadow: "0 28px 65px -42px color-mix(in srgb, var(--text) 34%, transparent)",
    padding: "clamp(0.95rem, 1.6vw, 1.85rem)",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  };

  const chipSize = "clamp(0.5rem, 0.95vw, 1.1rem)";

  const appStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    fontWeight: "var(--heading-weight)",
    // Appnamnet är en skylt, inte en rubrik — därför explicit versal i stället
    // för --heading-case (som är `normal` i dagsljus).
    textTransform: "uppercase",
    fontSize: "calc(clamp(1rem, 2vw, 2.5rem) * var(--display-scale, 1))",
    lineHeight: 1,
    letterSpacing: "-0.01em",
    color: "var(--text)",
    margin: 0,
  };

  const verdictStyle: React.CSSProperties = {
    ...mono,
    fontSize: "clamp(0.6rem, 0.98vw, 1.05rem)",
    letterSpacing: "0.18em",
    lineHeight: 1.5,
    color: "var(--text)",
    textAlign: "right",
    maxWidth: "46%",
    transform: judged ? "none" : "translateY(-6px)",
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    fontFamily: "var(--font-body)",
    fontSize: aScale.fontSize,
    lineHeight: aScale.lineHeight,
    color: "var(--text)",
    maskImage: FADE,
    WebkitMaskImage: FADE,
  };

  const moreStyle: React.CSSProperties = {
    ...mono,
    fontSize: "clamp(0.52rem, 0.8vw, 0.86rem)",
    opacity: 0.5,
    marginTop: "0.8em",
    flexShrink: 0,
  };

  /** Panelramarna kommer samtidigt i klick 1; högerpanelen bara *tänds* i
   *  klick 2, och då rör sig ingenting annat på sliden. */
  const panelTransition = (isRight: boolean) =>
    isRight && rightShown
      ? `opacity ${dur(0.38)} ${EASE}, transform ${dur(0.38)} ${EASE}`
      : `opacity ${dur(0.52)} ${EASE} ${leftShown ? lag(0.32) : "0s"}, transform ${dur(0.52)} ${EASE} ${
          leftShown ? lag(0.32) : "0s"
        }`;

  /** Kaskaden är kapad vid sex rader — känslan av rad-för-rad utan att långa
   *  listor får en tröghetssvans. Takten är identisk på båda sidor; att låta
   *  den översvallande modellen "forsa ut" snabbare vore en värdering. */
  const lineDelay = (i: number, shown: boolean, base: number) =>
    shown ? lag(base + Math.min(i, 5) * 0.11) : "0s";

  const renderPanel = (
    side: "left" | "right",
    lines: string[],
    app: string | undefined,
    caption: string | undefined,
    verdict: string | undefined,
    more: string | undefined,
  ) => {
    const isRight = side === "right";
    const shown = isRight ? rightShown : leftShown;
    const base = isRight ? 0.12 : 0.52;

    return (
      <div
        data-card=""
        style={{
          ...panelStyle,
          opacity: isRight ? rightOpacity : leftShown ? 1 : 0,
          transform: leftShown ? "none" : "translateY(22px)",
          transition: panelTransition(isRight),
        }}
      >
        {/* Headern: appnamn ‖ dom. Domen renderas alltid, så höjden är
            reserverad och appnamnet flyttar sig aldrig när den faller. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "1vw",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw" }}>
              {/* Fylld mot konturad kvadrat — fyllning/kontur har noll valens,
                  medan färgade appnamn eller en tonad panelbotten oundvikligen
                  läses som "den här är den framhävda". */}
              <span
                aria-hidden
                style={{
                  width: chipSize,
                  height: chipSize,
                  flexShrink: 0,
                  background: isRight ? "transparent" : "var(--accent)",
                  border: isRight ? "2px solid var(--text)" : "none",
                }}
              />
              {app ? (
                <h3 style={appStyle}>
                  <EditableText path={isRight ? "rightApp" : "leftApp"} value={app}>
                    {app}
                  </EditableText>
                </h3>
              ) : null}
            </div>
            {caption ? (
              <div
                style={{
                  ...mono,
                  fontSize: "clamp(0.55rem, 0.86vw, 0.92rem)",
                  opacity: 0.58,
                  marginTop: "0.6vh",
                }}
              >
                <EditableText path={isRight ? "rightCaption" : "leftCaption"} value={caption}>
                  {caption}
                </EditableText>
              </div>
            ) : null}
          </div>

          <div
            style={{
              ...verdictStyle,
              opacity: judged && verdict ? 1 : 0,
              transition: `opacity ${dur(0.4)} ${EASE} ${judged ? lag(isRight ? 0.09 : 0) : "0s"}, transform ${dur(
                0.4,
              )} ${EASE} ${judged ? lag(isRight ? 0.09 : 0) : "0s"}`,
            }}
          >
            {verdict ? (
              <EditableText path={isRight ? "rightVerdict" : "leftVerdict"} value={verdict}>
                {verdict}
              </EditableText>
            ) : null}
          </div>
        </div>

        {/* Headerlinjalen — identisk i båda panelerna. */}
        <div
          style={{
            height: 2,
            background: "var(--text)",
            marginTop: "1.1vh",
            marginBottom: "0.7vh",
            flexShrink: 0,
          }}
        />

        {/* Kroppen är toppställd, aldrig space-between, aldrig utsträckt. Att
            högerpanelen har luft kvar när vänsterpanelen tonar ut i masken är
            *data* — den enda visualiseringen av floden som finns. */}
        <div style={bodyStyle}>
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                marginBottom: "0.7em",
                opacity: shown ? 0.9 : 0,
                transform: shown ? "none" : "translateY(10px)",
                transition: `opacity ${dur(0.4)} ${EASE} ${lineDelay(i, shown, base)}, transform ${dur(
                  0.4,
                )} ${EASE} ${lineDelay(i, shown, base)}`,
              }}
            >
              {renderInline(line)}
            </div>
          ))}
        </div>

        {more ? (
          <div
            style={{
              ...moreStyle,
              opacity: shown ? 0.5 : 0,
              transition: `opacity ${dur(0.4)} ${EASE} ${shown ? lag(base + 0.66) : "0s"}`,
            }}
          >
            <EditableText path={isRight ? "rightMore" : "leftMore"} value={more}>
              {more}
            </EditableText>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="relative h-full w-full overflow-hidden" data-two-answers="" style={rootStyle}>
      <style>{`@media (prefers-reduced-motion: reduce){[data-two-answers]{--ta-dur:0.001;--ta-lag:0}}`}</style>

      {kicker ? (
        <div
          style={{
            ...mono,
            fontSize: "clamp(0.62rem, 1.02vw, 1.1rem)",
            position: "absolute",
            top: "4.5vh",
            left: "5vw",
            zIndex: 6,
            color: "var(--accent)",
          }}
        >
          <EditableText path="kicker" value={kicker}>
            {kicker}
          </EditableText>
        </div>
      ) : null}

      {chapter ? (
        <div
          style={{
            ...mono,
            fontSize: "clamp(0.62rem, 1.02vw, 1.1rem)",
            position: "absolute",
            top: "4.5vh",
            right: "5vw",
            zIndex: 6,
            opacity: 0.6,
            textAlign: "right",
            maxWidth: "34vw",
          }}
        >
          <EditableText path="chapter" value={chapter}>
            {chapter}
          </EditableText>
        </div>
      ) : null}

      {/* Titeln kommer först i klick 2. "Samma fråga. Två svar." är en spoiler
          i exakt det ögonblick rummet ska reagera på prompten. */}
      {title ? (
        <h2
          style={{
            position: "absolute",
            top: "11.6vh",
            left: "5vw",
            maxWidth: "62vw",
            zIndex: 5,
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
            textTransform: "var(--heading-case)" as "normal" | "uppercase",
            fontSize: "calc(clamp(1.25rem, 2.5vw, 2.9rem) * var(--display-scale, 1))",
            lineHeight: 0.94,
            opacity: leftShown ? 1 : 0,
            transform: leftShown ? "none" : "translateY(10px)",
            transition: `opacity ${dur(0.45)} ${EASE} ${leftShown ? lag(0.18) : "0s"}, transform ${dur(
              0.45,
            )} ${EASE} ${leftShown ? lag(0.18) : "0s"}`,
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </h2>
      ) : null}

      {/* Promptenheten — ankaret. Stiger 2vh och krymper: ett block som gör
          bådadera läses som "arkiveras", ett som bara krymper som "blir litet". */}
      {hasPrompt ? (
        <div
          style={{
            position: "absolute",
            left: "5vw",
            right: "5vw",
            top: docked ? "20vh" : "22vh",
            zIndex: 5,
            transition: `top ${dur(0.6)} ${EASE}`,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: "clamp(0.6rem, 0.98vw, 1.05rem)",
              color: "var(--accent)",
              marginBottom: "1.4vh",
            }}
          >
            <EditableText path="promptLabel" value={promptLabel}>
              {promptLabel}
            </EditableText>
          </div>
          <div
            style={{
              // Randen är identitetsmärket som överlever kollapsen.
              borderLeft: "2px solid var(--accent)",
              paddingLeft: docked ? "1.1vw" : "1.6vw",
              maxWidth: docked ? "100%" : "72%",
              maxHeight: docked ? "10.5vh" : "48vh",
              overflow: "hidden",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              fontSize: docked ? "clamp(0.72rem, 1vw, 1.06rem)" : pScale.fontSize,
              lineHeight: docked ? 1.45 : pScale.lineHeight,
              textWrap: "balance",
              opacity: judged ? 0.55 : 0.86,
              maskImage: FADE,
              WebkitMaskImage: FADE,
              transition: `font-size ${dur(0.6)} ${EASE}, max-width ${dur(0.6)} ${EASE}, max-height ${dur(
                0.6,
              )} ${EASE}, padding-left ${dur(0.6)} ${EASE}, line-height ${dur(0.6)} ${EASE}, opacity ${dur(
                0.5,
              )} ${EASE} ${judged ? lag(0.26) : "0s"}`,
            }}
          >
            <EditableText path="prompt" value={prompt} block>
              {prompt}
            </EditableText>
          </div>
        </div>
      ) : null}

      {/* Panelbandet. Låst geometri: ingenting flödar om efter klick 1, så
          Joel kan klicka 3→2→3 för att peka utan att sliden hoppar. */}
      <div
        style={{
          position: "absolute",
          left: "5vw",
          right: "5vw",
          top: hasPrompt ? "34.5vh" : "22vh",
          bottom: "15.5vh",
          zIndex: 5,
          display: "grid",
          gridTemplateColumns: hasRight ? "1fr 1fr" : "1fr",
          gap: "2.6vw",
        }}
      >
        {renderPanel("left", left, leftApp, leftCaption, leftVerdict, leftMore)}
        {hasRight
          ? renderPanel("right", right, rightApp, rightCaption, rightVerdict, rightMore)
          : null}
      </div>

      {bottomLine ? (
        <div
          style={{
            position: "absolute",
            left: "5vw",
            bottom: "8vh",
            maxWidth: "76%",
            zIndex: 6,
            borderTop: "2px solid var(--accent)",
            paddingTop: "1.4vh",
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.85rem, 1.3vw, 1.4rem)",
            lineHeight: 1.32,
            opacity: judged ? 1 : 0,
            transform: judged ? "none" : "translateY(12px)",
            transition: `opacity ${dur(0.5)} ${EASE} ${judged ? lag(0.26) : "0s"}, transform ${dur(
              0.5,
            )} ${EASE} ${judged ? lag(0.26) : "0s"}`,
          }}
        >
          <EditableText path="bottomLine" value={bottomLine} block>
            {renderInline(bottomLine)}
          </EditableText>
        </div>
      ) : null}
    </div>
  );
}
