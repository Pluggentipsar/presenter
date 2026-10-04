"use client";

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneTransition } from '../shared/SceneMotion';
import s from './planning-room.module.css';

type Props = {step:number; still:boolean; v:(key:string)=>string; t:(key:string)=>ReactNode; prompt:()=>ReactNode; fullPrompt:()=>ReactNode; img:(key:string,cls:string)=>ReactNode};

/** A single mounted desk: overview → close reading → context → pupil → overview.
 * Content remains in MDX props; the room owns only camera positions and framing. */
export function PlanningRoom({step,still,v,t,prompt,fullPrompt,img}:Props) {
  const phase=Number(v('processStep'))||0;
  const close=phase===0&&step===2;
  const tr=sceneTransition(still);
  const plan=phase===0
    ? step===0?{x:54,y:175,scale:.7,rotate:-8,opacity:.48}
      : close?{x:-30,y:68,scale:1.18,rotate:0,opacity:1}
      : {x:205,y:171,scale:1,rotate:0,opacity:1}
    : phase===1?{x:24,y:205,scale:.65,rotate:-7,opacity:.72}
      : {x:30,y:-640,scale:.65,rotate:-7,opacity:0};
  const example=phase<2?{x:155,y:850,scale:.9,rotate:0,opacity:0}
    : phase===2?{x:106,y:186,scale:1,rotate:0,opacity:1}
      : {x:38,y:124,scale:.38,rotate:-5,opacity:.75};
  const answerVisible=phase>0||step>0;
  const planText=phase===0?v('response'):v('journeyPlan');
  return <div className={s.room} data-planning-phase={phase} data-close-reading={close}>
    <motion.div className={s.grid} aria-hidden="true" initial={false} animate={{y:phase<2?0:-140,scale:close?1.28:1,opacity:close?.3:.6}} transition={tr}/>
    <motion.article className={s.plan} data-persistent-document initial={false} animate={plan} transition={tr} style={{originX:0,originY:0}} aria-hidden={phase>=2}>
      <div className={s.paperChrome}><i/><i/><i/><span>{t('journeyPlanTitle')}</span></div>
      <p className={s.origin}>{phase===0?t('responseLabel'):t('journeyLabel')}</p>
      {answerVisible?<div className={s.planRows} data-chat-answer>{planText.split('\n').filter(Boolean).map((line,i)=><motion.p key={i} animate={{opacity:close&&i!==1?.19:1}} transition={tr} data-highlight={close&&i===1}><span>{String(i+1).padStart(2,'0')}</span><b>{line.replace(/^\d+[.)]\s*/,'')}</b>{v('planTimes').split('|')[i]&&<em className={s.timeBox}>{v('planTimes').split('|')[i]}</em>}</motion.p>)}</div>:<div className={s.blank} aria-hidden="true"><i/><i/><i/></div>}
      <div className={s.paperEdge}/>
    </motion.article>
    <motion.div className={s.promptDock} data-phase={phase} data-compact={phase===0&&step>0} initial={false}
      animate={{x:phase===0?(step===0?515:760):phase===1?465:480,y:phase===0?(step===0?245:68):phase===1?154:160,scale:phase===0&&step>0?.62:1,opacity:phase===2||close?0:1}}
      transition={tr} style={{originX:0,originY:0}} aria-hidden={phase===2||close}>
      {phase!==2&&prompt()}
    </motion.div>
    {close&&<motion.h1 className={s.review} data-critical initial={still?false:{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={tr}>{t('outcome')}</motion.h1>}
    {phase===1&&<motion.div className={s.teacherContext} initial={still?false:{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={tr}><span className={s.contextRule}/><h2>{t('contextTitle')}</h2><p>{t('contextBody')}</p></motion.div>}
    <motion.article className={s.examples} data-persistent-example initial={false} animate={example} transition={tr} style={{originX:0,originY:0}} aria-hidden={phase<2}>
      <div className={s.paperChrome}><i/><i/><i/><span>{phase===2?t('promptLabel'):t('journeyExampleLabel')}</span></div>
      {phase>=2&&<>
        <p className={s.opinion} data-critical>{phase===2?t('prompt'):t('journeyExample1')}</p>
        {(phase>2||step>0)&&<motion.p className={s.reason} data-critical initial={still?false:{opacity:0,y:85}} animate={{opacity:1,y:0}} transition={tr}>{phase===2?t('prompt2'):t('journeyExample2')}</motion.p>}
      </>}
    </motion.article>
    {phase===2&&<motion.h1 className={s.exampleHeading} initial={still?false:{y:40,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('title')}</motion.h1>}
    {phase===3&&<motion.div className={s.pupil} initial={still?false:{opacity:0,y:150,scale:.85}} animate={{opacity:1,y:0,scale:1}} transition={tr}>{img('contextImage',s.pupilImage)}<h2>{t('contextTitle')}</h2><p>{t('contextBody')}</p></motion.div>}
    {fullPrompt()}
  </div>;
}
