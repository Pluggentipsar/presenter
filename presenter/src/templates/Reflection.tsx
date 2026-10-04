"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useSlideSteps } from "@/lib/slide-steps";
import styles from "./WorkshopSupport.module.css";

type Size = "sm" | "md" | "lg" | "xl";

interface ReflectionProps {
  /** Rubrik */
  title?: string;
  /** Tag ovanför (tex "REFLEKTION" eller "SAMTALSFRÅGOR") */
  tag?: string;
  /** Hur många minuter som är avsatta */
  duration?: string;
  /** Storlek på huvudrubriken. Default md. */
  titleSize?: Size;
  /** Storlek på frågorna. Default md. */
  questionSize?: Size;
  /** Synliga ingångar till bordsarbetet, separerade med |. */
  examples?: string;
  supportTitle?: string;
  supportHint?: string;
  /** Meningsstarter separerade med |. */
  starter?: string;
  supportExample?: string;
  children?: ReactNode;
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(1.5rem, 3.5vw, 2.5rem)",
  md: "clamp(2rem, 5vw, 3.5rem)",
  lg: "clamp(2.75rem, 6.5vw, 5rem)",
  xl: "clamp(3.5rem, 8vw, 6.5rem)",
};

const QUESTION_SIZES: Record<Size, string> = {
  sm: "clamp(1rem, 2vw, 1.375rem)",
  md: "clamp(1.25rem, 2.75vw, 2rem)",
  lg: "clamp(1.75rem, 3.75vw, 2.75rem)",
  xl: "clamp(2.25rem, 4.75vw, 3.5rem)",
};

function extractQuestions(children: ReactNode): ReactNode[] {
  const questions: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ children?: ReactNode }>;
    const type = element.type;
    if (type === "ul" || type === "ol") {
      Children.forEach(element.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          questions.push((li as ReactElement<{ children?: ReactNode }>).props.children);
        }
      });
    } else if (type === "li") {
      questions.push(element.props.children);
    }
  });
  return questions;
}

/**
 * Reflektionsfrågor - en och en animeras fram.
 * Bra för samtalsrundor, parsnack eller enskild reflektion.
 *
 * <Reflection tag="REFLEKTION" title="Hur använder ni AI idag?" duration="5 min i par">
 *   - Vad funkar?
 *   - Vad skaver?
 *   - Vad skulle ni vilja ändra?
 * </Reflection>
 */
export function Reflection({
  title,
  tag = "Reflektion",
  duration,
  titleSize = "md",
  questionSize = "md",
  examples,
  supportTitle = "Några ingångar",
  supportHint,
  starter,
  supportExample,
  children,
}: ReflectionProps) {
  const questions = extractQuestions(children);
  const activeStep = useSlideSteps(questions.length);

  if (examples || starter) {
    return <section className={styles.scene} data-workshop-support>
      <header>
        <p className={styles.kicker}>{tag}</p>
        <h2>{title}</h2>
      </header>
      <div className={styles.layout}>
        <ol className={styles.instructions}>
          {questions.map((question, i) => <motion.li key={i}
            initial={false} animate={{ opacity: i <= activeStep ? 1 : 0.3 }} transition={{ duration: 0.2 }}>
            <span className={styles.number}>{i + 1}</span><div>{question}</div>
          </motion.li>)}
        </ol>
        <aside className={styles.support} aria-label={supportTitle}>
          <h3>{supportTitle}</h3>
          {examples && <ul className={styles.examples}>{examples.split("|").map(text => <li key={text}>{text.trim()}</li>)}</ul>}
          {starter && <div className={styles.starter}>{starter.split("|").map(text => <p key={text}>{text.trim()}</p>)}</div>}
          {supportExample && <div className={styles.example}><span>Exempel · budgeten</span><p>{supportExample}</p></div>}
          {supportHint && <p className={styles.hint}>{supportHint}</p>}
        </aside>
      </div>
      <footer>{duration}</footer>
    </section>;
  }

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div data-glow=""
            className="h-8 w-8 rounded-full border-2 border-accent"
            style={{ boxShadow: "0 0 24px var(--accent-glow)" }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="p-1 text-accent"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <span
            className="text-sm uppercase tracking-[0.3em] text-accent md:text-base"
            style={{ fontWeight: 600 }}
          >
            <EditableText path="tag" value={tag ?? ""}>{tag}</EditableText>
          </span>
          {duration && (
            <>
              <span className="h-px flex-1 bg-text-muted opacity-30" />
              <span className="text-xs uppercase tracking-[0.25em] text-text-muted">
                {duration}
              </span>
            </>
          )}
        </motion.div>

        {title && (
          <motion.h2
            className="leading-tight"
            style={{
              fontSize: TITLE_SIZES[titleSize],
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <EditableText
              path="title"
              value={title ?? ""}
              sizeControls={[
                { prop: "titleSize", current: titleSize, options: ["sm", "md", "lg", "xl"], label: "Titel" },
              ]}
            >{title}</EditableText>
          </motion.h2>
        )}

        <ul className="flex flex-col gap-6">
          {questions.map((q, i) => {
            const isActive = i <= activeStep;
            return (
              <motion.li
                key={i}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -16 }}
                animate={{
                  opacity: isActive ? 1 : 0.2,
                  x: isActive ? 0 : -4,
                }}
                transition={{ duration: 0.5, delay: isActive ? 0.1 : 0 }}
              >
                <motion.span data-glow=""
                  className="mt-[0.5em] h-6 w-6 flex-shrink-0 rounded-full border-2"
                  style={{
                    borderColor: isActive ? "var(--accent)" : "var(--text-muted)",
                    background: isActive ? "var(--accent-dim)" : "transparent",
                    boxShadow: isActive ? "0 0 12px var(--accent-glow)" : "none",
                  }}
                  animate={{ scale: isActive ? 1 : 0.85 }}
                />
                <span
                  className="leading-snug"
                  style={{
                    fontSize: `var(--room-instruction, ${QUESTION_SIZES[questionSize]})`,
                    fontFamily: "var(--font-display)",
                    fontWeight: 500,
                  }}
                >
                  {q}
                </span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
