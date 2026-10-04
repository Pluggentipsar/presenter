"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { EditableText, useInlineEdit } from '@/lib/inline-edit';
import { sceneEase } from '../shared/SceneMotion';
import waveform from '../shared/listening-waveform.json';
import s from './learning-scenes.module.css';

export const learningCompositions=['knowledge-lever','reading-journey','pupil-worlds','epa-listening'];
type Props={step:number;still:boolean;backward:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode;prompt:()=>ReactNode;fullPrompt:()=>ReactNode};

export function LearningScene(props:Props){
 const {step,still,v,t}=props,tr={duration:still?0:1.1,ease:sceneEase};
 switch(v('composition')){
  case 'knowledge-lever':return <>
   <div className={s.leverGrid} aria-hidden/>
   <h1 className={s.leverTitle}>{t('title')}</h1>
   <div className={s.fulcrum}><span>{t('fulcrumLabel')}</span></div>
   <motion.div className={s.beam} initial={false} animate={{rotate:step?-7:7}} transition={tr}>
    <div className={s.beamSurface}/>
    <motion.div className={s.leverKnowledge} initial={false} animate={{rotate:step?7:-7}} transition={tr}><small>{t('leftLabel')}</small>{['knowledge1','knowledge2','knowledge3'].map((k,i)=><div key={k}><span>0{i+1}</span>{t(k)}</div>)}</motion.div>
    <motion.div className={s.leverValue} initial={false} animate={{rotate:step?7:-7,opacity:step?1:.26}} transition={tr}><span aria-hidden>↗</span><h2>{t('rightLabel')}</h2></motion.div>
   </motion.div>
   <motion.p className={s.leverCaption} initial={false} animate={{opacity:step?1:0,y:step?0:15}} transition={tr}>{step>0?t('leverCaption'):null}</motion.p>
  </>;
  case 'reading-journey':return <ReadingJourney {...props}/>;
  case 'pupil-worlds':return <>
   <div className={s.worldOrbit} aria-hidden><i/><i/><i/></div>
   <motion.img className={s.pupilCar} src={v('contextImage')} alt={v('contextImageAlt')} initial={still?false:{x:220,opacity:0}} animate={{x:0,opacity:1}} transition={tr}/>
   <motion.img className={s.pupilSport} src={v('image')} alt={v('imageAlt')} initial={still?false:{y:100,rotate:16,opacity:0}} animate={{y:0,rotate:-7,opacity:1}} transition={tr}/>
   <h1 className={s.pupilTitle}>{t('title')}</h1>
   <div className={s.pupilTags}>{['pupil1','pupil2','pupil3'].map((k,i)=><motion.span key={k} initial={still?false:{y:30,opacity:0}} animate={{y:0,opacity:1}} transition={{...tr,delay:still?0:.25+i*.25}}><i/> {t(k)}</motion.span>)}</div>
  </>;
  case 'epa-listening':return <ListeningJourney {...props}/>;
  default:return null;
 }
}

function ReadingJourney({step,still,v,t,prompt,fullPrompt}:Props){
 const phase=Number(v('processStep'))||0,tr={duration:still?0:.9,ease:sceneEase};
 const [local,setLocal]=useState<{key:string;value:number}|null>(null),key=`${phase}-${step}`;
 const shown=local?.key===key?local.value:step;
 const body=v('originalBody'),word=v('word'),wordIndex=word?body.toLocaleLowerCase('sv').indexOf(word.toLocaleLowerCase('sv')):-1;
 const parts=wordIndex<0?[body]:[body.slice(0,wordIndex),body.slice(wordIndex,wordIndex+word.length),body.slice(wordIndex+word.length)];
 return <>
  <h1 className={s.readingTitle}>{t('title')}</h1>
  <motion.article className={s.readingPaper} initial={false} animate={{x:phase===0?140:phase===1?40:shown===2?-430:78,y:phase===0?210:phase===1?235:211,scale:phase===0?1:phase===1?.46:.88,rotate:phase===1?-5:0,opacity:phase===2&&shown===2?.33:1}} transition={tr}>
   <header><span aria-hidden>{phase===2?'◉':'▤'}</span>{t(phase===2?'documentTitle':'originalLabel')}<i/><i/><i/></header>
   <div className={s.paperBody}><h2>{t('originalTitle')}</h2><EditableText path="originalBody" value={body} multiline neutralWrapper><p>{parts.map((part,i)=>phase===2&&part.toLowerCase()===word.toLowerCase()?<button className={s.word} key={i} onClick={e=>{e.stopPropagation();setLocal({key,value:1});}}>{part}</button>:part)}</p></EditableText></div>
  </motion.article>
  <AnimatePresence mode="wait" initial={false}>{phase===1?<motion.div key="order" className={s.readingPrompt} initial={still?false:{x:100,opacity:0}} animate={{x:0,opacity:1}} exit={{y:-80,opacity:0}} transition={tr}>{prompt()}<div className={s.orderChips}>{['readingFeature1','readingFeature2','readingFeature3'].map(k=><span key={k}>{t(k)}</span>)}</div></motion.div>:phase===2&&shown===1?<motion.aside key="word" className={s.wordModal} initial={still?false:{y:70,opacity:0,scale:.85}} animate={{y:0,opacity:1,scale:1}} exit={{opacity:0,y:-40}} transition={tr}>
   <header>{t('wordLabel')}<button aria-label="Stäng ordförklaringen" onClick={e=>{e.stopPropagation();setLocal({key,value:0});}}>×</button></header><h2>{t('word')}</h2><p>{t('definition')}</p><div className={s.translation} lang="ar" dir="rtl">{t('translation')}</div><small>{t('translationNote')}</small>
  </motion.aside>:phase===2&&shown===2?<motion.aside key="question" className={s.readingQuiz} initial={still?false:{x:140,opacity:0}} animate={{x:0,opacity:1}} exit={{opacity:0}} transition={tr}><span>{t('questionLabel')}</span><h2>{t('question')}</h2>{['choice1','choice2'].map((k,i)=><p key={k}><b>{String.fromCharCode(65+i)}</b>{t(k)}</p>)}<small>{t('quizNote')}</small></motion.aside>:null}</AnimatePresence>
  {phase===1&&fullPrompt()}
 </>;
}

