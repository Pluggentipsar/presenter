"use client";

import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { Film } from '../shared/Film';
import { sceneEase } from '../shared/SceneMotion';
import { EditableText } from '@/lib/inline-edit';
import s from './opening-scenes.module.css';

type Props={step:number;still:boolean;backward:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:()=>ReactNode};
export const openingCompositions=['speaker-video','agent-network','media-bridge','word-field','full-reading','impact-quote'];

/** Opt-in forms inside the registered LectureScene. Copy and media are MDX props. */
export function OpeningScene({step,still,backward,v,t,prompt}:Props){
  const tr={duration:still?0:.85,ease:sceneEase};
  switch(v('composition')){
    case 'speaker-video':return <>
      <motion.div className={s.speakerCopy} initial={false} animate={{scale:step?.85:1,x:step?-12:0}} transition={tr}><h1>{t('title')}</h1><p>{t('subtitle')}</p></motion.div>
      <motion.div className={s.speakerFilm} initial={false} animate={{x:step?-35:0,y:step?-20:0,scale:step?1.08:1}} transition={tr}>
        <div className={s.windowBar}>{t('videoLabel')}<span>{t(step?'playingLabel':'readyLabel')}</span></div>
        <div className={s.videoArea}>{step?<Film src={v('videoSrc')} poster={v('poster')} backward={backward}/>:<><motion.img src={v('poster')} alt={v('imageAlt')}/><span className={s.play} aria-hidden>▶</span></>}</div>
      </motion.div>
      <motion.img className={s.book} src={v('bookSrc')} alt={v('bookAlt')} initial={false} animate={{rotate:-9,scale:step?.88:1}} transition={tr}/>
      <div className={s.contactGrid}>{['website','social','instagram','podcast','email'].map((kind)=><div key={kind}><ContactIcon kind={kind}/><span>{t(`contact_${kind}`)}</span></div>)}</div>
    </>;
    case 'media-bridge':return <><h1 className={s.bridgeTitle}>{t('title')}</h1><AnimatePresence mode="wait" initial={false}>
      <motion.div key={v('videoSrc')||v('image')} className={s.bridgeMedia} initial={still?false:{y:95,scale:.94,opacity:0}} animate={{y:0,scale:1,opacity:1}} exit={{y:-95,scale:.94,opacity:0}} transition={{...tr,duration:still?0:.6}}>
        {v('videoSrc')?<Film src={v('videoSrc')} poster={v('poster')} backward={backward}/>:<motion.img src={v('image')} alt={v('imageAlt')} className={s.profile}/>}
      </motion.div>
    </AnimatePresence><p className={s.mediaLabel}>{t('mediaNote')}</p></>;
    case 'full-reading':return <><div className={s.readingPortrait}><motion.img src={v('contextImage')} alt={v('contextImageAlt')}/><h2>{t('contextTitle')}</h2></div><div className={s.readingPrompt}>{prompt()}</div></>;
    case 'impact-quote':return <>
      <motion.img className={s.quotePortrait} src={v('image')} alt={v('imageAlt')} initial={still?false:{x:100,opacity:0}} animate={{x:0,opacity:.65}} transition={tr}/>
      <ImpactQuote still={still} text={v('title')} accent={v('emphasisWords')}/><p className={s.attribution}>{t('subtitle')}</p>
    </>;
    case 'word-field':return <>
      <div className={s.wordField} aria-hidden>{v('backgroundWords').split('|').filter(Boolean).map((word,i)=><motion.span key={`${i}-${word}`} className={s.floatingWord} style={{left:38+(i*317)%1030,top:32+(i*137)%630,fontSize:27+(i%4)*11,'--drift':`${i%2?18:-18}px`,'--duration':`${12+i%6}s`} as CSSProperties} initial={still?false:{opacity:0,scale:.8}} animate={{opacity:.13+(i%3)*.045,scale:1}} transition={{duration:still?0:.9,delay:still?0:i*14/Math.max(1,v('backgroundWords').split('|').length-1)}}>{word}</motion.span>)}</div>
      <div className={s.wordShield}/><h1 className={s.hyperTitle}>{t('title')}</h1>
    </>;
    case 'agent-network':return <AgentNetwork step={step} still={still} t={t} v={v}/>;
    default:return null;
  }
}

