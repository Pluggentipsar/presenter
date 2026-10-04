"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AudiencePanel } from "./AudiencePanel";
import { SharePresentationPanel } from "./SharePresentationPanel";
import { VersionsPanel } from "./VersionsPanel";
import {
  setSlideEffect,
  setSlideGradient,
  setPresentationColor,
  getPresentationSource,
} from "@/lib/presentation-actions";
import { SlideDesignPanel } from "./design/SlideDesignPanel";
import { unpackEffect } from "./design/EffectPicker";
import type {
  ColorProp,
  ColorScope,
} from "./design/ColorOverridePicker";
import type { SlideMeta } from "@/lib/extract-slide-types";
import type { SliderEffectValue, SlideGradientValue, CutDef } from "@/lib/types";
import type { AudienceSession } from "@/lib/audience-session";
import type { Avsandarprofil, BrandingState } from "@/lib/avsandare";
import { getThemeList, type ThemeOverrideState } from "@/lib/theme-override";
import { getTheme } from "@/themes";

interface MenuOverlayProps {
  visible: boolean;
  onClose: () => void;
  slideMetas: SlideMeta[];
  totalSlides: number;
  currentIndex: number;
  totalSteps: number;
  slug: string;
  editTarget?: {slug: string; slideIndex: number};
  theme: string;
  onGoTo: (index: number) => void;
  onOpenPresenter: () => void;
  onToggleNotes: () => void;
  onToggleFullscreen: () => void;
  hasNotes: boolean;
  isFullscreenSupported: boolean;
  audience?: {
    supportsAudience: boolean;
    session: AudienceSession | null;
    starting: boolean;
    error: string | null;
    onStart: () => void;
    onEnd: () => void;
  };
  interactions?: {
    canStart: boolean;
    activeType: "quiz" | "reflection" | null;
    onStartQuiz: () => void;
    onStartReflection: () => void;
  };
  /** Trigger för PDF-export av hela presentationen som visuell PDF. */
  onExportPdf?: () => void | Promise<void>;
  /** Trigger för PowerPoint-export — slides som bilder + talarnotiser i anteckningsfältet. */
  onExportPptx?: () => void | Promise<void>;
  /** Tillfällig textredigering i webbläsaren — på/av. */
  inlineEditActive?: boolean;
  /** Toggle för tillfällig textredigering. */
  onToggleInlineEdit?: () => void;
  /** Öppna AddImageModal för att byta bakgrund på aktuell slide. */
  onChangeBackgroundImage?: () => void;
  /** Öppna AddVideoModal för att sätta videobakgrund på aktuell slide. */
  onChangeBackgroundVideo?: () => void;
  /** Sätt ett godtyckligt CSS-värde (platt färg) som bakgrund. */
  onSetBackgroundColor?: (cssValue: string) => void;
  /** Ta bort background-prop på aktuell slide (= återgå till temats default). */
  onResetBackground?: () => void;
  /** Sätt overlay (0-1) + light/dark på aktuell slide. */
  onSetOverlay?: (overlay: number, mode: "dark" | "light") => void;
  /** Sätt oskärpa (px) på aktuell slides bakgrundslager. 0 = ta bort. */
  onSetBlur?: (px: number) => void;
  /** Avsändarprofilen (lib/avsandarprofiler.ts) och dess aktiva läge. Utan profil visas inget kort. */
  brandingProfile?: Avsandarprofil;
  branding?: BrandingState;
  onBrandingChange?: (next: Partial<BrandingState>) => void;
  /** Tema-override (M-mode + T-tangent). */
  themeOverride?: ThemeOverrideState;
  /** Originalt tema från MDX-frontmatter. */
  frontmatterTheme?: string;
  onThemeOverrideChange?: (next: Partial<ThemeOverrideState>) => void;
  /** Versioner/cuts (kortare bågar) — redigeras i Versioner-panelen. */
  cuts?: CutDef[];
  /** Map slide-index (1-indexerat, string) → effekt-config (string eller {kind, color}). */
  sliderEffects?: Record<string, SliderEffectValue>;
  /** Map slide-index (1-indexerat, string) → gradient-bakgrund. */
  slideGradients?: Record<string, SlideGradientValue>;
  /** Map slide-index (1-indexerat, string) → hex-accentfärg. */
  slideAccents?: Record<string, string>;
  /** Map slide-index (1-indexerat, string) → hex-textfärg. */
  slideTextColors?: Record<string, string>;
  /** Map slide-index (1-indexerat, string) → hex för dämpad text. */
  slideMutedColors?: Record<string, string>;
  /** Global override för accent-färg över hela presentationen. */
  accentOverride?: string;
  /** Global override för text-färg över hela presentationen. */
  textOverride?: string;
  /** Global override för dämpad text över hela presentationen. */
  mutedOverride?: string;
}

