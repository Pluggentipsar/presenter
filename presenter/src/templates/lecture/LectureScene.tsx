"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { EditableText } from '@/lib/inline-edit';
import { Film } from '../shared/Film';
import { useLectureSteps } from '../shared/lecture-steps';
import { PromptTypewriter } from '../shared/PromptTypewriter';
import { fieldText, itemKeys, lectureStepCount, type LectureProps } from './scene-model';
import { SceneMaterial, ProcessMark } from './SceneMaterial';
import { FinishScene, finishLayouts } from './FinishScenes';
import { SceneExit, sceneTransition, sceneMotionMode } from '../shared/SceneMotion';
import { AmbientGradient } from '../shared/AmbientGradient';
import { KineticWords } from './KineticWords';
import { PlanningRoom } from './PlanningRoom';
import { PlanningPrinciples } from './PlanningPrinciples';
import { OpeningScene, openingCompositions } from './OpeningScenes';
import { TeachingScene, teachingCompositions } from './TeachingScenes';
import { LearningScene, learningCompositions } from './LearningScenes';
import { PerspectiveScene, perspectiveCompositions } from './PerspectiveScenes';
import { PrivacyJourney } from './PrivacyJourney';
import { DictationScene } from './DictationScene';
import { GamePitch } from './GamePitch';
import { MaterialJourney } from './MaterialJourney';
import { ResearchLearningScene } from './ResearchLearningScenes';
import { LearningChoices } from './LearningChoices';
import { TeachingDesign } from './TeachingDesign';
import { ProcessDesignScene } from './ProcessDesignScenes';
import { AssessmentScene } from './AssessmentScenes';
import { assessmentSteps } from './assessment-model';
import { VoiceWave } from '../shared/VoiceWave';
import s from './lecture.module.css';

