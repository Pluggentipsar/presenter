"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { LayoutGroup, motion, type Transition } from 'framer-motion';
import { EditableText } from '@/lib/inline-edit';
import { useLectureSteps } from '../shared/lecture-steps';
import { sequenceWindow, type SequenceProps } from './sequence-model';
import { SceneExit, sceneMotionMode } from '../shared/SceneMotion';
import s from './sequence.module.css';

type Tools = {p:SequenceProps; step:number; still:boolean; tr:Transition; t:(key:string)=>ReactNode; v:(key:string)=>string};
export function LectureSequence(p: SequenceProps) {
  const sequence=String(p.sequence||'material');
  const {start,count}=sequenceWindow(p);
  const {step:localStep,still}=useLectureSteps(count);
  const step=localStep+start;
  const host=useRef<HTMLDivElement>(null),id=useId();
  const [scale,setScale]=useState(1);
  useEffect(()=>{const el=host.current;if(!el)return;const observer=new ResizeObserver(([e])=>setScale(Math.min(e.contentRect.width/1280,e.contentRect.height/720)));observer.observe(el);return()=>observer.disconnect();},[]);
  // A window can retain its original MDX field names, so R edits the real source.
  const actual=(key:string)=>p.prompt!==undefined&&key===`prompt${sequence==='material'?Math.max(1,Math.floor((start+1)/2)):1}`?'prompt':sequence==='material'&&((start===3&&key==='title2')||(start===5&&key==='title3'))?'title':sequence==='agency'&&((start===2&&key==='thesis')||(start===4&&key==='closing'))?'title':key;
  const v=(key:string)=>String(p[actual(key)]??'');
  const t=(key:string)=><EditableText path={actual(key)} value={v(key)} multiline neutralWrapper><span className={s.copy}>{v(key)}</span></EditableText>;
  const tr:Transition={duration:still?0:.85,ease:[.22,1,.36,1]};
  const tools={p,step,still,tr,t,v};
  return <div ref={host} className={s.viewport} data-continuity-id={id} data-sequence={sequence} data-step={step} data-count={count}>
    <div style={{width:1280*scale,height:720*scale,position:'relative'}}><section className={s.stage} data-kind={sequence} data-step={step} data-still={still} style={{transform:`scale(${scale})`}}>
      <SceneExit still={still} mode={sceneMotionMode(p.sceneMotion)}><LayoutGroup id={id}>{sequence==='material'?<Material {...tools}/>:sequence==='learning'?<Learning {...tools}/>:<Agency {...tools}/>}</LayoutGroup></SceneExit>
      {v('credit')&&<footer className={s.credit}>{v('sourceUrl')?<a href={v('sourceUrl')} target="_blank" rel="noreferrer">{t('credit')}</a>:t('credit')}</footer>}
      <div className={s.progress} aria-label={`Steg ${localStep+1} av ${count}`}>{Array.from({length:count},(_,i)=><i key={i} data-active={i===localStep} data-past={i<localStep}/>)}</div>
    </section></div>
  </div>;
}
function Photo({src,alt,className}:{src:string;alt:string;className?:string}) {
  // Lecture media remain replaceable in R; no network image service is needed.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} draggable={false}/>;
}
function Prompt({x,field}:{x:Tools;field:string}) {
  return <motion.div className={s.prompt} data-prompt={field} initial={x.still?false:{y:50,opacity:0,rotate:2}} animate={{y:0,opacity:1,rotate:0}} transition={x.tr}>
    <div className={s.sender}><span aria-hidden="true">↗</span>{x.t('promptLabel')}</div><p>{x.t(field)}</p><span className={s.send} aria-hidden="true">↑</span>
  </motion.div>;
}
function Material(x:Tools) {
  const {step,still,tr,t,v}=x;
  const phase=step<3?0:step<5?1:2;
  const isPrompt=[1,3,5].includes(step);
  const board=step===0?{x:665,y:86,scale:1.02,rotate:6}:step===1?{x:46,y:264,scale:.69,rotate:-6}:step===2?{x:66,y:233,scale:.64,rotate:-8}:isPrompt?{x:70,y:293,scale:.57,rotate:-6}:{x:44,y:535,scale:.25,rotate:-7};
  return <>
    <motion.div className={s.materialLight} animate={{x:phase*200,y:phase*-70}} transition={tr}/>
    <nav className={s.phaseRail} aria-label="Materialets resa">{[1,2,3].map((n)=><span key={n} data-current={n===phase+1} data-past={n<phase+1}>{n<=phase+1?t(`phase${n}`):<i aria-hidden="true"/>}</span>)}</nav>
    <motion.div className={s.board} initial={false} animate={board} transition={tr} style={{originX:0,originY:0}}>
      <Photo src={v('image')} alt={v('imageAlt')}/><div className={s.boardTape}/>
    </motion.div>
    {step===0&&<motion.h1 className={s.materialHero} initial={still?false:{y:50,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('title')}</motion.h1>}
    {isPrompt&&<><motion.h1 className={s.materialHeading} key={phase} initial={still?false:{y:-24,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t(phase===0?'title':phase===1?'title2':'title3')}</motion.h1><div className={s.materialPrompt}><Prompt x={x} field={`prompt${phase+1}`}/></div></>}
    {step===2&&<motion.article className={s.transcript} initial={still?false:{x:140,rotate:8,opacity:0}} animate={{x:0,rotate:0,opacity:1}} transition={tr} data-result>
      <span className={s.paperFold}/><h2>{t('transcriptTitle')}</h2><div className={s.transcriptLines}>{v('transcript').split('\n').map((line,i)=><motion.p key={i} initial={still?false:{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{...tr,delay:still?0:i*.07}}>{line}</motion.p>)}</div><p className={s.transcriptNote}>{t('transcriptNote')}</p>
    </motion.article>}
    {(step===4||step===6)&&<>
      <motion.h1 layoutId="language-concept" className={step===4?s.conceptTitle:s.podcastConcept} transition={tr}>{t('concept')}</motion.h1>
      {step===4?<div data-result>
        <div className={s.languageExamples}>{[1,2].map(n=><motion.article key={n} layoutId={`voice-${n}`} className={s.languageExample} data-voice={n} initial={still?false:{x:n===1?-100:100,opacity:0,rotate:n===1?-3:3}} animate={{x:0,opacity:1,rotate:0}} transition={tr}>
          <p className={s.context}>{t(`context${n}`)}</p><h2>{t(`greeting${n}`)}</h2><p className={s.sameQuestion}>{t('question')}</p>
        </motion.article>)}</div><p className={s.conceptNote}>{t('conceptNote')}</p>
      </div>:<>
        <motion.div className={s.headphones} initial={still?false:{scale:1.3,rotate:15,opacity:0}} animate={{scale:1,rotate:-12,opacity:1}} transition={tr}><Photo src={v('headphones')} alt={v('headphonesAlt')}/></motion.div>
        <div className={s.podcastScript} data-result>{[1,2].map(n=><motion.article key={n} layoutId={`voice-${n}`} className={s.scriptLine} data-voice={n} transition={tr}><b>{t(`voice${n}`)}</b><p>{t(`line${n}`)}</p></motion.article>)}</div>
        <motion.div className={s.thinkPause} initial={still?false:{y:40,opacity:0}} animate={{y:0,opacity:1}} transition={tr}><span aria-hidden="true">Ⅱ</span><p>{t('pause')}</p></motion.div><p className={s.audioNote}>{t('audioNote')}</p>
      </>}
    </>}
  </>;
}
function Learning(x:Tools) {
  const {step,still,tr,t,v}=x;
  const isPrompt=step===1||step===4;
  const paper=step===0?{x:750,y:238,rotate:10,scale:1.02,opacity:.42}:step===1||step===4?{x:60,y:180,rotate:-7,scale:.79,opacity:1}:step===2?{x:620,y:95,rotate:4,scale:1,opacity:1}:step===3?{x:545,y:190,rotate:0,scale:1,opacity:1}:step===5?{x:66,y:180,rotate:-5,scale:.78,opacity:1}:step===6?{x:640,y:140,rotate:4,scale:.9,opacity:1}:{x:870,y:340,rotate:8,scale:.62,opacity:1};
  return <>
    <motion.div className={s.leafBackdrop} initial={false} animate={{x:step===0?0:-290,scale:step===0?1:1.18,opacity:step===0?.74:.2}} transition={tr}><Photo src={v('image')} alt={v('imageAlt')}/></motion.div>
    <motion.article className={s.learningPaper} initial={false} animate={paper} style={{originX:0,originY:0}} transition={tr} data-has-answer={step===2||step===6}>
      <p className={s.paperEyebrow}>{t('paperTitle')}</p><h2>{t('task')}</h2>
      {step===2?<div className={s.essayText} data-answer><span>{t('answerLabel')}</span><p>{t('answer')}</p></div>:step===6?<div className={s.ownText} data-student><span>{t('studentLabel')}</span><p>{t('studentAnswer')}</p></div>:<div className={s.emptyLines} aria-hidden="true"><i/><i/><i/><i/></div>}
    </motion.article>
    {step===0&&<motion.h1 className={s.learningHero} initial={still?false:{y:60,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('title')}</motion.h1>}
    {isPrompt&&<div className={s.learningPrompt}><Prompt x={x} field={step===1?'prompt1':'prompt2'}/></div>}
    {step===2&&<motion.div className={s.assistEcho} initial={still?false:{x:-200,opacity:0}} animate={{x:0,opacity:1}} transition={tr}><b>AI</b><p>{t('helpLabel')}</p><svg viewBox="0 0 350 80" aria-hidden="true"><motion.path d="M5 40H330m-24-22 25 22-25 22" initial={{pathLength:still?1:0}} animate={{pathLength:1}} transition={tr}/></svg></motion.div>}
    {step===3&&<><motion.h1 className={s.outcomeQuestion} initial={still?false:{x:-75,opacity:0}} animate={{x:0,opacity:1}} transition={tr}>{t('outcome')}</motion.h1><div className={s.supportGone}>{t('soloLabel')}</div></>}
    {step===5&&<motion.div className={s.aiQuestion} data-answer initial={still?false:{x:120,opacity:0}} animate={{x:0,opacity:1}} transition={tr}><span>{t('answerLabel')}</span><p>{t('aiQuestion')}</p></motion.div>}
    {step===6&&<><motion.div className={s.writingHand} initial={still?false:{y:180,rotate:15,opacity:0}} animate={{y:0,rotate:-7,opacity:1}} transition={tr}><Photo src={v('writingImage')} alt={v('writingImageAlt')}/></motion.div><p className={s.studentLabel}>{t('studentLabel')}</p></>}
    {step===7&&<><motion.div className={s.transferWords} initial={still?false:{x:-60,opacity:0}} animate={{x:0,opacity:1}} transition={tr}><p>{t('soloLabel')}</p><h1>{t('transferTitle')}</h1></motion.div><motion.div className={s.transferQuestion} initial={still?false:{y:50,opacity:0}} animate={{y:0,opacity:1}} transition={tr}><p>{t('transferQuestion')}</p><small>{t('transferNote')}</small></motion.div></>}
  </>;
}
function Agency(x:Tools) {
  const {step,still,tr,t,v}=x;
  const terms=[1,2,3,4];
  return <>
    <motion.div className={s.sunReveal} initial={false} animate={{clipPath:step===2?'circle(150% at 82% 50%)':'circle(0% at 82% 50%)'}} transition={{...tr,duration:still?0:1.15}}/>
    <motion.div className={s.tap} initial={false} animate={{x:step===0?650:step===1?795:1280,y:step===0?100:60,rotate:step===0?-6:0,scale:step===0?1.12:.86,opacity:step<2?1:0}} transition={tr}><Photo src={v('image')} alt={v('imageAlt')}/></motion.div>
    {step===0&&<motion.h1 className={s.tapTitle} initial={still?false:{x:-100,opacity:0}} animate={{x:0,opacity:1}} transition={tr}>{t('title')}</motion.h1>}
    {step===1&&<div className={s.capacities}>{terms.map((n,i)=><motion.p key={n} initial={still?false:{x:300,opacity:0}} animate={{x:0,opacity:1}} transition={{...tr,delay:still?0:i*.1}}>{t(`capacity${n}`)}</motion.p>)}</div>}
    {step===2&&<motion.h1 className={s.thesis} initial={still?false:{scale:1.35,y:140,opacity:0}} animate={{scale:1,y:0,opacity:1}} transition={{...tr,delay:still?0:.12}}><EditableText path={Number(x.p.startStep)===2?'title':'thesis'} value={v('thesis')} multiline neutralWrapper><span className={s.thesisLines}>{v('thesis').replace(' > ','\n>\n').split('\n').map((line,i)=><span key={i}>{line}</span>)}</span></EditableText></motion.h1>}
    <motion.div className={s.busBackground} initial={false} animate={{opacity:step>=3?1:0,scale:step===4?1.02:1.17,x:step===4?-15:0}} transition={{...tr,duration:still?0:1.2}}><Photo src={v('busImage')} alt={v('busImageAlt')}/></motion.div>
    {step===3&&(Number(x.p.startStep)===3?<motion.h1 className={s.generationCombined} initial={still?false:{y:70,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('title')}</motion.h1>:<><motion.p className={s.generation} initial={still?false:{y:-50,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('generation')}</motion.p><motion.h1 className={s.generationQuestion} initial={still?false:{y:120,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('generationQuestion')}</motion.h1></>)}
    {step===4&&<motion.blockquote className={s.closing} initial={still?false:{y:65,opacity:0}} animate={{y:0,opacity:1}} transition={{...tr,duration:still?0:1.15}}><p>{t('closing')}</p></motion.blockquote>}
  </>;
}