function ContactIcon({kind}:{kind:string}){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{kind==='website'?<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>:kind==='email'?<><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="m3 6 9 7 9-7"/></>:kind==='instagram'?<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></>:kind==='podcast'?<><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M6 10v2a6 6 0 0 0 12 0v-2M12 18v4M8 22h8"/></>:<><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>}</svg>;
}

function ImpactQuote({still,text,accent}:{still:boolean;text:string;accent:string}){
  const [first,...rest]=text.split('\n');
  const i=accent?first.indexOf(accent):-1;
  return <blockquote className={s.impact}><EditableText path="title" value={text} multiline neutralWrapper>
    <motion.span className={s.impactLead} initial={still?false:{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:still?0:.6}}>{i<0?first:first.slice(0,i)}</motion.span>
    {i>=0&&<motion.strong className={s.impactWord} initial={still?false:{opacity:0,scale:1.6,x:85}} animate={{opacity:1,scale:1,x:0}} transition={{duration:still?0:.85,delay:still?0:.2,ease:sceneEase}}>{accent}{first.slice(i+accent.length)}</motion.strong>}
    <motion.span className={s.impactRest} initial={still?false:{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{duration:still?0:.7,delay:still?0:.55}}>{rest.join('\n')}</motion.span>
  </EditableText></blockquote>;
}

function AgentNetwork({step,still,t,v}:Pick<Props,'step'|'still'|'t'|'v'>){
  const tr={duration:still?0:.85,ease:sceneEase};
  return <><motion.div className={s.network} initial={false} animate={{opacity:step?1:.24,scale:step?1:.94}} transition={tr}>
    <svg viewBox="0 0 740 550" aria-hidden><circle cx="370" cy="275" r="255" fill="var(--ai)" opacity=".035"/>
      {Array.from({length:8},(_,g)=>{const a=g*Math.PI/4,x=370+230*Math.cos(a),y=275+215*Math.sin(a);return <g key={g}>
        <path className={s.link} d={`M${x} ${y} Q370 ${y} 370 275`} />
        <circle r="4" className={s.packet} style={{offsetPath:`path("M${x} ${y} Q370 ${y} 370 275")`,animationDelay:`-${g*.8}s`,animationPlayState:still?'paused':'running'}}/>
        <circle cx={x} cy={y} r="51" className={s.cluster}/>
        {Array.from({length:16},(_,n)=>{const angle=n*2.4,r=7+Math.sqrt(n)*9;return <circle key={n} cx={x+Math.cos(angle)*r} cy={y+Math.sin(angle)*r} r={n%5?2.4:3.5} className={s.agent} style={{animationDelay:`-${n*.3+g}s`,animationPlayState:still?'paused':'running'}}/>;})}
      </g>;})}
      <circle cx="370" cy="275" r="73" className={s.hub}/><circle cx="370" cy="275" r="91" className={s.hubRing}/>
    </svg><div className={s.hubText}>{t('networkCenter')}</div>
    <div className={s.networkCaption}>{t('networkCaption')}</div>
    <div className={s.networkNote}>{t('modelNote')}</div>
    </motion.div>
    <AnimatePresence mode="wait" initial={false}><motion.div key={step} className={s.researchCopy} data-step={step} initial={still?false:{opacity:0,y:25}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} transition={tr}>
      {step===0?<><h1>{t('title')}</h1><p>{t('subtitle')}</p></>:<><strong>{t(step===1?'value1':'value2')}</strong><h2>{t(step===1?'caption1':'caption2')}</h2><p>{t(step===1?'detail1':'detail2')}</p></>}
    </motion.div></AnimatePresence>{step>0&&<p className={s.networkLabel}>{v('networkLabel')&&t('networkLabel')}</p>}
  </>;
}
