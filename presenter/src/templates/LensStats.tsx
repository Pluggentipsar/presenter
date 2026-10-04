"use client";

import { Children, isValidElement } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { EditableText } from "@/lib/inline-edit";
import { unwrapLazy } from "@/lib/extract-text";
import { useSlideSteps } from "@/lib/slide-steps";

/**
 * LensStats ★ — mätstickan: samma tal genom två linser, på en gemensam axel.
 *
 * Premiär: en keynote 2026-05-27 (hot mot möjlighet). Omskriven 2026-09-04 för
 * ai-relationer-elevhalsa, där poängen inte är siffrorna utan **avståndet**
 * mellan dem: 36 mot 22 procent, 26 mot 14 procent. Två gap av nästan samma
 * bredd, staplade rakt under varandra — det är "samma mönster" som geometri,
 * och Joel behöver inte påstå det.
 *
 * Mallen läser sina egna data och väljer läge:
 *
 * **PAR** — lika många rader per sida, identiska etiketter, samma enhet och
 * samma tecken. Då ritas ett band per etikettpar: vänsterlinsen som fylld
 * stapel, högerlinsen som ihålig, ett gapblock med Δ-plakett mellan spetsarna,
 * och en numrerad tickaxel under fältet.
 *
 * **SOLO** — allt annat. Staplarna grupperas (alla vänster, en regel, alla
 * höger) och tickaxeln ritas *inte*. Det är med flit: att jämföra "−50 %
 * bortfallna jobb" med "+35 % produktivitet" på en numrerad delad skala vore
 * ett mätbarhetsanspråk som inte finns i underlaget. Formen får inte påstå mer
 * än datan gör — särskilt inte i en föreläsning om källkritik.
 *
 * Raderna skrivs som en punktlista i tre delar separerade med `|`
 * (**inte** husets ` · ` — båda decken är skrivna mot rörledningen):
 *
 *   värde | etikett | left|right
 *
 * ```mdx
 * <LensStats
 *   kicker="§ 04 · Utsatthet"
 *   question="Samma mönster syns vid självrapporterad depression"
 *   subtitle="Samma två frågor, ny uppdelning. Fortfarande samband — inte orsak."
 *   leftLabel="Självrapporterad depression"  leftAccent="var(--accent)"
 *   rightLabel="Utan självrapporterad depression"  rightAccent="var(--text-muted)"
 *   leftSource="Mediemyndigheten 2026"  rightSource="Mediemyndigheten 2026"
 *   payoff="Men unga med depression använder AI för **stora beslut** i lägre grad."
 * >
 * - 36 % | Pratat med AI om hur de mår | left
 * - 26 % | Använt AI som sällskap | left
 * - 22 % | Pratat med AI om hur de mår | right
 * - 14 % | Använt AI som sällskap | right
 * </LensStats>
 * ```
 *
 * **Steg:** 0) axeln står, lins A är redan ritad · 1) lins B landar (i SOLO är
 * det hela vändningen) · 2) gapen mäts, alla samtidigt (endast PAR) ·
 * 3) payoffen. Steg 2 och 3 hoppas över när de saknar underlag, så en keynote
 * får tre tillstånd och elevhalsa fyra.
 *
 * Mallen är byggd för att tåla både glasteman (nattglas) och
 * brutalistkontraktet (kobolt): inga rundade hörn, inga skuggor, ingen
 * text-shadow, inga radialer. Bara geometri i temats egna variabler.
 * Fler än sex rader per sida ligger utanför formens avsikt — den krymper
 * fortfarande, men bandet blir för tunt för att mätas med ögat.
 */

interface LensStatsProps {
  kicker?: string;
  /** Den centrala frågan — visas som hero överst. */
  question: string;
  /** Underrubrik under frågan, ofta "samma data, olika linser"-formuleringen. */
  subtitle?: string;
  leftLabel: string;
  leftSource?: string;
  leftBottomLine?: string;
  /** Accentfärg vänster (default: signal-röd från temats accentAlert). */
  leftAccent?: string;
  rightLabel: string;
  rightSource?: string;
  rightBottomLine?: string;
  /** Accentfärg höger (default: optimistisk grön). */
  rightAccent?: string;
  /** Sluttreplik i botten. */
  payoff?: string;
  /**
   * Stats via markdown-lista. Format per rad:
   * `- Värde | Etikett | left|right`
   * Värde kan vara t.ex. "−50%" eller "+35%". Etikett kort, läsbar från avstånd.
   */
  children?: ReactNode;
}

