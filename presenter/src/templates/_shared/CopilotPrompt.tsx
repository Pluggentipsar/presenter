"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import styles from "./CopilotPrompt.module.css";

type Props = { text: string; compact?: boolean; label?: string };

/** A presentation-sized composer based on the observed Copilot UI, not a live chat. */
export function CopilotPrompt({ text, compact = false, label = "Förberett uppdrag" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy(button: HTMLButtonElement) {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      // Also supports local/insecure presentation hosts and clipboard API denial.
      const previousFocus = document.activeElement as HTMLElement | null;
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("aria-label", "Prompt för kopiering");
      field.style.cssText = "position:fixed;left:0;top:0;opacity:0;width:1px;height:1px";
      document.body.appendChild(field);
      try { field.focus(); field.select(); copied = document.execCommand("copy"); }
      catch { copied = false; }
      finally { field.remove(); previousFocus?.focus({ preventScroll: true }); }
    }
    setStatus(copied ? "copied" : "error");
    // A clicker using Space should advance after copying, not activate the button again.
    if (document.activeElement === button) root.current?.focus({ preventScroll: true });
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    // Keep native keyboard activation; stop the presentation's Space/Enter handler.
    if (event.key === " " || event.key === "Enter") event.stopPropagation();
  }

  return <div ref={root} tabIndex={-1} className={`${styles.root} ${compact ? styles.compact : ""}`} data-copilot-prompt>
    <div className={styles.header}><span>Copilot</span><span>{label}</span></div>
    <div className={styles.composer}>
      <p className={styles.text} data-prompt-text>{text}</p>
      <div className={styles.tools}>
        <span className={styles.context}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg><span>Ta med underlaget i Copilot</span></span>
        <button type="button" className={styles.copy} onClick={event => { event.stopPropagation(); void copy(event.currentTarget); }} onKeyDown={handleKey} aria-label="Kopiera prompt">
          <svg viewBox="0 0 24 24" aria-hidden="true">{status === "copied" ? <path d="m5 12 4 4L19 6" /> : <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>}</svg>
          <span>{status === "copied" ? "Kopierad" : "Kopiera prompt"}</span>
        </button>
      </div>
    </div>
    <div className={styles.status} role="status" aria-live="polite">{status === "copied" ? "Klistra in i Copilot." : status === "error" ? "Kopieringen blockerades. Markera prompttexten och tryck Ctrl+C." : ""}</div>
  </div>;
}
