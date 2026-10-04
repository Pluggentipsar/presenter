"use client";

import { useEffect, useRef } from 'react';
import s from './ambient-gradient.module.css';

/** Decorative light only. Never reveals content or owns a slide step.
 * Uses the surrounding scene's semantic colours, with theme fallbacks.
 * Three rasterised gradients move by transform; no per-frame blur/JS loop.
 */
export function AmbientGradient({still=false,quiet=false}:{still?:boolean;quiet?:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=host.current;
    if(!el) return;
    let inView=true;
    const update=()=>{el.dataset.paused=String(document.hidden||!inView);};
    const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;update();});
    observer.observe(el);
    document.addEventListener('visibilitychange',update);
    update();
    return ()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);};
  },[]);
  return <div ref={host} aria-hidden="true" className={s.field} data-ambient-gradient data-still={still} data-quiet={quiet}>
    <div className={s.light}/><div className={s.light}/><div className={s.light}/><div className={s.shade}/>
  </div>;
}
