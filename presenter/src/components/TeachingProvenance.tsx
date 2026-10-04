"use client";

import { useId, useRef } from "react";
import { PromptSurface } from "./TeachingWorkspace";
import styles from "./TeachingProvenance.module.css";

/** Small shared visual grammar; keep the teaching scene itself free to take its own form. */
export function OriginStamp({ who, label, illustrated = false }: {
  who: "teacher" | "ai" | "material" | "pupils" | "pupil";
  label: string;
  illustrated?: boolean;
}) {
  return <span className={styles.origin} data-who={who}><b aria-hidden>{who === "ai" ? "AI" : who === "material" ? "↳" : who === "pupils" ? "NI" : who === "pupil" ? "JAG" : "DU"}</b><span>{label}</span>{illustrated && <small>Illustrerat</small>}</span>;
}

export function PromptPeek({ prompt, label = "Se uppdraget till AI", note = "Exempelprompt. Svaret i föreläsningen är illustrerat.", actor = "teacher" }: { prompt: string; label?: string; note?: string; actor?: "teacher" | "pupil" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button className={styles.peek} type="button" aria-haspopup="dialog" onKeyDown={event => { if (event.key === " " || event.key === "Enter") event.stopPropagation(); }} onClick={() => dialog.current?.showModal()}><span aria-hidden>{actor === "pupil" ? "JAG" : "DU"} → AI</span>{label}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onKeyDown={event => event.stopPropagation()} onClick={event => {
      const d = dialog.current;
      if (!d || event.target !== d) return;
      const box = d.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) d.close();
    }}>
      <h3 id={titleId}>Uppdraget till AI</h3><PromptSurface className={styles.fullPrompt} pupil={actor === "pupil"} label={actor === "pupil" ? "Elevens prompt" : "Din prompt"}><p className={styles.prompt}>{prompt}</p></PromptSurface><p className={styles.note}>{note}</p>
      <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>Tillbaka till exemplet</button>
    </dialog>
  </>;
}

export const teachingPrompts = {
  planning: "Planera tre lektioner à 40 minuter om att bygga upp och återberätta en berättelse i modersmål åk 4–6. Eleverna har olika läs- och skriverfarenhet; flera uttrycker sig lättare muntligt. Vi har en kort berättelse att läsa och lyssna på. Visa progression, elevernas handlingar och hur jag kan följa deras utveckling.",
  firstLesson: "Utveckla första lektionen i arbetsområdet om berättande texter. Vi har 40 minuter. Visa momenten och föreslå hur tiden ska fördelas. Eleverna ska kunna återberätta så att en lyssnare följer händelserna.",
  instruction: "Bearbeta min instruktion utan att ta bort innehållet eller det eleven ska öva. Dela först upp den i tydliga steg. Bygg sedan en fristående HTML-sida: ett steg i taget, valbara understeg, klartmarkering och en översikt. Lägg inte in svaren på uppgiften.",
  reading: "Bygg en HTML-sida med min originaltext och två språkversioner, ungefär A2 och B1. Behåll resonemanget och undantagen. Lägg till klickbara ord med svensk översättning, enkel förklaring och exempelmening. Lägg till en förståelsefråga med ledtråd. Låt eleven återvända till texten.",
  meaning: "Skriv om texten med enklare språk. Behåll skribentens tanke, villkor och undantag.",
  challenge: "Granska vår stegwebb mot de tre fiktiva behov jag beskriver. Peka ut en exakt formulering eller funktion för varje möjligt hinder. Skilj underlag från antaganden. Föreslå vad jag kan undersöka i min grupp och en liten ändring att pröva.",
  game: "Eleverna spelar ett ordklasspel. Jag vill också att de ska kunna resonera om hur ord fungerar i en mening. Föreslå några möjliga tillägg till undervisningen. Jag väljer det som hjälper mitt mål.",
};
