"use client";

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { sceneTransition } from '../shared/SceneMotion';
import s from './assessment.module.css';
import { AssessmentTransfer } from './AssessmentTransfer';

type Props = { step: number; still: boolean; v: (key: string) => string; t: (key: string) => ReactNode; img: (key: string, className: string) => ReactNode };

function StepSwap({ still, children }: { still: boolean; children: ReactNode }) {
  // Remove outgoing content synchronously when reversing or using reduced motion.
  return still ? <>{children}</> : <AnimatePresence initial={false} mode="wait">{children}</AnimatePresence>;
}

/** The legible artifact persists through each scene's transformations. */
function AnalysisPaper({ t, focused = false }: { t: Props['t']; focused?: boolean }) {
  return <article className={s.paper} data-assessment-paper>
    <div className={s.paperMeta}><span>{t('documentLabel')}</span><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h12l6 6v20H7Z M19 3v7h6 M12 16h8 M12 21h8" /></svg></div>
    <h2>{t('documentTitle')}</h2><p>{t('documentBody')}</p>
    <p className={s.claim} data-focused={focused}>{t('documentClaim')}</p>
    <div className={s.paperBottom}><span>{t('documentCaption')}</span><i aria-hidden="true" /></div>
  </article>;
}

/** Clicker owns every reveal. Backward and reduced motion land immediately. */
export function AssessmentScene({ step, still, v, t, img }: Props) {
  if (v('composition') === 'assessment-transfer') return <AssessmentTransfer step={step} still={still} t={t} />;
  const transition = sceneTransition(still);
  const enter = { initial: still ? false as const : { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition };
  if (v('composition') === 'assessment-effort') return <>
    <motion.div className={s.effortPhoto} initial={false} animate={{ x: step ? 190 : 0, scale: step ? .89 : 1, opacity: step ? .42 : .85 }} transition={transition}>{img('image', s.photo)}</motion.div>
    <div className={s.effortVeil} />
    <motion.div className={s.effortOpening} initial={false} animate={{ y: step ? -100 : 0, scale: step ? .43 : 1, opacity: step ? .66 : 1 }} transition={transition}>
      <h1>{t('title')}<strong>{t('effortWord')}</strong></h1>
    </motion.div>
    {step > 0 && <motion.div className={s.effortTurn} {...enter}>
      <p>{t('turnLead')}</p><h2>{t('turnWord')}</h2>
      <motion.div className={s.underline} initial={{ scaleX: still ? 1 : 0 }} animate={{ scaleX: 1 }} transition={transition} />
      <p>{t('turnTail')}</p>
    </motion.div>}
  </>;
  if (v('composition') === 'assessment-evidence') return <>
    <div className={s.deskLight} />
    <motion.h1 className={s.evidenceHeading} initial={false} animate={{ y: step ? -116 : 0, scale: step ? .5 : 1, opacity: step ? .66 : 1 }} transition={transition}>{t('title')}</motion.h1>
    <motion.div className={s.evidencePaper} initial={still ? false : { y: 75, rotate: 9, opacity: 0 }} animate={{ x: step ? -638 : 0, y: step ? 126 : 0, rotate: step ? -3 : 4, scale: step ? .9 : 1, opacity: 1 }} transition={transition}>
      <AnalysisPaper t={t} focused={step > 0} />
    </motion.div>
    {step > 0 && <motion.div className={s.evidenceQuestion} {...enter}>
      <h2>{t('question')}</h2><div className={s.known}><span aria-hidden="true">✓</span><p>{t('observation')}</p></div>
      <div className={s.unknown}><span aria-hidden="true">?</span><p>{t('uncertainty')}</p></div>
    </motion.div>}
  </>;
  if (v('composition') === 'assessment-twins') return <>
    <header className={s.twinsHeading}><h1>{t('title')}</h1><p>{t('subtitle')}</p></header>
    <div className={s.goal}><span>{t('goalLabel')}</span><p>{t('goal')}</p></div>
    <motion.div className={s.twinPaper} initial={still ? false : { x: -30, opacity: 0 }} animate={{ x: 0, opacity: step > 0 ? .84 : 1 }} transition={transition}>
      <div className={s.evidenceTab}>{t('evidenceLabel')}</div><AnalysisPaper t={t} focused={step > 0} />
    </motion.div>
    <svg className={s.link} viewBox="0 0 170 280" aria-hidden="true">
      {step > 0 && <motion.path d="M8 214 H43 Q70 214 70 184 V58 Q70 30 99 30 H158" fill="none" stroke="currentColor" strokeWidth="2" initial={{ pathLength: still ? 1 : 0 }} animate={{ pathLength: 1 }} transition={transition} />}
      {step > 0 && <circle cx="158" cy="30" r="5" fill="currentColor" />}
    </svg>
    {step === 0 && <motion.div className={s.twinWaiting} {...enter}><span aria-hidden="true">＋</span><p>{t('followupHint')}</p></motion.div>}
    <StepSwap still={still}>
      {step > 0 && <motion.div key={step === 1 ? 'conversation' : 'new-source'} className={s.twinFollowup} data-new-source={step === 2} {...enter} exit={{ opacity: 0, y: still ? 0 : -15, transition: { duration: still ? 0 : .18 } }}>
        <div className={s.followupIcon} aria-hidden="true">{step === 1 ? <svg viewBox="0 0 52 44"><path d="M3 3h37v25H20L9 39V28H3Z M14 12h16 M14 19h10" /></svg> : <svg viewBox="0 0 52 44"><path d="M8 3h27l10 10v28H8Z M35 3v11h10 M17 23h19 M17 31h13" /></svg>}</div>
        <span className={s.followupLabel}>{t(step === 1 ? 'followupLabel' : 'transferLabel')}</span>
        <blockquote>{t(step === 1 ? 'followupQuestion' : 'transferQuestion')}</blockquote>
        <p className={s.followupHint}>{t(step === 1 ? 'followupHint' : 'transferHint')}</p>
        {step === 2 && <div className={s.thirdSource}><span>{t('sourceLabel')}</span><i /><i /><i /></div>}
      </motion.div>}
    </StepSwap>
  </>;
  return <>
    <div className={s.blueprint} aria-hidden="true" />
    <h1 className={s.designHeading}>{t('title')}</h1>
    <div className={s.designTask}><span>{t('assignmentLabel')}</span><p>{t('assignmentTitle')}</p></div>
    <div className={s.timeline}><div className={s.rail} /><motion.div className={s.railActive} initial={false} animate={{ width: `${step * 50}%` }} transition={transition} />
      {[1, 2, 3].map((n) => <div key={n} className={s.stop} data-active={step + 1 === n} data-past={step + 1 > n}><span>{n < step + 1 ? '✓' : `0${n}`}</span><p>{t(`phase${n}`)}</p></div>)}
    </div>
    <StepSwap still={still}><motion.div key={step} className={s.decision} {...enter} exit={{ opacity: 0, y: still ? 0 : -15, transition: { duration: still ? 0 : .15 } }}>
      <h2>{t(`decision${step + 1}`)}</h2><blockquote>{t(`instruction${step + 1}`)}</blockquote><p>{t(`result${step + 1}`)}</p>
    </motion.div></StepSwap>
    <p className={s.designNote}>{t('designNote')}</p>
  </>;
}