/** One renderer in presentation and R editor. All lecture copy lives in MDX props. */
export function LectureScene(props: LectureProps) {
  const count = lectureStepCount(props);
  const continuityId = useId();
  const { step, still, backward } = useLectureSteps(count);
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el=host.current; if(!el) return;
    const observer=new ResizeObserver(([entry])=>setScale(Math.min(entry.contentRect.width/1280,entry.contentRect.height/720)));
    observer.observe(el); return ()=>observer.disconnect();
  }, []);
  const v=(key:string)=>fieldText(props,key);
  const emphasis=v('emphasisWords').split('|').filter(Boolean);
  const emphasized=(text:string):ReactNode=>{
    if(!emphasis.length)return text;
    const word=emphasis.find(w=>text.includes(w));
    if(!word)return text;
    const i=text.indexOf(word);
    return <>{emphasized(text.slice(0,i))}<mark className={s.emphasis} data-accent={v('emphasisRole')||'human'}>{word}</mark>{emphasized(text.slice(i+word.length))}</>;
  };
  const t=(key:string)=> <EditableText path={key} value={v(key)} multiline neutralWrapper><span className={s.copy}>{emphasized(v(key).replace(/\*\*/g,''))}</span></EditableText>;
  // These replaceable assets deliberately keep their original paths in R mode.
  // eslint-disable-next-line @next/next/no-img-element
  const img=(key:string,cls:string)=>v(key)?<img src={v(key)} alt={v(`${key}Alt`)} className={cls}/>:null;
  const layout=v('layout')||'poster';
  const motionMode=sceneMotionMode(props.sceneMotion);
  const transition=sceneTransition(still,props.tempo==='nedslag');
  const enter={initial:still || (step===0&&motionMode!=='default')?false as const:{opacity:0,y:18},animate:{opacity:1,y:0},transition};
  const groupSize=Math.max(1,Number(props.groupSize)||1);
  const items=itemKeys(props);
  const prompt=(key='prompt',full=false)=>{
    const shownKey=!full&&key==='prompt'&&v('promptExcerpt')?'promptExcerpt':key;
    return <div className={s.prompt} data-chat-prompt data-length={v(shownKey).length>900?'long':v(shownKey).length>620?'medium':v(shownKey).length>350?'compact':'short'}>
    <div className={s.sender}><span aria-hidden="true" className={s.chatIcon}>↗</span>{t('promptLabel')}</div>
    <div className={s.promptText}><EditableText path={shownKey} value={v(shownKey)} multiline neutralWrapper>{props.typePrompt==='ja'?<PromptTypewriter text={v(shownKey)} still={still} complete={key==='prompt'&&step>0}/>:<span className={s.copy}>{v(shownKey).split('\n\n').map((part,i)=><span className={s.promptParagraph} key={i}>{part}</span>)}</span>}</EditableText></div>
    <div className={s.promptBottom}><span>{shownKey==='promptExcerpt'?'Utdrag ur prompten':''}</span><i aria-hidden="true">↑</i></div>
  </div>};
  const fullPrompt=()=>v('promptExcerpt')&&<details className={s.fullPrompt} key={`full-${step}`} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.stopPropagation();} if(e.key==='Enter'||e.key===' ')e.stopPropagation();}}><summary>Hela prompten</summary><div className={s.fullPromptPanel}><div className={s.fullPromptScroll}>{prompt('prompt',true)}</div>{v('materialsUrl')&&<a className={s.materialsLink} href={v('materialsUrl')} target="_blank" rel="noreferrer">Samtliga prompter från passet ↗</a>}</div></details>;
  const material=()=> <SceneMaterial props={props} still={still}/>;
  const film=()=> <Film src={v('videoSrc')} poster={v('poster')} backward={backward} audio={props.audio==='ja'} silent={props.sound==='av'}/>;
  const heading=()=>v('title')&&<h1 className={s.heading} data-critical>{t('title')}</h1>;
  const number=(n:number)=>String(n).padStart(2,'0');
  const voltage=Math.max(.1,Number(step?v('voltageAfter'):v('voltage'))||6);
  const resistance=Math.max(.1,Number(v('resistance'))||3);
  const current=voltage/resistance;
  let content:ReactNode;

  if(assessmentSteps[v('composition')]) content=<AssessmentScene step={step} still={still} t={t} v={v} img={img}/>;
  else if(['source-design','product-process','epa-insertion'].includes(v('composition'))) content=<ProcessDesignScene step={step} still={still} t={t} v={v} prompt={prompt} img={img}/>;
  else if(['pedagogical-responsibility','teaching-design'].includes(v('composition'))) content=<TeachingDesign step={step} still={still} t={t} v={v} prompt={prompt}/>;
  else if(['two-voices','knowledge-filter','who-when-how','ai-doping'].includes(v('composition'))) content=<LearningChoices step={step} still={still} t={t} v={v}/>;
  else if(['research-overview','automation-shortcut'].includes(v('composition'))) content=<ResearchLearningScene step={step} still={still} t={t} v={v}/>;
  else if(v('composition')==='material-journey') content=<MaterialJourney step={step} still={still} backward={backward} t={t} v={v} prompt={prompt}/>;
  else if(v('composition')==='privacy-journey') content=<PrivacyJourney step={step} still={still} t={t} v={v}/>;
  else if(v('composition')==='dictation-value') content=<DictationScene step={step} still={still} backward={backward} t={t} v={v}/>;
  else if(v('composition')==='game-pitch') content=<GamePitch step={step} still={still} backward={backward} t={t} v={v} prompt={prompt}/>;
  else if(perspectiveCompositions.includes(v('composition'))) content=<PerspectiveScene step={step} still={still} t={t} v={v} prompt={prompt}/>;
  else if(learningCompositions.includes(v('composition'))) content=<LearningScene step={step} still={still} backward={backward} t={t} v={v} prompt={prompt} fullPrompt={fullPrompt}/>;
  else if(teachingCompositions.includes(v('composition'))) content=<TeachingScene step={step} still={still} backward={backward} t={t} v={v} prompt={prompt}/>;
  else if(openingCompositions.includes(v('composition'))) content=<OpeningScene step={step} still={still} backward={backward} t={t} v={v} prompt={prompt}/>;
  else if(v('spatialStory')==='principles') content=<PlanningPrinciples step={step} still={still} t={t} v={v} fullPrompt={fullPrompt}/>;
  else if(v('spatialStory')==='planning') content=<PlanningRoom step={step} still={still} t={t} v={v} img={img} prompt={prompt} fullPrompt={fullPrompt}/>;
  else if(finishLayouts.includes(layout)) content=<FinishScene props={props} step={step} still={still} t={t} v={v} img={img}/>;
  else if(layout==='word-turn'||layout==='word-return') content=<KineticWords mode={layout==='word-turn'?'turn':'handoff'} step={step} still={still} t={t} v={v}/>;
  else switch(layout) {
    case 'bus': content=<>
      <motion.blockquote initial={false} className={s.busQuote} animate={{width:step>0?640:1120,fontSize:step>0?(v('title').length>130?43:52):65,y:step>0?-15:0}} transition={transition}><p data-critical>{t('title')}</p></motion.blockquote>
      <div className={s.busRoute}><span>{t('number')}</span><div>{Array.from({length:6},(_,i)=><i key={i} data-active={i+1===Number(v('number'))}/>)}</div><motion.div initial={still?false:{x:Math.max(0,Number(v('number'))-2)*46}} animate={{x:(Number(v('number'))-1)*46}} transition={transition}>{img('busImage',s.busMini)}</motion.div></div>
      {step>0&&<motion.div className={s.busPhone} data-dense={v('response').split('\n').length>3} initial={still?false:{x:360,rotate:8,opacity:0}} animate={{x:0,rotate:0,opacity:1}} transition={transition}>
        <div className={s.phoneSpeaker}/><div className={s.phoneHeading}><span aria-hidden="true">‹</span>{t('phoneTitle')}<span aria-hidden="true">···</span></div>
        <div className={s.phoneUser} data-chat-prompt><small>{t('promptLabel')}</small><p>{t('prompt')}</p></div>
        {step>1&&<motion.div {...enter} className={s.phoneAnswer} data-chat-answer><small>{t('responseLabel')}<VoiceWave /></small><p>{t('response')}</p></motion.div>}
        <div className={s.phoneComposer} aria-hidden="true">＋<span/>↑</div>
      </motion.div>}
      {step>0&&<p className={s.phoneCaption}>{t('phoneLabel')}</p>}
    </>;break;
    case 'poster': content=<>
      {img('image',s.posterObject)}
      {v('composition')==='chapter'&&<div className={s.chapterSlab} aria-hidden="true"/>}
      <motion.div key={step} {...enter} className={s.posterCopy} data-object={Boolean(v('image'))} data-length={v(step?'after':'title').length>90?'long':v(step?'after':'title').length>55?'medium':'short'}>
        {step>0&&<p className={s.precedent}>{t('title')}</p>}
        <h1 data-critical>{t(step?'after':'title')}</h1>
        {v('subtitle')&&<p className={s.subtitle}>{t('subtitle')}</p>}
      </motion.div>
    </>;break;
    case 'portrait': content=<>
      <div className={s.portraitHalo}/>{img('image',s.portrait)}
      <motion.div {...enter} className={s.portraitCopy} data-long={v('title').length>24}><h1 data-critical>{t('title')}</h1><p>{t('subtitle')}</p></motion.div>
    </>;break;
    case 'quote': content=<>
      {img('image',s.quotePortrait)}
      <motion.blockquote {...enter} className={s.quote} data-image={Boolean(v('image'))} data-long={v('title').length>170}><span className={s.quoteMark} aria-hidden="true">“</span><p data-critical>{t('title')}</p></motion.blockquote>
      {v('number')&&<div className={s.voiceIndex}><span>{t('number')}</span><div>{Array.from({length:6},(_,i)=><i key={i} data-active={i+1===Number(v('number'))}/>)}</div></div>}
      {v('subtitle')&&<p className={s.quoteAttribution}>{t('subtitle')}</p>}
    </>;break;
    case 'chat': content=<>
      {heading()}
      <LayoutGroup><motion.div layout className={s.chatWorkspace} data-title={Boolean(v('title'))} data-followup={step>0} data-outcome={step===count-1&&Boolean(v('outcome'))} transition={transition}>
        <motion.div layout className={s.contextColumn} animate={{opacity:step>0?.34:1,scale:step>0?.93:1}} transition={transition}>{material()}</motion.div>
        <motion.div layout className={s.conversationColumn} transition={transition}>
          {step===0?<motion.div key="prompt" initial={still||motionMode!=='default'?false:{opacity:0,x:45,rotate:1}} animate={{opacity:1,x:0,rotate:0}} transition={transition}>{prompt()}</motion.div>:
          props.fullPromptStep==='ja'&&step===1?<div className={s.fullManual}>{prompt('prompt',true)}</div>:
          <><div className={s.promptMemory}>{t(v('promptExcerpt')?'promptExcerpt':'prompt')}</div>
            <AnimatePresence mode="wait" initial={false}>{step===count-1&&v('outcome')?<motion.div key="outcome" {...enter} className={s.outcome}><p>{t('outcome')}</p></motion.div>:
            <motion.div key="response" {...enter} className={s.responseStage}>{v('response')?<div className={s.response} data-chat-answer><div className={s.sender}><span className={s.aiMark}>AI</span>{t('responseLabel')}<VoiceWave /></div><div data-critical>{t('response')}</div></div>:v('videoSrc')?film():img('image2',s.resultImage)}</motion.div>}</AnimatePresence>
          </>}
        </motion.div>
      </motion.div></LayoutGroup>{fullPrompt()}
    </>;break;
    case 'compare': content=<>
      {heading()}<div className={s.compare} data-step={step}>
        <motion.div className={s.comparisonSide} animate={{opacity:step===0?1:.58,scale:step===0?1:.97}} transition={transition}>{img('image',s.compareImage)}{prompt()}</motion.div>
        {step>0&&<motion.div {...enter} className={s.comparisonSide}>{img('image2',s.compareImage)}{prompt('prompt2')}</motion.div>}
      </div>{step>1&&<motion.p {...enter} className={s.compareOutcome}>{t('outcome')}</motion.p>}
    </>;break;
    case 'corners':content=<>{heading()}{v('discussionLabel')&&<div className={s.discussionBadge}><svg viewBox="0 0 80 65" aria-hidden="true"><path d="M4 4h47v31H23L10 45V35H4Z"/><path d="M31 41v9h23l15 11V50h6V20H59"/><path d="M15 16h25M15 24h16"/></svg><span>{t('discussionLabel')}</span></div>}<div className={s.corners}>{items.map((key,i)=><div key={key}><span>{number(i+1)}</span><h2>{t(key)}</h2></div>)}</div></>;break;
    case 'film':content=<>
      {heading()}{step===0&&v('prompt')?<><div className={s.chatWorkspace} data-title={Boolean(v('title'))}><div className={s.contextColumn}>{material()}</div><div className={s.conversationColumn}>{prompt()}</div></div>{fullPrompt()}</>:<motion.div className={s.filmFrame} initial={still?false:{clipPath:'inset(8% 8% 8% 8% round 28px)',opacity:0}} animate={{clipPath:'inset(0% 0% 0% 0% round 14px)',opacity:1}} transition={transition}>{film()}</motion.div>}
      {v('mediaNote')&&<p className={s.mediaNote}>{t('mediaNote')}</p>}
    </>;break;
    case 'document':content=<>
      {heading()}<motion.div className={s.document} data-dense={v('body').length>1000} data-focus={step>0} animate={{x:step>0?-175:0,scale:step>0?.9:1}} transition={transition}>
        <div className={s.documentToolbar}><span aria-hidden="true">▤</span>{t('documentTitle')}<span aria-hidden="true">···</span></div>
        <h2>{t('subtitle')}</h2><p data-critical>{t('body')}</p>
        {v('word')&&<div className={s.wordUnderline}>{t('word')} <span aria-hidden="true">↗</span></div>}
      </motion.div>
      {step===1&&<motion.div {...enter} className={s.wordModal}><span className={s.modalCorner} aria-hidden="true">×</span><h2>{t('word')}</h2><p>{t('definition')}</p><p lang="ar" dir="auto" className={s.translation}>{t('translation')}</p></motion.div>}
      {step===2&&<motion.div {...enter} className={s.wordModal}><h2>{t('question')}</h2><div className={s.quizChoice}>{t('choice1')}</div><div className={s.quizChoice}>{t('choice2')}</div></motion.div>}
    </>;break;
    case 'steps':content=<>
      {heading()}{img('image',s.stepObject)}
      <div className={s.stepHistory}>{items.slice(0,step*groupSize).map(key=><span key={key}>{t(key)}</span>)}</div>
      <AnimatePresence mode="wait" initial={false}><motion.div initial={still?false:{opacity:0,y:60}} animate={{opacity:1,y:0}} transition={transition} key={step} exit={{opacity:0,y:-45,transition}} data-content-step={step} className={s.steps} data-group={groupSize} data-image={Boolean(v('image'))}>
        {items.slice(step*groupSize,(step+1)*groupSize).map(key=><div key={key} className={s.stepItem}><span className={s.stepRule}/><div><h2 data-critical data-long={v(key).length>90}>{t(key)}</h2>{v(key.replace('item','detail'))&&<p>{t(key.replace('item','detail'))}</p>}</div></div>)}
      </motion.div></AnimatePresence><div className={s.stepTrack} aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i} data-active={i===step}/>)}</div>
    </>;break;
    case 'flow':content=<>
      {heading()}{v('subtitle')&&<p className={s.flowSubtitle}>{t('subtitle')}</p>}
      {props.reveal==='allt'?<div className={s.processOverview} data-items={items.length}>{items.map((key,i)=><div key={key} data-role={v(`role${i+1}`)||'human'}><ProcessMark kind={v(`motif${i+1}`)}/><h2>{t(key)}</h2><p>{t(`detail${i+1}`)}</p>{i<items.length-1&&<span className={s.flowArrow} aria-hidden="true">→</span>}</div>)}</div>:
        <div className={s.journey}>
          <div className={s.journeyRail}>{items.map((key,i)=><div key={key} data-state={i===step?'active':i<step?'past':'future'} data-role={v(`role${i+1}`)||'human'}><span>{i<step?'✓':number(i+1)}</span>{i<=step?<p>{t(key)}</p>:<i aria-hidden="true"/>}</div>)}</div>
          <AnimatePresence mode="wait" initial={false}><motion.div className={s.journeyFocus} data-content-step={step} key={step} initial={still?false:{x:50,opacity:0}} animate={{x:0,opacity:1}} exit={{x:-30,opacity:0,transition}} transition={transition} data-role={v(`role${step+1}`)||'human'} data-image={Boolean(v(`stepImage${step+1}`))}>
            <div className={s.journeyArt}>{v(`stepImage${step+1}`)?img(`stepImage${step+1}`,s.fullImage):<ProcessMark kind={v(`motif${step+1}`)}/>}</div>
            <div className={s.journeyWords}><h2 data-critical>{t(items[step])}</h2>{v(`detail${step+1}`)&&<p>{t(`detail${step+1}`)}</p>}</div>
          </motion.div></AnimatePresence>
        </div>}
    </>;break;
    case 'research':content=<>
      <div className={s.researchField} aria-hidden="true">{Array.from({length:23},(_,i)=><motion.div key={i} style={{'--i':i} as CSSProperties} animate={still?undefined:{rotate:[-14,14,-14]}} transition={{duration:14+i/2,repeat:Infinity,ease:'easeInOut'}}/>)}</div>
      {step>0&&<motion.div className={s.researchAgents} aria-hidden="true" initial={still?false:{opacity:0,rotateY:25}} animate={{opacity:step===1?.7:.22,rotateY:0}} transition={transition}><div/></motion.div>}
      {step===0?<motion.div {...enter} className={s.researchTitle}><h1>{t('title')}</h1><p>{t('subtitle')}</p></motion.div>:<motion.div key={step} {...enter} className={s.stat}><strong>{t(step===1?'value1':'value2')}</strong><h2>{t(step===1?'caption1':'caption2')}</h2><p>{t(step===1?'detail1':'detail2')}</p></motion.div>}
    </>;break;
    case 'puzzle':content=<>
      {step>0&&<motion.div className={s.puzzleArt} initial={still?false:{x:130,opacity:0}} animate={{x:0,opacity:1}} transition={transition}>{img('image',s.fullImage)}</motion.div>}
      <motion.h1 {...enter} className={s.puzzleTitle}>{t(step&&v('after')?'after':'title')}</motion.h1>
    </>;break;
    case 'circuit':content=<>
      {heading()}<div className={s.circuit}>
        <svg viewBox="0 0 760 380" aria-hidden="true"><path className={s.wire} d="M110 150V65H640V290H110V220"/><path className={s.battery} d="M68 150h84m-65 24h46m-65 23h84m-65 23h46"/><rect className={s.resistor} x="360" y="45" width="125" height="40" rx="4"/>{Array.from({length:13},(_,i)=><circle key={i} r="5" className={s.currentDot} style={{offsetPath:'path("M110 150V65H640V290H110V220")',animationDelay:`-${i*1.7}s`,animationDuration:`${20/current}s`,animationPlayState:still?'paused':'running'}}/>)}</svg>
        <strong className={s.voltage}>{voltage} V</strong><strong className={s.resistance}>{resistance} Ω</strong><div className={s.amps} key={step}><motion.strong {...enter}>{new Intl.NumberFormat('sv-SE',{maximumFractionDigits:2}).format(current)} A</motion.strong><span>I = U / R</span></div>
      </div><p className={s.circuitQuestion}>{t('question')}</p><p className={s.modelNote}>{t('modelNote')}</p>
    </>;break;
    case 'gallery':content=<>
      {heading()}{v('prompt')&&step===0?<><div className={s.chatWorkspace}><div className={s.contextColumn}><SceneMaterial props={{...props,image:'',imageAlt:''}} still={still}/></div><div className={s.conversationColumn}>{prompt()}</div></div>{fullPrompt()}</>:<motion.div initial={still?false:{scale:1.06,opacity:0}} animate={{scale:1,opacity:1}} transition={transition} className={s.gallery} data-pair={Boolean(v('image2'))}>{img('image',s.galleryImage)}{img('image2',s.galleryImage)}</motion.div>}
      {v('subtitle')&&<p className={s.galleryCaption}>{t('subtitle')}</p>}
    </>;break;
    case 'study':content=<>
      {heading()}<div className={s.studyProtocol}>{[1,2,3].map((n)=><div key={n} data-active={n===step+1} data-past={n<step+1}><span>{number(n)}</span>{n<=step+1&&<p>{t(`phase${n}`)}</p>}</div>)}</div>
      <motion.div key={step} initial={still?false:{opacity:0,x:40}} animate={{opacity:1,x:0}} transition={transition} className={s.studyContent}><ProcessMark kind={step===0?'people':step===1?'paper':'question'}/><div><h2>{t(`phase${step+1}`)}</h2><p>{t(`detail${step+1}`)}</p></div></motion.div>
    </>;break;
    case 'story':content=<>
      {heading()}{img('image',s.storyImage)}<div className={s.storyTimeline} aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i} data-active={i===step}/>)}</div><motion.div {...enter} key={step} className={s.story} data-final={step===items.length} data-image={Boolean(v('image'))}><p data-critical>{t(step===items.length?'question':items[step])}</p></motion.div>
    </>;break;
    case 'lever':content=<>
      {heading()}<div className={s.lever}><div className={s.fulcrum}/><motion.div className={s.beam} animate={{rotate:step?-10:8}} transition={transition}><span>{t('leftLabel')}</span><span>{t('rightLabel')}</span></motion.div></div><p className={s.leverCaption}>{t('subtitle')}</p>
    </>;break;
    case 'horizon':content=<>
      {heading()}{step===0?<div className={s.horizonImage}>{img('image',s.fullImage)}</div>:<motion.div {...enter} className={s.horizonReading}><h2>{t('detail1')}</h2><p>{t('detail2')}</p></motion.div>}
    </>;break;
  }
  return <div ref={host} className={s.viewport} data-continuity-id={continuityId} data-lecture-scene={v('scene')} data-lecture-step={step} data-lecture-count={count}>
    <div style={{position:'relative',width:1280*scale,height:720*scale}}><section className={s.stage} data-layout={layout} data-tone={v('tone')||'paper'} data-still={still} data-image={Boolean(v('background'))} data-composition={v('composition')} data-role={v('role')||'human'} data-visual={v('visual')} data-step={step} data-tall-heading={v('title').includes('\n\n')} style={{transform:`scale(${scale})`}}>
      {v('background')&&<div className={s.background}>{img('background',s.fullImage)}{v('backgroundVideo')&&<Film src={v('backgroundVideo')} poster={v('background')} backward={backward} decorative silent/>}<div className={s.veil}/></div>}
      {['flow','quiet'].includes(v('ambient'))&&<AmbientGradient still={still} quiet={v('ambient')==='quiet'}/>}
      <header className={s.top}>{t('label')}</header>
      {v('processLabels')&&<nav className={s.chapterTrail} aria-label="Exemplets delsteg">{v('processLabels').split('|').map((part,i)=><span key={i} data-state={i===Number(v('processStep'))?'active':i<Number(v('processStep'))?'past':'future'}><i aria-hidden="true"/>{part}</span>)}</nav>}
      <SceneExit still={still} mode={motionMode} axis={['document','steps','focus','study','evidence'].includes(layout)?'y':'x'}>{content}</SceneExit>
      <footer className={s.footer}>{v('sourceUrl')?<a href={v('sourceUrl')} target="_blank" rel="noreferrer">{t('credit')}</a>:t('credit')}</footer>
    </section></div>
  </div>;
}
