"use client";

import { motion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import { withAlpha } from "@/lib/gradient-presets";

interface TermPair {
  sv: string;
  ar: string;
}

interface TranslationDemoProps {
  kicker?: string;
  title?: string;
  subtitle?: string;
  prompt?: string;
  swedishText?: string;
  arabicText?: string;
  terms?: TermPair[];
  background?: string;
  accent?: string;
}

function isPhotoBackground(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

function resolveBackground(bg: string | undefined): string {
  const fallback = "var(--slide-base, var(--bg))";
  if (!bg) return fallback;
  if (isPhotoBackground(bg)) {
    return `linear-gradient(rgba(10,9,8,0.62), rgba(10,9,8,0.78)), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// När en foto-bakgrund visas ligger panelerna ovanpå en mörk scrim — då måste
// texten vara fast ljus oavsett tema. Utan foto-bakgrund (ren var(--bg)) ska
// texten följa temat så den blir mörk på ljust tema.
const TEXT_ON_PHOTO = "rgba(245,246,250,0.92)";
const MUTED_ON_PHOTO = "rgba(245,246,250,0.6)";

const DEFAULT_SV = `Under den grekiska antiken skapades litterära verk som än idag formar vår syn på tragedi, epik och retorik. Homeros episka dikter "Iliaden" och "Odysséen" berättar om hjältar, gudar och människoöden. Sofokles och Euripides utvecklade tragedin till en konstform där människans val och gudarnas vilja möts i djupa konflikter.`;

const DEFAULT_AR = `خلال العصور الكلاسيكية اليونانية، أُنشئت أعمال أدبية لا تزال تشكّل نظرتنا إلى المأساة، والملحمة، والبلاغة. قصائد هوميروس الملحمية "الإلياذة" و"الأوديسة" تروي قصص الأبطال والآلهة ومصائر البشر. طوّر سوفوكليس ويوربيديس المأساة إلى شكل فني حيث تتلاقى خيارات الإنسان وإرادة الآلهة في صراعات عميقة.`;

const DEFAULT_TERMS: TermPair[] = [
  { sv: "epik", ar: "ملحمة" },
  { sv: "tragedi", ar: "مأساة" },
  { sv: "retorik", ar: "بلاغة" },
  { sv: "hjälte", ar: "بطل" },
  { sv: "ödet", ar: "القدر" },
  { sv: "gudar", ar: "آلهة" },
];

export function TranslationDemo({
  kicker,
  title,
  subtitle,
  prompt,
  swedishText = DEFAULT_SV,
  arabicText = DEFAULT_AR,
  terms = DEFAULT_TERMS,
  background,
  accent = "var(--accent)",
}: TranslationDemoProps) {
  // Step 0: prompt; 1: sv; 2: ar; 3: terms
  const activeStep = useSlideSteps(4);

  const onPhoto = isPhotoBackground(background);
  const textColor = onPhoto ? TEXT_ON_PHOTO : "var(--text)";
  const mutedColor = onPhoto ? MUTED_ON_PHOTO : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background) }}
    >
      <div
        className="relative flex h-full w-full flex-col"
        style={{
          padding: "clamp(2rem, 3.5vw, 3.5rem)",
          zIndex: 2,
          gap: "clamp(0.8rem, 1.5vh, 1.3rem)",
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1" style={{ flexShrink: 0 }}>
          {kicker ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(0.7rem, 0.85vw, 0.9rem)",
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: accent,
                fontWeight: 600,
              }}
            >
              <EditableText path="kicker" value={kicker ?? ""}>{kicker}</EditableText>
            </motion.div>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "clamp(1.6rem, 2.8vw, 2.3rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: textColor,
                margin: 0,
              }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.88rem, 1vw, 1.05rem)",
                color: mutedColor,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
            </motion.p>
          ) : null}
        </div>

        {/* Prompt-bar */}
        {prompt ? (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            style={{
              alignSelf: "flex-start",
              maxWidth: "56em",
              background: "var(--text)",
              borderRadius: "1rem",
              padding: "0.75rem 1rem",
              boxShadow: "0 14px 40px -12px rgba(0,0,0,0.5)",
              fontFamily: "var(--font-body)",
              fontSize: "clamp(0.85rem, 0.98vw, 1rem)",
              color: "var(--bg)",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "center",
              gap: "0.7rem",
            }}
          >
            <div
              aria-hidden
              style={{
                width: "1.6rem",
                height: "1.6rem",
                borderRadius: "50%",
                background: accent,
                // "DU"-etiketten sitter på en accent-fylld cirkel. accent kan vara
                // mörk (t.ex. dagsljus grön) — håll texten fast ljus så den läses.
                color: "rgba(245,246,250,0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              DU
            </div>
            <div><EditableText path="prompt" value={prompt ?? ""}>{prompt}</EditableText></div>
          </motion.div>
        ) : null}

        {/* 3 paneler */}
        <div
          className="flex-1"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 0.85fr",
            gap: "clamp(0.8rem, 1.3vw, 1.3rem)",
            alignItems: "stretch",
            minHeight: 0,
          }}
        >
          {/* SV-panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={activeStep >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={panelStyle(accent, onPhoto)}
          >
            <PanelHeader flag="🇸🇪" label="SVENSKA" accent={accent} />
            <div style={panelBodyStyle(false, onPhoto)}>
              <EditableText path="swedishText" value={swedishText ?? ""} label="Svensk text">{swedishText}</EditableText>
            </div>
          </motion.div>

          {/* AR-panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={activeStep >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={panelStyle(accent, onPhoto)}
          >
            <PanelHeader flag="🇸🇦" label="العربية" accent={accent} rtl />
            <div style={{ ...panelBodyStyle(true, onPhoto), textAlign: "right" as const }}>
              <EditableText path="arabicText" value={arabicText ?? ""} label="Arabisk text">{arabicText}</EditableText>
            </div>
          </motion.div>

          {/* Terms-panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={activeStep >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={panelStyle(accent, onPhoto)}
          >
            <PanelHeader flag="🗝" label="BEGREPP" accent={accent} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem",
                padding: "0.15rem",
              }}
            >
              {terms.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "0.7rem",
                    padding: "0.35rem 0",
                    borderBottom: i < terms.length - 1 ? `1px solid ${withAlpha(accent, 0.18)}` : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      fontSize: "clamp(0.85rem, 0.95vw, 0.98rem)",
                      color: textColor,
                    }}
                  >
                    {t.sv}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "clamp(0.9rem, 1vw, 1.05rem)",
                      color: accent,
                      direction: "rtl",
                    }}
                  >
                    {t.ar}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function panelStyle(accent: string, onPhoto: boolean): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "0.7rem",
    padding: "clamp(0.9rem, 1.3vw, 1.3rem)",
    borderRadius: "0.75rem",
    // På foto-scrim behåller glaset den ljusa varma tonen; utan foto blir det en
    // tema-medveten yta så panelen syns även mot ett ljust slide-bg.
    background: onPhoto ? "rgba(247,241,230,0.07)" : "var(--bg-surface)",
    backdropFilter: "blur(18px) saturate(140%)",
    WebkitBackdropFilter: "blur(18px) saturate(140%)",
    border: `1px solid ${withAlpha(accent, 0.25)}`,
    boxShadow: onPhoto
      ? `0 14px 34px -12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)`
      : `0 14px 34px -12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(0,0,0,0.04)`,
    overflow: "hidden",
  };
}

function panelBodyStyle(rtl: boolean, onPhoto: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-body)",
    fontSize: "clamp(0.82rem, 0.95vw, 0.98rem)",
    lineHeight: 1.55,
    color: onPhoto ? TEXT_ON_PHOTO : "var(--text)",
    direction: rtl ? ("rtl" as const) : ("ltr" as const),
    overflow: "hidden",
  };
}

function PanelHeader({
  flag,
  label,
  accent,
  rtl,
}: {
  flag: string;
  label: string;
  accent: string;
  rtl?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        paddingBottom: "0.6rem",
        borderBottom: `1px solid ${withAlpha(accent, 0.25)}`,
        flexDirection: rtl ? "row-reverse" : "row",
      }}
    >
      <div style={{ fontSize: "1.1rem" }}>{flag}</div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: accent,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}
