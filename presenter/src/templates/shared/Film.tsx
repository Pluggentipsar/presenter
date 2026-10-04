"use client";
import { useEffect, useRef, useState } from "react";
import { useIsPresent, useReducedMotion } from "framer-motion";
import { useInlineEdit } from "@/lib/inline-edit";
import s from "./film.module.css";

/**
 * Film eller ljud i en scen, med ljudknapp och spela-knapp. Spelar bara när scenen nås framåt; bakåt,
 * reducerad rörelse (dekorativ film) och redigering i R pausar. `hold`: filmen står pausad tills scenens
 * nästa klick släpper den. Samma komponent som elevföreläsningens Film (3 oktober 2026), med egna
 * grundstilar, så att andra scenfamiljer inte drar med sig föreläsningens stilar och innehåll.
 */
export function Film({ src, poster, backward, decorative = false, audio = false, silent = false, chrome = true, hold = false }: { src: string; poster?: string; backward: boolean; decorative?: boolean; audio?: boolean; silent?: boolean; chrome?: boolean; hold?: boolean }) {
  const { editMode } = useInlineEdit();
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null); const present = useIsPresent(); const reduced = useReducedMotion();
  const [muted, setMuted] = useState(decorative); const [blocked, setBlocked] = useState(false); const [failed, setFailed] = useState(false);
  const [shape, setShape] = useState("landscape");
  useEffect(() => {
    const el = ref.current; if (!el) return; let valid = true;
    if (present && !backward && !editMode && !hold && !(decorative && reduced)) el.play().catch(() => { if (valid) setBlocked(true); });
    else el.pause();
    return () => { valid = false; el.pause(); };
  }, [src, backward, present, reduced, decorative, editMode, hold]);
  return <div className={`${s.film} ${decorative ? s.decorative : ""}`} data-film-shape={shape}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {poster && <img src={poster} alt="" />}
    {audio ? <audio ref={ref} src={src} muted={silent || muted} preload="metadata" onError={() => setFailed(true)} /> : <video ref={ref} src={src} poster={poster} playsInline muted={silent || muted} preload="metadata" loop={decorative} onLoadedMetadata={e => setShape(e.currentTarget.videoWidth < e.currentTarget.videoHeight ? "portrait" : "landscape")} onError={() => setFailed(true)} aria-label={decorative ? "Genererad stämningsfilm" : "Originalklipp i full längd"} />}
    {!decorative && chrome && <div className={s.mediaControls}>
      {failed ? <span>Filmen kunde inte laddas.</span> : <>
        {silent ? <span>Utan ljud</span> : <button type="button" onClick={() => setMuted(v => !v)}>{muted ? "Ljud av" : "Ljud på"}</button>}
        {(blocked || backward || editMode) && <button type="button" onClick={() => ref.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true))}>Spela</button>}
      </>}
    </div>}
  </div>;
}
