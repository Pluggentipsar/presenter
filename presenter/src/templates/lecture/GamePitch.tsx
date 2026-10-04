"use client";
import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { Film } from '../shared/Film';
import { sceneEase } from '../shared/SceneMotion';
import s from './game-pitch.module.css';
type Props={step:number;still:boolean;backward:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:(key?:string,full?:boolean)=>ReactNode};
export function GamePitch({step,still,backward,v,t,prompt}:Props){
 const circuit=v('demoKind')==='circuit';
 if(circuit&&step>=2)return <CircuitDemo key={step} after={step>2} still={still} v={v} t={t}/>;
 return <>
  <div className={s.glow}/>
  {step===0?<><div className={s.gesture} aria-hidden>{circuit?<svg viewBox="0 0 400 240"><path d="M70 100V45H330V195H70V145M45 100H95M55 145H85"/><rect x="170" y="30" width="70" height="30"/><circle cx="290" cy="195" r="8"/></svg>:<><svg viewBox="0 0 400 240"><path d="M90 195C100 150 120 108 170 88S260 88 310 35"/><circle cx="310" cy="35" r="17"/><path d="m298 6 12-5 9 10M339 25l14 5"/></svg><span>{t('token1')}</span><span>{t('token2')}</span></>}</div><div className={s.pitch}><h2>{t('title')}</h2><h1>{t('chapterTitle')}</h1></div></>:step===1?<div className={s.prompt}><p>{t('chapterTitle')}</p><h2>{t('title')}</h2>{prompt('prompt',true)}</div>:<motion.div className={s.film} initial={still?false:{scale:.92,opacity:0,y:35}} animate={{scale:1,opacity:1,y:0}} transition={{duration:still?0:.65,ease:sceneEase}}><Film src={v('videoSrc')} backward={backward}/></motion.div>}
 </>;
}

function CircuitDemo({after,still,v,t}:{after:boolean;still:boolean;v:Props['v'];t:Props['t']}){
 const [volts,setVolts]=useState(Number(v(after?'voltageAfter':'voltage'))||6),[ohms,setOhms]=useState(Number(v('resistance'))||3);
 const amps=volts/ohms;
 return <><h1 className={s.circuitTitle}>{t('demoTitle')}</h1><div className={s.circuit}>
 <svg viewBox="0 0 700 340" aria-hidden><path d="M90 125V55H590V280H90V200"/><path d="M55 125H125M67 150H113M55 175H125M67 200H113"/><rect x="300" y="35" width="110" height="40"/>{Array.from({length:12},(_,i)=><circle key={i} r="5" className={s.dot} style={{offsetPath:'path("M90 125V55H590V280H90V200")',animationDelay:`-${i*1.3}s`,animationDuration:`${24/amps}s`,animationPlayState:still?'paused':'running'}}/>)}</svg>
 <span className={s.volts}>{volts} V</span><span className={s.ohms}>{ohms} Ω</span><div className={s.amps}><strong>{new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(amps)} A</strong><span>I = U / R</span></div>
 </div><p className={s.predict}>{t('question')}</p><div className={s.sliders} onKeyDown={e=>{if(e.key==='Escape'){(e.target as HTMLElement).blur();e.stopPropagation();}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.stopPropagation();}}><label>{t('voltageLabel')} <input type="range" onPointerUp={e=>e.currentTarget.blur()} min="1" max="24" value={volts} onChange={e=>setVolts(Number(e.target.value))}/></label><label>{t('resistanceLabel')} <input type="range" onPointerUp={e=>e.currentTarget.blur()} min="1" max="12" value={ohms} onChange={e=>setOhms(Number(e.target.value))}/></label></div><p className={s.modelNote}>{t('modelNote')}</p></>;
}
