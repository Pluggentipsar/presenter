"use client";

import { motion } from 'framer-motion';
import { EditableText } from '@/lib/inline-edit';
import { itemKeys, type LectureProps } from './scene-model';
import { MovingObject, sceneTransition } from '../shared/SceneMotion';
import type { ReactNode } from 'react';
import { VoiceBand } from '../shared/VoiceBand';
import s from './finish.module.css';

type Tools={props:LectureProps;step:number;still:boolean;t:(key:string)=>ReactNode;v:(key:string)=>string;img:(key:string,cls:string)=>ReactNode};
export const finishLayouts=['time-value','evidence','handoff','focus','voice-poster'];

/** Native compositions reuse props/notes; no lecture copy is hidden in this file. */
export function FinishScene(x:Tools) {
  const {props,step,still,t,v,img}=x;
  const tr=sceneTransition(still,props.tempo==='nedslag');
  const enter={initial:still?false as const:{opacity:0,y:40},animate:{opacity:1,y:0},transition:tr};
  const layout=v('layout');
  if(layout==='time-value') return <>
    <motion.div className={s.valuePhoto} initial={false} animate={{opacity:step?.7:0,scale:step?1:1.12}} transition={tr}>{img('image',s.fullPhoto)}</motion.div>
    <motion.div className={s.clock} initial={false} animate={{x:step?480:0,y:step?90:0,scale:step?.55:1,opacity:step?.12:1,rotate:step?30:0}} transition={tr} aria-hidden="true">
      <svg viewBox="0 0 400 400"><defs><linearGradient id="clockMetal"><stop stopColor="var(--bg)"/><stop offset=".48" stopColor="var(--ai)"/><stop offset="1" stopColor="var(--text)"/></linearGradient></defs><circle cx="200" cy="200" r="180" className={s.clockRim}/><circle cx="200" cy="200" r="155" className={s.clockGlass}/>{Array.from({length:60},(_,i)=><line key={i} x1="200" y1={i%5===0?57:62} x2="200" y2={i%5===0?76:69} transform={`rotate(${i*6} 200 200)`}/>)}<motion.path initial={false} animate={{d:step?"M200 200L218.4 304.4":"M200 200L150.2 106.4"}} transition={tr} className={s.minute}/><path d="M200 200 139 162" className={s.hour}/><circle cx="200" cy="200" r="10" className={s.pin}/></svg>
    </motion.div>
    <motion.div className={s.timeWords} initial={false} animate={{y:step?-120:0}} transition={tr}><motion.h1 animate={{fontSize:step?48:162,opacity:step?.65:1}} transition={tr}>{t('title')}</motion.h1>{step>0&&<motion.h2 {...enter}>{t('after')}</motion.h2>}</motion.div>
  </>;
  if(layout==='voice-poster') return <>
    <div className={s.quotePhoto}>{img('image',s.fullPhoto)}</div>
    <motion.blockquote className={s.voicePoster} {...enter}>
      <EditableText path="title" value={v('title')} multiline neutralWrapper><span className={s.voiceLines}>{v('title').split('\n').map((line,i)=><span key={i} data-last={i===v('title').split('\n').length-1}>{line}</span>)}</span></EditableText>
    </motion.blockquote><p className={s.voiceAttribution}>{t('subtitle')}</p>
  </>;
  if(layout==='focus') {
    const keys=itemKeys(props),group=Math.max(1,Number(props.groupSize)||1),active=keys.slice(step*group,(step+1)*group);
    return <>
      {v('title')&&<h1 className={s.focusHeading}>{t('title')}</h1>}{img('image',s.focusObject)}
      <div className={s.focusHistory}>{keys.slice(0,step*group).map(key=><span key={key}>{t(key)}</span>)}</div>
      <motion.div key={step} {...enter} className={s.focusWords} data-group={group} data-heading={Boolean(v('title'))}>{active.map(key=><div key={key}><h2 style={{fontSize:group>1?46:v(key).length>140?48:v(key).length>65?68:v(key).length>28?92:146}}>{t(key)}</h2>{v(key.replace('item','detail'))&&<p>{t(key.replace('item','detail'))}</p>}</div>)}</motion.div>
      {v('waveSteps')&&<VoiceBand className={s.focusWave} tone={v('waveSteps').split('|')[Math.min(step,v('waveSteps').split('|').length-1)]==='ai'?'ai':'human'}/>}
      <div className={s.focusTrack} aria-hidden="true">{Array.from({length:Math.ceil(keys.length/group)},(_,i)=><i key={i} data-current={i===step}/>)}</div>
    </>;
  }
  if(layout==='handoff') {
    const keys=itemKeys(props),style=v('processStyle')||'desk';
    return <>
      {v('title')&&<h1 className={s.processHeading}>{t('title')}</h1>}
      {v('subtitle')&&<p className={s.processSubtitle}>{t('subtitle')}</p>}
      <div className={s.deskLight} aria-hidden="true"/>
      <div className={s.processRail}>{keys.map((key,i)=><div key={key} data-current={i===step} data-past={i<step} data-role={v(`role${i+1}`)}><i aria-hidden="true"/>{i<=step?<span>{t(key)}</span>:<span className={s.unseen} aria-hidden="true"/>}</div>)}</div>
      <MovingObject className={s.carriedPaper} still={still} x={style==='return'?85:55+step*22} y={v('title')?275:170} scale={1} rotate={step%2===0?-5:3}>
        <div className={s.paperTabs} aria-hidden="true"><i/><i/><i/></div>
        {v(`stepImage${step+1}`)?<motion.div key={step} {...enter} className={s.carriedPhoto}>{img(`stepImage${step+1}`,s.fullPhoto)}</motion.div>:<div className={s.paperWriting} aria-hidden="true"><i/><i/><i/><i/></div>}
        <motion.div className={s.paperSeal} animate={{backgroundColor:v(`role${step+1}`)==='ai'?'var(--ai)':'var(--human)',x:step%2?16:0}} transition={tr} aria-hidden="true">{v(`role${step+1}`)==='ai'?'AI':'↗'}</motion.div>
      </MovingObject>
      <motion.div key={step} {...enter} className={s.processFocus} data-heading={Boolean(v('title'))} data-role={v(`role${step+1}`)}><h2>{t(keys[step])}</h2>{v(`detail${step+1}`)&&<p>{t(`detail${step+1}`)}</p>}</motion.div>
    </>;
  }
  if(layout==='evidence') {
    const kind=v('evidenceKind');
    const removed=kind==='risk'?step===2:step===1;
    return <>
      <h1 className={s.evidenceHeading}>{t('title')}</h1>
      <div className={s.evidenceVisual} data-kind={kind} data-step={step}>
        {kind==='participants'?<div className={s.participants} aria-label={v('visualLabel1')}>{Array.from({length:54},(_,i)=><motion.i key={i} initial={false} animate={{opacity:step===2?.3:1,backgroundColor:step===1?i<18?'var(--human)':i<36?'var(--ai)':'var(--ink)':'var(--ai)'}} transition={tr}/>)}</div>:kind==='classes'?<div className={s.classrooms}>{Array.from({length:12},(_,i)=><motion.div key={i} initial={false} animate={{opacity:step===2?.35:1,y:step===1?i%2*-8:0}} transition={tr}>{Array.from({length:4},(_,j)=><i key={j}/>)}</motion.div>)}</div>:<>
          <MovingObject className={s.evidencePaper} still={still} x={removed?28:0} y={step===2?10:0} rotate={removed?0:-6}><span/><div className={s.answerLines} data-visible={!removed}><i/><i/><i/><i/></div></MovingObject>
          <MovingObject className={s.aiSupport} still={still} x={removed?190:0} y={removed?-65:0} opacity={removed?.12:1} rotate={step===2?-7:0}><b>AI</b><i/><i/></MovingObject>
        </>}
        <p className={s.visualCaption}>{t(`visualLabel${step+1}`)}</p>
      </div>
      <motion.div key={step} {...enter} className={s.evidenceWords}><h2>{t(`phase${step+1}`)}</h2><p>{t(`detail${step+1}`)}</p></motion.div>
      <nav className={s.evidenceRail} aria-label="Undersökningens delar">{[1,2,3].map(n=><span key={n} data-current={n===step+1} data-past={n<step+1}>{n<=step+1?t(`phase${n}`):<i aria-hidden="true"/>}</span>)}</nav>
    </>;
  }
  return null;
}
