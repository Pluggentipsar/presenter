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
} from "react";
import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { submitQuestion, type AudienceSession } from "@/lib/audience-session";
import { useAudienceNotes } from "@/lib/use-audience-notes";
import { useAudienceId } from "@/lib/audience-id";
import { SlideWithSteps } from "./SlideWithSteps";
import { InteractionAudiencePanel } from "./InteractionAudiencePanel";
import type { StepController } from "@/lib/slide-steps";
import type { StepConfig } from "@/lib/step-config";
import type { SlideMeta } from "@/lib/extract-slide-types";

interface AudienceViewerProps {
  children: ReactNode;
  session: AudienceSession;
  slideMetas: SlideMeta[];
  presentationTitle: string;
}

export function AudienceViewer({
  children,
  session,
  slideMetas,
  presentationTitle,
}: AudienceViewerProps) {
  const slides = useMemo(
    () =>
      Children.toArray(children).filter((child) =>
        isValidElement(child)
      ) as ReactElement[],
    [children]
  );
  const total = slides.length;

  // Presentatörens aktuella slide (styrs via realtime från sessions-tabellen).
  const [presenterSlide, setPresenterSlide] = useState(session.current_slide ?? 0);
  // Publikens egen slide-position — default samma som presenter, men publiken
  // kan avvika genom att navigera bakåt/framåt (om tillåtet).
  const [index, setIndex] = useState(session.current_slide ?? 0);
  const [direction, setDirection] = useState(1);
  const [panel, setPanel] = useState<"none" | "general" | "slide" | "ask">("none");
  const [connected, setConnected] = useState(false);
  // Publiken följer presenter som default. Sätts false när publiken navigerat själv.
  const [autoFollow, setAutoFollow] = useState(true);
  const [allowBack, setAllowBack] = useState(session.allow_back ?? true);
  const [allowForward, setAllowForward] = useState(session.allow_forward ?? false);
  const stepsController = useRef<StepController | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  // Auto-scrolla aside:en in i viewporten när publik växlar flik.
  // Bara relevant på mobil där aside ligger under slide-vyn.
  const scrollAsideIntoView = useCallback(() => {
    if (typeof window === "undefined") return;
    // Bara på mobil (< md breakpoint där layouten stackas vertikalt)
    if (window.innerWidth >= 768) return;
    // Vänta en tick så panel-content hinner rendera innan vi scrollar
    setTimeout(() => {
      asideRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }, []);

  const { notes, setGeneral, setSlideNote } = useAudienceNotes(session.id);
  const audienceId = useAudienceId();

  // Realtime: lyssna på sessions-ändringar
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`session:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const next = payload.new as AudienceSession;
          if (typeof next.current_slide === "number") {
            setPresenterSlide(next.current_slide);
            // Om publiken är i auto-follow, följ med
            setIndex((prev) => {
              if (autoFollow) {
                setDirection(next.current_slide > prev ? 1 : -1);
                return next.current_slide;
              }
              return prev;
            });
          }
          if (typeof next.allow_back === "boolean") setAllowBack(next.allow_back);
          if (typeof next.allow_forward === "boolean") setAllowForward(next.allow_forward);
          if (next.active === false) {
            setConnected(false);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [session.id, autoFollow]);

  // Navigation-handlers för publiken.
  const canGoBack = allowBack && index > 0;
  const canGoForward = allowForward && index < total - 1 && index < presenterSlide;
  // (Framåt endast till det presentatören visat så långt, även om allow_forward=true)

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    setDirection(-1);
    setIndex((prev) => Math.max(0, prev - 1));
    setAutoFollow(false);
  }, [canGoBack]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    setDirection(1);
    setIndex((prev) => Math.min(total - 1, prev + 1));
    // Om publiken når presentatören igen → auto-follow tillbaka
    setAutoFollow((prev) => {
      const newIndex = Math.min(total - 1, index + 1);
      return newIndex === presenterSlide ? true : prev;
    });
  }, [canGoForward, index, total, presenterSlide]);

  const catchUpToLive = useCallback(() => {
    setDirection(presenterSlide > index ? 1 : -1);
    setIndex(presenterSlide);
    setAutoFollow(true);
  }, [presenterSlide, index]);

  // Keyboard nav för publiken (pilar)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignorera om fokus är i input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goBack, goForward]);

  const isDivergent = index !== presenterSlide;

  const current = slides[Math.min(Math.max(index, 0), total - 1)];
  const currentMeta = slideMetas[index];
  const slideTitle = currentMeta?.primaryText ?? `Slide ${index + 1}`;
  const currentSlideNote = notes.perSlide[index] ?? "";

  const handleDownloadPdf = useCallback(async () => {
    const { buildAudiencePdf } = await import("@/lib/audience-pdf");
    await buildAudiencePdf({
      presentationTitle,
      sessionCode: session.code,
      slideMetas,
      notes,
    });
  }, [notes, session.code, slideMetas, presentationTitle]);

  // Tillåt body-scroll i publikvyn så hela sidan kan scrollas på mobil
  // (body har overflow:hidden default för presentationsvy).
  useEffect(() => {
    document.body.classList.add("allow-scroll");
    return () => {
      document.body.classList.remove("allow-scroll");
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="flex items-center justify-between border-b border-white/10 bg-bg-surface/60 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-[0.25em] text-text-muted">
            {presentationTitle}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-text">
            <span>
              Slide <span className="font-semibold">{index + 1}</span> / {total}
            </span>
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                connected ? "bg-emerald-400" : "bg-amber-400"
              }`}
              aria-hidden
            />
            <span className="text-xs text-text-muted">
              {connected ? "Live" : "Återansluter…"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:border-accent hover:text-accent md:inline-flex"
          >
            Ladda ner PDF
          </button>
          <Link
            href="/join"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:border-red-400 hover:text-red-400"
          >
            Lämna
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-rows-[auto_1fr] gap-4 p-4 md:grid-cols-[1fr_360px] md:grid-rows-1 md:gap-6 md:p-6">
        <div className="flex min-h-0 flex-col gap-3">
          {/* "Följ live"-banner när publiken avvikit från presentatören */}
          <AnimatePresence>
            {isDivergent && (
              <motion.button
                key="catch-up"
                type="button"
                onClick={catchUpToLive}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition-colors hover:border-amber-400 hover:bg-amber-400/20"
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300" aria-hidden />
                  <span>
                    Du är på slide <strong>{index + 1}</strong> · Presentatören är på{" "}
                    <strong>{presenterSlide + 1}</strong>
                  </span>
                </span>
                <span className="text-xs uppercase tracking-[0.2em]">
                  Följ live →
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          <ScaledSlideViewport
            index={index}
            direction={direction}
            stepsController={stepsController}
            stepConfig={currentMeta?.steps}
          >
            {current}
          </ScaledSlideViewport>

          {/* Navigation-kontroller för publiken */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={!canGoBack}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-bg-surface/40 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-text-muted"
              title={allowBack ? "Föregående slide (←)" : "Presentatören har låst bakåtnavigation"}
              aria-label="Föregående slide"
            >
              ← Föregående
            </button>
            <span className="font-mono text-xs tabular-nums text-text-muted/70">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={goForward}
              disabled={!canGoForward}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-bg-surface/40 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-text-muted"
              title={
                !allowForward
                  ? "Presentatören har låst framåtnavigation"
                  : index >= presenterSlide
                    ? "Vänta på presentatören"
                    : "Nästa slide (→)"
              }
              aria-label="Nästa slide"
            >
              Nästa →
            </button>
          </div>
        </div>

        <aside className="flex min-h-0 flex-col gap-3" ref={asideRef}>
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={panel === "slide"}
              onClick={() => {
                setPanel(panel === "slide" ? "none" : "slide");
                scrollAsideIntoView();
              }}
            >
              Anteckning för slide
            </TabButton>
            <TabButton
              active={panel === "general"}
              onClick={() => {
                setPanel(panel === "general" ? "none" : "general");
                scrollAsideIntoView();
              }}
            >
              Löpande anteckningar
            </TabButton>
            <TabButton
              active={panel === "ask"}
              onClick={() => {
                setPanel(panel === "ask" ? "none" : "ask");
                scrollAsideIntoView();
              }}
              variant="accent"
            >
              Ställ fråga
            </TabButton>
          </div>

          <div className="flex min-h-[280px] flex-1 flex-col rounded-xl border border-white/10 bg-bg-surface/40 p-4">
            {panel === "none" && (
              <NotesHelp
                slideTitle={slideTitle}
                generalCount={notes.general.length}
                slideCount={Object.keys(notes.perSlide).length}
              />
            )}
            {panel === "slide" && (
              <SlideNotePanel
                key={index}
                slideIndex={index}
                slideTitle={slideTitle}
                value={currentSlideNote}
                onChange={(text) => setSlideNote(index, text)}
              />
            )}
            {panel === "general" && (
              <GeneralNotePanel value={notes.general} onChange={setGeneral} />
            )}
            {panel === "ask" && (
              <AskQuestionPanel
                sessionId={session.id}
                slideIndex={index}
                onDone={() => setPanel("none")}
              />
            )}
          </div>

          <button
            onClick={handleDownloadPdf}
            className="rounded-full border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.2em] text-text-muted transition-colors hover:border-accent hover:text-accent md:hidden"
          >
            Ladda ner PDF
          </button>
        </aside>
      </div>

      {audienceId && (
        <InteractionAudiencePanel sessionId={session.id} audienceId={audienceId} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  variant = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "accent";
}) {
  const accent = variant === "accent";
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition-colors ${
        active
          ? accent
            ? "border-accent bg-accent text-bg"
            : "border-accent bg-accent/10 text-accent"
          : accent
            ? "border-accent/60 text-accent hover:bg-accent/10"
            : "border-white/15 text-text-muted hover:border-accent hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}

function NotesHelp({
  slideTitle,
  generalCount,
  slideCount,
}: {
  slideTitle: string;
  generalCount: number;
  slideCount: number;
}) {
  return (
    <div className="text-sm text-text-muted">
      <div className="text-xs uppercase tracking-[0.3em] text-accent">Nu visas</div>
      <div className="mt-1 text-base text-text">{slideTitle}</div>
      <p className="mt-4 leading-relaxed">
        Skriv anteckningar kopplade till aktuell slide eller löpande under
        föreläsningen. Allt sparas automatiskt i din webbläsare. Ladda ner som
        PDF när du vill.
      </p>
      <ul className="mt-4 space-y-1 text-xs text-text-muted">
        <li>• Slide-anteckningar: {slideCount} st</li>
        <li>• Löpande: {generalCount} tecken</li>
      </ul>
    </div>
  );
}

function SlideNotePanel({
  slideIndex,
  slideTitle,
  value,
  onChange,
}: {
  slideIndex: number;
  slideTitle: string;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-text-muted">
          Slide {slideIndex + 1}
        </div>
        <div className="mt-0.5 text-sm text-text">{slideTitle}</div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Din anteckning för den här sliden…"
        className="min-h-0 flex-1 resize-none rounded-lg border border-white/10 bg-bg p-3 text-sm leading-relaxed text-text outline-none transition-colors focus:border-accent"
      />
      <div className="text-xs text-text-muted">Sparas automatiskt</div>
    </div>
  );
}

function GeneralNotePanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="text-xs uppercase tracking-[0.3em] text-text-muted">
        Löpande anteckningar
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tankar, idéer, citat — oberoende av aktuell slide…"
        className="min-h-0 flex-1 resize-none rounded-lg border border-white/10 bg-bg p-3 text-sm leading-relaxed text-text outline-none transition-colors focus:border-accent"
      />
      <div className="text-xs text-text-muted">Sparas automatiskt</div>
    </div>
  );
}

function AskQuestionPanel({
  sessionId,
  slideIndex,
  onDone,
}: {
  sessionId: string;
  slideIndex: number;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      await submitQuestion(sessionId, trimmed, slideIndex);
      setText("");
      setStatus("sent");
      setTimeout(onDone, 1200);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="text-xs uppercase tracking-[0.3em] text-accent">
        Ställ en fråga
      </div>
      <p className="text-xs text-text-muted">
        Din fråga dyker upp hos föreläsaren. Den visas inte för andra i publiken.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        placeholder="Skriv din fråga…"
        maxLength={2000}
        className="min-h-0 flex-1 resize-none rounded-lg border border-white/10 bg-bg p-3 text-sm leading-relaxed text-text outline-none transition-colors focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">
          {status === "sent" && <span className="text-emerald-400">Skickad ✓</span>}
          {status === "error" && <span className="text-red-400">{error ?? "Fel"}</span>}
          {status === "idle" && <span>{text.length}/2000</span>}
        </div>
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-full border border-accent bg-accent/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          {sending ? "Skickar…" : "Skicka"}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// ScaledSlideViewport — renderar slide vid 1920×1080 design-storlek och
// skalar ner med CSS transform så templates aldrig overrunner mobilskärmen.
// Samma pattern som EditorPreview använder för att visa preview-zon.
// =============================================================================

const SLIDE_DESIGN_WIDTH = 1920;
const SLIDE_DESIGN_HEIGHT = 1080;

function ScaledSlideViewport({
  index,
  direction,
  stepsController,
  stepConfig,
  children,
}: {
  index: number;
  direction: number;
  stepsController: React.MutableRefObject<StepController | null>;
  /** stegAv / hoppaSteg på sliden — samma steg som i spelaren. */
  stepConfig?: StepConfig;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      const s = Math.min(w / SLIDE_DESIGN_WIDTH, h / SLIDE_DESIGN_HEIGHT);
      setScale(s);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-black"
      style={{ aspectRatio: "16 / 9" }}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          variants={{
            enter: (dir: number) => ({ opacity: 0, x: dir * 20 }),
            center: { opacity: 1, x: 0 },
            exit: (dir: number) => ({ opacity: 0, x: dir * -20 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 32 },
            opacity: { duration: 0.2 },
          }}
          className="absolute inset-0"
        >
          <div
            style={{
              width: SLIDE_DESIGN_WIDTH,
              height: SLIDE_DESIGN_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <SlideWithSteps slideKey={index} controllerRef={stepsController} config={stepConfig}>
              {children}
            </SlideWithSteps>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
