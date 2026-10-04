"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { SlideStepsContext } from "@/lib/slide-steps";
import { SlideGradientLayer } from "@/components/SlideGradientLayer";
import { resolveGradient } from "@/lib/gradient-presets";
import type { SlideGradientValue } from "@/lib/types";
import {
  STAGE_CHANNEL,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  isStageMessage,
  type StageEvent,
  type StepTarget,
} from "@/lib/share/stage-protocol";

interface StageViewerProps {
  initialSlide: number;
  initialStep: StepTarget;
  slideGradients?: Record<string, SlideGradientValue>;
  slideAccents?: Record<string, string>;
  slideTextColors?: Record<string, string>;
  slideMutedColors?: Record<string, string>;
  children: ReactNode;
  hiddenSlides?: number[];
  /** Byt slide utan övergång (granskningsvyn): Framers övergång står stilla i en dold flik. */
  instant?: boolean;
}

const FORWARDED_KEYS = new Set([
  "ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Escape",
]);
const NO_HIDDEN_SLIDES: number[] = [];

function post(event: StageEvent) {
  if (window.parent !== window) window.parent.postMessage(event, window.location.origin);
}

/**
 * Granskningsvyn (/[slug]/granska) ber om en bild av läget som visas. Samma
 * fångst som miniatyrerna (modern-screenshot), men i full scenstorlek.
 */
