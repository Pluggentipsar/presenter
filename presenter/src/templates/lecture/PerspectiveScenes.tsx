"use client";
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneEase } from '../shared/SceneMotion';
import s from './perspective-scenes.module.css';

export const perspectiveCompositions=['badminton-bridge','spotlight','class-perspectives','practice-field','possibility-fan','learning-reframe','table-discussion','student-chapter'];
type Props={step:number;still:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:()=>ReactNode};
export function PerspectiveScene({step,still,v,t,prompt}:Props){
 const tr={duration:still?0:.9,ease:sceneEase};
 if(v('composition')==='table-discussion')return <><div className={s.discussBadge}><svg viewBox="0 0 80 65" aria-hidden><path d="M4 4h47v31H23L10 45V35H4ZM31 41v9h23l15 11V50h6V20H59"/></svg>{t('discussionLabel')}</div><div className={s.talkHalo} aria-hidden/><h1 className={s.discussTitle}>{t('title')}</h1><div className={s.discussQuestions}>{[1,2,3].map(n=><div key={n}><span>0{n}</span><h2>{t(`item${n}`)}</h2></div>)}</div></>;
 if(v('composition')==='student-chapter')return <><motion.img className={s.studentPhoto} src={v('image')} alt={v('imageAlt')} initial={still?false:{scale:1.1,opacity:0}} animate={{scale:1,opacity:.82}} transition={{duration:still?0:1.8,ease:sceneEase}}/><div className={s.studentShade}/><svg className={s.studentLines} viewBox="0 0 1280 720" aria-hidden>{[0,1,2].map(i=><motion.path key={i} d={`M${900+i*70} -40C${580+i*100} 280 ${1170-i*90} 400 ${790+i*110} 780`} initial={still?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:still?0:2.8,delay:still?0:i*.18}}/>)}</svg><h1 className={s.studentTitle}><span>{t('title')}</span><motion.strong initial={still?false:{y:50,opacity:0}} animate={{y:0,opacity:1}} transition={tr}>{t('chapterFocus')}</motion.strong></h1></>;
 if(v('composition')==='learning-reframe')return <><motion.div className={s.reframeOld} initial={false} animate={{y:step?85:245,scale:step?.57:1,opacity:step?.45:1}} transition={tr}><h1>{t('title')}</h1><motion.i initial={false} animate={{scaleX:step?1:0}} transition={tr}/></motion.div>{step>0&&<motion.h2 className={s.reframeNew} initial={still?false:{y:85,opacity:0,filter:'blur(12px)'}} animate={{y:0,opacity:1,filter:'blur(0px)'}} transition={{...tr,delay:still?0:.25}}>{t('after')}</motion.h2>}</>;
 if(v('composition')==='practice-field')return <><div className={s.practiceWords}>{[1,2,3,4,5,6,7,8,9].map((n)=><motion.span key={n} style={{left:[60,640,120,755,30,790,60,540,650][n-1],top:[78,118,200,244,472,455,591,624,535][n-1],rotate:n%2?-4:3}} initial={still?false:{y:50,opacity:0,scale:.9}} animate={{y:0,opacity:.2,scale:1}} transition={{...tr,delay:still?0:(n-1)*.4}}>{t(`item${n}`)}</motion.span>)}</div><div className={s.practiceVeil}/><h1 className={s.practiceTitle}>{t('title')}</h1></>;
 if(v('composition')==='possibility-fan')return <><div className={s.fanGlow}/><svg className={s.fanLines} viewBox="0 0 1280 720" aria-hidden>{[[920,140],[1140,260],[1120,520],[850,610],[670,470]].map(([x,y],i)=><motion.path key={i} d={`M910 350Q${x} 350 ${x} ${y}`} initial={still?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:still?0:1.5,delay:still?0:.3+i*.15}}/>)}</svg><motion.img className={s.fanSource} src={v('image')} alt={v('imageAlt')} initial={still?false:{scale:1.2,rotate:10,opacity:0}} animate={{scale:1,rotate:-5,opacity:1}} transition={tr}/>{[1,2,3,4,5].map((n)=><motion.div className={s.fanFormat} key={n} style={{left:[840,1040,1000,770,595][n-1],top:[104,235,494,588,460][n-1]}} initial={still?false:{x:40,y:30,opacity:0}} animate={{x:0,y:0,opacity:1}} transition={{...tr,delay:still?0:.4+n*.16}}><span aria-hidden>{['Aa','▧','◖◗','♫','⌘'][n-1]}</span>{t(`format${n}`)}</motion.div>)}<h1 className={s.possibilityTitle}>{t('title')}</h1></>;
 if(v('composition')==='badminton-bridge')return <>
  <h1 className={s.bridgeTitle}>{t('title')}</h1>
  <div className={s.court} aria-hidden/>
  <svg className={s.flight} viewBox="0 0 1280 720" aria-hidden><motion.path d="M265 505Q650 135 1095 505" initial={false} animate={{pathLength:step?1:0,opacity:step?.5:0}} transition={{duration:still?0:1.5,ease:'easeInOut'}}/></svg>
  <div className={s.net} aria-hidden><i/><span/></div>
  <motion.img className={s.shuttle} src={v('image')} alt={v('imageAlt')} initial={false} animate={{x:step?(still?950:[150,580,950]):150,y:step?(still?390:[390,225,390]):390,rotate:step?(still?60:[-65,0,60]):-65}} transition={{duration:still?0:1.5,ease:'easeInOut'}}/>
  <div className={s.bridgeEnds}><span>{t('leftLabel')}</span><motion.span initial={false} animate={{opacity:step?1:.25}} transition={tr}>{t('rightLabel')}</motion.span></div>
  {step>0&&<motion.p className={s.bridgeNote} initial={still?false:{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{...tr,delay:still?0:1.15}}>{t('bridgeCaption')}</motion.p>}
 </>;
 if(v('composition')==='spotlight')return <>
  <div className={s.spotGrid}/><h1 className={s.spotTitle}>{t('title')}</h1>
  <div className={s.dimQuestions} aria-hidden>{[1,2,3,4].map(n=><span key={n}>{v(`spot${n}`)}</span>)}</div>
  <motion.div className={s.litQuestions} initial={false} animate={{maskImage:still?'radial-gradient(ellipse 950px 500px at 50% 50%, black 80%, transparent)':['radial-gradient(ellipse 260px 180px at 15% 30%, black 35%, transparent)','radial-gradient(ellipse 260px 180px at 85% 30%, black 35%, transparent)','radial-gradient(ellipse 260px 180px at 15% 80%, black 35%, transparent)','radial-gradient(ellipse 260px 180px at 85% 80%, black 35%, transparent)','radial-gradient(ellipse 950px 500px at 50% 50%, black 80%, transparent)']}} transition={{duration:still?0:9,ease:'easeInOut'}}>{[1,2,3,4].map(n=><span key={n}>{t(`spot${n}`)}</span>)}</motion.div>
  <motion.div className={s.spotHalo} aria-hidden initial={false} animate={{x:still?350:[-120,650,-120,650,350],y:still?420:[340,340,500,500,420],opacity:still?.3:[.6,.6,.6,.6,.3],scale:still?2:[1,1,1,1,2]}} transition={{duration:still?0:9,ease:'easeInOut'}}/>
  {/* Valfri ficklampa (image): hänger uppe till höger och siktar på samma fråga som ljuset, i samma takt. Vinklarna räknas från svansen (1180, 110) mot frågornas mitt på 1280 × 720-scenen. */}
  {v('image')&&<motion.div className={s.spotLamp} aria-hidden initial={false} animate={{rotate:still?-35:[-17.5,-47,-25.5,-54,-35]}} transition={{duration:still?0:9,ease:'easeInOut'}}><span className={s.spotBeam}/><img src={v('image')} alt=""/></motion.div>}
 </>;
 return <>
  <motion.h1 className={s.classTitle} initial={false} animate={{fontSize:step?45:59}} transition={tr}>{t('title')}</motion.h1>
  <motion.article className={s.assignment} initial={false} animate={{x:step?-330:0,opacity:step?0:1,scale:step?.85:1}} transition={tr}><header>{t('contextTitle')}</header><h2>{t('assignmentTitle')}</h2><p>{t('contextBody')}</p></motion.article>
  <AnimatePresence initial={false}>{step===0&&<motion.div className={s.classPrompt} key="prompt" initial={false} exit={{opacity:0,y:-55,scale:.95}} transition={tr}>{prompt()}</motion.div>}</AnimatePresence>
  {step>0&&<><p className={s.answerLabel}>{t('responseLabel')}</p><div className={s.perspectives}>{[1,2,3,4].map((n)=><motion.article key={n} initial={still?false:{opacity:0,y:55,rotate:n%2?-3:3}} animate={{opacity:1,y:0,rotate:0}} transition={{...tr,delay:still?0:.3+(n-1)*.18}}><header><span>0{n}</span><h2>{t(`perspective${n}`)}</h2></header><p>{t(`reaction${n}`)}</p><div>{t(`adjustment${n}`)}</div></motion.article>)}</div><p className={s.classFoot}>{t('perspectiveNote')}</p></>}
 </>;
}