interface StatItem {
  value: string;
  label: string;
  side: "left" | "right";
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    return inner;
  }
  return "";
}

function parseStats(children: ReactNode): StatItem[] {
  const out: StatItem[] = [];
  // unwrapLazy på BÅDA nivåerna. Utan den säger isValidElement nej till en
  // react.lazy-nod, servern renderar noll rader och hydreringen spricker.
  Children.forEach(children, (rawChild) => {
    const child = unwrapLazy(rawChild);
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type !== "ul" && el.type !== "ol") return;
    Children.forEach(el.props.children, (rawLi) => {
      const li = unwrapLazy(rawLi);
      if (!isValidElement(li) || (li as ReactElement).type !== "li") return;
      const text = extractText(
        (li as ReactElement<{ children?: ReactNode }>).props.children,
      ).trim();
      if (!text) return;
      const parts = text.split(/\s*\|\s*/);
      const side = (parts[2] || "left").trim().toLowerCase() as
        | "left"
        | "right";
      out.push({
        value: parts[0] ?? "",
        label: parts[1] ?? "",
        side: side === "right" ? "right" : "left",
      });
    });
  });
  return out;
}

/* ── Talet ────────────────────────────────────────────────────────────────
 * Värdet sätts i tre grader: tecken, tal, enhet. Tecknet bärs av glyfen, inte
 * av axeln — staplarna växer alltid från en gemensam nolla och mäter magnitud.
 */

interface ParsedValue {
  /** "−" (U+2212), "+" eller tomt. Alla bindestreckssorter normaliseras hit. */
  sign: string;
  /** Talet som det skrevs, decimalkommat bevarat. */
  digits: string;
  /** Det som stod efter talet: "%", "p.e.", "miljoner" … */
  unit: string;
  /** Absolutbeloppet som tal, för skalan. */
  mag: number;
  ok: boolean;
}

const VALUE_RE = /^\s*([−–—+-])?\s*(\d+(?:[.,]\d+)?)\s*(.*)$/u;

function parseValue(raw: string): ParsedValue {
  const empty: ParsedValue = { sign: "", digits: "", unit: "", mag: 0, ok: false };
  const m = VALUE_RE.exec(raw ?? "");
  if (!m) return empty;
  const mag = parseFloat((m[2] ?? "").replace(",", "."));
  if (!Number.isFinite(mag)) return empty;
  const rawSign = m[1] ?? "";
  return {
    sign: rawSign === "+" ? "+" : rawSign ? "−" : "",
    digits: m[2] ?? "",
    unit: (m[3] ?? "").trim(),
    mag,
    ok: true,
  };
}

