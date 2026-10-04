"use client";

import { useEffect, useRef } from 'react';
import { animate, cubicBezier } from 'framer-motion';
import { EditableText } from '@/lib/inline-edit';
import { useSceneReview } from '@/lib/share/scene-review';

const EASE = [.16, 1, .3, 1] as const;
const curve = cubicBezier(...EASE);

/**
 * A finite entrance, not a live statistic. Backwards, reduced motion and R show the exact value.
 * Granskningens ram (?direkt=1) visar också talet färdigt, och ?simtid visar talet vid den sekunden
 * (lib/share/scene-review.ts), så att granskningens bilder inte fångar det mitt i uppräkningen.
 */
export function CountUp({value,path,still,delay=0,duration=2.4}:{value:string;path:string;still:boolean;delay?:number;duration?:number}) {
  const output=useRef<HTMLSpanElement>(null);
  const number=Number(value.replace(',','.'));
  const review=useSceneReview();
  const simtid=review.simtid;
  const reviewing=review.frame||simtid!==null;
  useEffect(()=>{
    const el=output.current;
    if(!el)return;
    if(still||!Number.isFinite(number)||(reviewing&&simtid===null)){el.textContent=value;return;}
    let active=true;
    const decimals=value.match(/[.,](\d+)$/)?.[1].length??0;
    const format=new Intl.NumberFormat('sv-SE',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    if(simtid!==null){
      const p=Math.min(1,Math.max(0,(simtid-delay)/duration));
      el.textContent=p>=1?value:format.format(number*curve(p));
      return;
    }
    el.textContent=format.format(0);
    const controls=animate(0,number,{delay,duration,ease:EASE,onUpdate:n=>{if(active)el.textContent=format.format(n);},onComplete:()=>{if(active)el.textContent=value;}});
    return ()=>{active=false;controls.stop();el.textContent=value;};
  },[value,number,still,delay,duration,reviewing,simtid]);
  return <EditableText path={path} value={value} neutralWrapper><span data-count-up={value} aria-label={value} style={{fontVariantNumeric:'tabular-nums'}}><span ref={output} aria-hidden="true">{still||!Number.isFinite(number)?value:'0'}</span></span></EditableText>;
}
