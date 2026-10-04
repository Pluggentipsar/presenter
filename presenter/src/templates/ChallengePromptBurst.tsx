"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";
import styles from "./ChallengePromptBurst.module.css";

/** Presenter-paced prompts turn agreement into a challenge, then return judgment to the pupil. */
export function ChallengePromptBurst({
  title = "Håll inte|bara med.",
  image = "",
  perspective = "Vilka perspektiv|missar jag?",
  disagreement = "Vad skulle någon|som inte håller|med mig säga?",
  assumptions = "Vilka antaganden|bygger jag på?",
  counterexample = "Hitta ett|motexempel.",
  premortem = "Gör en pre-mortem|på min plan.",
  premortemExample = "Tänk att vår klassutflykt blev misslyckad. Vad kan ha gått fel?",
  question = "Ställ en fråga|som utmanar|mitt resonemang.",
  ending = "AI utmanar.|Jag avgör.",
  takeaway = "Välj en invändning. Undersök den. Motivera vad du ändrar eller behåller.",
  openingLabel = "Lär eleverna att utmana sig själva.",
  runningLabel = "Vänd AI:n mot sig själv.",
}: {
  title?: string; image?: string; perspective?: string; disagreement?: string;
  assumptions?: string; counterexample?: string; premortem?: string;
  premortemExample?: string; question?: string; ending?: string; takeaway?: string;
  openingLabel?: string; runningLabel?: string;
}) {
  const prompts = [
    { path: "perspective", value: perspective, label: "Perspektiv", tilt: -2 },
    { path: "disagreement", value: disagreement, label: "Invändningar", tilt: 1.4 },
    { path: "assumptions", value: assumptions, label: "Antaganden", tilt: -1.3 },
    { path: "counterexample", value: counterexample, label: "Motexempel", tilt: 2 },
    { path: "premortem", value: premortem, label: "Pre-mortem", tilt: -1.8 },
    { path: "question", value: question, label: "Följdfrågor", tilt: 1 },
  ];
  const step = Math.min(useSlideSteps(prompts.length + 2), prompts.length + 1);
  const reduced = useReducedMotion();
  const prompt = step > 0 && step <= prompts.length ? prompts[step - 1] : null;
  const isEnding = step === prompts.length + 1;
  const duration = reduced ? 0 : .3;

  return <section className={styles.canvas} aria-label="Vänd AI:n mot sig själv" data-step={step}>
    {image && <motion.img className={styles.mask} src={image} alt="" aria-hidden initial={false}
      animate={{ right: prompt ? "-6%" : isEnding ? "-11%" : "-2%", rotate: prompt ? 12 : isEnding ? 22 : -9, opacity: isEnding ? .23 : 1 }}
      transition={{ duration }} />}
    <div className={styles.persistentLabel}>{step === 0 ? openingLabel : runningLabel}</div>
    <div className={styles.stage} aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {step === 0 && <motion.div key="opening" className={styles.opening}
          initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: reduced ? 0 : -80 }} transition={{ duration }}>
          <h2><EditableText path="title" value={title}>{title.split("|").map(line => <span key={line}>{line}</span>)}</EditableText></h2>
          <svg className={styles.turnArrow} viewBox="0 0 350 180" aria-hidden><path d="M10 30 H220 C335 30 335 147 220 147 H48 M101 94 L48 147 L101 200" transform="translate(0 -15)" fill="none" stroke="currentColor" strokeWidth="20" strokeLinejoin="miter" /></svg>
          <p>Låt AI spela djävulens advokat.</p>
        </motion.div>}
        {prompt && <motion.div key={prompt.path} data-prompt={prompt.path} className={`${styles.poster} ${step % 2 === 0 ? styles.ink : styles.paper}`}
          initial={reduced ? false : { y: "100%", rotate: prompt.tilt + 5, opacity: 0 }}
          animate={{ y: 0, rotate: prompt.tilt, opacity: 1 }}
          exit={{ y: reduced ? 0 : "-18%", rotate: reduced ? prompt.tilt : prompt.tilt - 3, opacity: 0 }}
          transition={{ duration, ease: [.22, 1, .36, 1] }}>
          <span className={styles.promptNumber} aria-label={`Fråga ${step} av ${prompts.length}`}>{String(step).padStart(2, "0")}<small> / {String(prompts.length).padStart(2, "0")}</small></span>
          <h2 className={styles.promptText}><EditableText path={prompt.path} value={prompt.value}>{prompt.value.split("|").map(line => <span key={line}>{line}</span>)}</EditableText></h2>
          {prompt.path === "premortem" && <p className={styles.example}><EditableText path="premortemExample" value={premortemExample}>{premortemExample}</EditableText></p>}
        </motion.div>}
        {isEnding && <motion.div key="ending" className={styles.ending}
          initial={reduced ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration }}>
          <h2><EditableText path="ending" value={ending}>{ending.split("|").map(line => <span key={line}>{line}</span>)}</EditableText></h2>
          <p><EditableText path="takeaway" value={takeaway}>{takeaway}</EditableText></p>
        </motion.div>}
      </AnimatePresence>
    </div>
    <div className={styles.trail} aria-hidden>{prompts.map((item, i) => <span key={item.path} data-current={step === i + 1} data-seen={step > i}>{item.label}</span>)}</div>
    <p className={styles.footer}>{isEnding ? "En invändning är något att pröva. Den kan också vara fel." : "Börja med din egen tanke, tolkning eller plan."}</p>
  </section>;
}
