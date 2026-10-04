import type { CSSProperties, ReactNode } from "react";
import { themes } from "@/themes";
import styles from "./TeachingWorkspace.module.css";

// A neutral working surface stays recognizable when the surrounding slide changes register.
const paper = themes.kobolt;
const palette = {
  "--bg": paper.bg, "--bg-surface": paper.bgSurface, "--bg-elevated": paper.bgElevated,
  "--text": paper.text, "--text-muted": paper.textMuted, "--accent": paper.accent,
} as CSSProperties;

export function TeachingChat({ children, className = "", title = "Din chatt med AI", source = "Illustrerat samtal" }: { children: ReactNode; className?: string; title?: string; source?: string }) {
  return <section className={`${styles.chat} ${className}`} style={{ ...palette, color: paper.text, backgroundColor: paper.bgElevated }} aria-label={`${title}: ${source}`}>
    <header className={styles.chatBar}><span className={styles.chatIcon} aria-hidden>AI</span><strong>{title}</strong><span>{source}</span></header>
    <div className={styles.chatBody}>{children}</div>
  </section>;
}

export function TeachingMessage({ who, children, label, attachment, className = "" }: {
  who: "teacher" | "ai" | "pupil"; children: ReactNode; label?: string; attachment?: string; className?: string;
}) {
  return <div className={`${styles.message} ${className}`} data-author={who === "pupil" ? "teacher" : who} style={palette}>
    <div className={styles.author}><span aria-hidden>{who === "teacher" ? "Du" : who === "pupil" ? "Jag" : "AI"}</span><strong>{label ?? (who === "teacher" ? "Din prompt" : who === "pupil" ? "Elevens meddelande" : "AI:s svar")}</strong></div>
    <div className={styles.bubble}>{attachment && <span className={styles.attachment}><svg viewBox="0 0 18 22" aria-hidden><path d="M2 1h9l5 5v15H2Z M11 1v6h5 M5 11h8 M5 15h8" /></svg>{attachment}</span>}{children}</div>
  </div>;
}

export function ArtifactBrowser({ title, href, children, className = "", address = "Förhandsvisning i föreläsningen", source = "Elevwebb byggd med AI" }: {
  title: string; href?: string; children: ReactNode; className?: string; address?: string; source?: string;
}) {
  return <section className={`${styles.browser} ${className}`} style={{ ...palette, color: paper.text, backgroundColor: paper.bgElevated }} aria-label={`AI-byggd elevwebb: ${title}`}>
    <header className={styles.browserTop}>
      <div className={styles.tab}><svg viewBox="0 0 22 18" aria-hidden><path d="M1 2h20v14H1Z M1 6h20 M4 4h1 M7 4h1" /></svg><strong>{title}</strong></div>
      <span>{source}</span>
    </header>
    <div className={styles.addressBar}>
      <span className={styles.fileIcon} aria-hidden>↳</span><span className={styles.address}>{href ? `Lokal fil / ${href.split("/").pop()}` : address}</span>
      {href && <><a href={href} target="_blank" rel="noreferrer" aria-label="Öppna hela elevstödet i en ny flik">Öppna <span aria-hidden>↗</span></a>
      <a href={href} download aria-label="Ladda ned hela elevstödet som HTML-fil">Ladda ned <span aria-hidden>↓</span></a></>}
    </div>
    <div className={styles.browserPage}>{children}</div>
  </section>;
}

/** A magnified part of a conversation; children retain the scene's own composition. */
export function PromptSurface({ children, className = "", label = "Din prompt", pupil = false }: { children: ReactNode; className?: string; label?: string; pupil?: boolean }) {
  return <div className={`${styles.promptSurface} ${className}`} data-teaching-surface="prompt" style={{ ...palette, backgroundColor: paper.accent, color: paper.bgElevated }}>
    <header className={styles.surfaceAuthor}><strong>{label}</strong><span>{pupil ? "Jag" : "Du"}</span></header>{children}
  </div>;
}

export function ChatReply({ children, className = "", label = "AI:s svar", source = "Illustrerat chattutdrag" }: { children?: ReactNode; className?: string; label?: string; source?: string }) {
  return <div className={`${styles.replySurface} ${className}`} data-teaching-surface="reply" style={{ ...palette, backgroundColor: paper.bgElevated, color: paper.text }}>
    <header className={styles.replyBar}><span>AI</span><strong>{label}</strong><small>{source}</small></header>{children}
  </div>;
}

export function ArtifactPlayer({ children, className = "", title, source }: { children: ReactNode; className?: string; title: string; source: string }) {
  return <section className={`${styles.player} ${className}`} data-teaching-surface="player" style={{ ...palette, color: paper.text, backgroundColor: paper.bgElevated }} aria-label={`${title}: ${source}`}>
    <header className={styles.playerBar}><span aria-hidden>▶</span><strong>{title}</strong><small>{source}</small></header><div className={styles.playerBody}>{children}</div>
  </section>;
}