function ListeningJourney({step,still,backward,v,t,prompt}:Props){
 const tr={duration:still?0:.9,ease:sceneEase};
 return <>
  <div className={s.listeningField}/><div className={s.road} aria-hidden/>
  <div className={s.epaWord} aria-hidden>EPA</div>
  <h1 className={s.listeningTitle}>{t(step===0?'title':step===3?'followupTitle':'listeningTitle')}</h1>
  <motion.img className={s.epaCar} src={v('contextImage')} alt={v('contextImageAlt')} initial={still?false:{x:180,opacity:0}} animate={{x:0,left:step?-40:690,top:step?482:345,width:step?600:590,rotate:step?-3:-6,opacity:step===3?.35:1}} transition={tr}/>
  {step===0?<><div className={s.epaPrompt}>{prompt()}</div><div className={s.interests}>{v('interestWords').split('|').map(w=><span key={w}>{w}</span>)}</div></>:<>
   <motion.div key={step===3?'after':'listen'} className={s.listenTask} initial={still?false:{y:25,opacity:0}} animate={{y:0,opacity:1}} transition={tr}><span>{t(step===3?'followupLabel':'listeningLabel')}</span><h2>{t(step===3?'followupTask':'listeningTask')}</h2><p>{t(step===3?'followupQuestion':'listeningQuestion')}</p>{step<3?<div className={s.vocabulary}>{v('vocabulary').split('|').map(w=><span key={w}>{w}</span>)}</div>:<b>{t('followupAction')}</b>}</motion.div>
   <div className={s.audioPosition}><AudioPlayer step={step} backward={backward} still={still} v={v} t={t}/></div>
  </>}
 </>;
}

function AudioPlayer({step,backward,still,v,t}:Pick<Props,'step'|'backward'|'still'|'v'|'t'>){
 const ref=useRef<HTMLAudioElement>(null),present=useIsPresent(),{editMode}=useInlineEdit();
 const [playing,setPlaying]=useState(false),[elapsed,setElapsed]=useState(0),[duration,setDuration]=useState(waveform.duration),[failed,setFailed]=useState(false),[blocked,setBlocked]=useState(false);
 const src=v('audioSrc');
 useEffect(()=>{const audio=ref.current;if(!audio)return;let valid=true;if(step===2&&!backward&&present&&!editMode){if(audio.ended)audio.currentTime=0;void audio.play().then(()=>{if(valid)setBlocked(false);}).catch(()=>{if(valid)setBlocked(true);});}else audio.pause();return()=>{valid=false;audio.pause();};},[step,backward,present,editMode,src]);
 const time=(n:number)=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
 return <div className={s.audioPlayer} data-listening-player data-playing={playing&&!still}>
  <header><span>AI</span>{t('audioLabel')}</header><h2>{t('audioTitle')}</h2>
  <div className={s.wave} aria-hidden>{waveform.levels.map((level,i)=><i key={i} data-heard={elapsed/duration>i/waveform.levels.length} style={{height:`${Math.max(5,level)}%`,animationDelay:`-${i*.13}s`}}/>)}</div>
  <div className={s.audioControls}><button aria-label={playing?'Pausa hörförståelsen':'Spela hörförståelsen'} onClick={e=>{e.stopPropagation();if(playing)ref.current?.pause();else void ref.current?.play().then(()=>setBlocked(false)).catch(()=>setBlocked(true));}}>{playing?'Ⅱ':'▶'}</button><span>{time(elapsed)} <small>/ {time(duration)}</small></span></div>
  <p className={s.audioStatus}>{failed?'Ljudfilen kunde inte läsas.':blocked?'Tryck på spela för att starta ljudet.':step===1?'Nästa framåttryck startar ljudet.':playing?'Lyssna efter ord och sammanhang.':'Ljudet är pausat.'}</p>
  <audio ref={ref} src={src} preload="auto" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onTimeUpdate={()=>setElapsed(ref.current?.currentTime??0)} onLoadedMetadata={()=>{if(Number.isFinite(ref.current?.duration))setDuration(ref.current!.duration);}} onEnded={()=>setPlaying(false)} onError={()=>setFailed(true)}/>
 </div>;
}
