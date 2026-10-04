"use client";
import { motion } from 'framer-motion';
import { EditableText } from '@/lib/inline-edit';
import type { ReactNode } from 'react';
import s from './privacy-journey.module.css';
type Props={step:number;still:boolean;v:(key:string)=>string;t:(key:string)=>ReactNode};
export function PrivacyJourney({step,still,v,t}:Props){
 const final=step===7,focus=step>0&&!final;
 const risks=Array.from({length:6},(_,i)=>({n:i+1,parts:v(`risk${i+1}`).split('|').filter(Boolean)}));
 const text=v('prompt'),matches=risks.flatMap(r=>r.parts.flatMap(part=>{const i=text.indexOf(part);return i<0?[]:[{start:i,end:i+part.length,n:r.n,text:part}];})).sort((a,b)=>a.start-b.start);
 const fragments:ReactNode[]=[];let cursor=0;
 matches.forEach((m,i)=>{if(m.start<cursor)return;fragments.push(text.slice(cursor,m.start));fragments.push(<mark key={i} data-current={step===m.n} data-past={step>m.n}>{m.text}</mark>);cursor=m.end;});fragments.push(text.slice(cursor));
 return <>
 <h1 className={s.title}>{t('title')}</h1><p className={s.fiction}>{t('fictionLabel')}</p>
 {!final?<><motion.article className={s.draft} data-focused={focus} initial={false} animate={{x:focus?25:60,y:focus?180:128,scale:focus?.57:1}} transition={{duration:still?0:.7}}><header><span>{t('destinationLabel')}</span><b>{t('stopLabel')}</b></header><EditableText path="prompt" value={text} multiline neutralWrapper><p>{fragments}</p></EditableText></motion.article>{focus&&<motion.div key={step} className={s.focus} initial={still?false:{opacity:0,y:25}} animate={{opacity:1,y:0}} transition={{duration:still?0:.45}}><span>0{step}</span><h2>{t(`category${step}`)}</h2><blockquote>{v(`risk${step}`).split('|').map((part,i)=><p key={i}>{part}</p>)}</blockquote><p>{t(`explanation${step}`)}</p></motion.div>}</>:<motion.article className={s.alternative} initial={still?false:{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:.5}}><header>{t('alternativeLabel')}</header><p>{t('safePrompt')}</p><footer>{t('rule')}</footer></motion.article>}
 <nav className={s.categories} aria-label="Granskning av prompten">{[1,2,3,4,5,6].map(n=><div key={n} data-active={step===n} data-seen={step>=n}><span>{step>=n?'×':`0${n}`}</span><b>{t(`category${n}`)}</b></div>)}</nav>
 </>;
}
