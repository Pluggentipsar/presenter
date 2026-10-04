"use client";

import { type CSSProperties } from 'react';
import { EditableText } from '@/lib/inline-edit';
import { fieldText, type LectureProps } from './scene-model';
import s from './lecture.module.css';

/** Tangible source material next to the instruction. Never a premature AI answer. */
export function SceneMaterial({ props, still }: { props: LectureProps; still: boolean }) {
  const v=(key:string)=>fieldText(props,key);
  const text=(key:string)=><EditableText path={key} value={v(key)} multiline neutralWrapper><span className={s.copy}>{v(key)}</span></EditableText>;
  const image=v('contextImage')||v('image');
  const imageAlt=v('contextImage')?v('contextImageAlt'):v('imageAlt');
  const visual=v('visual')||'paper';
  return <div className={s.material} data-visual={visual} data-has-image={Boolean(image)}>
    {image ? <div className={s.materialImage}>
      {/* Local, replaceable teaching assets; original paths remain editable. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={imageAlt}/>
    </div> : visual==='circuit' ? <svg className={s.materialCircuit} viewBox="0 0 420 330" aria-hidden="true"><path d="M75 170V65H330V270H75V220"/><path d="M40 170h70m-55 25h40m-55 25h70"/><rect x="180" y="48" width="85" height="34" rx="3"/><circle cx="330" cy="173" r="34"/><path d="m312 156 36 34m0-34-36 34"/></svg> : visual==='game' ? <div className={s.gameModel} aria-hidden="true"><div className={s.gameWindow}><span/><span/><span/></div><div className={s.gamePlatforms}><i/><i/><i/></div><svg className={s.gameHand} viewBox="0 0 160 160"><path d="M62 137c-5-25-24-35-29-48-5-11 8-19 16-9l11 13V32c0-14 17-14 17 0v36-50c0-13 17-13 17 0v50-34c0-13 17-13 17 0v42-19c0-13 17-13 17 0v49c0 16-14 27-14 40"/></svg><div className={s.gameTarget}/></div> : visual==='concept' ? <div className={s.needLayers}>{v('contextBody').split('\n').map((line,i)=><div key={i}><span aria-hidden="true">{i===0?'↳':i===1?'Aa':'↗'}</span><p>{line}</p></div>)}</div> : <div className={s.paperStack} data-written={Boolean(v('contextBody'))}><div aria-hidden="true"/><div aria-hidden="true"/><div>{v('contextBody')?<div className={s.paperContent}><h2>{text('contextTitle')}</h2><p>{text('contextBody')}</p></div>:<><i/><i/><i/><i/><i/><i/></>}</div></div>}
    {visual==='voice'&&<div className={s.voiceWave} aria-hidden="true">{Array.from({length:35},(_,i)=><i key={i} style={{'--bar':`${14+(i*17)%49}px`,'--delay':`${i*-.13}s`,animationPlayState:still?'paused':'running'} as CSSProperties}/>)}</div>}
    {(v('contextTitle')||v('contextBody'))&&(Boolean(image)||!v('contextBody')||['circuit','game','concept'].includes(visual))&&<div className={s.materialCaption}><h2>{text('contextTitle')}</h2>{v('contextBody')&&visual!=='concept'&&<p>{text('contextBody')}</p>}</div>}
  </div>;
}

/** Schematic pictograms belong to the process, not to invented research quantities. */
export function ProcessMark({ kind = 'paper' }: { kind?: string }) {
  return <svg viewBox="0 0 160 130" fill="none" aria-hidden="true" className={s.processMark}>
    {kind==='chat' ? <><path d="M20 20h120v72H66l-28 21V92H20z"/><path d="M44 43h70M44 62h46"/></> : kind==='check' ? <><circle cx="80" cy="65" r="49"/><path d="m51 65 19 20 41-43"/></> : kind==='people' ? <><circle cx="53" cy="35" r="18"/><circle cx="109" cy="43" r="15"/><path d="M17 111V90a36 36 0 0 1 72 0v21m7-47a30 30 0 0 1 44 26v21"/></> : kind==='question' ? <><path d="M50 38c0-33 61-33 61 0 0 23-33 17-33 40"/><circle cx="78" cy="99" r="3"/></> : <><path d="M40 9h63l24 25v87H40zM103 9v25h24M59 55h49M59 73h49M59 91h31"/></>}
  </svg>;
}
