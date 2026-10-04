"use client";
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneEase } from '../shared/SceneMotion';
import s from './process-design.module.css';

type Props={step:number;still:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:(key?:string,full?:boolean)=>ReactNode;img:(key:string,cls:string)=>ReactNode};

/** Shared task, visible ownership and editable instructions; no content advances on a timer. */
export function ProcessDesignScene({step,still,v,t,prompt,img}:Props){
 const tr={duration:still?0:.8,ease:sceneEase};
 if(v('composition')==='product-process')return <><div className={s.poemGlow}/><motion.div className={s.poemImages} initial={still?false:{opacity:0,y:30,rotate:-3}} animate={{opacity:1,y:0,rotate:0}} transition={tr}>{img('image',s.collage)}</motion.div><h1 className={s.poemTitle}><span className={s.productWord}>{t('productWord')}</span><span className={s.versusWord}>{t('versusWord')}</span><strong>{t('processWord')}</strong></h1></>;
 if(v('composition')==='epa-insertion'){
  const indices=step?[1,2,3,4]:[1,3,4];
  return <><h1 className={s.epaHeading}>{t(step?'title':'beforeTitle')}</h1><div className={s.epaLine}/><div className={s.epaCards}><AnimatePresence>{indices.map((n,i)=><motion.article key={n} data-ai={n===2} initial={still?false:{opacity:0,y:n===2?-70:25}} animate={{opacity:1,y:0,x:i*(step?298:400),width:step?266:364}} exit={{opacity:0,y:still?0:-60,transition:{duration:still?0:.25}}} transition={tr}><span className={s.initial}>{t(`letter${n}`)}</span><h2>{t(`item${n}`)}</h2><p>{t(`detail${n}`)}</p></motion.article>)}</AnimatePresence></div><p className={s.epaCaption}>{t(step?'after':'subtitle')}</p></>;
 }
 const focus=step===3?1:step===4?4:step===5?5:0;
 const role=(n:number)=>v(`owner${n}`);
 return <>
  <motion.div className={s.taskHeading} initial={false} animate={{y:step?0:100,width:step?1140:750}} transition={tr}>
   <span>{t('assignmentLabel')}</span><motion.h1 animate={{fontSize:step?48:100}} transition={tr}>{t('title')}</motion.h1><p>{t('subtitle')}</p>
  </motion.div>
  {step===0?<><div className={s.sourcePair}>{[1,2].map(n=><motion.div key={n} initial={still?false:{rotate:0,y:40,opacity:0}} animate={{rotate:n===1?-8:8,y:0,opacity:1}} transition={{...tr,delay:still?0:n*.12}}><span>{t(`sourceLabel${n}`)}</span><i/><i/><i/><i/><i/></motion.div>)}</div><div className={s.threeQuestions}>{[1,2,3].map(n=><p key={n}>{t(`question${n}`)}</p>)}</div></>:<>
   <div className={s.workList}>{[1,2,3,4,5].map(n=><motion.article key={n} data-role={step>=2?role(n):'unassigned'} data-active={!focus||focus===n} initial={still?false:{opacity:0,x:-35}} animate={{opacity:focus&&focus!==n?.35:1,x:0}} transition={{...tr,delay:still?0:(n-1)*.07}}><span className={s.workNumber}>0{n}</span><div><h2>{t(`work${n}`)}</h2><p>{t(`detail${n}`)}</p></div>{step>=2&&<span className={s.owner}>{t(`ownerLabel${n}`)}</span>}</motion.article>)}</div>
   <AnimatePresence mode="wait" initial={false}><motion.div key={step} className={s.designPanel} initial={still?false:{opacity:0,y:28}} animate={{opacity:1,y:0}} exit={{opacity:0,y:still?0:-20}} transition={{duration:still?0:.3,ease:sceneEase}}>
    {step===1?<><span className={s.panelEyebrow}>{t('breakdownLabel')}</span><h2>{t('breakdownTitle')}</h2><p className={s.panelBody}>{t('breakdownBody')}</p></>:step===2?<><span className={s.panelEyebrow}>{t('ownershipLabel')}</span><h2>{t('ownershipTitle')}</h2><div className={s.roleKey}>{[1,2,3].map(n=><p key={n} data-role={['support','challenge','student'][n-1]}><i/>{t(`question${n}`)}</p>)}</div><p className={s.panelBody}>{t('ownershipBody')}</p></>:step===3||step===4?<><span className={s.panelEyebrow}>{t('behaviorLabel')}</span><h2>{t(step===3?'supportTitle':'challengeTitle')}</h2>{prompt(step===3?'supportPrompt':'challengePrompt',true)}<p className={s.promptNote}>{t('promptNote')}</p></>:<><span className={s.panelEyebrow}>{t('checkpointLabel')}</span><h2>{t('checkpointTitle')}</h2><blockquote>{t('checkpointTask')}</blockquote><p className={s.panelBody}>{t('checkpointBody')}</p></>}
   </motion.div></AnimatePresence>
   <div className={s.journeyProgress} aria-label="Resans steg">{[1,2,3,4,5].map(n=><i key={n} data-active={n<=step}/>)}</div>
  </>}
 </>;
}