export function MenuOverlay({
  visible,
  onClose,
  slideMetas,
  cuts = [],
  totalSlides,
  currentIndex,
  totalSteps,
  slug,
  editTarget,
  theme,
  onGoTo,
  onOpenPresenter,
  onToggleNotes,
  onToggleFullscreen,
  hasNotes,
  isFullscreenSupported,
  audience,
  interactions,
  onExportPdf,
  onExportPptx,
  inlineEditActive,
  onToggleInlineEdit,
  onChangeBackgroundImage,
  onChangeBackgroundVideo,
  onSetBackgroundColor,
  onResetBackground,
  onSetOverlay,
  onSetBlur,
  brandingProfile,
  branding,
  onBrandingChange,
  themeOverride,
  frontmatterTheme,
  onThemeOverrideChange,
  sliderEffects,
  slideGradients,
  slideAccents,
  slideTextColors,
  slideMutedColors,
  accentOverride,
  textOverride,
  mutedOverride,
}: MenuOverlayProps) {
  const [activePanel, setActivePanel] = useState<"live" | "design" | "share">(
    "live",
  );
  // Behåll menyn monterad efter första öppning så valt arbetsläge och
  // panelernas lokala live-state finns kvar när M stängs och öppnas igen.
  // `everOpened`: har menyn öppnats minst en gång? (innan dess: rendera inget)
  // `exitDone`: är stäng-animationen klar? (då kan vi sätta display:none)
  const [everOpened, setEverOpened] = useState(false);
  const [exitDone, setExitDone] = useState(true);

  // Rå MDX-källa för "Kopiera MDX". Hämtas i förväg när Dela-panelen visas så
  // att klicket kan skriva till urklipp synkront — en await mellan klick och
  // clipboard.writeText() kan kosta oss user activation i vissa webbläsare.
  const [mdxSource, setMdxSource] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setEverOpened(true);
      setExitDone(false);
      return;
    }
    // Menyn stängs — vänta ut stäng-animationen, sätt sedan display:none.
    // Timer (inte onAnimationComplete) så det funkar även om animationen
    // avbryts. Timern avbryts om menyn öppnas igen innan den hinner klart.
    const t = setTimeout(() => setExitDone(true), 360);
    return () => clearTimeout(t);
  }, [visible]);

  // Hämta om källan varje gång Dela-panelen öppnas — filen kan ha ändrats i
  // R-läget sedan förra gången menyn var uppe.
  useEffect(() => {
    if (!visible || activePanel !== "share" || !slug) return;
    let cancelled = false;
    void getPresentationSource(slug).then((res) => {
      if (cancelled) return;
      setMdxSource(res.ok && res.source ? res.source : null);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, activePanel, slug]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const flashCopyState = (state: "copied" | "error") => {
    setCopyState(state);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), 2200);
  };

  const handleCopyMdx = async () => {
    try {
      let source = mdxSource;
      if (!source) {
        const res = await getPresentationSource(slug);
        source = res.ok && res.source ? res.source : null;
        setMdxSource(source);
      }
      if (!source) {
        flashCopyState("error");
        return;
      }
      await navigator.clipboard.writeText(source);
      flashCopyState("copied");
    } catch {
      flashCopyState("error");
    }
  };

  const effectiveTheme = themeOverride?.enabled
    ? themeOverride.themeName
    : (frontmatterTheme ?? theme);

  const showAppearance =
    Boolean(themeOverride && onThemeOverrideChange) ||
    Boolean(brandingProfile && branding && onBrandingChange);
  const showSlideBg = Boolean(
    onChangeBackgroundImage || onResetBackground || onSetOverlay || slug,
  );

  // Innan menyn öppnats första gången: rendera ingenting alls.
  if (!everOpened) return null;

  // `displayed` är true så länge menyn syns ELLER stäng-animationen pågår.
  // När false sätts display:none — menyn (med previews) ligger kvar i DOM.
  const displayed = visible || !exitDone;

  return (
    <div style={{ display: displayed ? "block" : "none" }}>
      {/* Backdrop — fixed, viewport-bunden så den täcker även när man scrollar.
          Konsekvent mörk över hela ytan så meny-content alltid har god kontrast
          oavsett bakgrundens slide-färg och scroll-position. */}
      <motion.div
        className="fixed inset-0 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.22 }}
        style={{
          background: "rgba(8,8,14,0.94)",
          backdropFilter: "blur(20px) saturate(130%)",
          WebkitBackdropFilter: "blur(20px) saturate(130%)",
          pointerEvents: visible ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* Scrollable content layer */}
      <motion.div
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden"
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: visible ? 0 : 14, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: visible ? "auto" : "none" }}
        onClick={onClose}
      >
            <div
              className="relative mx-auto max-w-6xl px-6 pb-16 md:px-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-30 -mx-6 px-6 md:-mx-10 md:px-10">
                <div
                  className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-5"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(8,8,14,0.88) 0%, rgba(8,8,14,0.55) 100%)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 8px 24px var(--accent-glow)",
                      }}
                    >
                      <span className="font-mono text-sm font-bold text-white">
                        M
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[10px] font-semibold uppercase tracking-[0.34em]"
                        style={{ color: "var(--accent)" }}
                      >
                        Meny
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2.5 text-sm">
                        <span className="font-mono font-semibold text-white">
                          {currentIndex + 1}
                          <span className="mx-1 opacity-40">/</span>
                          {totalSlides}
                        </span>
                        {totalSteps > 0 && (
                          <span className="text-white/65">
                            · {totalSteps} steg
                          </span>
                        )}
                        <span className="hidden text-white/65 sm:inline">
                          · tema:{" "}
                          <span className="font-mono text-white">
                            {effectiveTheme}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/65 transition-all hover:border-accent hover:bg-accent/[0.08] hover:text-accent"
                  >
                    <span>Stäng</span>
                    <Kbd>ESC</Kbd>
                  </button>
                </div>
                <div
                  className="flex items-center gap-1 border-b border-white/[0.06] pb-3 pt-2"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(8,8,14,0.55), rgba(8,8,14,0.88))",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                  }}
                >
                  {(
                    [
                      ["live", "Live", "Framförande och publik"],
                      ["design", "Design", "Aktuell slide och tema"],
                      ["share", "Dela", "Länkar och export"],
                    ] as const
                  ).map(([id, label, hint]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActivePanel(id)}
                      title={hint}
                      aria-pressed={activePanel === id}
                      className={`rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        activePanel === id
                          ? "border-accent/50 bg-accent/15 text-accent"
                          : "border-transparent text-white/55 hover:border-white/15 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <Link
                    href={`/${slug}/studio`}
                    className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    <IconStoryboard />
                    Storyboard
                  </Link>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-10">
                {activePanel === "live" ? (
                  <Section eyebrow="Live" title="Framförande">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
                    <MenuAction
                      icon={<IconPresenter />}
                      label="Presenter mode"
                      hint="Öppnar i nytt fönster"
                      onClick={() => {
                        onOpenPresenter();
                        onClose();
                      }}
                    />
                    <MenuAction
                      icon={<IconNotes />}
                      label="Speaker notes"
                      hint={hasNotes ? "Tryck N" : "Inga notes här"}
                      onClick={() => {
                        onToggleNotes();
                        onClose();
                      }}
                      disabled={!hasNotes}
                    />
                    <MenuAction
                      icon={<IconFullscreen />}
                      label="Fullscreen"
                      hint="Tryck F"
                      onClick={() => {
                        onToggleFullscreen();
                        onClose();
                      }}
                      disabled={!isFullscreenSupported}
                    />
                    <MenuActionLink
                      href={`/${slug}/studio`}
                      icon={<IconStoryboard />}
                      label="Storyboard"
                      hint="Översikt & struktur"
                    />
                    <MenuActionLink
                      href={`/${editTarget?.slug ?? slug}/edit?slide=${(editTarget?.slideIndex ?? currentIndex) + 1}`}
                      icon={<IconEdit />}
                      label="Redigera"
                      hint="Editor på denna slide"
                    />
                    </div>
                  </Section>
                ) : null}

                {activePanel === "design" && onToggleInlineEdit ? (
                  <Section eyebrow="Direkt" title="Snabbredigering">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <MenuAction
                        icon={<IconEditText />}
                        label={
                          inlineEditActive
                            ? "Sluta redigera text"
                            : "Redigera text direkt"
                        }
                        hint={
                          inlineEditActive
                            ? "Tillfällig redigering är aktiv"
                            : "Klicka på text i den visade sliden"
                        }
                        onClick={onToggleInlineEdit}
                      />
                      <MenuActionLink
                        href={`/${editTarget?.slug ?? slug}/edit?slide=${(editTarget?.slideIndex ?? currentIndex) + 1}`}
                        icon={<IconEdit />}
                        label="Öppna R-editorn"
                        hint="Granulär redigering av aktuell slide"
                      />
                    </div>
                  </Section>
                ) : null}

                {activePanel === "design" && showSlideBg && slug ? (
                  <Section
                    eyebrow={`Slide ${currentIndex + 1}`}
                    title="Design på denna slide"
                    hint="Samma kontroller finns i R-läget under Design."
                  >
                    <MenuSlideDesign
                      key={`design-${currentIndex}`}
                      slug={editTarget?.slug ?? slug}
                      slideIndex1Based={(editTarget?.slideIndex ?? currentIndex) + 1}
                      meta={slideMetas[currentIndex]}
                      themeBackground={getTheme(effectiveTheme).bg}
                      gradient={
                        slideGradients?.[String(currentIndex + 1)] ?? null
                      }
                      effect={sliderEffects?.[String(currentIndex + 1)] ?? null}
                      slideAccent={slideAccents?.[String(currentIndex + 1)]}
                      slideText={slideTextColors?.[String(currentIndex + 1)]}
                      slideMuted={slideMutedColors?.[String(currentIndex + 1)]}
                      globalAccent={accentOverride}
                      globalText={textOverride}
                      globalMuted={mutedOverride}
                      onChangeBackgroundImage={onChangeBackgroundImage}
                      onChangeBackgroundVideo={onChangeBackgroundVideo}
                      onSetBackgroundColor={onSetBackgroundColor}
                      onResetBackground={onResetBackground}
                      onSetOverlay={onSetOverlay}
                      onSetBlur={onSetBlur}
                    />
                  </Section>
                ) : null}

                {activePanel === "design" && showAppearance ? (
                  <Section eyebrow="Utseende" title="Tema & varumärke">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {themeOverride && onThemeOverrideChange ? (
                        <ThemeOverrideCard
                          themeOverride={themeOverride}
                          frontmatterTheme={frontmatterTheme ?? theme}
                          effectiveTheme={effectiveTheme}
                          onChange={onThemeOverrideChange}
                        />
                      ) : null}
                      {brandingProfile && branding && onBrandingChange ? (
                        <BrandingCard
                          profil={brandingProfile}
                          branding={branding}
                          onChange={onBrandingChange}
                        />
                      ) : null}
                    </div>
                  </Section>
                ) : null}

                {activePanel === "live" && audience ? (
                  <AudiencePanel
                    supportsAudience={audience.supportsAudience}
                    session={audience.session}
                    starting={audience.starting}
                    error={audience.error}
                    onStart={audience.onStart}
                    onEnd={audience.onEnd}
                  />
                ) : null}

                {activePanel === "live" && interactions ? (
                  <Section eyebrow="Live" title="Interaktivitet">
                    {!interactions.canStart ? (
                      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.05] p-5 text-sm text-white/65">
                        Starta publikläget först — quiz och reflektioner går via
                        samma session.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <InteractionStartButton
                          label="Starta quiz"
                          hint="Flervalsfråga, live-resultat"
                          icon={<IconQuiz />}
                          disabled={interactions.activeType === "quiz"}
                          running={interactions.activeType === "quiz"}
                          onClick={() => {
                            interactions.onStartQuiz();
                            onClose();
                          }}
                        />
                        <InteractionStartButton
                          label="Starta reflektion"
                          hint="Öppen fråga, fri text"
                          icon={<IconReflection />}
                          disabled={interactions.activeType === "reflection"}
                          running={interactions.activeType === "reflection"}
                          onClick={() => {
                            interactions.onStartReflection();
                            onClose();
                          }}
                        />
                      </div>
                    )}
                  </Section>
                ) : null}

                {activePanel === "share" ? (
                  <>
                    <Section eyebrow="Export" title="Ta presentationen vidare">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {onExportPdf ? (
                          <MenuAction
                            icon={<IconPdf />}
                            label="Spara som PDF"
                            hint="Visuell kopia av hela presentationen"
                            onClick={() => void onExportPdf()}
                          />
                        ) : null}
                        {onExportPptx ? (
                          <MenuAction
                            icon={<IconPptx />}
                            label="Spara som PowerPoint"
                            hint="Design + redigerbar text"
                            onClick={() => void onExportPptx()}
                          />
                        ) : null}
                        {!editTarget && <MenuAction
                          icon={<IconPptx />}
                          label="Redigerbar PowerPoint"
                          hint="Förenklad layout med textrutor"
                          onClick={() => {
                            window.location.assign(`/api/pptx/${slug}`);
                          }}
                        />}
                        {!editTarget && <MenuAction
                          icon={
                            copyState === "copied" ? <IconCheck /> : <IconCopy />
                          }
                          label={
                            copyState === "copied"
                              ? "Kopierad"
                              : "Kopiera MDX"
                          }
                          hint={
                            copyState === "copied"
                              ? "Klistra in i chatbotten"
                              : copyState === "error"
                                ? "Kunde inte kopiera — testa igen"
                                : mdxSource
                                  ? `Hela källfilen · ${totalSlides} slides · ${Math.round(mdxSource.length / 1024)} kB`
                                  : "Hela källfilen — text, notes, frontmatter"
                          }
                          onClick={() => void handleCopyMdx()}
                        />}
                      </div>
                    </Section>
                    {editTarget ? <p className="text-sm text-white/70">Dela elevlänken från lektionsbyggaren. Den behåller lektionsserien och era valda aktiviteter.</p> : <SharePresentationPanel slug={slug} />}
                  </>
                ) : null}

                {activePanel === "live" && slug && !editTarget ? (
                  <Section eyebrow="Tempo" title="Versioner">
                    <VersionsPanel
                      slug={slug}
                      cuts={cuts}
                      slideMetas={slideMetas}
                      onGoTo={onGoTo}
                    />
                  </Section>
                ) : null}

                {activePanel === "live" ? (
                  <Section eyebrow="Tangenter" title="Kortkommandon">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      <Shortcut keys={["→", "Space"]} label="Nästa" />
                      <Shortcut keys={["←"]} label="Föregående" />
                      <Shortcut keys={["Home", "End"]} label="Första/sista" />
                      <Shortcut keys={["F"]} label="Fullscreen" />
                      <Shortcut keys={["N"]} label="Speaker notes" />
                      <Shortcut keys={["M"]} label="Denna meny" />
                      <Shortcut keys={["R"]} label="Redigera-läge" />
                      <Shortcut keys={["T"]} label="Cykla tema" />
                      <Shortcut keys={["Shift", "T"]} label="Deckets eget tema" />
                      <Shortcut keys={["K"]} label="Cykla versioner" />
                      <Shortcut keys={["J"]} label="Nästa tidsmarkör" />
                      <Shortcut keys={["L"]} label="Landning · 10 min kvar" />
                      <Shortcut keys={["ESC"]} label="Stäng meny" />
                    </div>
                  </Section>
                ) : null}

                <div className="border-t border-white/[0.06] pt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/65 transition-colors hover:text-accent"
                  >
                    ← Alla presentationer
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
    </div>
  );
}

/* ── Layout primitives ─────────────────────────────────────────────────── */

function Section({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.34em]"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </div>
        <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
        {hint && (
          <div className="mt-1 text-xs text-text-muted">{hint}</div>
        )}
      </div>
      {children}
    </section>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.12] bg-white/[0.05] p-5 transition-colors hover:border-white/15 md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Theme override card ───────────────────────────────────────────────── */

function ThemeOverrideCard({
  themeOverride,
  frontmatterTheme,
  effectiveTheme,
  onChange,
}: {
  themeOverride: ThemeOverrideState;
  frontmatterTheme: string;
  effectiveTheme: string;
  onChange: (next: Partial<ThemeOverrideState>) => void;
}) {
  const themes = getThemeList();
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
            <span>Byt tema live</span>
            <Kbd>T</Kbd>
            <span className="text-xs font-normal text-white/65">
              cyklar
            </span>
          </div>
          <div className="mt-1.5 text-xs text-white/65">
            Original:{" "}
            <span className="font-mono text-white">{frontmatterTheme}</span>
            {themeOverride.enabled && effectiveTheme !== frontmatterTheme ? (
              <>
                {" "}
                · nu:{" "}
                <span
                  className="font-mono"
                  style={{ color: "var(--accent)" }}
                >
                  {effectiveTheme}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <Switch
          checked={themeOverride.enabled}
          onChange={() => onChange({ enabled: !themeOverride.enabled })}
          label="Slå på tema-override"
        />
      </div>

      <AnimatePresence initial={false}>
        {themeOverride.enabled ? (
          <motion.div
            key="theme-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {themes.map((t) => {
                const active = themeOverride.themeName === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange({ themeName: t.id })}
                    className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                      active
                        ? "border-accent/60 bg-accent/[0.08]"
                        : "border-white/[0.08] bg-transparent hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                    style={
                      active
                        ? {
                            boxShadow:
                              "inset 0 0 0 1px var(--accent-dim), 0 4px 12px var(--accent-glow)",
                          }
                        : undefined
                    }
                    title={t.id}
                  >
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{
                        background: t.accent,
                        boxShadow: active
                          ? "0 0 0 2px rgba(255,255,255,0.55)"
                          : "0 0 0 1px rgba(255,255,255,0.18)",
                      }}
                    />
                    <span
                      className={`truncate ${
                        active ? "font-medium text-white" : "text-white/65"
                      }`}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

/* ── Branding card ─────────────────────────────────────────────────────── */

function BrandingCard({
  profil,
  branding,
  onChange,
}: {
  profil: Avsandarprofil;
  branding: BrandingState;
  onChange: (next: Partial<BrandingState>) => void;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white">
            {profil.rubrik}
          </div>
          <div className="mt-1.5 text-xs text-white/65">
            {profil.beskrivning}
          </div>
        </div>
        <Switch
          checked={branding.enabled}
          onChange={() => onChange({ enabled: !branding.enabled })}
          label={profil.knapp}
        />
      </div>

      <AnimatePresence initial={false}>
        {branding.enabled ? (
          <motion.div
            key="branding-options"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex items-center gap-2 text-xs text-white/80">
                <input type="checkbox" checked={branding.footerOnly ?? false} onChange={(event) => onChange({ footerOnly: event.target.checked })} />
                Behåll temats färger och typsnitt
              </label>
              {!branding.footerOnly && <div className="flex flex-wrap gap-1.5">
                {profil.ordning.map((key) => {
                  const c = profil.palett[key];
                  const active = branding.accent === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onChange({ accent: key })}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all ${
                        active
                          ? "border-white/40 bg-white/[0.08]"
                          : "border-white/[0.08] bg-transparent hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                      title={c.label}
                    >
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-sm"
                        style={{
                          background: c.primary,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                        }}
                      />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/65">
                  Bård-ton
                </span>
                {(["auto", "light", "dark"] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => onChange({ footerTone: tone })}
                    className={`rounded-md border px-2.5 py-1 text-xs transition-all ${
                      branding.footerTone === tone
                        ? "border-accent/60 bg-accent/[0.08] text-white"
                        : "border-white/[0.08] text-white/65 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {tone === "auto" ? "Auto" : tone === "light" ? "Ljus" : "Mörk"}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

/* ── Switch — robust, a11y, ingen escape ───────────────────────────────── */

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        checked
          ? "bg-accent"
          : "bg-white/10 hover:bg-white/15"
      }`}
      style={
        checked
          ? { boxShadow: "0 0 0 1px var(--accent-dim), 0 4px 12px var(--accent-glow)" }
          : undefined
      }
    >
      <span
        aria-hidden
        className={`block h-5 w-5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

/* ── Action cards ──────────────────────────────────────────────────────── */

function MenuAction({
  icon,
  label,
  hint,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-start gap-2.5 overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 text-left transition-all hover:border-accent/40 hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/[0.12] disabled:hover:bg-white/[0.05]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-0"
        style={{
          background:
            "radial-gradient(140% 80% at 100% 0%, var(--accent-dim) 0%, transparent 60%)",
        }}
      />
      <div className="relative text-white/65 transition-colors group-hover:text-accent group-disabled:text-white/65">
        {icon}
      </div>
      <div className="relative">
        <div className="text-sm font-medium text-white">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-white/65">{hint}</div>
        ) : null}
      </div>
    </button>
  );
}

function MenuActionLink({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-start gap-2.5 overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.05] p-4 text-left transition-all hover:border-accent/40 hover:bg-white/[0.10]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(140% 80% at 100% 0%, var(--accent-dim) 0%, transparent 60%)",
        }}
      />
      <div className="relative text-white/65 transition-colors group-hover:text-accent">
        {icon}
      </div>
      <div className="relative">
        <div className="text-sm font-medium text-white">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-white/65">{hint}</div>
        ) : null}
      </div>
    </Link>
  );
}

