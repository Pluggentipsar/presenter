"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SlideTargetContext } from "@/lib/slide-target";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { ReactElement, ReactNode } from "react";
import { NotesOverlay } from "./NotesOverlay";
import { MenuOverlay } from "./MenuOverlay";
import { SlideEffectLayer, type SlideEffect } from "./SlideEffectLayer";
import { SlideGradientLayer } from "./SlideGradientLayer";
import { resolveGradient } from "@/lib/gradient-presets";
import { QuestionsOverlay } from "./QuestionsOverlay";
import { InteractionStartModal } from "./InteractionStartModal";
import { InteractionPresenterPanel } from "./InteractionPresenterPanel";
import { AddImageModal } from "./editor/AddImageModal";
import { getPresenterChannel, type PresenterMessage } from "@/lib/presenter-sync";
import { usePresenterSession } from "@/lib/use-presenter-session";
import { usePresenterInteractions } from "@/lib/use-presenter-interactions";
import { updateSlideProp } from "@/lib/edit-actions";
import type { InteractionType } from "@/lib/interactions";
import type { StepController } from "@/lib/slide-steps";
import { SlideWithSteps } from "./SlideWithSteps";
import { AmbientParticles } from "./AmbientParticles";
import type { SlideMeta } from "@/lib/extract-slide-types";
import type {
  BrandWatermark,
  SlideGradientValue,
  SliderEffectValue,
} from "@/lib/types";
import type { CutDef } from "@/lib/types";
import { AvsandarFooter } from "./AvsandarFooter";
import { LinjenRoute } from "./LinjenRoute";
import { linjenSky } from "@/lib/linjen";
import { getTheme } from "@/themes";
import { VoiceLine } from "./VoiceLine";
import { VatterWorld } from "@/templates/stage/world";
import { SkalaWorld, skalaFor, zoomMove } from "@/templates/stage/skala";
import { worldOfTheme } from "@/templates/stage/kit";
import { WorldContext, createWorldStore } from "@/templates/stage/world-store";
import {
  brandingCssOverrides,
  defaultBranding,
  initialBranding,
  loadBranding,
  saveBranding,
  type BrandingState,
} from "@/lib/avsandare";
import { avsandarprofiler } from "@/lib/avsandarprofiler";

/** Avsändarprofilen som M-menyn kan slå på (lib/avsandarprofiler.ts). Utan profil finns ingen bård. */
const avsandare = avsandarprofiler[0];
import {
  cycleNextTheme,
  DEFAULT_THEME_OVERRIDE,
  loadThemeOverride,
  saveThemeOverride,
  themeOverrideCssVars,
  type ThemeOverrideState,
} from "@/lib/theme-override";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { SlideNotesProvider } from "@/lib/slide-notes";
import { RecordingPanel } from "@/components/recording/RecordingPanel";
import type { RecorderPosition } from "@/lib/recording/recorder";

interface SlideViewerProps {
  children: ReactNode;
  syncId?: string;
  editTargets?: {slug: string; slideIndex: number}[];
  notes?: (string | null)[];
  slideMetas?: SlideMeta[];
  slug?: string;
  theme?: string;
  title?: string;
  brand?: BrandWatermark;
  ambient?: boolean | string;
  /** 1-indexerade slide-nummer som ska hoppas över i presenter-läget. */
  hiddenSlides?: number[];
  /** Versioner/cuts (kortare bågar). K cyklar full → versioner → full. Tom = ingen toggle. */
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
  /** Global accent-override över hela presentationen. */
  accentOverride?: string;
  /** Global text-override över hela presentationen. */
  textOverride?: string;
  /** Global muted-override över hela presentationen. */
  mutedOverride?: string;
}

