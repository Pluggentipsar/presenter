"use client";

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneTransition } from '../shared/SceneMotion';
import s from './assessment-transfer.module.css';

type Props = { step: number; still: boolean; t: (key: string) => ReactNode };

/** Small visual cues describe the kind of change; they do not supply its answer. */
function TaskMark({ kind, changed }: { kind: number; changed: boolean }) {
  return <svg viewBox="0 0 180 110" aria-hidden="true" className={s.taskMark}>
    {kind === 1 ? <>
      <path className={s.faint} d="M20 5V92H175 M20 65H175 M20 38H175 M60 5V92 M100 5V92 M140 5V92" />
      <path d="M20 86L168 18" /><path className={s.accent} d={changed ? 'M20 37L168 11' : 'M20 69L168 43'} />
      {changed && <path className={s.faint} strokeDasharray="4 5" d="M20 69L168 43" />}
    </> : kind === 2 ? <>
      <path className={s.faint} d="M14 14H161 M14 34H142 M14 54H160 M14 74H116 M14 94H155" />
      <path className={s.accent} strokeWidth="10" d={changed ? 'M14 74H116' : 'M14 34H142'} />
      <path d={changed ? 'M147 59L164 74L147 89' : 'M139 19L157 34L139 49'} />
    </> : kind === 3 ? <>
      <path d="M18 42V16H152V42 M18 68V94H152V68 M85 16V42 M85 68V94" />
      <path strokeWidth="4" d="M9 42H27 M13 68H23" />
      <circle cx="85" cy="55" r="13" /><path d="M76 46L94 64 M94 46L76 64" />
      {!changed && <><circle cx="152" cy="55" r="13" /><path d="M143 46L161 64 M161 46L143 64" /></>}
      {changed && <path className={s.accent} strokeDasharray="3 5" d="M141 45L163 65 M163 45L141 65" />}
    </> : <>
      <path d="M34 9H121L146 34V99H34Z M121 9V34H146" />
      <path className={s.faint} d="M51 51H126 M51 67H126 M51 83H101" />
      <circle className={s.accent} cx={changed ? 126 : 51} cy="67" r="17" />
    </>}
  </svg>;
}

export function AssessmentTransfer({ step, still, t }: Props) {
  const transition = sceneTransition(still);
  const active = step > 0;
  const enter = { initial: still ? false as const : { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition };
  const pair = <motion.div className={s.pairContent} key={step} {...enter} exit={{ opacity: 0, y: -18, transition: { duration: .16 } }}>
    <article className={s.original}>
      <header><span>{t('firstLabel')}</span><b aria-hidden="true">01</b></header>
      <TaskMark kind={step} changed={false} />
      <p>{t(active ? `originalTask${step}` : 'firstIntro')}</p>
    </article>
    <article className={s.twin}>
      <header><span>{t('secondLabel')}</span><b aria-hidden="true">02</b></header>
      <TaskMark kind={step} changed />
      <p>{t(active ? `twinTask${step}` : 'secondIntro')}</p>
      {active && <div className={s.change}>{t(`change${step}`)}</div>}
    </article>
  </motion.div>;
  return <div className={s.scene} data-examples={active}>
    <div className={s.halo} aria-hidden="true" />
    <motion.h1 className={s.title} initial={false} animate={{ fontSize: active ? 63 : 88 }} transition={transition}>{t('title')}</motion.h1>
    {!active && <motion.p {...enter} className={s.principle}>{t('principle')}</motion.p>}
    {active && <><div className={s.subjects}>{[1, 2, 3].map(n => <div key={n} data-active={step === n}><i aria-hidden="true" />{t(`subject${n}`)}</div>)}</div>
      <div className={s.goal}><span>{t('goalLabel')}</span><p key={step}>{t(`learningGoal${step}`)}</p></div></>}
    <div className={s.pair}>
      <div className={s.bridge} aria-hidden="true"><svg viewBox="0 0 100 70"><path d="M0 35H100 M39 24L52 35L39 46 M56 24L69 35L56 46" /></svg></div>
      {still ? pair : <AnimatePresence initial={false} mode="wait">{pair}</AnimatePresence>}
    </div>
    <p className={s.rule}>{t(active ? 'designRule' : 'introNote')}</p>
  </div>;
}
