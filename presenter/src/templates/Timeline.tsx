"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { EditableText } from "@/lib/inline-edit";

interface TimelineProps {
  title?: string;
  orientation?: "horizontal" | "vertical";
  children?: ReactNode;
}

interface TimelineEventProps {
  date: string;
  title?: string;
  children?: ReactNode;
}

interface ExtractedEvent {
  date: string;
  title?: string;
  body: ReactNode;
}

function extractEvents(children: ReactNode): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<TimelineEventProps>;
    if (element.props.date) {
      events.push({
        date: element.props.date,
        title: element.props.title,
        body: element.props.children ?? null,
      });
    }
  });
  return events;
}

/**
 * Tidslinje med animerad linje + steg-för-steg avslöjade händelser.
 *
 * Användning:
 * <Timeline title="AI i skolan" orientation="horizontal">
 *   <TimelineEvent date="Nov 2022" title="ChatGPT">
 *     Release till allmänheten.
 *   </TimelineEvent>
 *   <TimelineEvent date="Apr 2023" title="My AI">
 *     Snapchat släpper My AI.
 *   </TimelineEvent>
 *   <TimelineEvent date="2026" title="Nu">
 *     Nationell AI-strategi.
 *   </TimelineEvent>
 * </Timeline>
 */
export function Timeline({
  title,
  orientation = "horizontal",
  children,
}: TimelineProps) {
  const events = extractEvents(children);
  const activeStep = useSlideSteps(events.length);

  if (orientation === "vertical") {
    return <VerticalTimeline title={title} events={events} activeStep={activeStep} />;
  }
  return <HorizontalTimeline title={title} events={events} activeStep={activeStep} />;
}

function HorizontalTimeline({
  title,
  events,
  activeStep,
}: {
  title?: string;
  events: ExtractedEvent[];
  activeStep: number;
}) {
  // Progress: antal synliga noder inkl aktuell
  const progress = events.length > 1 ? activeStep / (events.length - 1) : 1;

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-16"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {title && (
          <motion.h2
            className="text-[clamp(2rem,5vw,3.5rem)] leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}

        <div className="relative pb-4">
          {/* Bakgrundslinje */}
          <div
            className="absolute left-0 right-0 top-4 h-0.5"
            style={{ background: "var(--text-muted)", opacity: 0.2 }}
          />
          {/* Animerad accent-linje */}
          <motion.div
            className="absolute left-0 top-4 h-0.5 origin-left"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 12px var(--accent-glow)",
              right: `${(1 - progress) * 100}%`,
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            key={activeStep}
          />

          {/* Noder */}
          <div className="relative flex justify-between">
            {events.map((event, i) => {
              const isActive = i <= activeStep;
              return (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-3"
                  style={{ maxWidth: `${100 / events.length}%` }}
                >
                  <motion.div
                    className="relative h-9 w-9 rounded-full border-2"
                    style={{
                      background: isActive ? "var(--accent)" : "var(--bg-surface)",
                      borderColor: isActive ? "var(--accent)" : "var(--text-muted)",
                      boxShadow: isActive ? "0 0 24px var(--accent-glow)" : "none",
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                  />
                  <motion.div
                    className="mt-2 text-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isActive ? 1 : 0.25, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <div
                      className="mb-1 text-xs uppercase tracking-[0.2em] text-accent"
                      style={{ fontWeight: 600 }}
                    >
                      {event.date}
                    </div>
                    {event.title && (
                      <div
                        className="text-[clamp(1rem,1.5vw,1.25rem)] font-semibold"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {event.title}
                      </div>
                    )}
                    {event.body && (
                      <div className="mt-1 text-sm text-text-muted md:text-base">
                        {event.body}
                      </div>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function VerticalTimeline({
  title,
  events,
  activeStep,
}: {
  title?: string;
  events: ExtractedEvent[];
  activeStep: number;
}) {
  const progress = events.length > 1 ? activeStep / (events.length - 1) : 1;

  return (
    <div className="slide-container">
      <div
        className="flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        {title && (
          <motion.h2
            className="text-[clamp(2rem,5vw,3.5rem)] leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
              letterSpacing: "var(--heading-tracking)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}

        <div className="relative pl-12">
          {/* Bakgrundslinje */}
          <div
            className="absolute bottom-0 left-4 top-4 w-0.5"
            style={{ background: "var(--text-muted)", opacity: 0.2 }}
          />
          {/* Animerad accent-linje */}
          <motion.div
            className="absolute left-4 top-4 w-0.5 origin-top"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 12px var(--accent-glow)",
              bottom: `${(1 - progress) * 100}%`,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6 }}
            key={activeStep}
          />

          {/* Noder */}
          <div className="flex flex-col gap-10">
            {events.map((event, i) => {
              const isActive = i <= activeStep;
              return (
                <motion.div
                  key={i}
                  className="relative"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: isActive ? 1 : 0.3, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <motion.div
                    className="absolute -left-12 top-1 h-8 w-8 rounded-full border-2"
                    style={{
                      background: isActive ? "var(--accent)" : "var(--bg-surface)",
                      borderColor: isActive ? "var(--accent)" : "var(--text-muted)",
                      boxShadow: isActive ? "0 0 24px var(--accent-glow)" : "none",
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 + i * 0.1 }}
                  />
                  <div className="mb-1 text-xs uppercase tracking-[0.25em] text-accent font-semibold">
                    {event.date}
                  </div>
                  {event.title && (
                    <div
                      className="mb-1 text-[clamp(1.25rem,2.5vw,1.75rem)] font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {event.title}
                    </div>
                  )}
                  {event.body && (
                    <div className="text-[clamp(1rem,1.5vw,1.25rem)] text-text-muted">
                      {event.body}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Marker för att definiera en händelse i Timeline */
export function TimelineEvent(_props: TimelineEventProps) {
  return null;
}