/** Etiketter jämförs mjukt — slutinterpunktion och dubbla mellanslag räknas inte. */
function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[.,;:!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Item extends StatItem {
  parsed: ParsedValue;
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const mono: CSSProperties = {
  fontFamily: "var(--font-mono)",
  textTransform: "uppercase",
  fontWeight: 600,
};

/** Lägger stapelbredden som custom property så en delad keyframe kan läsa den. */
function withW(p: number, s: CSSProperties): CSSProperties {
  return { ...s, "--w": `${p}%` } as CSSProperties;
}

export function LensStats({
  kicker,
  question,
  subtitle,
  leftLabel,
  leftSource,
  leftBottomLine,
  leftAccent = "var(--accent)",
  rightLabel,
  rightSource,
  rightBottomLine,
  rightAccent = "var(--text-muted)",
  payoff,
  children,
}: LensStatsProps) {
  const stats = parseStats(children);
  const toItem = (s: StatItem): Item => ({ ...s, parsed: parseValue(s.value) });
  const leftItems = stats.filter((s) => s.side === "left").map(toItem);
  const rightItems = stats.filter((s) => s.side === "right").map(toItem);
  const allItems = [...leftItems, ...rightItems];

  /* ── Lägesdetektering ──────────────────────────────────────────────────
   * PAR kräver att raderna faktiskt är par: samma antal, samma etikett, samma
   * enhet och samma tecken. Tecken-villkoret är inte försiktighet — axeln mäter
   * magnitud, så ett gapblock mellan −4 och +12 skulle spänna 8 när den verkliga
   * skillnaden är 16. Vid blandat tecken kan blocket alltså inte vara sant.
   */
  const paired =
    leftItems.length >= 1 &&
    leftItems.length === rightItems.length &&
    leftItems.every((l, i) => {
      const r = rightItems[i];
      return (
        norm(l.label) !== "" &&
        norm(l.label) === norm(r.label) &&
        l.parsed.ok &&
        r.parsed.ok &&
        l.parsed.unit === r.parsed.unit &&
        l.parsed.sign === r.parsed.sign
      );
    });

  const pairs = paired
    ? leftItems.map((l, i) => ({
        label: l.label,
        left: l.parsed,
        right: rightItems[i].parsed,
      }))
    : [];

  /* ── Skalan ────────────────────────────────────────────────────────────
   * 0.82 är takvillkoret: längsta stapeln får aldrig nå axelns slut, så
   * värdesiffran alltid får plats utanför spetsen och aldrig behöver kryssa in
   * i stapeln.
   */
  const maxAbs = allItems.reduce((m, i) => Math.max(m, i.parsed.mag), 0);
  const hasScale = maxAbs > 0;
  const niceMax = Math.max(10, Math.ceil(maxAbs / 0.82 / 10) * 10);
  const pct = (mag: number) => (mag / niceMax) * 100;
  const tickStep = [5, 10, 20, 25, 50, 100].find((s) => niceMax / s <= 6) ?? 100;
  const ticks: number[] = [];
  if (hasScale) {
    for (let t = 0; t <= niceMax + 1e-6; t += tickStep) ticks.push(Math.round(t));
  }

  const gaps = pairs.map((p) => Math.abs(p.left.mag - p.right.mag));

  /* ── Steg ──────────────────────────────────────────────────────────────
   * Steg 0 står redan med lins A ritad — det är den avgörande PDF-egenskapen,
   * eftersom `animation-fill-mode: backwards` lämnar allt i sluttillstånd när
   * ingen stegprovider finns.
   */
  const HAS_GAP = paired && hasScale && gaps.some((g) => g > 0);
  const HAS_PAYOFF = !!payoff;
  const STEP_B = 1;
  const STEP_GAP = HAS_GAP ? 2 : -1;
  const STEP_PAYOFF = HAS_PAYOFF ? (HAS_GAP ? 3 : 2) : -1;
  const step = useSlideSteps(2 + (HAS_GAP ? 1 : 0) + (HAS_PAYOFF ? 1 : 0));

  const bShown = step >= STEP_B;
  const gapShown = STEP_GAP >= 0 && step >= STEP_GAP;
  const payoffShown = STEP_PAYOFF >= 0 && step >= STEP_PAYOFF;

  /* ── Måttsättning ─────────────────────────────────────────────────────── */
  const rowCount = paired ? pairs.length : allItems.length;
  const single = rowCount === 1;
  const dense = rowCount > 3;
  const cram = rowCount > 6;

  const BAND = single
    ? "clamp(2.6rem, 8vh, 6rem)"
    : cram
      ? "clamp(1rem, 3vh, 2.4rem)"
      : dense
        ? "clamp(1.5rem, 4.2vh, 3.2rem)"
        : "clamp(2.2rem, 6vh, 4.6rem)";
  const GUTTER = dense
    ? "clamp(0.25rem, 0.6vh, 0.5rem)"
    : "clamp(0.35rem, 0.9vh, 0.75rem)";
  const ROWGAP = cram
    ? "0.9vh"
    : dense
      ? "clamp(0.6rem, 1.7vh, 1.4rem)"
      : "clamp(1rem, 2.8vh, 2.4rem)";
  const NUM = cram
    ? "calc(clamp(1.05rem, 2vw, 2.2rem) * var(--display-scale, 1))"
    : dense
      ? "calc(clamp(1.3rem, 2.6vw, 2.9rem) * var(--display-scale, 1))"
      : "calc(clamp(1.7rem, 3.4vw, 3.9rem) * var(--display-scale, 1))";
  const FLAT_NUM = `calc(${NUM} * 0.62)`;

  const rlabel: CSSProperties = {
    fontFamily: "var(--font-body)",
    fontSize: dense
      ? "clamp(0.76rem, 1vw, 1.08rem)"
      : "clamp(0.88rem, 1.18vw, 1.32rem)",
    lineHeight: 1.22,
    color: "var(--text)",
    opacity: 0.86,
    display: "-webkit-box",
    WebkitLineClamp: dense ? 2 : 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textAlign: "right",
    paddingRight: "0.9vw",
  };

  const hairline = "color-mix(in srgb, var(--text) 13%, transparent)";
  const hairlineFaint = "color-mix(in srgb, var(--text) 3%, transparent)";

  /* ── Textbehandling ───────────────────────────────────────────────────── */
  const renderRich = (text: string, accent?: string): ReactNode => {
    const color = accent ?? "var(--accent)";
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
      const m = /^\*\*(.+)\*\*$/.exec(part);
      if (m) {
        // 700, inte 500: kobolt plattar ut mellanvikterna och 500 försvinner.
        return (
          <span key={i} style={{ color, fontWeight: 700 }}>
            {m[1]}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  /** Värdesiffran i tre grader. Tabular-nums så 36 och 22 rimmar lodrätt. */
  const valueNode = (p: ParsedValue, raw: string, size: string) => {
    if (!p.ok) {
      return (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: `calc(${size} * 0.62)`,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {raw}
        </span>
      );
    }
    return (
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size,
          lineHeight: 0.82,
          display: "inline-flex",
          alignItems: "baseline",
        }}
      >
        {p.sign ? (
          <span
            style={{ fontSize: "0.5em", opacity: 0.85, marginRight: "0.05em" }}
          >
            {p.sign}
          </span>
        ) : null}
        <span
          style={{
            fontSize: "1em",
            lineHeight: 0.82,
            letterSpacing: "-0.035em",
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            fontStretch: "112%",
          }}
        >
          {p.digits}
        </span>
        {p.unit ? (
          <span
            style={{
              fontSize: "0.38em",
              letterSpacing: "0.02em",
              opacity: 0.8,
              marginLeft: "0.16em",
            }}
          >
            {p.unit}
          </span>
        ) : null}
      </span>
    );
  };

  /** Δ mellan två procenttal är procent*enheter* — Joel blir uppläst på det annars. */
  const deltaUnit = (a: ParsedValue, b: ParsedValue): string => {
    if (a.unit === "%" && b.unit === "%") return "p.e.";
    return a.unit || b.unit || "";
  };
  const deltaText = (d: number): string =>
    Number.isInteger(d) ? String(d) : d.toFixed(1).replace(".", ",");

  /* ── Linsbandet ───────────────────────────────────────────────────────── */
  const anyBottomLine = !!(leftBottomLine || rightBottomLine);

  const lensHead = (
    side: "left" | "right",
    label: string,
    accent: string,
    source: string | undefined,
    bottomLine: string | undefined,
  ) => {
    const filled = side === "left";
    return (
      <div
        className="ls-anim"
        style={{
          display: "flex",
          alignItems: "stretch",
          animation: `ls-fade 0.5s ${EASE} 0.42s backwards`,
        }}
      >
        <div
          aria-hidden
          style={{
            width: "3px",
            flexShrink: 0,
            background: accent,
            marginRight: "0.9vw",
            borderRadius: 0,
          }}
        />
        <div
          style={{
            // Lins B monteras nedtonad: sliden visar att en andra lins finns,
            // men att den inte talat än.
            opacity: filled ? 1 : bShown ? 1 : 0.38,
            transition: `opacity 0.4s ${EASE}`,
            minWidth: 0,
          }}
          className="ls-tr"
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              aria-hidden
              style={{
                width: "0.85vw",
                height: "0.85vw",
                minWidth: "9px",
                minHeight: "9px",
                flexShrink: 0,
                marginRight: "0.55vw",
                borderRadius: 0,
                boxSizing: "border-box",
                // Samma texturkontrakt som staplarna: fylld vänster, ihålig
                // höger. Det är förutsättningen för att slå ihop två kolumner
                // till en axel — legenden säger vem som är vem, staplarna
                // behöver aldrig upprepa det.
                background: filled ? accent : withAlpha(accent, 0.18),
                border: filled ? "none" : `2px solid ${accent}`,
              }}
            />
            <span
              style={{
                ...mono,
                fontSize: "clamp(0.72rem, 0.95vw, 1rem)",
                letterSpacing: "0.2em",
                color: accent,
              }}
            >
              <EditableText
                path={side === "left" ? "leftLabel" : "rightLabel"}
                value={label}
              >
                {label}
              </EditableText>
            </span>
          </div>
          {source ? (
            <div
              style={{
                ...mono,
                fontSize: "clamp(0.56rem, 0.72vw, 0.78rem)",
                letterSpacing: "0.18em",
                color: "var(--text-muted)",
                fontWeight: 500,
                marginTop: "0.5vh",
              }}
            >
              <EditableText
                path={side === "left" ? "leftSource" : "rightSource"}
                value={source}
              >
                {source}
              </EditableText>
            </div>
          ) : null}
          {bottomLine ? (
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "normal",
                textTransform: "none",
                fontSize: "clamp(0.95rem, 1.25vw, 1.35rem)",
                lineHeight: 1.25,
                letterSpacing: "-0.012em",
                color: "var(--text)",
                opacity: 0.9,
                marginTop: "0.9vh",
              }}
            >
              <EditableText
                path={side === "left" ? "leftBottomLine" : "rightBottomLine"}
                value={bottomLine}
              >
                {bottomLine}
              </EditableText>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  /* ── Staplar ──────────────────────────────────────────────────────────── */

  /** Stapel som monteras direkt (lins A) — CSS-animation, inte steg. */
  const barA = (p: number, accent: string, top: string, delay: number) => (
    <div
      aria-hidden
      className="ls-anim"
      style={withW(p, {
        position: "absolute",
        left: 0,
        top,
        height: BAND,
        width: `${p}%`,
        background: accent,
        borderRadius: 0,
        boxSizing: "border-box",
        zIndex: 1,
        animation: `ls-bar 0.62s ${EASE} ${delay}s backwards`,
      })}
    />
  );

  /** Stapel som landar på klick (lins B) — ihålig, ingen stagger. */
  const barB = (p: number, accent: string, top: string) => (
    <div
      aria-hidden
      className="ls-tr"
      style={{
        position: "absolute",
        left: 0,
        top,
        height: BAND,
        width: bShown ? `${p}%` : 0,
        background: withAlpha(accent, 0.18),
        border: `2px solid ${accent}`,
        borderRadius: 0,
        boxSizing: "border-box",
        zIndex: 2,
        transition: `width 0.58s ${EASE}`,
      }}
    />
  );

  const numA = (
    p: number,
    parsed: ParsedValue,
    raw: string,
    accent: string,
    centerY: string,
    delay: number,
  ) => (
    <div
      className="ls-anim"
      style={withW(p, {
        position: "absolute",
        top: centerY,
        left: hasScale ? `calc(${p}% + 0.7vw)` : 0,
        transform: "translateY(-50%)",
        whiteSpace: "nowrap",
        zIndex: 5,
        color: accent,
        animation: hasScale
          ? `ls-num 0.3s ${EASE} ${delay + 0.34}s backwards`
          : `ls-in 0.45s ${EASE} ${delay}s backwards`,
      })}
    >
      {valueNode(parsed, raw, hasScale ? NUM : FLAT_NUM)}
    </div>
  );

  const numB = (
    p: number,
    parsed: ParsedValue,
    raw: string,
    accent: string,
    centerY: string,
  ) => (
    <div
      className="ls-tr"
      style={{
        position: "absolute",
        top: centerY,
        left: hasScale ? (bShown ? `calc(${p}% + 0.7vw)` : "0.7vw") : 0,
        transform: "translateY(-50%)",
        whiteSpace: "nowrap",
        zIndex: 5,
        color: accent,
        opacity: bShown ? 1 : 0,
        transition: `left 0.58s ${EASE}, opacity 0.3s ${EASE} 0.28s`,
      }}
    >
      {valueNode(parsed, raw, hasScale ? NUM : FLAT_NUM)}
    </div>
  );

  /* ── Gapblocket ────────────────────────────────────────────────────────
   * Staplarna växte åt höger; gapet växer åt vänster, från den långa stapelns
   * ände tillbaka mot den korta. Motsatt riktning gör att blocket läses som ett
   * annat slags objekt — ett mått, inte en tredje dataserie. clipPath i stället
   * för width så att de lodräta 2/3 px-kanterna inte deformeras.
   */
  const gapBlock = (l: ParsedValue, r: ParsedValue) => {
    const d = Math.abs(l.mag - r.mag);
    if (!hasScale || d <= 0) return null;
    const a = pct(l.mag);
    const b = pct(r.mag);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const leading = l.mag >= r.mag ? leftAccent : rightAccent;
    const unit = deltaUnit(l, r);
    return (
      <>
        <div
          aria-hidden
          className="ls-tr"
          style={{
            position: "absolute",
            left: `${lo}%`,
            width: `${hi - lo}%`,
            top: "-0.6vh",
            bottom: "-0.6vh",
            background: "color-mix(in srgb, var(--text) 9%, transparent)",
            borderLeft: "2px solid color-mix(in srgb, var(--text) 45%, transparent)",
            borderRight: `3px solid ${leading}`,
            borderRadius: 0,
            boxSizing: "border-box",
            zIndex: 3,
            clipPath: gapShown ? "inset(0 0 0 0)" : "inset(0 0 0 100%)",
            transition: `clip-path 0.5s ${EASE}`,
          }}
        />
        <div
          data-tag="solid"
          className="ls-tr"
          style={{
            position: "absolute",
            left: `${(lo + hi) / 2}%`,
            top: "50%",
            transform: gapShown
              ? "translate(-50%, -50%) scale(1)"
              : "translate(-50%, -50%) scale(0.9)",
            zIndex: 4,
            // Looken ligger inline: nattglas har inga data-tag-regler, kobolt
            // bekräftar bara samma sak.
            background: "var(--text)",
            color: "var(--bg)",
            border: "2px solid var(--text)",
            borderRadius: 0,
            fontFamily: "var(--font-mono)",
            padding: "0.4vh 0.8vw",
            whiteSpace: "nowrap",
            lineHeight: 1,
            opacity: gapShown ? 1 : 0,
            transition: `opacity 0.36s ${EASE} 0.26s, transform 0.36s ${EASE} 0.26s`,
          }}
        >
          <span
            style={{
              fontSize: "clamp(0.95rem, 1.5vw, 1.7rem)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {deltaText(d)}
          </span>
          {unit ? (
            <span style={{ fontSize: "0.6em", marginLeft: "0.3em" }}>{unit}</span>
          ) : null}
        </div>
      </>
    );
  };

  /* ── Band ─────────────────────────────────────────────────────────────── */
  const trackHeightPar = `calc(${BAND} * 2 + ${GUTTER})`;
  const centerA = `calc(${BAND} / 2)`;
  const centerB = `calc(${BAND} * 1.5 + ${GUTTER})`;

  const bandRow = (key: string, label: string, track: ReactNode, height: string, i: number) => (
    <div
      key={key}
      data-row=""
      style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
    >
      <div
        className="ls-anim"
        style={{
          width: "25%",
          flexShrink: 0,
          ...rlabel,
          animation: `ls-slidex 0.5s ${EASE} ${0.32 + i * 0.06}s backwards`,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: "72%",
          marginLeft: "3%",
          position: "relative",
          height,
          flexShrink: 0,
        }}
      >
        {track}
      </div>
    </div>
  );

  const bands: ReactNode[] = [];

  if (paired) {
    pairs.forEach((p, i) => {
      const delay = 0.7 + i * 0.09;
      bands.push(
        bandRow(
          `pair-${i}`,
          p.label,
          <>
            {gapBlock(p.left, p.right)}
            {hasScale ? barA(pct(p.left.mag), leftAccent, "0", delay) : null}
            {hasScale
              ? barB(pct(p.right.mag), rightAccent, `calc(${BAND} + ${GUTTER})`)
              : null}
            {numA(pct(p.left.mag), p.left, leftItems[i].value, leftAccent, centerA, delay)}
            {numB(pct(p.right.mag), p.right, rightItems[i].value, rightAccent, centerB)}
          </>,
          trackHeightPar,
          i,
        ),
      );
    });
  } else {
    const centerSolo = "50%";
    leftItems.forEach((it, i) => {
      const delay = 0.7 + i * 0.09;
      bands.push(
        bandRow(
          `l-${i}`,
          it.label,
          <>
            {hasScale ? barA(pct(it.parsed.mag), leftAccent, "0", delay) : null}
            {numA(pct(it.parsed.mag), it.parsed, it.value, leftAccent, centerSolo, delay)}
          </>,
          BAND,
          i,
        ),
      );
    });
    // Gruppdelaren bevarar det rumsliga argumentet: hot-blocket, sedan
    // möjlighet-blocket. Interfoliering hade förstört vändningen.
    if (leftItems.length > 0 && rightItems.length > 0) {
      bands.push(
        <div
          key="divider"
          aria-hidden
          className="ls-anim"
          style={{
            height: "1px",
            width: "100%",
            flexShrink: 0,
            background: "color-mix(in srgb, var(--text) 20%, transparent)",
            margin: "1.6vh 0",
            animation: `ls-fade 0.5s ${EASE} 0.5s backwards`,
          }}
        />,
      );
    }
    rightItems.forEach((it, i) => {
      const idx = leftItems.length + i;
      bands.push(
        bandRow(
          `r-${i}`,
          it.label,
          <>
            {hasScale ? barB(pct(it.parsed.mag), rightAccent, "0") : null}
            {numB(pct(it.parsed.mag), it.parsed, it.value, rightAccent, centerSolo)}
          </>,
          BAND,
          idx,
        ),
      );
    });
  }

  const unitForTicks = paired ? pairs[0]?.left.unit ?? "" : "";
  const questionSmall = (question ?? "").length > 48;
  const payoffLong = (payoff ?? "").length > 130;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      <div
        style={{
          position: "relative",
          height: "100%",
          padding: "5vh 5vw 4.5vh",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Rubrikblock — medvetet nedskalat mot tidigare. Diagrammet är hjälten. */}
        {kicker ? (
          <div
            className="ls-anim"
            style={{
              ...mono,
              fontSize: "clamp(0.62rem, 0.86vw, 0.92rem)",
              letterSpacing: "0.24em",
              color: "var(--accent)",
              marginBottom: "1.6vh",
              animation: `ls-fade 0.5s ${EASE} 0s backwards`,
            }}
          >
            <EditableText path="kicker" value={kicker}>
              {kicker}
            </EditableText>
          </div>
        ) : null}

        <h2
          className="ls-anim"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            letterSpacing: "var(--heading-tracking)",
            textTransform: "var(--heading-case)" as "normal" | "uppercase",
            fontSize: questionSmall
              ? "calc(clamp(1.45rem, 2.45vw, 2.5rem) * var(--display-scale, 1))"
              : "calc(clamp(1.7rem, 2.9vw, 2.9rem) * var(--display-scale, 1))",
            lineHeight: 1.02,
            color: "var(--text)",
            margin: 0,
            marginBottom: "0.9vh",
            maxWidth: "22em",
            animation: `ls-fade 0.5s ${EASE} 0.08s backwards`,
          }}
        >
          <EditableText path="question" value={question}>
            {renderRich(question)}
          </EditableText>
        </h2>

        {subtitle ? (
          <p
            className="ls-anim"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.92rem, 1.12vw, 1.18rem)",
              color: "var(--text-muted)",
              lineHeight: 1.45,
              margin: 0,
              maxWidth: "40em",
              animation: `ls-fade 0.5s ${EASE} 0.16s backwards`,
            }}
          >
            <EditableText path="subtitle" value={subtitle}>
              {subtitle}
            </EditableText>
          </p>
        ) : null}

        {/* Linsbandet — legenden som gör att staplarna slipper upprepa sig */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.8vw",
            alignItems: "stretch",
            minHeight: anyBottomLine ? "9.5vh" : "7vh",
            marginTop: "2.6vh",
            marginBottom: "3vh",
            flexShrink: 0,
          }}
        >
          {lensHead("left", leftLabel, leftAccent, leftSource, leftBottomLine)}
          {lensHead("right", rightLabel, rightAccent, rightSource, rightBottomLine)}
        </div>

        {/* Fältet */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            {/* Rutnätet. I SOLO-läge tunnas hårstrecken ned och tickraden
                uteblir — utan numrerad axel gör formen inget mätbarhetsanspråk. */}
            {hasScale ? (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              >
                <div style={{ width: "28%", flexShrink: 0 }} />
                <div style={{ width: "72%", position: "relative" }}>
                  {ticks.map((t, i) =>
                    t === 0 ? null : (
                      <div
                        key={t}
                        className="ls-anim"
                        style={{
                          position: "absolute",
                          left: `${(t / niceMax) * 100}%`,
                          top: 0,
                          bottom: 0,
                          width: "1px",
                          background: paired ? hairline : hairlineFaint,
                          transformOrigin: "bottom",
                          animation: `ls-rule 0.45s ${EASE} ${0.15 + i * 0.03}s backwards`,
                        }}
                      />
                    ),
                  )}
                  <div
                    className="ls-anim"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "2px",
                      background:
                        "color-mix(in srgb, var(--text) 34%, transparent)",
                      transformOrigin: "bottom",
                      animation: `ls-rule 0.45s ${EASE} 0.15s backwards`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div
              style={{
                position: "relative",
                zIndex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-around",
                gap: ROWGAP,
              }}
            >
              {bands}
            </div>
          </div>

          {paired && hasScale ? (
            <div
              className="ls-anim"
              style={{
                display: "flex",
                flexShrink: 0,
                height: "3.2vh",
                animation: `ls-fade 0.4s ${EASE} 1.25s backwards`,
              }}
            >
              <div style={{ width: "28%", flexShrink: 0 }} />
              <div style={{ width: "72%", position: "relative" }}>
                {ticks.map((t, i) => (
                  <span
                    key={t}
                    style={{
                      ...mono,
                      position: "absolute",
                      left: `${(t / niceMax) * 100}%`,
                      top: "0.5vh",
                      transform: "translateX(-50%)",
                      fontSize: "clamp(0.55rem, 0.68vw, 0.74rem)",
                      letterSpacing: "0.14em",
                      opacity: 0.5,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t}
                    {i === ticks.length - 1 && unitForTicks
                      ? ` ${unitForTicks}`
                      : ""}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Payoffbandet — slidens poäng, vänsterställd under ett vänsterställt
            diagram, utan display-scale (annars sväller den till fyra rader). */}
        {payoff ? (
          <div style={{ flexShrink: 0, marginTop: "1.5vh" }}>
            <div
              aria-hidden
              className="ls-tr"
              style={{
                height: "2px",
                background: "color-mix(in srgb, var(--text) 16%, transparent)",
                transformOrigin: "left center",
                transform: payoffShown ? "scaleX(1)" : "scaleX(0)",
                transition: `transform 0.55s ${EASE}`,
              }}
            />
            <div
              className="ls-tr"
              style={{
                display: "flex",
                alignItems: "stretch",
                marginTop: "1.4vh",
                opacity: payoffShown ? 1 : 0,
                transform: payoffShown ? "none" : "translateY(8px)",
                transition: `opacity 0.5s ${EASE} 0.22s, transform 0.5s ${EASE} 0.22s`,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: "4px",
                  flexShrink: 0,
                  background: "var(--accent)",
                  marginRight: "1.2vw",
                  borderRadius: 0,
                }}
              />
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 500,
                  fontStyle: "normal",
                  textTransform: "none",
                  fontSize: payoffLong
                    ? "clamp(0.95rem, 1.4vw, 1.55rem)"
                    : "clamp(1.05rem, 1.62vw, 1.8rem)",
                  lineHeight: 1.34,
                  letterSpacing: "-0.015em",
                  color: "var(--text)",
                  margin: 0,
                  maxWidth: "46em",
                  textAlign: "left",
                }}
              >
                <EditableText path="payoff" value={payoff}>
                  {renderRich(payoff)}
                </EditableText>
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
@keyframes ls-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes ls-slidex{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes ls-in{from{opacity:0}to{opacity:1}}
@keyframes ls-rule{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ls-bar{from{width:0}to{width:var(--w)}}
@keyframes ls-num{from{left:0.7vw;opacity:0}40%{opacity:1}to{left:calc(var(--w) + 0.7vw)}}
@media (prefers-reduced-motion: reduce){.ls-anim{animation:none!important}.ls-tr{transition-duration:0.001s!important}}
`}</style>
    </div>
  );
}
