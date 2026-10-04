"use client";

import { useEffect, useState } from "react";
import { useIsPresent, useReducedMotion } from "framer-motion";
import s from "./prompt-typewriter.module.css";
import { useInlineEdit } from "@/lib/inline-edit";

/** Types within one manual step. It never advances the slide or reveals an answer. */
export function PromptTypewriter({ text, still, complete = false, delay = 350 }: {
  text: string;
  still: boolean;
  complete?: boolean;
  delay?: number;
}) {
  const [count, setCount] = useState(0);
  const present = useIsPresent();
  const reduced = useReducedMotion();
  const { editMode } = useInlineEdit();
  const instant = still || reduced || complete || !present || editMode;
  const letters = Array.from(text);
  const typing = !instant && count < letters.length;

  useEffect(() => {
    if (instant) return;
    const characters = Array.from(text);
    let next = 0;
    let timer: ReturnType<typeof setTimeout>;
    const type = () => {
      next += 1;
      setCount(next);
      if (next < characters.length) {
        const pause = /[.!?]/.test(characters[next - 1]) ? 210 : 38;
        timer = setTimeout(type, pause);
      }
    };
    timer = setTimeout(type, delay);
    return () => clearTimeout(timer);
  }, [text, instant, delay]);

  return <span className={s.typewriter} data-prompt-typing={typing ? "running" : "complete"}>
    {/* Reserve the full bubble height; assistive technology reads one complete message. */}
    <span className={s.reserve} aria-hidden="true">{text}</span>
    <span className={s.accessible}>{text}</span>
    <span className={s.visible} aria-hidden="true" data-typed-prompt data-writing={typing}>
      {instant ? text : letters.slice(0, count).join("")}
    </span>
  </span>;
}
