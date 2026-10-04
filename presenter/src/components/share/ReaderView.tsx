"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { ShareArticle } from "@/lib/share/article";
import {
  READER_DEFAULTS,
  SCALE_STEPS,
  SPLIT_MAX,
  SPLIT_MIN,
  getReaderSettings,
  getServerReaderSettings,
  stepReaderScale,
  subscribeReaderSettings,
  updateReaderSettings,
} from "@/lib/share/reader-settings";
import { StageFrame, type StageState } from "./StageFrame";
import { ReadNodes } from "./inline";
import styles from "./share.module.css";

const WIDE = "(min-width: 1024px)";
const subscribeFullscreenSupport = () => () => {};
const getFullscreenSupport = () => Boolean(document.fullscreenEnabled);
const getServerFullscreenSupport = () => false;

/**
 * Läsläget: lästexten rullar, sliden ligger still bredvid (på mobil överst)
 * och följer texten. Varje textblock är förankrat i en slide och ett klickläge;
 * blocket som korsar läslinjen bestämmer vad scenrutan visar. Så överlever
 * "prompt först, svar på nästa klick" även för den som läser.
 *
 * Läsaren styr själv formen: drar i mittlinjen, döljer bilden ("bara text"),
 * ändrar textstorlek och slår av fokustoningen. Valen sparas i webbläsaren.
 */
