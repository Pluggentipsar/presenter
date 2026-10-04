"use client";

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EditableText } from '@/lib/inline-edit';
import { Film } from '../shared/Film';
import { sceneEase } from '../shared/SceneMotion';
import s from './teaching-scenes.module.css';

export const teachingCompositions=['purpose','toolbox','full-film','puzzle-fit','approval-stamp','instruction-journey'];
type Props={step:number;still:boolean;backward:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:()=>ReactNode};
export function TeachingScene({step,still,backward,v,t,prompt}:Props){
 const tr={duration:still?0:.95,ease:sceneEase};
 switch(v('composition')){
  case 'purpose':return <>
   <motion.div className={s.purposeOrb} initial={false} animate={{x:step?590:0,y:step?80:0,scale:step?.48:1,opacity:step?.2:1,rotate:step?22:-8}} transition={tr} aria-hidden><span>AI</span></motion.div>
   <motion.h1 className={s.purposeTitle} initial={false} animate={{y:step?-95:0,fontSize:step?46:99,opacity:step?.5:1}} transition={tr}>{t('title')}</motion.h1>
   {step>0&&<motion.h2 className={s.purposeAfter} initial={still?false:{y:100,opacity:0,scale:.85}} animate={{y:0,opacity:1,scale:1}} transition={tr}>{t('after')}</motion.h2>}
  </>;
  case 'toolbox':return <>
   <svg className={s.tpack} viewBox="0 0 620 520" aria-hidden><circle cx="225" cy="200" r="165"/><circle cx="395" cy="200" r="165"/><circle cx="310" cy="340" r="165"/><text x="160" y="172">PK</text><text x="455" y="172">CK</text><text x="310" y="444">TK</text><text x="310" y="264">TPACK</text></svg>
   <h1 className={s.toolboxHeading}>{t('title')}</h1>
   <div className={s.toolbox}><div className={s.toolboxHandle}/><div className={s.toolboxLip}/>
    {[1,2,3,4].map((n)=><motion.div className={s.knowledge} key={n} style={{left:35+(n-1)*223}} initial={false} animate={{y:step?-32:0,rotate:step?0:(n-2.5)*3}} transition={tr}><span className={s.toolNumber}>0{n}</span><p>{t(`tool${n}`)}</p><div className={s.toolLines} aria-hidden><i/><i/><i/></div></motion.div>)}
    <motion.div className={s.aiTool} initial={false} animate={{x:step?0:125,y:step?0:-95,rotate:step?0:12,scale:step?1:1.15}} transition={tr}><span>{t('toolAI')}</span><svg viewBox="0 0 50 50" aria-hidden><path d="M25 3v44M3 25h44M9 9l32 32M9 41 32-32"/></svg></motion.div>
    <div className={s.toolboxFront}><span>{t('toolboxLabel')}</span><i aria-hidden/></div>
   </div><motion.p className={s.toolboxCaption} initial={false} animate={{opacity:step?1:0,y:step?0:18}} transition={tr}>{step>0?t('toolboxCaption'):null}</motion.p>
  </>;
  case 'full-film':return <div className={s.fullFilm}><Film src={v('videoSrc')} backward={backward} chrome={false}/></div>;
  case 'puzzle-fit':return <><h1 className={s.puzzleTitle}>{t('title')}</h1><svg className={s.puzzle} viewBox="-40 -50 660 560" aria-label={v('puzzleLabel')}>
    {Array.from({length:6},(_,i)=>i===4?null:<path key={i} d={piece(i%3,Math.floor(i/3))} transform={`translate(${(i%3)*180} ${Math.floor(i/3)*180})`} className={s.piece} style={{opacity:.35+(i%3)*.13}}/>)}
    <motion.g initial={false} animate={{x:step?180:255,y:step?180:380,rotate:step?0:15}} transition={tr}><path d={piece(1,1)} className={s.aiPiece}/><text x="90" y="108" textAnchor="middle">AI</text></motion.g>
   </svg></>;
  case 'approval-stamp':return <><div className={s.stampPhoto}>{v('image')&&<motion.img src={v('image')} alt={v('imageAlt')}/>}</div><EditableText path="title" value={v('title')} multiline neutralWrapper><h1 className={s.stampLead}>{v('title').split('\n')[0]}</h1><motion.div className={s.stamp} initial={still?false:{scale:2,opacity:0,rotate:-24}} animate={{scale:1,opacity:1,rotate:-8}} transition={{...tr,delay:still?0:.4}}><svg viewBox="0 0 80 80" aria-hidden><path d="m10 42 20 21 42-48"/></svg><strong>{v('title').split('\n').slice(1).join('\n')}</strong></motion.div></EditableText><p className={s.stampAttribution}>{t('subtitle')}</p></>;
  case 'instruction-journey':return <InstructionJourney v={v} t={t} prompt={prompt} still={still}/>;
  default:return null;
 }
}

function piece(col:number,row:number){
 const top=row?'h65 c-10 -30 60 -30 50 0 h65':'h180';
 const right=col<2?'v65 c30 -10 30 60 0 50 v65':'v180';
 const bottom=row<1?'h-65 c10 -30 -60 -30 -50 0 h-65':'h-180';
 const left=col?'v-65 c30 10 30 -60 0 -50 v-65':'v-180';
 return `M0 0 ${top} ${right} ${bottom} ${left} Z`;
}

function InstructionJourney({v,t,prompt,still}:Pick<Props,'v'|'t'|'prompt'|'still'>){
 const phase=Number(v('processStep'))||0,tr={duration:still?0:1,ease:sceneEase};
 return <>
  <motion.article className={s.original} initial={false} animate={{x:phase===0?155:phase===1?55:10,y:phase===0?92:phase===1?202:218,scale:phase===0?1:phase===1?.51:.4,rotate:phase===0?0:-5,opacity:phase===2?.32:1}} transition={tr}>
   <header><span aria-hidden>▤</span>{t('originalLabel')}</header><h2>{t('originalTitle')}</h2><p>{t('originalBody')}</p>
  </motion.article>
  <AnimatePresence mode="wait" initial={false}>{phase===1?<motion.div key="prompt" className={s.instructionPrompt} initial={still?false:{x:120,opacity:0}} animate={{x:0,opacity:1}} exit={{y:-70,opacity:0,scale:.92}} transition={tr}>{prompt()}</motion.div>:phase===2?<motion.article key="result" className={s.clearInstruction} initial={still?false:{y:80,opacity:0,scale:.94}} animate={{y:0,opacity:1,scale:1}} transition={tr}>
   <header>{t('documentTitle')}<span>{t('resultLabel')}</span></header><h1>{t('title')}</h1><div>{v('body').split('\n').filter(Boolean).map((line,i)=><motion.p key={i} initial={still?false:{y:15,opacity:0}} animate={{y:0,opacity:1}} transition={{...tr,delay:still?0:i*.17}}><EditableText path="body" value={v('body')} multiline neutralWrapper>{line}</EditableText></motion.p>)}</div>
  </motion.article>:null}</AnimatePresence>
 </>;
}
