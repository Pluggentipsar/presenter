"use client";

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneTransition } from '../shared/SceneMotion';
import s from './kinetic.module.css';

/** Words are the objects. Copy and examples are provided by the MDX/R editor. */
export function KineticWords({mode,step,still,t,v}:{mode:string;step:number;still:boolean;t:(key:string)=>ReactNode;v:(key:string)=>string}) {
  const transition=sceneTransition(still);
  if(mode==='turn') return <div className={s.turn} data-kinetic="turn" data-phase={step}>
    <h1 className={s.turnLead} data-critical>{t('lead')}</h1>
    <motion.div className={s.turnWord} initial={false} animate={{x:step?0:670,y:step?190:0,rotate:0}} transition={transition}>
      <h2 data-critical>{t('word')}</h2>
    </motion.div>
    <svg className={s.returnArrow} viewBox="0 0 1280 720" fill="none" aria-hidden="true">
      <motion.path d="M 1120 558 C 1030 685 580 685 392 531 L 445 531 M 392 531 L 403 583" stroke="currentColor" strokeWidth="3" initial={false} animate={{pathLength:step?1:0,opacity:step?.55:0}} transition={transition}/>
    </svg>
    {step>0&&<motion.h2 className={s.turnTail} data-critical initial={still?false:{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={transition}>{t('tail')}</motion.h2>}
  </div>;

  return <div className={s.handoff} data-kinetic="handoff" data-phase={step}>
    <div className={s.rail} aria-hidden="true"><motion.div initial={false} animate={{scaleX:step/2}} transition={transition}/></div>
    {[0,1,2].filter(i=>i<=step).map(i=><motion.div className={s.word} key={i} data-current={i===step} data-role={i===1?'ai':'human'}
      style={{transformOrigin:'left top'}} initial={still?false:{x:860,y:150,scale:1,opacity:0}}
      animate={{x:i===step?70:70+i*270,y:i===step?125:545,scale:i===step?1:.2,opacity:i===step?1:.64}} transition={transition}>
      <h1 data-critical>{t(`item${i+1}`)}</h1>
    </motion.div>)}
    <div className={s.glass} aria-hidden="true"><span>{String(step+1).padStart(2,'0')}</span></div>
    <motion.p className={s.detail} data-critical key={step} initial={still?false:{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={transition}>{t(`detail${step+1}`)}</motion.p>
    {v(`stepImage${step+1}`)&&<motion.div className={s.object} key={`image-${step}`} initial={still?false:{opacity:0,scale:1.05}} animate={{opacity:.35,scale:1}} transition={transition}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={v(`stepImage${step+1}`)} alt={v(`stepImage${step+1}Alt`)}/>
    </motion.div>}
  </div>;
}
