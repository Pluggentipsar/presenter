"use client";
import { useEffect, useRef } from "react";
import { useIsPresent } from "framer-motion";

/** Ett klipp ur en film: start, längd och slinga. Spelar bara när scenen är framme och inte stilla.
 * Flyttat ur en annan scenfamilj 3 oktober 2026 (används också av Vem). */
export function Clip({src,poster,alt,still,start=0,duration=0,loop=false}:{src:string;poster:string;alt:string;still:boolean;start?:number;duration?:number;loop?:boolean}) {
  const ref = useRef<HTMLVideoElement>(null);
  const present = useIsPresent();
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let live = true;
    const ready = () => { if (!live) return; video.currentTime = start; if (present && !still) void video.play().catch(() => {}); else video.pause(); };
    if (video.readyState >= 1) ready(); else video.addEventListener('loadedmetadata', ready, { once: true });
    return () => { live = false; video.removeEventListener('loadedmetadata',ready); video.pause(); };
  }, [src, start, present, still]);
  return <video ref={ref} src={src || undefined} poster={poster || undefined} muted playsInline preload="metadata" loop={loop} aria-label={alt} onTimeUpdate={e => { if (!loop && duration > 0 && e.currentTarget.currentTime >= start + duration) e.currentTarget.pause(); }} />;
}