export function SlideViewer({
  children,
  editTargets,
  syncId,
  notes = [],
  slideMetas = [],
  slug = "",
  theme = "default",
  title,
  brand,
  ambient = false,
  hiddenSlides = [],
  cuts = [],
  sliderEffects,
  slideGradients,
  slideAccents,
  slideTextColors,
  slideMutedColors,
  accentOverride,
  textOverride,
  mutedOverride,
}: SlideViewerProps) {
  const reducedMotion = useReducedMotion();
  // Snabb lookup för "är denna slide dold?". 1-indexerat → 0-indexerat
  // konvertering sker när vi anropar.
  const hiddenSet = useMemo(
    () => new Set(hiddenSlides.map((n) => n - 1)),
    [hiddenSlides],
  );

  // Versioner ("cuts"): K cyklar full → version 1 → … → full. En slide taggad
  // {/* cut-skip: <id> */} i MDX:en (→ slideMetas[i].cutSkip) döljs i just den
  // versionen. activeCut = -1 = full (inga extra döljs). Otaggat = med överallt.
  const [activeCut, setActiveCut] = useState(-1);
  const activeCutId =
    activeCut >= 0 && activeCut < cuts.length ? cuts[activeCut].id : null;
  const cutHidden = useMemo(() => {
    if (!activeCutId) return new Set<number>();
    return new Set(
      slideMetas.flatMap((m, i) =>
        m?.cutSkip?.includes(activeCutId) ? [i] : [],
      ),
    );
  }, [slideMetas, activeCutId]);
  const effectiveHidden = useMemo(
    () => (cutHidden.size ? new Set([...hiddenSet, ...cutHidden]) : hiddenSet),
    [hiddenSet, cutHidden],
  );
  const cycleCut = useCallback(
    () => setActiveCut((c) => (c + 1 >= cuts.length ? -1 : c + 1)),
    [cuts.length],
  );

  /**
   * Hitta nästa synlig slide-index i en given riktning. Returnerar `null`
   * om vi är i slutet/början (ingen mer synlig slide finns).
   */
  const findNextVisible = (from: number, dir: 1 | -1, max: number): number | null => {
    let i = from;
    while (true) {
      i += dir;
      if (i < 0 || i >= max) return null;
      if (!effectiveHidden.has(i)) return i;
    }
  };
  const slides = useMemo(
    () =>
      Children.toArray(children).filter((child) =>
        isValidElement(child)
      ) as ReactElement[],
    [children]
  );
  const total = slides.length;

  const [index, setIndex] = useState(0);
  const sceneGroup = slideMetas[index]?.sceneGroup;
  let groupStart = index;
  if (sceneGroup) while (groupStart > 0
    && slideMetas[groupStart - 1]?.sceneGroup === sceneGroup
    && slideMetas[groupStart - 1]?.templateName === slideMetas[index]?.templateName) groupStart--;
  const sceneKey = sceneGroup ? `room:${groupStart}:${sceneGroup}` : index;
  const editSlug = editTargets?.[index]?.slug ?? slug;
  const editIndex = editTargets?.[index]?.slideIndex ?? index;
  const [direction, setDirection] = useState(1);
  // Hopp (menyn, L, J) i stället för framåt/bakåt: resan i AI och du tonar då bara.
  const [jumped, setJumped] = useState(false);
  // Målet för pågående övergång. Scener som flyger mellan platser (VemScene)
  // läser det även under utgången; se lib/slide-target.ts.
  const targetScene = slideMetas[index]?.scene;
  // Resan i AI och du: decket i Solkraft reser mellan scenerna. Decket styr,
  // inte T, så resan följer med när färgerna byts. Andra föreläsningar lånar
  // scenerna men behåller sina övergångar.
  const sceneTravel = theme === "elever_solkraft";
  // Vätterresan: ett deck med `resa=` på någon Stage låter
  // sjön ligga kvar mellan slides. Förgrunden reser till en slide i dess `resa`
  // (in vid kapitel, upp vid återkomst, stilla för frågor); utan `resa` nedåt.
  // Decket styr, inte T. Rektorsinternatet och andra deck utan `resa` behåller
  // spelarens vanliga toning. Se templates/stage/world.tsx.
  const vatterDeck = useMemo(() => slideMetas.some(m => m.templateName === "Stage" && m.resa), [slideMetas]);
  // Tiopotenserna: samma resa, men världen är zoomen i stället för sjön (skala.tsx).
  const skalaDeck = useMemo(() => vatterDeck && slideMetas.some(m => m.templateName === "Stage" && m.skala), [vatterDeck, slideMetas]);
  const vatterSlide = vatterDeck && slideMetas[index]?.templateName === "Stage";
  const worldStore = useMemo(() => createWorldStore(), []);
  // Tiopotenserna (rörelsepasset 1 oktober): utan eget `resa` följer förgrunden zoomen, in när
  // kameran zoomar in och ut när den zoomar ut. Världen står kvar på förra slidens nivå när
  // målet byts, så riktningen läses en gång per slidebyte.
  const zoomEntry = useMemo(() => skalaDeck ? zoomMove(worldStore.get().skala, skalaFor(slideMetas[index]?.skala ?? "", 0)) : null, [skalaDeck, worldStore, slideMetas, index]);
  const vatterMove = vatterSlide ? slideMetas[index]?.resa ?? zoomEntry ?? "ner" : undefined;
  const slideTarget = useMemo(() => ({ index, scene: targetScene, direction, travel: sceneTravel, jump: jumped, move: vatterMove }), [index, targetScene, direction, sceneTravel, jumped, vatterMove]);
  // These scenes animate their own text and media. Keep their canvas visible
  // through the exit instead of fading away the whole choreography at once.
  const sceneChoreography = ["LectureScene", "LectureSequence", "TrustScene", "VemScene"].includes(slideMetas[index]?.templateName ?? "")
    || vatterSlide
    || (slideMetas[index]?.templateName === "ElevLectureScene"
    && (sceneTravel || ["media", "protein", "possibility-chapter"].includes(slideMetas[index]?.scene ?? "")));
  // Rörelseriktningen skiljer inte ett bakåtklick från ett explicit menyhopp.
  // Bara ett vanligt bakåtbyte ska öppna föregående slides sista steg.
  const [stepEntry, setStepEntry] = useState<"first" | "last">("first");
  const [notesVisible, setNotesVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  // R-läget ligger ovanpå presentationen i stället för att navigera bort.
  // Då förblir presentationens live-state och M-menyn monterade.
  const [editorVisible, setEditorVisible] = useState(false);

  // Avsändarens bård (M-mode toggle). Profilen anger teman där den är på från början, till
  // exempel en kommuns flaggning i kommunens eget tema.
  const [branding, setBrandingState] = useState<BrandingState>(() => initialBranding(avsandare, theme));

  // Hydrera från localStorage på client (per slug)
  useEffect(() => {
    if (!slug) return;
    const stored = loadBranding(avsandare, slug);
    const fallback = defaultBranding(avsandare);
    // Hoppa bara över hydrering om vi vet att inget sparats — annars använd det sparade
    if (
      stored.enabled !== fallback.enabled ||
      stored.accent !== fallback.accent ||
      stored.footerTone !== fallback.footerTone ||
      stored.footerOnly !== undefined
    ) {
      setBrandingState(stored);
    }
  }, [slug]);

  const setBranding = useCallback(
    (next: Partial<BrandingState>) => {
      setBrandingState((prev) => {
        const merged = { ...prev, ...next };
        if (slug) saveBranding(avsandare, slug, merged);
        return merged;
      });
    },
    [slug]
  );

  const brandingOverrides = useMemo(
    () => brandingCssOverrides(avsandare, branding),
    [branding]
  );

  // Tema-override (M-mode + T-tangent). Skriver över ALLA temats CSS-variabler.
  const [themeOverride, setThemeOverrideState] = useState<ThemeOverrideState>(
    DEFAULT_THEME_OVERRIDE
  );

  useEffect(() => {
    if (!slug) return;
    const stored = loadThemeOverride(slug);
    if (stored.enabled) setThemeOverrideState(stored);
  }, [slug]);

  const setThemeOverride = useCallback(
    (next: Partial<ThemeOverrideState>) => {
      setThemeOverrideState((prev) => {
        const merged = { ...prev, ...next };
        if (slug) saveThemeOverride(slug, merged);
        return merged;
      });
    },
    [slug]
  );

  const themeOverrideVars = useMemo(
    () => themeOverrideCssVars(themeOverride),
    [themeOverride]
  );

  // Effektivt tema-id för data-theme (för CSS som riktar sig till specifika teman).
  const effectiveTheme = themeOverride.enabled ? themeOverride.themeName : theme;

  // Linjen (linjen): resan längs busslinjen. Framåt glider nästa slide in
  // från höger och bakåt tvärtom; vid en ny hållplats (akt, `station` på sliden)
  // reser sig sliden underifrån. Följer T, så andra teman behåller sin toning.
  const linjen = getTheme(effectiveTheme).signature === "linjen";
  const linjenActs = useMemo(() => {
    let act = 0;
    return slideMetas.map((m, i) => (i > 0 && m.station ? ++act : act));
  }, [slideMetas]);
  const linjenPrevious = useRef(index);
  const linjenTransfer = linjen && linjenActs[linjenPrevious.current] !== linjenActs[index];
  useEffect(() => { linjenPrevious.current = index; }, [index]);
  const travel = linjen ? direction * (linjenTransfer ? 2 : 1) : direction;

  // Slå ihop override + branding. Branding körs sist så accent vinner när båda är på.
  const wrapperOverrides = useMemo(
    () => ({ ...themeOverrideVars, ...brandingOverrides }),
    [themeOverrideVars, brandingOverrides]
  );

  // Auto-dölja avsändarbården när text kolliderar med dess yta.
  const [footerCollides, setFooterCollides] = useState(false);
  const [questionsVisible, setQuestionsVisible] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [stepsCount, setStepsCount] = useState(0);
  const [fullscreenSupported, setFullscreenSupported] = useState(false);

  const audience = usePresenterSession(slug);
  const interactions = usePresenterInteractions(audience.session?.id ?? null);
  const [interactionModal, setInteractionModal] = useState<InteractionType | null>(null);

  const stepsController = useRef<StepController | null>(null);
  // Inspelningen (tangenten I): panelen och var föreläsningen står, läst ur refs så att
  // inspelaren alltid ser aktuell slide och klicksteg (2 oktober 2026).
  const [recordingOpen, setRecordingOpen] = useState(false);
  const positionRef = useRef<{ index: number; slideId?: string; title?: string }>({ index: 0 });
  const getRecorderPosition = useCallback((): RecorderPosition => {
    const { index: at, slideId, title: slideTitle } = positionRef.current;
    const controller = stepsController.current;
    const own = controller && controller.getSlideKey() === at;
    const layout = slideStageRef.current?.querySelector<HTMLElement>("[data-layout]")?.dataset.layout;
    return { index: at, slideId, title: slideTitle, step: own ? controller.getCurrentStep() + 1 : 1, steps: own ? Math.max(1, controller.getTotalSteps()) : 1, layout: layout === "talare" || layout === "full" || layout === "horn" ? layout : undefined };
  }, []);
  useEffect(() => {
    positionRef.current = { index, slideId: slideMetas[index]?.slideId, title: slideMetas[index]?.primaryText };
  }, [index, slideMetas]);
  const slideStageRef = useRef<HTMLDivElement | null>(null);
  // Spelarens rot: allt publiken ser, med temats lager. Inspelningen (läget film) spelar in den.
  const sceneRef = useRef<HTMLDivElement | null>(null);
  // Under en filminspelning döljs spelarens egna diskreta kontroller (tipsraden, versionsknappen).
  const [filmRecording, setFilmRecording] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const [pdfExport, setPdfExport] = useState<{
    active: boolean;
    current: number;
    total: number;
    label: string;
    format: "pdf" | "pptx";
  } | null>(null);

  // M-mode: snabb byt-bakgrund (bild)
  const [bgImageModalOpen, setBgImageModalOpen] = useState(false);
  const router = useRouter();

  // Tillfällig textredigering direkt i webbläsaren (försvinner vid omladdning).
  // Exporterna fotograferar DOM:en → redigerad text följer med i PDF/PPTX.
  const inlineEdit = useInlineEdit(slideStageRef, index);

  useEffect(() => {
    setFullscreenSupported(document.fullscreenEnabled ?? false);
  }, []);

  // Göm hint efter 4 sekunder
  useEffect(() => {
    const timer = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Synka index med URL ?slide=N. Konsoliderad så vi inte skriver över
  // ?slide-paramen vid mount innan vi hunnit läsa den.
  // (Tidigare hade vi två separata useEffects, men URL-write körde med
  // index=0 vid mount innan URL-read hunnit triggra re-render.)
  const slideUrlSyncedRef = useRef(false);
  useEffect(() => {
    if (!slideUrlSyncedRef.current) {
      // Första körningen: läs URL, sätt ref, returnera utan att skriva
      slideUrlSyncedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const param = params.get("slide");
      if (param) {
        const n = parseInt(param, 10);
        if (!isNaN(n) && n >= 1 && n <= total) {
          setIndex(n - 1);
        }
      }
      return;
    }
    // Efterföljande körningar: skriv URL
    const url = new URL(window.location.href);
    url.searchParams.set("slide", String(index + 1));
    window.history.replaceState({}, "", url.toString());
  }, [index, total]);

  // Broadcast slide till publikläget när session är aktiv
  useEffect(() => {
    audience.broadcastSlide(index);
  }, [index, audience]);

  // Poll stepsController så vi kan visa steg-count i menyn
  useEffect(() => {
    const interval = setInterval(() => {
      const n = stepsController.current?.getTotalSteps() ?? 0;
      setStepsCount((prev) => (prev !== n ? n : prev));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Refs som alltid pekar på senaste goNext/goPrev — undviker både stale
  // closures i BroadcastChannel-handlern OCH temporal-dead-zone-fel
  // (goNext/goPrev deklareras nedan).
  const goNextRef = useRef<() => void>(() => {});
  const goPrevRef = useRef<() => void>(() => {});

  // BroadcastChannel: sync with presenter window
  useEffect(() => {
    const channel = getPresenterChannel();
    if (!channel) return;

    const msg: PresenterMessage = { type: "slide-changed", slideIndex: index, slug: syncId ?? slug };
    channel.postMessage(msg);

    const handler = (e: MessageEvent<PresenterMessage>) => {
      const data = e.data;
      if (data.slug !== (syncId ?? slug)) return;
      if (data.type === "request-current") {
        channel.postMessage({ type: "slide-changed", slideIndex: index, slug } satisfies PresenterMessage);
      } else if (data.type === "navigate") {
        // Använd goNext/goPrev via ref så stagedreveal-steg respekteras
        // (avancerar steg först, slide bara om sliden är slut)
        if (data.direction === "next") {
          goNextRef.current();
        } else {
          goPrevRef.current();
        }
      } else if (data.type === "goto") {
        setIndex((i) => {
          if (data.slideIndex < 0 || data.slideIndex >= total) return i;
          // Explicit goto via menyn — respektera även dolda (användaren
          // vill aktivt navigera dit, ofta för att redigera/granska).
          setDirection(data.slideIndex > i ? 1 : -1);
          setJumped(true);
          setStepEntry("first");
          return data.slideIndex;
        });
      }
    };
    channel.addEventListener("message", handler);
    return () => {
      channel.removeEventListener("message", handler);
      channel.close();
    };
  }, [index, slug, syncId, total]);

  const goNext = useCallback(() => {
    // AnimatePresence keeps the outgoing slide mounted during its exit. Do not
    // let a rapid click use its exhausted controller to skip the incoming one.
    if (stepsController.current?.getSlideKey() !== index) return;
    if (stepsController.current?.tryNextStep()) return;
    const next = findNextVisible(index, 1, total);
    if (next === null) return;
    // Release ownership synchronously: queued clicker events must not skip
    // several windows before React commits the incoming scene's controller.
    stepsController.current = null;
    setDirection(1);
    setJumped(false);
    setStepEntry("first");
    setIndex(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, effectiveHidden]);

  const goPrev = useCallback(() => {
    if (stepsController.current?.getSlideKey() !== index) return;
    if (stepsController.current?.tryPrevStep()) return;
    const prev = findNextVisible(index, -1, total);
    if (prev === null) return;
    stepsController.current = null;
    setDirection(-1);
    setJumped(false);
    setStepEntry("last");
    setIndex(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total, effectiveHidden]);

  // Synkronisera refs efter att goNext/goPrev är definierade.
  // Eslint är OK med detta — vi kör synkront i render, inte i effect.
  goNextRef.current = goNext;
  goPrevRef.current = goPrev;

  const goTo = useCallback(
    (n: number) => {
      if (n < 0 || n >= total) return;
      setDirection(n > index ? 1 : -1);
      setJumped(true);
      setStepEntry("first");
      setIndex(n);
    },
    [index, total]
  );

  // Landningsknappen (L): hoppa till sliden markerad landing="true" i MDX:en —
  // punkten där ~10 minuter återstår. Talaren rundar av var hen än står och
  // slipper klicka sig genom resten av decket. Är landningssliden bortcuttad
  // i aktiv version tas nästa synliga efter den.
  const landingIndex = useMemo(
    () => slideMetas.findIndex((m) => m?.landing),
    [slideMetas],
  );
  const goLanding = useCallback(() => {
    if (landingIndex < 0) return;
    let target = landingIndex;
    if (effectiveHidden.has(target)) {
      const next = findNextVisible(target, 1, total);
      if (next === null) return;
      target = next;
    }
    goTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingIndex, effectiveHidden, total, goTo]);

  // Röstlinjens vändpunkt i temat Rösten: sliden markerad voiceTurn="true".
  const voiceTurnIndex = useMemo(
    () => slideMetas.findIndex((m) => m?.voiceTurn),
    [slideMetas],
  );

  // Tidsmarkörer (J): slides märkta remaining="30" i MDX:en. Landningen
  // räknas som remaining=10, så L och J delar samma karta och en deck som
  // bara har landing="true" fungerar utan ändring.
  //
  // J hoppar till nästa markör FRAMFÖR dig, inte till en fast punkt. Står
  // du vid minut 60 och inser att tiden runnit i väg hamnar du på
  // trettiominuterspunkten; trycker du igen längre fram hamnar du på
  // landningen. Samma tangent hela vägen, och du kan aldrig hoppa bakåt av
  // misstag — det är det du minst av allt vill göra inför en sal.
  const timeMarkers = useMemo(() => {
    const out: number[] = [];
    slideMetas.forEach((m, i) => {
      if (typeof m?.remaining === "number" || m?.landing) out.push(i);
    });
    return out;
  }, [slideMetas]);

  const goNextTimeMarker = useCallback(() => {
    const next = timeMarkers.find((i) => i > index);
    if (next === undefined) return;
    let target = next;
    if (effectiveHidden.has(target)) {
      const visible = findNextVisible(target, 1, total);
      if (visible === null) return;
      target = visible;
    }
    goTo(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeMarkers, index, effectiveHidden, total, goTo]);

  const toggleNotes = useCallback(() => setNotesVisible((v) => !v), []);
  const toggleMenu = useCallback(() => setMenuVisible((v) => !v), []);
  const toggleQuestions = useCallback(() => setQuestionsVisible((v) => !v), []);

  const startAudience = useCallback(() => {
    audience.start({ theme, title, currentSlide: index });
  }, [audience, theme, title, index]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const handleBackgroundPick = useCallback(
    async (path: string) => {
      if (!editSlug) return;
      const result = await updateSlideProp(editSlug, editIndex, "background", path);
      if (!result.ok) {
        console.error("Bakgrundsbyte misslyckades:", result.error);
      } else {
        // Hämta nya MDX-rendret från server
        router.refresh();
      }
    },
    [editSlug, editIndex, router],
  );

  const handleOpenBackgroundImage = useCallback(() => {
    setMenuVisible(false);
    setBgImageModalOpen(true);
  }, []);

  const handleResetBackground = useCallback(async () => {
    if (!editSlug) return;
    setMenuVisible(false);
    const result = await updateSlideProp(editSlug, editIndex, "background", "");
    if (!result.ok) {
      console.error("Återställning av bakgrund misslyckades:", result.error);
    } else {
      router.refresh();
    }
  }, [editSlug, editIndex, router]);

  const handleSetOverlay = useCallback(
    async (overlay: number, mode: "dark" | "light") => {
      if (!editSlug) return;
      const overlayResult = await updateSlideProp(
        editSlug,
        editIndex,
        "overlay",
        overlay > 0 ? String(overlay) : ""
      );
      const modeResult = await updateSlideProp(
        editSlug,
        editIndex,
        "overlayMode",
        overlay > 0 && mode === "light" ? "light" : ""
      );
      if (!overlayResult.ok || !modeResult.ok) {
        console.error(
          "Overlay-uppdatering misslyckades:",
          overlayResult.error || modeResult.error
        );
      } else {
        router.refresh();
      }
    },
    [editSlug, editIndex, router]
  );

  // Oskärpa skrivs debouncat — slidern tickar för varje pixel under draget,
  // och varje tick ska inte bli en egen server-skrivning.
  const blurDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSetBlur = useCallback(
    (px: number) => {
      if (!editSlug) return;
      if (blurDebounceRef.current) clearTimeout(blurDebounceRef.current);
      blurDebounceRef.current = setTimeout(async () => {
        const result = await updateSlideProp(
          editSlug,
          editIndex,
          "backgroundBlur",
          px > 0 ? String(Math.round(px)) : ""
        );
        if (!result.ok) {
          console.error("Oskärpe-uppdatering misslyckades:", result.error);
        } else {
          router.refresh();
        }
      }, 300);
    },
    [editSlug, editIndex, router]
  );

  const handleExportPdf = useCallback(async () => {
    setMenuVisible(false);
    setStepEntry("first");
    // Stäng av textredigeringsläget så markeringsramar/caret inte fastnar i
    // fångsten — gjorda textändringar ligger kvar och följer med i exporten.
    inlineEdit.setActive(false);
    // Vänta på att menyn försvinner från DOM så den inte syns i slide-fångsten
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    setPdfExport({ active: true, current: 0, total, label: "Förbereder export…", format: "pdf" });
    try {
      const { exportFullPresentationPdf } = await import("@/lib/full-presentation-pdf");
      await exportFullPresentationPdf({
        slideStageRef,
        currentIndex: index,
        total,
        setIndex,
        stepsControllerRef: stepsController,
        title: title ?? slug ?? "presentation",
        slug,
        onProgress: (current, totalCount, label) => {
          setPdfExport({ active: true, current, total: totalCount, label, format: "pdf" });
        },
      });
    } catch (err) {
      console.error("PDF-export misslyckades:", err);
    } finally {
      setPdfExport(null);
    }
  }, [index, total, title, slug, inlineEdit]);

  const handleExportPptx = useCallback(async () => {
    setMenuVisible(false);
    setStepEntry("first");
    // Stäng av textredigeringsläget så markeringsramar/caret inte fastnar i
    // fångsten — gjorda textändringar ligger kvar och följer med i exporten.
    inlineEdit.setActive(false);
    // Vänta på att menyn försvinner från DOM så den inte syns i slide-fångsten
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    setPdfExport({ active: true, current: 0, total, label: "Förbereder export…", format: "pptx" });
    try {
      const { exportFullPresentationPptx } = await import("@/lib/full-presentation-pptx");
      await exportFullPresentationPptx({
        slideStageRef,
        currentIndex: index,
        total,
        setIndex,
        stepsControllerRef: stepsController,
        title: title ?? slug ?? "presentation",
        slug,
        notes,
        onProgress: (current, totalCount, label) => {
          setPdfExport({ active: true, current, total: totalCount, label, format: "pptx" });
        },
      });
    } catch (err) {
      console.error("PowerPoint-export misslyckades:", err);
    } finally {
      setPdfExport(null);
    }
  }, [index, total, title, slug, notes, inlineEdit]);

  const openPresenter = useCallback(() => {
    if (!slug) return;
    const params = new URLSearchParams(window.location.search);
    params.delete("slide");
    const url = `/${slug}/presenter?${params}`;
    window.open(url, `presenter-${slug}`, "width=1100,height=800,menubar=no,toolbar=no");
  }, [slug]);

  // Editorn skickar detta meddelande efter att eventuell väntande autosave
  // har flushats. Presentationen ligger kvar under editorn, så M-menyn och
  // alla redan laddade miniatyrer överlever växlingen.
  useEffect(() => {
    if (!editorVisible) return;
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        slideIndex?: number;
      };
      if (data.type !== "presenter-editor-close") return;
      const returnedIndex = editTargets && typeof data.slideIndex === "number" ? editTargets.findIndex(t => t.slug === editSlug && t.slideIndex === data.slideIndex) : data.slideIndex;
      if (
        typeof returnedIndex === "number" &&
        returnedIndex >= 0 &&
        returnedIndex < total
      ) {
        setDirection(returnedIndex > index ? 1 : -1);
        setJumped(true);
        setStepEntry("first");
        setIndex(returnedIndex);
      }
      setEditorVisible(false);
      // Hämta sparad MDX igen. Next.js refresh mergar RSC-payloaden utan att
      // kasta klientstate, så thumbnail-cachen ligger kvar.
      router.refresh();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [editorVisible, index, router, total, editTargets, editSlug]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        // Textredigeringsläget: låt tangenttryck gå till texten, inte navigationen
        if (e.target.isContentEditable) return;
      }
      switch (e.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          goPrev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(total - 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "n":
        case "N":
          e.preventDefault();
          toggleNotes();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMenu();
          break;
        case "k":
        case "K":
          e.preventDefault();
          cycleCut();
          break;
        case "l":
        case "L":
          e.preventDefault();
          goLanding();
          break;
        case "j":
        case "J":
          e.preventDefault();
          goNextTimeMarker();
          break;
        case "t":
        case "T":
          e.preventDefault();
          // Shift+T återgår till deckets eget tema; T cyklar vidare.
          setThemeOverrideState((prev) => {
            const next = e.shiftKey ? DEFAULT_THEME_OVERRIDE : cycleNextTheme(prev, theme);
            if (slug) saveThemeOverride(slug, next);
            return next;
          });
          break;
        case "r":
        case "R":
          if (slug) {
            e.preventDefault();
            setMenuVisible(false);
            setEditorVisible(true);
          }
          break;
        case "i":
        case "I":
          // Inspelningspanelen. Inspelningen fortsätter när panelen stängs.
          if (slug) {
            e.preventDefault();
            setRecordingOpen((open) => !open);
          }
          break;
        case "Escape":
          if (questionsVisible) {
            e.preventDefault();
            setQuestionsVisible(false);
          } else if (notesVisible) {
            e.preventDefault();
            setNotesVisible(false);
          } else if (menuVisible) {
            e.preventDefault();
            setMenuVisible(false);
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    goNext,
    goPrev,
    goTo,
    goLanding,
    goNextTimeMarker,
    toggleFullscreen,
    toggleNotes,
    toggleMenu,
    cycleCut,
    total,
    notesVisible,
    menuVisible,
    questionsVisible,
    slug,
    index,
    theme,
  ]);

  // Touch swipe
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - touchStartX.current;
      const dy = endY - touchStartY.current;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goNext();
        else goPrev();
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [goNext, goPrev]
  );

  const current = slides[index];
  const currentNotes = notes[index] ?? null;

  // Per-slide gradient-bakgrund — upplöst config (presets → färger).
  // gradientKey används som AnimatePresence-nyckel: byter slide men
  // gradienten är densamma → ingen omrendering/flimmer.
  const gradientConfig = useMemo(
    () =>
      slideGradients
        ? resolveGradient(slideGradients[String(index + 1)])
        : null,
    [slideGradients, index],
  );
  const gradientKey = gradientConfig ? JSON.stringify(gradientConfig) : null;

  // Gradienten renderas som ett lager längst bak. Men 44 % av sliderna
  // använder en template som målar sin EGEN basbakgrund ovanpå — och den
  // faller tillbaka på var(--bg). På ett mörkt tema märks det knappt; på
  // dagsljus är var(--bg) vitt, och gradienten försvann helt.
  //
  // --slide-base är den fallbacken. Är den osatt beter sig allt som förut;
  // sätter vi den till transparent när sliden har en gradient slipper
  // templaten måla över den. Variabeln rör bara BAKGRUNDER — de templates
  // som använder var(--bg) som textfärg på accentytor påverkas inte.
  const slideBaseOverride = gradientConfig
    ? ({ "--slide-base": "transparent" } as React.CSSProperties)
    : undefined;

  // Mätning: om textelement på aktuell slide går ner i footer-zonen
  // (botten ~110px) → låt footern fadea ut.
  useEffect(() => {
    if (!branding.enabled) {
      setFooterCollides(false);
      return;
    }
    const stage = slideStageRef.current;
    if (!stage) return;

    const FOOTER_ZONE_HEIGHT = 110; // matchar avsändarbårdens faktiska höjd + säkerhetsmarginal
    const TEXT_SELECTORS =
      'h1, h2, h3, h4, h5, h6, p, li, span, td, th, blockquote, dt, dd';

    const check = () => {
      const stage2 = slideStageRef.current;
      if (!stage2) return;
      // Per-slide opt-out: templates kan markera sin root med data-no-avsandar-footer
      // för att alltid dölja avsändarbården (t.ex. när content ska fylla hela höjden).
      if (stage2.querySelector('[data-no-avsandar-footer]')) {
        setFooterCollides(true);
        return;
      }
      const dangerY = window.innerHeight - FOOTER_ZONE_HEIGHT;
      const candidates = stage2.querySelectorAll<HTMLElement>(TEXT_SELECTORS);
      for (const el of candidates) {
        if (el.closest('[data-avsandar-footer]')) continue;
        const text = el.innerText?.trim();
        if (!text) continue;
        const rect = el.getBoundingClientRect();
        if (rect.height < 4 || rect.width < 4) continue;
        if (rect.bottom > dangerY) {
          setFooterCollides(true);
          return;
        }
      }
      setFooterCollides(false);
    };

    // Vänta tills slidens entry-animation har landat innan vi mäter
    const t1 = setTimeout(check, 80);
    const t2 = setTimeout(check, 400);
    const t3 = setTimeout(check, 900);

    const scheduleCheck = (() => {
      let raf = 0;
      return () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(check);
      };
    })();

    const ro = new ResizeObserver(scheduleCheck);
    ro.observe(stage);

    // Mutation-observer fångar steg-byggda listor + andra DOM-ändringar
    // som inte ändrar stage-storlek men kan flytta texten.
    const mo = new MutationObserver(scheduleCheck);
    mo.observe(stage, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Säkerhetsnät: poll var 700ms ifall MO/RO missar (animationer, lazy
    // bilder som ändrar layout etc). Billigt — bara enstaka querySelector.
    const interval = setInterval(check, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
      mo.disconnect();
      clearInterval(interval);
    };
  }, [branding.enabled, index]);

  return (
    <div
      ref={sceneRef}
      className="relative h-screen w-screen overflow-hidden bg-bg text-text"
      style={
        {
          ...wrapperOverrides,
          ...slideBaseOverride,
          isolation: "isolate",
          backgroundImage: "var(--theme-slide-background, none)",
        } as React.CSSProperties
      }
      data-thumbnail-capture-root="true"
      data-theme={effectiveTheme}
      data-avsandar-enabled={branding.enabled}
      data-avsandar-footer-tone={branding.footerTone}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {(() => {
        // ambient kan vara true (alltid), false (aldrig) eller "a-b" (range, 1-indexerat).
        if (ambient === true) return <AmbientParticles />;
        if (typeof ambient === "string") {
          const m = ambient.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m) {
            const from = parseInt(m[1], 10);
            const to = parseInt(m[2], 10);
            const currentSlide = index + 1;
            if (currentSlide >= from && currentSlide <= to) {
              return <AmbientParticles />;
            }
          }
        }
        return null;
      })()}

      {/* Per-slide gradient-bakgrund — längst bak (z-index -1), bakom allt
          slide-innehåll och bakom ev. effekt-lager. initial={false} → ingen
          intoning vid första render (gradienten finns direkt), men byter
          man till en slide med annan gradient crossfadar de mjukt. */}
      <AnimatePresence initial={false}>
        {gradientConfig && gradientKey ? (
          <motion.div
            key={gradientKey}
            className="absolute inset-0"
            style={{ zIndex: -1 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
          >
            <SlideGradientLayer config={gradientConfig} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Per-slide bakgrundseffekt (dots/flow/aurora/grain/stardust/mesh/constellation/ribbon).
          Dim:as till 25% när M-menyn är öppen så användaren ser kontroller.
          Värdet i sliderEffects kan vara en sträng ("dots") eller ett
          objekt ({ kind: "dots", color: "#EF4F8F", opacity: 0.8, speed: 1.5 }). */}
      {(() => {
        if (!sliderEffects) return null;
        const key = String(index + 1);
        const value = sliderEffects[key];
        if (!value) return null;
        const kind = typeof value === "string" ? value : value.kind;
        const color = typeof value === "string" ? undefined : value.color;
        const opacity = typeof value === "string" ? undefined : value.opacity;
        const speed = typeof value === "string" ? undefined : value.speed;
        return (
          <SlideEffectLayer
            effect={kind as SlideEffect}
            color={color}
            intensity={menuVisible ? 0.25 : 1}
            opacity={opacity}
            speed={speed}
          />
        );
      })()}
      <div
        ref={slideStageRef}
        className="absolute"
        style={{
          // Lås slide-scenen till 16:9 — samma koordinatsystem som editorn
          // (1920×1080). Då matchar FloatingImage-positioner exakt mellan
          // R-läge och presentation. På en 16:9-skärm (din vanliga fullskärm)
          // fyller den precis som förr; på andra proportioner letterboxas den
          // med tunna kanter (inset:0 + margin:auto centrerar boxen).
          inset: 0,
          margin: "auto",
          width: "min(100vw, calc(100vh * 16 / 9))",
          height: "min(100vh, calc(100vw * 9 / 16))",
        }}
      >
        {/* Show the server-rendered first slide while JavaScript loads. Only
            subsequent slide changes need an entrance transition. */}
        {/* Vätterresan: sjön ritas här, bakom slidebytet, och ligger kvar. */}
        {vatterDeck && (skalaDeck ? <SkalaWorld store={worldStore} /> : <VatterWorld store={worldStore} world={worldOfTheme(effectiveTheme)} />)}
        <SlideTargetContext.Provider value={slideTarget}>
        <WorldContext.Provider value={vatterSlide ? worldStore : null}>
        <AnimatePresence initial={false} mode="wait" custom={travel}>
          <motion.div
            key={sceneKey}
            custom={travel}
            variants={sceneChoreography ? {
              enter: { opacity: 1 },
              center: { opacity: 1 },
              // Resan i AI och du och Vätterresan håller själva kvar sliden medan förgrunden lämnar (LectureTravel, VatterTravel).
              exit: (dir: number) => ({ opacity: 1, transition: { duration: 0, delay: dir < 0 || reducedMotion || sceneTravel || vatterSlide ? 0 : .46 } }),
            } : linjen && !reducedMotion ? {
              enter: (c: number) => ({ opacity: 0, x: Math.abs(c) > 1 ? 0 : Math.sign(c) * 84, y: Math.abs(c) > 1 ? Math.sign(c) * 56 : 0 }),
              center: { opacity: 1, x: 0, y: 0 },
              exit: (c: number) => ({ opacity: 0, x: Math.abs(c) > 1 ? 0 : Math.sign(c) * -56, y: Math.abs(c) > 1 ? Math.sign(c) * -36 : 0, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }),
            } : theme === "samtal" && !reducedMotion ? {
              enter: (dir:number) => ({ opacity:0, x:dir*26, y:5, scale:.993 }),
              center: { opacity:1, x:0, y:0, scale:1 },
              exit: (dir:number) => ({ opacity:0, x:dir*-18, y:-3, scale:.997 }),
            } : { enter:{opacity:0}, center:{opacity:1}, exit:{opacity:0} }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: theme === "samtal" ? (reducedMotion ? 0 : 0.34) : linjen ? (reducedMotion ? 0 : 0.42) : 0.28, ease: [0.22, 1, 0.36, 1] }}
            // slide-gradient-host sätts BARA när sliden faktiskt har en
            // gradient. Regeln i globals.css tvingar då mallens rot
            // genomskinlig så gradientlagret bakom syns. Utan gradient
            // beter sig sliden exakt som förut.
            className={`absolute inset-0${gradientConfig ? " slide-gradient-host" : ""}`}
            style={(() => {
              const key = String(index + 1);
              const vars: Record<string, string> = {};
              const a = slideAccents?.[key];
              const t = slideTextColors?.[key];
              const m = slideMutedColors?.[key];
              if (a) vars["--accent"] = a;
              if (t) vars["--text"] = t;
              if (m) vars["--text-muted"] = m;
              if (linjen) vars["--linjen-sky"] = linjenSky(slideMetas, index);
              return vars as React.CSSProperties;
            })()}
          >
            <SlideWithSteps slideKey={index} controllerRef={stepsController} initialStep={stepEntry} config={slideMetas[index]?.steps}>
              {/* Manuset når templaten via kontext. Bara <Utkast> läser det —
                  se slide-notes.tsx. Övriga templates ser det aldrig. */}
              <SlideNotesProvider notes={currentNotes}>
                  {sceneGroup ? cloneElement(current, { key: sceneKey }) : current}
              </SlideNotesProvider>
            </SlideWithSteps>
          </motion.div>
        </AnimatePresence>
        </WorldContext.Provider>
        </SlideTargetContext.Provider>
        {linjen && !editorVisible && <LinjenRoute index={index} metas={slideMetas} still={!!reducedMotion} />}
        {/* Röstlinjen syns bara i temat Rösten (signature: voice). Den ligger
            utanför slidebytet och glider därför vidare mellan slides. */}
        <VoiceLine index={index} total={total} turn={voiceTurnIndex} />
      </div>

      {/* Brand-watermark (frontmatter.brand) — alltid synlig om satt */}
      {brand && !(brand.hideOnFirst && index === 0) && (
        <BrandWatermarkBadge brand={brand} />
      )}

      {/* Avsändarens bård — från början på i profilens teman, annars via M-mode-toggle.
          Auto-fade när slidens text kolliderar med footer-zonen. */}
      {avsandare && branding.enabled && (
        <AvsandarFooter
          profil={avsandare}
          tone={branding.footerTone === "auto" ? (avsandare.ljusaTeman.includes(theme) ? "light" : "dark") : branding.footerTone}
          hidden={footerCollides}
        />
      )}

      {/* Inspelningen (tangenten I). Panelen ritas utanför spelaren (portal), så att den inte kommer med i filmen. */}
      {slug && <RecordingPanel open={recordingOpen} onClose={() => setRecordingOpen(false)} slug={slug} channelKey={syncId ?? slug} title={title ?? slug} getPosition={getRecorderPosition} scene={sceneRef} stage={slideStageRef} onFilmChange={setFilmRecording} />}

      {/* Diskret hint i botten - fadar bort efter några sekunder */}
      <AnimatePresence>
        {hintVisible && !menuVisible && !notesVisible && !filmRecording && (
          <motion.div
            className="pointer-events-none fixed bottom-4 left-1/2 z-10 -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.55, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[0.65rem] uppercase tracking-[0.3em] text-text-muted backdrop-blur-sm">
              <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0 font-mono text-[0.65rem]">
                M
              </kbd>
              <span>för meny</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version-toggle: superdiskret, persistent. Visar aktiv version och
          lyser i accent. K (eller klick) cyklar full → versioner → full. */}
      {!menuVisible && !notesVisible && !filmRecording && cuts.length > 0 && (
        <button
          type="button"
          onClick={cycleCut}
          aria-pressed={activeCutId != null}
          title={
            activeCutId
              ? `Version: ${cuts[activeCut].name} — K för nästa`
              : "Full presentation — K för kortversion"
          }
          className="fixed bottom-4 right-4 z-10 flex items-center gap-2 rounded-full px-3 py-1 text-[0.6rem] uppercase tracking-[0.28em] backdrop-blur-sm transition-all duration-300"
          style={{
            border: `1px solid ${activeCutId ? "var(--accent)" : "rgba(255,255,255,0.12)"}`,
            background: activeCutId
              ? "color-mix(in srgb, var(--accent) 16%, rgba(0,0,0,0.45))"
              : "rgba(0,0,0,0.35)",
            color: activeCutId ? "var(--accent)" : "var(--text-muted)",
            opacity: activeCutId ? 0.95 : 0.4,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "9999px",
              background: activeCutId ? "var(--accent)" : "transparent",
              border: activeCutId ? "none" : "1px solid currentColor",
              boxShadow: activeCutId ? "0 0 8px var(--accent)" : "none",
              transition: "all 0.3s",
            }}
          />
          <span>{activeCutId ? cuts[activeCut].name : "full"}</span>
        </button>
      )}

      <NotesOverlay
        visible={notesVisible}
        notes={currentNotes}
        slideNumber={index + 1}
        totalSlides={total}
        onClose={() => setNotesVisible(false)}
      />

      <MenuOverlay
        editTarget={editTargets?.[index]}
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        slideMetas={slideMetas}
        cuts={cuts}
        totalSlides={total}
        currentIndex={index}
        totalSteps={stepsCount}
        slug={slug}
        theme={theme}
        onGoTo={goTo}
        onOpenPresenter={openPresenter}
        onToggleNotes={toggleNotes}
        onToggleFullscreen={toggleFullscreen}
        hasNotes={currentNotes != null && currentNotes !== ""}
        isFullscreenSupported={fullscreenSupported}
        audience={{
          supportsAudience: audience.supportsAudience,
          session: audience.session,
          starting: audience.starting,
          error: audience.error,
          onStart: startAudience,
          onEnd: audience.end,
        }}
        interactions={{
          canStart: Boolean(audience.session),
          activeType: interactions.active?.active ? interactions.active.type : null,
          onStartQuiz: () => setInteractionModal("quiz"),
          onStartReflection: () => setInteractionModal("reflection"),
        }}
        onExportPdf={handleExportPdf}
        onExportPptx={handleExportPptx}
        inlineEditActive={inlineEdit.active}
        onToggleInlineEdit={() => {
          inlineEdit.toggle();
          setMenuVisible(false);
        }}
        onChangeBackgroundImage={slug ? handleOpenBackgroundImage : undefined}
        onResetBackground={slug ? handleResetBackground : undefined}
        onSetOverlay={slug ? handleSetOverlay : undefined}
        onSetBlur={slug ? handleSetBlur : undefined}
        brandingProfile={avsandare}
        branding={branding}
        onBrandingChange={setBranding}
        themeOverride={themeOverride}
        frontmatterTheme={theme}
        onThemeOverrideChange={setThemeOverride}
        sliderEffects={sliderEffects}
        slideGradients={slideGradients}
        slideAccents={slideAccents}
        slideTextColors={slideTextColors}
        slideMutedColors={slideMutedColors}
        accentOverride={accentOverride}
        textOverride={textOverride}
        mutedOverride={mutedOverride}
      />

      {/* R-läge: editorn körs i samma flik men ovanpå presentationen.
          Presentationens komponentträd avmonteras aldrig, vilket gör att
          live-state och menyval finns kvar när editorn stängs. */}
      <AnimatePresence>
        {editorVisible && slug ? (
          <motion.div
            data-pdf-exclude="true"
            className="fixed inset-0 z-[100] bg-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <iframe
              src={`/${editSlug}/edit?slide=${editIndex + 1}&embedded=1`}
              title={`Redigera ${title ?? slug}`}
              className="h-full w-full border-0 bg-bg"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* M-mode: byt bakgrund-bild */}
      {slug ? (
        <AddImageModal
          open={bgImageModalOpen}
          slug={editSlug}
          onClose={() => setBgImageModalOpen(false)}
          onPick={(path) => {
            void handleBackgroundPick(path);
            setBgImageModalOpen(false);
          }}
        />
      ) : null}

      {/* Export progress-overlay (PDF + PowerPoint) */}
      <AnimatePresence>
        {pdfExport && pdfExport.active && (
          <motion.div
            data-pdf-exclude="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex w-[min(28rem,90vw)] flex-col gap-4 rounded-2xl border border-white/10 bg-bg-surface/90 p-8 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-accent">
                {pdfExport.format === "pptx" ? "Exporterar PowerPoint" : "Exporterar PDF"}
              </div>
              <div className="text-lg font-semibold text-text">
                {pdfExport.label}
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-accent"
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${(pdfExport.current / Math.max(pdfExport.total, 1)) * 100}%`,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <div className="text-xs text-text-muted">
                {pdfExport.current} av {pdfExport.total} · navigera inte under tiden
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Textredigeringsläge: markeringsstil för redigerbara block */}
      {inlineEdit.active ? (
        <style>{`
          [data-inline-edit-path] {
            outline: 1.5px dashed color-mix(in srgb, var(--accent) 45%, transparent);
            outline-offset: 3px;
            cursor: text;
          }
          [data-inline-edit-path]:hover { outline-color: var(--accent); }
          [data-inline-edit-path]:focus {
            outline: 2px solid var(--accent);
            outline-offset: 3px;
          }
        `}</style>
      ) : null}

      {/* Indikator: redigeringsläge på / antal tillfälliga textändringar */}
      {(inlineEdit.active || inlineEdit.editCount > 0) && (
        <div
          data-pdf-exclude="true"
          className="fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/80 backdrop-blur-md"
        >
          {inlineEdit.active ? (
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Textredigering · klicka på text i sliden
            </span>
          ) : null}
          {inlineEdit.editCount > 0 ? (
            <>
              <span className="text-white/55">
                {inlineEdit.editCount} {inlineEdit.editCount === 1 ? "ändring" : "ändringar"} ·
                försvinner vid omladdning
              </span>
              <button
                type="button"
                onClick={inlineEdit.discard}
                className="rounded-full border border-white/15 px-2.5 py-0.5 text-white/70 transition-colors hover:border-accent hover:text-accent"
              >
                Återställ
              </button>
            </>
          ) : null}
        </div>
      )}

      <InteractionStartModal
        visible={interactionModal != null}
        type={interactionModal}
        starting={interactions.starting}
        error={interactions.error}
        slideIndex={index}
        onSubmit={async (payload) => {
          if (!interactionModal) return;
          const result = await interactions.start({
            type: interactionModal,
            prompt: payload.prompt,
            options: payload.options,
            slideIndex: payload.slideIndex,
          });
          if (result) setInteractionModal(null);
        }}
        onClose={() => setInteractionModal(null)}
      />

      {interactions.active?.active && (
        <InteractionPresenterPanel
          active={interactions.active}
          responses={interactions.responses}
          onEnd={interactions.end}
          onSetReveal={interactions.setReveal}
          onFeature={interactions.featureResponse}
        />
      )}

      {audience.session && (
        <QuestionButton
          count={audience.questions.length}
          unseen={audience.unseenCount}
          onClick={toggleQuestions}
        />
      )}

      <QuestionsOverlay
        visible={questionsVisible}
        questions={audience.questions}
        currentSlide={index}
        onClose={() => setQuestionsVisible(false)}
        onMarkSeen={audience.markAllSeen}
      />
    </div>
  );
}

function BrandWatermarkBadge({ brand }: { brand: BrandWatermark }) {
  const pos = brand.position ?? "bottom-left";
  const positionStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 5,
    pointerEvents: "none",
    opacity: brand.opacity ?? 0.55,
    ...(pos === "bottom-left" && { bottom: "1rem", left: "1rem" }),
    ...(pos === "bottom-right" && { bottom: "1rem", right: "1rem" }),
    ...(pos === "top-left" && { top: "1rem", left: "1rem" }),
    ...(pos === "top-right" && { top: "1rem", right: "1rem" }),
  };
  return (
    <motion.div
      style={positionStyle}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: brand.opacity ?? 0.55, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex items-center gap-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brand.logo}
        alt=""
        style={{ height: brand.size ?? "1.5rem", width: "auto" }}
      />
      {brand.tagline && (
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-text-muted">
          {brand.tagline}
        </span>
      )}
    </motion.div>
  );
}

function QuestionButton({
  count,
  unseen,
  onClick,
}: {
  count: number;
  unseen: number;
  onClick: () => void;
}) {
  const hasUnseen = unseen > 0;
  return (
    <button
      onClick={onClick}
      aria-label={`Publikfrågor (${unseen} olästa av ${count})`}
      className={`fixed bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-all ${
        hasUnseen
          ? "border-accent bg-accent/15 text-accent shadow-[0_0_22px_-6px_var(--color-accent)] animate-pulse"
          : "border-white/15 bg-black/40 text-text-muted hover:border-accent hover:text-accent"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      {hasUnseen && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-bg">
          {unseen}
        </span>
      )}
    </button>
  );
}