async function capture(id: string, scale = 1, format: "image/webp" | "image/png" = "image/webp", quality = 0.85) {
  try {
    await document.fonts?.ready;
    const root = document.querySelector<HTMLElement>("[data-theme]") ?? document.body;
    const { domToBlob } = await import("modern-screenshot");
    const blob = await domToBlob(root, {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      scale,
      type: format,
      quality,
      backgroundColor: getComputedStyle(root).backgroundColor || "#000",
      timeout: 15000,
      fetch: { requestInit: { mode: "cors", cache: "force-cache" } },
    });
    post({ channel: STAGE_CHANNEL, type: "captured", id, blob });
  } catch (error) {
    post({ channel: STAGE_CHANNEL, type: "captured", id, error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * En slide i ett bestämt klickläge. Äger stegkontexten själv i stället för att
 * använda SlideStepsProvider: steget kommer från lästexten eller från scenrutans
 * livenavigering. Varje slide får en egen instans (den ligger innanför den
 * nycklade motion.div:en), så en slide som tonar ut behåller sitt eget läge och
 * sitt eget stegantal i stället för att ärva den inkommande slidens.
 */
function StagedSlide({
  slide,
  step,
  children,
  onState,
  request,
}: {
  slide: number;
  step: StepTarget;
  children: ReactNode;
  onState: (state: { slide: number; step: number; totalSteps: number }) => void;
  request: { slide: number; step: StepTarget };
}) {
  const [totalSteps, setTotalSteps] = useState(0);
  // En mall kan själv be om ett steg (goToStep). Det gäller tills läsläget
  // pekar ut ett nytt läge.
  const [override, setOverride] = useState<number | null>(null);
  const [seenRequest, setSeenRequest] = useState(request);
  if (seenRequest !== request) {
    setSeenRequest(request);
    setOverride(null);
  }

  const registerSteps = useCallback((count: number) => {
    setTotalSteps((prev) => Math.max(prev, count));
  }, []);
  const goToStep = useCallback((next: number) => {
    if (Number.isFinite(next)) setOverride(Math.max(0, Math.trunc(next)));
  }, []);

  const wantLast = override === null && step === "last";
  const wanted = override ?? (step === "last" ? 0 : step);
  const currentStep = wantLast
    ? Math.max(0, totalSteps - 1)
    : totalSteps > 0
      ? Math.min(wanted, totalSteps - 1)
      : wanted;

  const value = useMemo(
    () => ({ slideKey: slide, registerSteps, currentStep, totalSteps, goToStep, startAtLast: wantLast }),
    [slide, registerSteps, currentStep, totalSteps, goToStep, wantLast],
  );

  useEffect(() => {
    onState({ slide, step: currentStep, totalSteps });
    post({ channel: STAGE_CHANNEL, type: "state", slide, step: currentStep, totalSteps });
  }, [slide, currentStep, totalSteps, onState]);

  return <SlideStepsContext.Provider value={value}>{children}</SlideStepsContext.Provider>;
}

/**
 * Scenrutan: visar EN slide i ETT klickläge, styrd utifrån med postMessage
 * (se stage-protocol.ts). Ligger alltid i en iframe med fast virtuell storlek,
 * så mallarnas vw/vh och brytpunkter beter sig som på en projektor.
 */
export function StageViewer({
  initialSlide,
  initialStep,
  slideGradients,
  slideAccents,
  slideTextColors,
  slideMutedColors,
  children,
  hiddenSlides = NO_HIDDEN_SLIDES,
  instant = false,
}: StageViewerProps) {
  const slides = useMemo(
    () => Children.toArray(children).filter((child) => isValidElement(child)) as ReactElement[],
    [children],
  );

  const [target, setTarget] = useState<{ slide: number; step: StepTarget }>(() => ({
    slide: initialSlide,
    step: initialStep,
  }));
  const slide = Math.max(0, Math.min(Math.trunc(target.slide) || 0, slides.length - 1));
  const live = useRef(false);
  const shown = useRef<{ slide: number; step: number; totalSteps: number } | null>(null);
  const pending = useRef(false);
  const targetRef = useRef(target);
  const receiveState = useCallback((state: { slide: number; step: number; totalSteps: number }) => {
    if (state.slide !== targetRef.current.slide) return;
    shown.current = state;
    // Registration may arrive just after the initial state of the next slide.
    pending.current = false;
  }, []);
  const show = useCallback((next: { slide: number; step: StepTarget }) => {
    targetRef.current = next;
    pending.current = true;
    setTarget(next);
  }, []);
  const navigate = useCallback((direction: 1 | -1) => {
    const current = shown.current;
    if (!live.current || !current || pending.current) return;
    if (direction > 0 && current.step < current.totalSteps - 1) {
      show({ slide: current.slide, step: current.step + 1 });
    } else if (direction < 0 && current.step > 0) {
      show({ slide: current.slide, step: current.step - 1 });
    } else {
      let next = current.slide + direction;
      while (next >= 0 && next < slides.length && hiddenSlides.includes(next + 1)) next += direction;
      if (next >= 0 && next < slides.length) show({ slide: next, step: direction > 0 ? 0 : "last" });
    }
  }, [slides.length, hiddenSlides, show]);

  useEffect(() => {
    let heard = false;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== window.location.origin || !isStageMessage(e.data)) return;
      if (e.data.type === "show") {
        heard = true;
        live.current = Boolean(e.data.live);
        show({ slide: e.data.slide, step: e.data.step });
        pending.current = false;
      } else if (e.data.type === "navigate") navigate(e.data.direction);
      else if (e.data.type === "capture") {
        heard = true;
        void capture(e.data.id, e.data.scale, e.data.format, e.data.quality);
      }
    };
    window.addEventListener("message", onMessage);
    // "ready" upprepas tills föräldern har svarat. Ett enda besked räcker inte:
    // på en riktig värd hinner scenrutan ofta bli klar FÖRE sidan den ligger i
    // (samma JS är redan cachad), och då finns ingen som lyssnar. Lokalt vinner
    // föräldern nästan alltid, så felet syns bara publicerat — sliden stod kvar
    // på omslaget medan texten rullade.
    const announce = () => post({ channel: STAGE_CHANNEL, type: "ready" });
    announce();
    let tries = 0;
    const timer = window.setInterval(() => {
      if (heard || ++tries > 150) window.clearInterval(timer);
      else announce();
    }, 400);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [show, navigate]);

  // Har rutan fokus (läsaren klickade i sliden) ska tangenterna ändå nå
  // läsläget — annars fastnar tangentbordet i iframen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!FORWARDED_KEYS.has(e.key)) return;
      e.preventDefault();
      if (live.current && e.key !== "Escape") {
        navigate(["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key) ? -1 : 1);
        return;
      }
      post({ channel: STAGE_CHANNEL, type: "key", key: e.key });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const key = String(slide + 1);
  const gradientConfig = useMemo(
    () => (slideGradients ? resolveGradient(slideGradients[key]) : null),
    [slideGradients, key],
  );
  const slideVars: Record<string, string> = {};
  if (slideAccents?.[key]) slideVars["--accent"] = slideAccents[key];
  if (slideTextColors?.[key]) slideVars["--text"] = slideTextColors[key];
  if (slideMutedColors?.[key]) slideVars["--text-muted"] = slideMutedColors[key];

  return (
    <div
      // Samma rot som SlideViewer. isolation: isolate är inte kosmetik —
      // withSlideBg lägger bakgrundsbild/video/register på negativa z-index,
      // och utan en egen stackningskontext hamnar de bakom sidans bakgrund.
      className="relative h-screen w-screen overflow-hidden bg-bg text-text"
      style={{
        ...(gradientConfig ? { "--slide-base": "transparent" } : {}),
        isolation: "isolate",
        backgroundImage: "var(--theme-slide-background, none)",
      } as CSSProperties}
    >
      {gradientConfig ? (
        <div className="absolute inset-0" style={{ zIndex: -1 }}>
          <SlideGradientLayer config={gradientConfig} />
        </div>
      ) : null}
      <div
        className="absolute"
        style={{
          // Samma 16:9-lås som SlideViewer, så koordinaterna stämmer.
          inset: 0,
          margin: "auto",
          width: "min(100vw, calc(100vh * 16 / 9))",
          height: "min(100vh, calc(100vw * 9 / 16))",
        }}
      >
        {instant ? (
          <div key={slide} className={`absolute inset-0${gradientConfig ? " slide-gradient-host" : ""}`} style={slideVars as CSSProperties}>
            <StagedSlide slide={slide} step={target.step} onState={receiveState} request={target}>
              {slides[slide] ?? null}
            </StagedSlide>
          </div>
        ) : (
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={slide}
              className={`absolute inset-0${gradientConfig ? " slide-gradient-host" : ""}`}
              style={slideVars as CSSProperties}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <StagedSlide slide={slide} step={target.step} onState={receiveState} request={target}>
                {slides[slide] ?? null}
              </StagedSlide>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
