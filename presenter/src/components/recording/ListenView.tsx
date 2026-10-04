"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StageFrame } from "@/components/share/StageFrame";
import { clock } from "@/lib/recording/timeline";
import s from "./lyssna.module.css";

/**
 * Lyssningsläget (/<slug>/lyssna, 2 oktober 2026): ljudet från en inspelning, och sliden som följer
 * tidslinjen klick för klick i samma slideruta som läsläget. Kapitlen och avskriften går att klicka
 * på för att hoppa. Mellanslag spelar och pausar; pilarna (och clickern) byter kapitel.
 */

export interface ListenPosition {
  /** Sekunder i ljudet. */
  t: number;
  /** 0-baserat slideindex i decket som det ser ut nu. */
  slide: number;
  /** 1-baserat klicksteg. */
  step: number;
}

interface Props {
  slug: string;
  id: string;
  title: string;
  recorded: string;
  duration: number;
  audio: string | null;
  positions: ListenPosition[];
  chapters: { start: number; end: number; title: string }[];
  sentences: { start: number; end: number; text: string }[];
}

/** Sista posten vars tid har passerats (listan är sorterad på tid). */
function lastAt<T extends { t?: number; start?: number }>(list: T[], time: number, key: (item: T) => number): number {
  let low = 0, high = list.length - 1, found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (key(list[middle]) <= time + 0.02) { found = middle; low = middle + 1; } else high = middle - 1;
  }
  return found;
}

export function ListenView({ slug, id, title, recorded, duration, audio, positions, chapters, sentences }: Props) {
  const player = useRef<HTMLAudioElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [making, setMaking] = useState("");

  const positionIndex = Math.max(0, lastAt(positions, time, position => position.t));
  const position = positions[positionIndex] ?? { t: 0, slide: 0, step: 1 };
  const chapterIndex = Math.max(0, lastAt(chapters, time, chapter => chapter.start));
  const sentenceIndex = lastAt(sentences, time, sentence => sentence.start);
  const total = duration || player.current?.duration || 0;

  const seek = useCallback((seconds: number) => {
    const element = player.current;
    if (!element) return;
    element.currentTime = Math.max(0, Math.min(seconds, (element.duration || duration) - 0.05));
    setTime(element.currentTime);
  }, [duration]);
  const toggle = useCallback(() => {
    const element = player.current;
    if (!element) return;
    if (element.paused) void element.play();
    else element.pause();
  }, []);

  // Tiden följs tätt medan ljudet spelar, så att sliden byter i rätt ögonblick.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      if (player.current) setTime(player.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Mellanslag spelar och pausar; pilar, Page Up/Down och clickern byter kapitel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === " " || event.key === "k") { event.preventDefault(); toggle(); }
      else if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); seek(chapters[Math.min(chapters.length - 1, chapterIndex + 1)]?.start ?? 0); }
      else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        const current = chapters[chapterIndex];
        seek(current && time - current.start > 3 ? current.start : chapters[Math.max(0, chapterIndex - 1)]?.start ?? 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, seek, chapters, chapterIndex, time]);

  // Meningen som sägs hålls synlig i avskriften (rutan rullar, inte sidan).
  useEffect(() => {
    const box = transcript.current;
    const current = box?.querySelector<HTMLElement>("[data-current]");
    if (!box || !current) return;
    const top = current.offsetTop - box.offsetTop;
    if (top < box.scrollTop + 40 || top > box.scrollTop + box.clientHeight - 80) box.scrollTo({ top: Math.max(0, top - box.clientHeight / 3), behavior: "smooth" });
  }, [sentenceIndex]);

  const makeAudio = async () => {
    setMaking("Gör ljudfilen …");
    const response = await fetch("/api/inspelning/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, id, settings: { layout: "ljud", loudness: true } }) });
    if (!response.ok) { setMaking(await response.text()); return; }
    for (;;) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const state = await (await fetch(`/api/inspelning/export?${new URLSearchParams({ slug, id })}`, { cache: "no-store" })).json() as { status?: { state: string; message?: string } };
      if (state.status?.state === "klar") { window.location.reload(); return; }
      if (state.status && state.status.state !== "kör") { setMaking(state.status.message ?? "Det gick inte."); return; }
    }
  };

  const recordedLabel = useMemo(() => new Date(recorded).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" }), [recorded]);

  return (
    <main className={s.page}>
      <header className={s.head}>
        <a className={s.back} href={`/${slug}/inspelningar?id=${id}`}>Inspelningen</a>
        <p className={s.kicker}>Lyssna · inspelad {recordedLabel}</p>
        <h1 className={s.title}>{title}</h1>
      </header>

      <div className={s.layout}>
        <section className={s.stageColumn} aria-label="Sliden och ljudet">
          <div className={s.stage}>
            <StageFrame slug={slug} slide={position.slide} step={Math.max(0, position.step - 1)} label={`Slide ${position.slide + 1}, klick ${position.step}`} />
          </div>
          {audio ? (
            <div className={s.player}>
              <audio
                ref={player}
                src={audio}
                preload="auto"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onSeeked={() => setTime(player.current?.currentTime ?? 0)}
                onTimeUpdate={() => { if (!playing) setTime(player.current?.currentTime ?? 0); }}
              />
              <button type="button" className={s.play} onClick={toggle} aria-label={playing ? "Pausa" : "Spela"}>
                {playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>}
              </button>
              <span className={s.time}>{clock(time)} / {clock(total)}</span>
              <div
                className={s.bar}
                role="slider"
                tabIndex={0}
                aria-label="Var i föreläsningen"
                aria-valuemin={0}
                aria-valuemax={Math.round(total)}
                aria-valuenow={Math.round(time)}
                onClick={event => {
                  const box = event.currentTarget.getBoundingClientRect();
                  seek(((event.clientX - box.left) / box.width) * total);
                }}
              >
                <span className={s.progress} style={{ width: `${total ? (time / total) * 100 : 0}%` }} />
                {chapters.slice(1).map(chapter => <span key={chapter.start} className={s.tick} style={{ left: `${total ? (chapter.start / total) * 100 : 0}%` }} />)}
              </div>
            </div>
          ) : (
            <div className={s.player}>
              <p className={s.note}>Ljudfilen finns inte ännu. Den görs ur inspelningen på några sekunder, med jämn ljudnivå och kapitel.</p>
              <button type="button" className={s.make} disabled={Boolean(making) && making.endsWith("…")} onClick={() => void makeAudio()}>{making || "Gör ljudfilen"}</button>
            </div>
          )}
          <p className={s.now}><span>{chapters[chapterIndex]?.title}</span> · slide {position.slide + 1}, klick {position.step}</p>
        </section>

        <aside className={s.side}>
          <h2 className={s.sideHead}>Kapitel</h2>
          <ol className={s.chapters}>
            {chapters.map((chapter, i) => (
              <li key={chapter.start} data-current={i === chapterIndex ? "" : undefined}>
                <button type="button" onClick={() => seek(chapter.start)}>
                  <span className={s.chapterTime}>{clock(chapter.start)}</span>
                  <span>{chapter.title}</span>
                </button>
              </li>
            ))}
          </ol>
          {sentences.length > 0 && <>
            <h2 className={s.sideHead}>Det som sägs</h2>
            <div ref={transcript} className={s.transcript}>
              {sentences.map((sentence, i) => (
                <span key={`${sentence.start}-${i}`}>
                  <button type="button" data-current={i === sentenceIndex ? "" : undefined} onClick={() => seek(sentence.start)}>{sentence.text}</button>{" "}
                </span>
              ))}
            </div>
          </>}
        </aside>
      </div>
    </main>
  );
}