export function ReaderView({ article }: { article: ShareArticle }) {
  const { blocks, chapters, slug } = article;
  const settings = useSyncExternalStore(subscribeReaderSettings, getReaderSettings, getServerReaderSettings);
  const textOnly = settings.layout === "text";

  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenAvailable = useSyncExternalStore(subscribeFullscreenSupport, getFullscreenSupport, getServerFullscreenSupport);
  const [fullscreenError, setFullscreenError] = useState("");
  const [navigation, setNavigation] = useState<{ direction: 1 | -1; sequence: number }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState<StageState | null>(null);

  const blockRefs = useRef<(HTMLElement | null)[]>([]);
  const columnsRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(false);
  const activeRef = useRef(0);
  const stageRef = useRef<StageState | null>(null);
  const wasFullscreen = useRef(false);
  const receiveStage = useCallback((state: StageState) => {
    stageRef.current = state;
    setStage(state);
  }, []);

  const block = blocks[active];
  const chapter = chapters[block?.chapter ?? 0];

  /** Läslinjen: texten som passerar den styr sliden. */
  const focusLine = useCallback(() => {
    const wide = window.matchMedia(WIDE).matches;
    const dockBottom = dockRef.current?.getBoundingClientRect().bottom ?? 0;
    // Utan synlig bild (bara text) finns inget att läsa "under".
    if (wide || dockBottom <= 0) return window.innerHeight * (wide ? 0.42 : 0.3);
    return dockBottom + (window.innerHeight - dockBottom) * 0.3;
  }, []);

  const scrollToBlock = useCallback(
    (index: number, smooth: boolean) => {
      const el = blockRefs.current[index];
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const top = window.scrollY + el.getBoundingClientRect().top - focusLine() + 12;
      window.scrollTo({ top: Math.max(0, top), behavior: smooth && !reduce ? "smooth" : "auto" });
    },
    [focusLine],
  );

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, blocks.length - 1));
      if (expandedRef.current) {
        // I förstorat läge finns ingen läslinje att mäta mot: byt block direkt
        // och låt texten hinna ikapp när rutan stängs.
        activeRef.current = next;
        setActive(next);
      } else {
        scrollToBlock(next, true);
      }
    },
    [blocks.length, scrollToBlock],
  );

  // Aktivt block = det sista vars överkant passerat läslinjen.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (expandedRef.current) return;
      const line = focusLine();
      let index = 0;
      blockRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) index = i;
      });
      activeRef.current = index;
      setActive(index);
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, doc.scrollTop / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const hash = window.location.hash.slice(1);
    const start = blocks.findIndex((b) => b.id === hash);
    if (start > 0) {
      scrollToBlock(start, false);
      // Webbtypsnitten laddas efter första layouten och flyttar styckena.
      // Sikta om när de är på plats, annars landar djuplänken ett stycke fel.
      document.fonts?.ready.then(() => {
        if (activeRef.current <= start) scrollToBlock(start, false);
      });
    }
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [blocks, focusLine, scrollToBlock]);

  // Textstorlek och "bara text" flyttar alla stycken. Håll kvar läsaren vid
  // samma stycke i stället för att låta sidan glida iväg under dem.
  const settingsApplied = useRef(false);
  useEffect(() => {
    if (!settingsApplied.current) {
      settingsApplied.current = true;
      return;
    }
    const frame = requestAnimationFrame(() => scrollToBlock(activeRef.current, false));
    return () => cancelAnimationFrame(frame);
  }, [settings.scale, settings.layout, scrollToBlock]);

  // Adressen följer läsningen, så en länk kan peka på ett visst stycke.
  useEffect(() => {
    const id = blocks[active]?.id;
    if (!id) return;
    const timer = window.setTimeout(() => {
      window.history.replaceState(null, "", active === 0 ? window.location.pathname : `#${id}`);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active, blocks]);

  const setExpandedState = useCallback(
    (next: boolean) => {
      expandedRef.current = next;
      setExpanded(next);
      // ShareScrollEffect äger normalläget ("auto"); här låses bara under förstoring.
      document.documentElement.style.overflow = next ? "hidden" : "auto";
      if (!next) requestAnimationFrame(() => scrollToBlock(activeRef.current, false));
    },
    [scrollToBlock],
  );

  // Fullscreen is a clean live presentation, independent of the reading blocks.
  // On exit, resume reading at the nearest text for the slide just presented.
  useEffect(() => {
    const sync = () => {
      const next = document.fullscreenElement === dockRef.current;
      setFullscreen(next);
      setNavigation(undefined);
      if (!next && wasFullscreen.current) {
        const current = stageRef.current;
        if (current) {
          let nearest = activeRef.current;
          const previous = blocks[nearest];
          const samePosition = previous?.slideIndex === current.slide &&
            (previous.step === "last" ? current.step >= current.totalSteps - 1 : previous.step === current.step);
          if (!samePosition) {
            nearest = 0;
            blocks.forEach((candidate, i) => {
              if (candidate.slideIndex < current.slide || (candidate.slideIndex === current.slide &&
                (candidate.step === "last" ? current.step >= current.totalSteps - 1 : candidate.step <= current.step))) nearest = i;
            });
          }
          activeRef.current = nearest;
          setActive(nearest);
        }
        setExpandedState(false);
        requestAnimationFrame(() => dockRef.current?.querySelector<HTMLButtonElement>(`.${styles.stageHit}`)?.focus({ preventScroll: true }));
      }
      wasFullscreen.current = next;
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [blocks, setExpandedState]);

  const toggleFullscreen = useCallback(async () => {
    setFullscreenError("");
    try {
      if (document.fullscreenElement === dockRef.current) await document.exitFullscreen();
      else await dockRef.current?.requestFullscreen();
    } catch {
      setFullscreenError("Helskärm kunde inte öppnas. Du kan fortsätta i den förstorade vyn.");
    }
  }, []);

  const closeExpanded = useCallback(async () => {
    if (document.fullscreenElement === dockRef.current) {
      try { await document.exitFullscreen(); }
      catch { setFullscreenError("Lämna helskärmen med Esc och försök igen."); return; }
    }
    setFullscreenError("");
    setExpandedState(false);
    requestAnimationFrame(() => dockRef.current?.querySelector<HTMLButtonElement>(`.${styles.stageHit}`)?.focus({ preventScroll: true }));
  }, [setExpandedState]);

  const onKey = useCallback(
    (key: string) => {
      if (key === "Escape") {
        if (document.fullscreenElement === dockRef.current) {
          void toggleFullscreen();
          return;
        }
        if (expandedRef.current) void closeExpanded();
        setMenuOpen(false);
        setSettingsOpen(false);
      } else {
        const direction = ["ArrowRight", "ArrowDown", "PageDown", " ", "j"].includes(key) ? 1
          : ["ArrowLeft", "ArrowUp", "PageUp", "k"].includes(key) ? -1 : null;
        if (direction === null) return;
        if (document.fullscreenElement === dockRef.current) {
          setNavigation(previous => ({ direction, sequence: (previous?.sequence ?? 0) + 1 }));
        } else goTo(activeRef.current + direction);
      }
    },
    [goTo, closeExpanded, toggleFullscreen],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Mittlinjen och inställningarna har egna piltangenter.
      if (e.target instanceof HTMLElement && e.target.closest("[data-own-keys]") && e.key !== "Escape") return;
      if (["ArrowRight", "ArrowLeft", "Escape", "j", "k"].includes(e.key) ||
        (expandedRef.current && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", " "].includes(e.key))) {
        if (e.key !== "Escape") e.preventDefault();
        onKey(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  // ── Mittlinjen ──────────────────────────────────────────────────────────
  const splitFromPointer = (clientX: number) => {
    const rect = columnsRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    updateReaderSettings({ split: Math.round(pct * 10) / 10 });
  };
  const onSplitDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onSplitMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging) splitFromPointer(e.clientX);
  };
  const onSplitUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };
  const onSplitKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 8 : 2;
    if (e.key === "ArrowLeft") updateReaderSettings({ split: settings.split - step });
    else if (e.key === "ArrowRight") updateReaderSettings({ split: settings.split + step });
    else if (e.key === "Home") updateReaderSettings({ split: SPLIT_MIN });
    else if (e.key === "End") updateReaderSettings({ split: SPLIT_MAX });
    else if (e.key === "Enter") updateReaderSettings({ split: READER_DEFAULTS.split });
    else return;
    e.preventDefault();
  };

  if (!block) return null;

  const steps = stage && stage.slide === block.slideIndex ? stage.totalSteps : 0;
  const stepNow = stage && stage.slide === block.slideIndex ? stage.step + 1 : 1;
  const chapterNumber = String((block.chapter ?? 0) + 1).padStart(2, "0");
  const scaleIndex = SCALE_STEPS.findIndex((s) => s === settings.scale);

  return (
    <div
      className={styles.reader}
      data-layout={settings.layout}
      data-focus={settings.focus ? undefined : "off"}
      data-dragging={dragging ? "" : undefined}
      style={{ "--split": settings.split, "--read-scale": settings.scale } as CSSProperties}
    >
      <header className={styles.bar}>
        <a href={article.home?.href ?? `/${slug}/dela`} className={styles.barBack} aria-label={article.home?.label ?? "Till startsidan"}>
          <span aria-hidden>←</span>
          <span className={styles.barTitle}>{article.home?.label ?? article.title}</span>
        </a>
        <button
          type="button"
          className={styles.barChapter}
          aria-expanded={menuOpen}
          aria-controls="kapitelmeny"
          onClick={() => {
            setSettingsOpen(false);
            setMenuOpen((v) => !v);
          }}
        >
          <span className={styles.mono}>{chapterNumber}</span>
          <span className={styles.barChapterTitle}>{chapter?.title}</span>
          <span aria-hidden className={styles.caret}>{menuOpen ? "×" : "☰"}</span>
        </button>
        <div className={styles.barRight}>
          <button
            type="button"
            className={styles.barSettings}
            aria-expanded={settingsOpen}
            aria-controls="lasinstallningar"
            aria-label="Läsinställningar"
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen((v) => !v);
            }}
          >
            <span aria-hidden>Aa</span>
          </button>
          <Link href={`/${slug}`} className={styles.barWatch}>
            Se föreläsningen <span aria-hidden>↗</span>
          </Link>
        </div>
        <div className={styles.progress} aria-hidden>
          <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      {menuOpen ? (
        <nav id="kapitelmeny" className={styles.menu} aria-label="Kapitel">
          <ol>
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={i === block.chapter ? styles.menuActive : undefined}
                  onClick={() => {
                    setMenuOpen(false);
                    goTo(c.firstBlock);
                  }}
                >
                  <span className={styles.mono}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{c.title}</span>
                  <span className={styles.menuMinutes}>{c.minutes} min</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {settingsOpen ? (
        <>
          <button
            type="button"
            className={styles.scrim}
            aria-label="Stäng läsinställningar"
            onClick={() => setSettingsOpen(false)}
          />
          <section id="lasinstallningar" className={styles.settings} aria-label="Läsinställningar" data-own-keys="">
            <div className={styles.settingsRow}>
              <span className={styles.mono}>Textstorlek</span>
              <div className={styles.stepper}>
                <button
                  type="button"
                  onClick={() => stepReaderScale(-1)}
                  disabled={scaleIndex <= 0}
                  aria-label="Mindre text"
                >
                  A−
                </button>
                <output aria-live="polite">{Math.round(settings.scale * 100)} %</output>
                <button
                  type="button"
                  onClick={() => stepReaderScale(1)}
                  disabled={scaleIndex >= SCALE_STEPS.length - 1}
                  aria-label="Större text"
                >
                  A+
                </button>
              </div>
            </div>
            <div className={styles.settingsRow}>
              <span className={styles.mono}>Visa</span>
              <div className={styles.segmented} role="group" aria-label="Visa">
                <button
                  type="button"
                  aria-pressed={!textOnly}
                  onClick={() => updateReaderSettings({ layout: "split" })}
                >
                  Bild + text
                </button>
                <button
                  type="button"
                  aria-pressed={textOnly}
                  onClick={() => updateReaderSettings({ layout: "text" })}
                >
                  Bara text
                </button>
              </div>
            </div>
            <div className={styles.settingsRow}>
              <span className={styles.mono}>Fokus</span>
              <div className={styles.segmented} role="group" aria-label="Fokus">
                <button
                  type="button"
                  aria-pressed={settings.focus}
                  onClick={() => updateReaderSettings({ focus: true })}
                >
                  Tona ner övrig text
                </button>
                <button
                  type="button"
                  aria-pressed={!settings.focus}
                  onClick={() => updateReaderSettings({ focus: false })}
                >
                  Av
                </button>
              </div>
            </div>
            <p className={styles.settingsHint}>
              Dra i linjen mellan bild och text för att ändra bredden. Dubbelklicka för att återställa.
            </p>
          </section>
        </>
      ) : null}

      <div ref={columnsRef} className={styles.columns}>
        <div className={styles.stageCol} data-expanded={expanded ? "" : undefined}>
          <div ref={dockRef} className={expanded ? styles.stageExpanded : styles.stageDock}>
            <div className={styles.stageSize}>
              <div className={styles.stageFrame}>
                <StageFrame
                  slug={slug}
                  slide={block.slideIndex}
                  step={block.step}
                  label={`Slide ${block.slideIndex + 1} ur föreläsningen`}
                  interactive={expanded}
                  live={fullscreen}
                  navigation={navigation}
                  onState={receiveStage}
                  onKey={onKey}
                />
                {!expanded ? (
                  <button
                    type="button"
                    className={styles.stageHit}
                    onClick={() => setExpandedState(true)}
                    aria-label="Förstora sliden"
                  />
                ) : null}
              </div>
              <div className={styles.stageCaption}>
                <span className={styles.mono}>
                  Slide {block.slideIndex + 1}
                  {steps > 1 ? ` · klick ${stepNow} av ${steps}` : ""}
                </span>
                {steps > 1 ? (
                  <span className={styles.dots} aria-hidden>
                    {Array.from({ length: steps }, (_, i) => (
                      <i key={i} data-on={i < stepNow ? "" : undefined} />
                    ))}
                  </span>
                ) : null}
                {expanded ? (
                  <span className={styles.stageNav}>
                    <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0}>
                      ← Föregående
                    </button>
                    <button type="button" onClick={() => goTo(active + 1)} disabled={active === blocks.length - 1}>
                      Nästa →
                    </button>
                    {fullscreenAvailable ? (
                      <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen}>
                        {fullscreen ? "Lämna helskärm ⛶" : "Helskärm ⛶"}
                      </button>
                    ) : null}
                    <button type="button" onClick={closeExpanded}>
                      Stäng ×
                    </button>
                  </span>
                ) : (
                  <span className={styles.stageTools}>
                    <button type="button" onClick={() => updateReaderSettings({ layout: "text" })}>
                      Bara text
                    </button>
                    <button type="button" onClick={() => setExpandedState(true)}>
                      Förstora ⤢
                    </button>
                  </span>
                )}
                {expanded && fullscreenError ? <span role="status" className={styles.fullscreenError}>{fullscreenError}</span> : null}
              </div>
            </div>
            {!expanded ? (
              <div
                className={styles.splitter}
                role="separator"
                aria-orientation="vertical"
                aria-label="Bredd på bild och text"
                aria-valuemin={SPLIT_MIN}
                aria-valuemax={SPLIT_MAX}
                aria-valuenow={Math.round(settings.split)}
                tabIndex={0}
                data-own-keys=""
                onPointerDown={onSplitDown}
                onPointerMove={onSplitMove}
                onPointerUp={onSplitUp}
                onPointerCancel={onSplitUp}
                onDoubleClick={() => updateReaderSettings({ split: READER_DEFAULTS.split })}
                onKeyDown={onSplitKey}
              />
            ) : null}
          </div>
        </div>

        <main className={styles.textCol}>
          {process.env.NODE_ENV !== "production" && article.warnings.length > 0 ? (
            <div className={styles.warnings} role="alert">
              <strong>Lästexten har fel (visas bara lokalt):</strong>
              <ul>
                {article.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {blocks.map((b, i) => {
            const opensChapter = chapters[b.chapter]?.firstBlock === i;
            return (
              <section
                key={b.id}
                id={b.id}
                ref={(el) => {
                  blockRefs.current[i] = el;
                }}
                className={styles.block}
                data-active={i === active ? "" : undefined}
              >
                {opensChapter ? (
                  <header className={styles.chapterHead}>
                    <span className={styles.mono}>
                      Kapitel {String(b.chapter + 1).padStart(2, "0")} · {chapters[b.chapter].minutes} min
                    </span>
                    <h2>{chapters[b.chapter].title}</h2>
                  </header>
                ) : null}
                <div className={styles.prose}>
                  <ReadNodes nodes={b.nodes} />
                </div>
              </section>
            );
          })}

          <footer className={styles.end}>
            {article.endNote ? <p className={styles.endNote}>{article.endNote}</p> : null}
            <div className={styles.endLinks}>
              <Link href={`/${slug}`} className={styles.buttonPrimary}>
                Se föreläsningen <span aria-hidden>↗</span>
              </Link>
              <a href={article.home?.href ?? `/${slug}/dela`} className={styles.buttonGhost}>
                {article.home?.label ?? "Till startsidan"}
              </a>
            </div>
          </footer>
        </main>
      </div>

      {textOnly ? (
        <button
          type="button"
          className={styles.showStage}
          onClick={() => updateReaderSettings({ layout: "split" })}
        >
          Visa bilden <span className={styles.mono}>Slide {block.slideIndex + 1}</span>
        </button>
      ) : null}
    </div>
  );
}
