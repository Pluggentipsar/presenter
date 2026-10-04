"use client";
import { motion } from 'framer-motion';
import { EditableText } from '@/lib/inline-edit';
import { PromptTypewriter } from '../shared/PromptTypewriter';
import type { ReactNode } from 'react';
import s from './dictation-scene.module.css';
type Props={step:number;still:boolean;backward:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode};
export function DictationScene({step,still,backward,v,t}:Props){
 return <>
 <footer className={s.footer}><span>{t('timeLabel')}</span><i aria-hidden/><strong>{t('valueLabel')}</strong></footer>
 {step===0?<><h1 className={s.title}>{t('title')}</h1><motion.img className={s.phone} src={v('contextImage')} alt={v('contextImageAlt')} initial={still?false:{y:60,rotate:8,opacity:0}} animate={{y:0,rotate:-6,opacity:1}} transition={{duration:.8}}/></>:step===1?<div className={s.dictation}><header><svg viewBox="0 0 32 40" aria-hidden><rect x="10" y="2" width="12" height="23" rx="6"/><path d="M4 17v4a12 12 0 0 0 24 0v-4M16 33v5M9 38h14"/></svg>{t('promptLabel')}<div className={s.wave} data-still={still||backward} aria-hidden>{Array.from({length:22},(_,i)=><i key={i} style={{height:8+Math.abs(Math.sin(i*2))*28,animationDelay:`-${i*.13}s`}}/>)}</div></header><div data-chat-prompt><EditableText path="prompt" value={v('prompt')} multiline neutralWrapper><PromptTypewriter text={v('prompt')} still={still} complete={backward}/></EditableText></div></div>:<motion.article className={s.mail} initial={still?false:{opacity:0,y:45}} animate={{opacity:1,y:0}} transition={{duration:.6}} data-chat-answer><header><span aria-hidden>AI</span>{t('responseLabel')}</header><div>{t('response')}</div></motion.article>}
 </>;
}