function InteractionStartButton({
  label,
  hint,
  icon,
  disabled,
  running,
  onClick,
}: {
  label: string;
  hint: string;
  icon: ReactNode;
  disabled: boolean;
  running: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-all ${
        running
          ? "border-accent/60 bg-accent/[0.08]"
          : "border-white/[0.12] bg-white/[0.05] hover:border-accent/40 hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-40"
      }`}
      style={
        running
          ? { boxShadow: "0 0 0 1px var(--accent-dim), 0 8px 24px var(--accent-glow)" }
          : undefined
      }
    >
      <div
        className={
          running
            ? "text-accent"
            : "text-white/65 transition-colors group-hover:text-accent"
        }
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-white">
          {running ? `${label} pågår` : label}
        </div>
        <div className="mt-0.5 text-xs text-white/65">{hint}</div>
      </div>
    </button>
  );
}

/* ── Keyboard chips ────────────────────────────────────────────────────── */

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white"
      style={{
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.25)",
      }}
    >
      {children}
    </kbd>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1">
            {i > 0 ? (
              <span className="text-white/40 text-xs">·</span>
            ) : null}
            <Kbd>{k}</Kbd>
          </span>
        ))}
      </div>
      <span className="text-sm text-white/65">{label}</span>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function IconQuiz() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function IconReflection() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="13" y2="14" />
    </svg>
  );
}

function IconPresenter() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconNotes() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  );
}

function IconFullscreen() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconStoryboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="4" width="8" height="6" rx="1.2" />
      <rect x="13" y="4" width="8" height="6" rx="1.2" />
      <rect x="3" y="14" width="8" height="6" rx="1.2" />
      <rect x="13" y="14" width="8" height="6" rx="1.2" />
    </svg>
  );
}

function IconPdf() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h1.5a1.5 1.5 0 1 1 0 3H9v-3z" />
      <path d="M9 13v5" />
      <path d="M14 13h2v5" />
      <path d="M14 16h2" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

function IconEditText() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V5h12v2" />
      <path d="M10 5v10" />
      <path d="M8 15h4" />
      <path d="M17.5 12.5l3 3L14 22h-3v-3z" />
    </svg>
  );
}

function IconPptx() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h2a1.75 1.75 0 1 1 0 3.5H9V13z" />
      <path d="M9 13v5" />
      <circle cx="15.5" cy="15.75" r="1.75" />
    </svg>
  );
}

/* ── M-lägets commit-adapter för den delade designpanelen ──────────────── */

/**
 * Kopplar SlideDesignPanel till M-lägets server actions.
 *
 * Allt som skiljer M-läget från R-läget bor här: optimistic state, debounce
 * under slider-drag och router.refresh() efter varje skrivning. Kontrollerna
 * själva vet ingenting om det — de tar värden och rapporterar värden.
 *
 * OBS: den här vägen skriver direkt till disk. R-läget MÅSTE gå via editorns
 * setParsed i stället, annars slåss de två om samma fil och editorns
 * revisionskontroll löser ut mitt i en session.
 */
function MenuSlideDesign({
  slug,
  slideIndex1Based,
  meta,
  themeBackground,
  gradient,
  effect,
  slideAccent,
  slideText,
  slideMuted,
  globalAccent,
  globalText,
  globalMuted,
  onChangeBackgroundImage,
  onChangeBackgroundVideo,
  onSetBackgroundColor,
  onResetBackground,
  onSetOverlay,
  onSetBlur,
}: {
  slug: string;
  slideIndex1Based: number;
  meta?: SlideMeta;
  themeBackground?: string;
  gradient: SlideGradientValue | null;
  effect: SliderEffectValue | null;
  slideAccent?: string;
  slideText?: string;
  slideMuted?: string;
  globalAccent?: string;
  globalText?: string;
  globalMuted?: string;
  onChangeBackgroundImage?: () => void;
  onChangeBackgroundVideo?: () => void;
  onSetBackgroundColor?: (cssValue: string) => void;
  onResetBackground?: () => void;
  onSetOverlay?: (overlay: number, mode: "dark" | "light") => void;
  onSetBlur?: (px: number) => void;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  // undefined = inte rört sedan senaste server-svar; annars vårt eget värde.
  const [optimisticGradient, setOptimisticGradient] = useState<
    SlideGradientValue | null | undefined
  >(undefined);
  const [optimisticEffect, setOptimisticEffect] = useState<
    SliderEffectValue | null | undefined
  >(undefined);
  const gradientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const effectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (gradientTimer.current) clearTimeout(gradientTimer.current);
      if (effectTimer.current) clearTimeout(effectTimer.current);
    },
    [],
  );

  const commitGradient = (value: SlideGradientValue | null) => {
    startTransition(async () => {
      const res = await setSlideGradient(slug, slideIndex1Based, value);
      if (res.ok) router.refresh();
      else setOptimisticGradient(undefined);
    });
  };

  const handleGradientChange = (
    value: SlideGradientValue | null,
    continuous?: boolean,
  ) => {
    setOptimisticGradient(value);
    if (gradientTimer.current) clearTimeout(gradientTimer.current);
    if (continuous) {
      // Drag i vinkel-slidern eller färgväljaren spammar inte disk.
      gradientTimer.current = setTimeout(() => {
        gradientTimer.current = null;
        commitGradient(value);
      }, 300);
      return;
    }
    gradientTimer.current = null;
    commitGradient(value);
  };

  const commitEffect = (value: SliderEffectValue | null) => {
    const { kind, color, opacity, speed } = unpackEffect(value);
    startTransition(async () => {
      const res = await setSlideEffect(
        slug,
        slideIndex1Based,
        kind,
        color,
        opacity,
        speed,
      );
      if (res.ok) router.refresh();
      else setOptimisticEffect(undefined);
    });
  };

  const handleEffectChange = (
    value: SliderEffectValue | null,
    continuous?: boolean,
  ) => {
    setOptimisticEffect(value);
    if (effectTimer.current) clearTimeout(effectTimer.current);
    if (continuous) {
      effectTimer.current = setTimeout(() => {
        effectTimer.current = null;
        commitEffect(value);
      }, 280);
      return;
    }
    effectTimer.current = null;
    commitEffect(value);
  };

  const handleColorChange = (
    prop: ColorProp,
    value: string | null,
    scope: ColorScope,
  ) => {
    startTransition(async () => {
      const target = scope === "slide" ? slideIndex1Based : ("all" as const);
      const res = await setPresentationColor(slug, target, prop, value);
      if (res.ok) router.refresh();
    });
  };

  const handleResetAll = () => {
    setOptimisticGradient(null);
    setOptimisticEffect(null);
    startTransition(async () => {
      await setSlideGradient(slug, slideIndex1Based, null);
      await setSlideEffect(slug, slideIndex1Based, null, null, null, null);
      await setPresentationColor(slug, slideIndex1Based, "accent", null);
      await setPresentationColor(slug, slideIndex1Based, "text", null);
      await setPresentationColor(slug, slideIndex1Based, "muted", null);
      onSetOverlay?.(0, "dark");
      onSetBlur?.(0);
      onResetBackground?.();
      router.refresh();
    });
  };

  const effectiveGradient =
    optimisticGradient !== undefined ? optimisticGradient : gradient;
  const effectiveEffect =
    optimisticEffect !== undefined ? optimisticEffect : effect;

  return (
    <SlideDesignPanel
      background={meta?.background}
      overlay={meta?.overlay}
      overlayMode={meta?.overlayMode}
      blur={meta?.backgroundBlur}
      gradient={effectiveGradient}
      effect={effectiveEffect}
      slideAccent={slideAccent}
      slideText={slideText}
      slideMuted={slideMuted}
      globalAccent={globalAccent}
      globalText={globalText}
      globalMuted={globalMuted}
      themeBackground={themeBackground}
      onPickBackgroundImage={() => onChangeBackgroundImage?.()}
      onPickBackgroundVideo={() => onChangeBackgroundVideo?.()}
      onSetBackgroundColor={(value) => onSetBackgroundColor?.(value)}
      onClearBackground={() => onResetBackground?.()}
      onSetOverlay={(value, mode) => onSetOverlay?.(value, mode)}
      onSetBlur={onSetBlur ? (px) => onSetBlur(px) : undefined}
      onGradientChange={handleGradientChange}
      onEffectChange={handleEffectChange}
      onColorChange={handleColorChange}
      onResetAll={handleResetAll}
      busy={busy}
    />
  );
}
