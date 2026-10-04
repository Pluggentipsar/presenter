"use client";

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneEase } from '../shared/SceneMotion';
import s from './planning-principles.module.css';

export function PlanningPrinciples({step,still,t,v,fullPrompt}:{step:number;still:boolean;t:(key:string)=>ReactNode;v:(key:string)=>string;fullPrompt:()=>ReactNode}) {
  const expanded=step>0;
  const keys=Array.from({length:12},(_,i)=>`principle${i+1}`).filter(k=>v(k));
  const tr={duration:still?0:.8,ease:sceneEase};
  return <div className={s.room} data-principles-expanded={expanded}>
    <motion.div className={s.halo} aria-hidden="true" initial={false} animate={{scale:expanded?1.35:.8,opacity:expanded?.6:.35}} transition={tr}/>
    <h1 className={s.heading}>{t('title')}</h1>
    {expanded&&<svg className={s.connections} viewBox="0 0 1280 720" aria-hidden="true">{keys.map((key,i)=>{
      const right=i>=6,y=157+(i%6)*78;
      return <motion.path key={key} d={right?`M846 371 C885 371 874 ${y+33} 920 ${y+33}`:`M434 371 C395 371 406 ${y+33} 360 ${y+33}`} initial={{pathLength:still?1:0,opacity:still?.65:0}} animate={{pathLength:1,opacity:.65}} transition={{...tr,delay:still?0:(i%6)*.12+(right?.06:0)}}/>;
    })}</svg>}
    <motion.article className={s.anchor} data-chat-prompt initial={false} animate={{x:expanded?430:350,y:expanded?230:191,width:expanded?420:580}} transition={tr}>
      <div className={s.sender}><i aria-hidden="true">↗</i>{t('promptLabel')}</div>
      <p className={s.subject}>{t('contextTitle')}</p>
      <span className={s.goalLabel}>{t('goalLabel')}</span>
      <p className={s.goal}>{t('contextBody')}</p>
      <div className={s.anchorFooter}>{t('planningDuration')}<i className={s.send} aria-hidden="true">↑</i></div>
    </motion.article>
    {expanded&&<div className={s.principles}>{keys.map((key,i)=>{
      const right=i>=6;
      return <motion.div key={key} className={s.principle} data-principle={i+1} style={{left:right?920:60,top:157+(i%6)*78}}
        initial={still?false:{opacity:0,x:right?-100:100,y:(2.5-i%6)*15,scale:.9}}
        animate={{opacity:1,x:0,y:0,scale:1}} transition={{...tr,delay:still?0:(i%6)*.12+(right?.06:0)}}>
        <span className={s.number}>{String(i+1).padStart(2,'0')}</span><p>{t(key)}</p>
      </motion.div>;
    })}</div>}
    {fullPrompt()}
  </div>;
}
