"use client";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useInlineEdit } from '@/lib/inline-edit';
import { sceneEase } from '../shared/SceneMotion';
import s from './material-journey.module.css';

type Props={step:number;still:boolean;backward:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:(key?:string,full?:boolean)=>ReactNode};
const keys=['summary','infographic','podcast','song','game'];
const symbols=['Aa','▧','◖◗','♫','⌘'];
export function MaterialJourney({step,still,backward,v,t,prompt}:Props){
 const active=step===0||step===11?-1:Math.floor((step-1)/2),order=step%2===1&&step<11,final=step===11;
 const tr={duration:still?0:.9,ease:sceneEase};
 return <>
  <motion.div className={s.light} initial={false} animate={{x:active*110,rotate:active*12}} transition={tr}/>
  <motion.figure className={s.source} initial={false} animate={{x:step===0?690:final?535:60,y:step===0?112:final?250:145,scale:step===0?1:final?.46:.44,rotate:step===0?5:final?-3:-6}} transition={tr}>
   <motion.img src={v('sourceImage')} alt={v('sourceCaption')}/><figcaption>{t('sourceCaption')}</figcaption>
  </motion.figure>
  {step===0&&<motion.div className={s.intro} initial={still?false:{y:50,opacity:0}} animate={{y:0,opacity:1}} transition={tr}><h1>{t('title')}</h1><p>{t('introCaption')}</p></motion.div>}
  {step>0&&!final&&<><nav className={s.rail} aria-label="Från tavelfoto till fem former">{[1,2,3,4,5].map(n=><span key={n} data-active={n===active+1} data-done={n<active+1}><i/>{t(`format${n}`)}</span>)}</nav><div className={s.current}><span>0{active+1}</span><h2>{t(`format${active+1}`)}</h2><p>{t(`action${active+1}`)}</p></div></>}
  <AnimatePresence mode="wait" initial={false}><motion.div key={step} className={s.focus} initial={still?false:{y:65,opacity:0,scale:.97}} animate={{y:0,opacity:1,scale:1}} exit={{y:-45,opacity:0,scale:.96}} transition={{...tr,duration:still?0:.55}}>
   {order?<div className={s.order}><h2>{t(`formatTitle${active+1}`)}</h2>{prompt(`${keys[active]}Prompt`,true)}</div>:step===2?<article className={s.summary} data-material-result><header>{t('mediaNote')}</header><h2>{t('summaryHeading')}</h2><p className={s.summaryIntro}>{t('summaryIntro')}</p><p>{t('summaryFocus')}</p><aside><span>{t('exerciseLabel')}</span><p>{t('summaryOvning')}</p></aside></article>:step===4?<div className={s.infographic} data-material-result><motion.img src={v('infographicImage')} alt={v('infographicAlt')}/></div>:step===6?<div className={s.podcast} data-material-result><div className={s.voicePair} aria-hidden><i>1</i><i>2</i></div><article><span>{t('podcastHosts')}</span><h2>{t('podcastTitle')}</h2><JourneyMedia src={v('podcastSrc')} title={v('podcastTitle')} backward={backward} still={still}/></article></div>:step===8?<div className={s.song} data-material-result><div className={s.record} aria-hidden><i>♫</i></div><article><span>{t('mediaNote')}</span><h2>{t('songTitle')}</h2><JourneyMedia src={v('songSrc')} title={v('songTitle')} backward={backward} still={still}/></article></div>:step===10?<div className={s.game} data-material-result><h2>{t('gameTitle')}</h2><JourneyMedia src={v('gameSrc')} title={v('gameTitle')} backward={backward} still={still} video/></div>:null}
  </motion.div></AnimatePresence>
  {final&&<><h1 className={s.finalTitle}>{t('finalTitle')}</h1><div className={s.finalOrbit}>{[1,2,3,4,5].map((n)=><motion.div key={n} className={s.orbitItem} initial={still?false:{scale:.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{...tr,delay:still?0:n*.09}}><i aria-hidden>{symbols[n-1]}</i><h2>{t(`format${n}`)}</h2><p>{t(`action${n}`)}</p></motion.div>)}</div><p className={s.finalCaption}>{t('finalCaption')}</p></>}
 </>;
}

function JourneyMedia({src,title,backward,still,video=false}:{src:string;title:string;backward:boolean;still:boolean;video?:boolean}){
 const ref=useRef<HTMLMediaElement|null>(null),present=useIsPresent(),{editMode}=useInlineEdit();
 const [playing,setPlaying]=useState(false),[elapsed,setElapsed]=useState(0),[duration,setDuration]=useState(0),[failed,setFailed]=useState(false);
 useEffect(()=>{const media=ref.current;if(!media)return;if(present&&!backward&&!editMode)void media.play().catch(()=>{});else media.pause();return()=>media.pause();},[src,present,backward,editMode]);
 const events={onPlay:()=>setPlaying(true),onPause:()=>setPlaying(false),onEnded:()=>setPlaying(false),onTimeUpdate:()=>setElapsed(ref.current?.currentTime??0),onLoadedMetadata:()=>setDuration(ref.current?.duration??0),onError:()=>setFailed(true)};
 const time=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
 return <div className={s.player} data-journey-media data-playing={playing&&!still}>
  {video?<video ref={el=>{ref.current=el;}} src={src} controls playsInline preload="metadata" aria-label={title} {...events}/>:<><audio ref={el=>{ref.current=el;}} src={src} preload="metadata" aria-label={title} {...events}/><div className={s.wave} aria-hidden>{Array.from({length:48},(_,i)=><i key={i} style={{height:`${20+Math.abs(Math.sin(i*1.7)*Math.cos(i*.31))*80}%`,animationDelay:`-${i*.13}s`}}/>)}</div><div className={s.transport}><button aria-label={playing?'Pausa inspelningen':'Spela inspelningen'} onClick={e=>{e.stopPropagation();const m=ref.current;if(m){if(m.paused)void m.play().catch(()=>{});else m.pause();}}}>{playing?'Ⅱ':'▶'}</button><span>{time(elapsed)} / {duration?time(duration):'…'}</span></div></>}
  {failed&&<p role="alert">Inspelningen kunde inte läsas.</p>}
 </div>;
}
