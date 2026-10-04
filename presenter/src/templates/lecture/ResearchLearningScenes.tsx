"use client";
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneEase } from '../shared/SceneMotion';
import s from './research-learning.module.css';

type Props={step:number;still:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode};
export function ResearchLearningScene({step,still,v,t}:Props){
 const tr={duration:still?0:.8,ease:sceneEase};
 if(v('composition')==='research-overview')return <>
  <h1 className={s.researchTitle}>{t('title')}</h1>
  <div className={s.studies}>{[1,2,3].map(n=><motion.article key={n} data-active={step===n-1} initial={false} animate={{y:step===n-1?-8:0}} transition={tr}>
   <header><span>0{n}</span><p>{t(`studyLabel${n}`)}</p></header>
   <svg className={s.studyGraphic} viewBox="0 0 320 75" aria-hidden>
    {n===1?<><path d="M10 58H305M18 52L95 16L180 55"/><path className={s.secondLine} d="M18 52L95 16L180 36L294 36"/><circle cx="95" cy="16" r="5"/><circle cx="180" cy="55" r="5"/></>:n===2?<>{[0,1,2,3].map(i=><g key={i}><rect x={15+i*80} y={20} width="48" height="37" rx="8"/>{i<3&&<path d={`M${65+i*80} 38h24`}/>}</g>)}</>:<><path d="M6 39H45L54 30L67 48L80 14L93 63L108 33L120 39H157L172 30L186 50L199 17L212 59L225 37H312"/><path className={s.secondLine} d="M6 53H45L63 48L81 57L95 45L112 53H163L179 48L197 58L215 47L232 53H312"/></>}
   </svg>
   <h2>{t(`studyTitle${n}`)}</h2><p className={s.setting}>{t(`studySetting${n}`)}</p>
   {step>=n-1&&<motion.div className={s.studyResult} initial={still?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={tr}><p>{t(`studyResult${n}`)}</p><small>{t(`studyCaveat${n}`)}</small></motion.div>}
   <a className={s.source} href={v(`studyUrl${n}`)} target="_blank" rel="noreferrer">{t(`studySource${n}`)} ↗</a>
  </motion.article>)}</div><p className={s.researchQuestion}>{t('question')}</p>
 </>;
 return <>
  <h1 className={s.automationTitle}>{t('title')}</h1>
  <svg className={s.routes} viewBox="0 0 1280 720" aria-hidden>
   <motion.path className={s.learningRoute} d="M175 473H1100" initial={still?false:{pathLength:0}} animate={{pathLength:1,opacity:step?.17:.85}} transition={{...tr,duration:still?0:1.7}}/>
   <motion.path className={s.shortcut} d="M175 470C230 470 215 342 320 342H960C1065 342 1050 470 1100 470" initial={false} animate={{pathLength:step?1:0,opacity:step?1:0}} transition={{duration:still?0:1.6,ease:'easeInOut'}}/>
  </svg>
  <article className={`${s.paper} ${s.task}`}><span>01</span><h2>{t('taskLabel')}</h2><p>{t('taskText')}</p><i/><i/><i/></article>
  <motion.div className={s.learningSteps} initial={false} animate={{opacity:step?.28:1,y:step?28:0}} transition={tr}>{[1,2,3].map(n=><div key={n}><b>0{n+1}</b><h2>{t(`work${n}`)}</h2><p>{t(`workDetail${n}`)}</p></div>)}</motion.div>
  <motion.article className={`${s.paper} ${s.answer}`} initial={false} animate={{borderColor:step?'var(--ai)':'var(--line)',boxShadow:step?'0 0 60px color-mix(in srgb,var(--ai) 22%,transparent)':'0 0 0px transparent'}} transition={{...tr,delay:still?0:1.2}}><span>{t('answerLabel')}</span><h2>{t('answerText')}</h2><motion.div initial={false} animate={{opacity:step?1:.18}} transition={{...tr,delay:still?0:1.2}}><i/><i/><i/><i/></motion.div></motion.article>
  {step>0&&<motion.div className={s.shortcutLabel} initial={still?false:{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={tr}>{t('shortcutLabel')}</motion.div>}
  <motion.p className={s.workCaption} initial={false} animate={{opacity:step?0:1}} transition={tr}>{t('workCaption')}</motion.p>
  {step>0&&<motion.p className={s.landing} initial={still?false:{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{...tr,delay:still?0:1.4}}>{t('question')}</motion.p>}
 </>;
}
