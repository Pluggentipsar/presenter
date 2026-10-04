"use client";

import { useEffect, useRef, useState } from "react";
import {
  STAGE_CHANNEL,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  isStageMessage,
  type StageCommand,
  type StepTarget,
} from "@/lib/share/stage-protocol";

export interface StageState {
  slide: number;
  step: number;
  totalSteps: number;
}

interface StageFrameProps {
  slug: string;
  /** 0-baserat slideindex. */
  slide: number;
  step: StepTarget;
  /** Beskrivning för skärmläsare; lästexten bär innehållet. */
  label: string;
  /**
   * false (default): sliden är en bild av läget — pekare och scroll går
   * igenom till sidan, så texten rullar även när markören vilar på sliden.
   * true: sliden tar emot klick (video, länkar), t.ex. i förstorat läge.
   */
  interactive?: boolean;
  /** Live fullscreen traverses the actual deck, including steps without reading text. */
  live?: boolean;
  /** Forward a clicker key received by the parent document into the scene. */
  navigation?: { direction: 1 | -1; sequence: number };
  onState?: (state: StageState) => void;
  onKey?: (key: string) => void;
}

/**
 * Sliden i en ruta. Iframen har alltid en virtuell projektorstorlek
 * (STAGE_WIDTH × STAGE_HEIGHT) och skalas ner till rutans bredd, så samma
 * slide ser likadan ut i en hero, i läslägets kolumn och på en telefon.
 * Rutan bestämmer själv sin bredd; höjden följer 16:9.
 */
export function StageFrame({
  slug,
  slide,
  step,
  label,
  interactive = false,
  live = false,
  navigation,
  onState,
  onKey,
}: StageFrameProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [ready, setReady] = useState(false);
  // Adressen sätts en gång. Därefter byts läge med meddelanden — att ändra
  // src skulle ladda om hela decket för varje stycke.
  const [src] = useState(
    // Snedstrecket före frågetecknet behövs i den statiska kopian, där /scen/ är en
    // mapp med index.html. Appen själv skickar bara vidare till adressen utan.
    () => `/${slug}/scen/?slide=${slide + 1}&step=${step === "last" ? "last" : step}`,
  );

  const handlers = useRef({ onState, onKey });
  useEffect(() => {
    handlers.current = { onState, onKey };
  });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const update = () => setScale(box.clientWidth / STAGE_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const target = useRef({ slide, step, live });
  useEffect(() => {
    target.current = { slide, step, live };
  });
  const send = () => {
    const command: StageCommand = { channel: STAGE_CHANNEL, type: "show", ...target.current };
    frameRef.current?.contentWindow?.postMessage(command, window.location.origin);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.origin !== window.location.origin || !isStageMessage(e.data)) return;
      if (e.data.type === "ready") {
        // Scenrutan upprepar "ready" tills den fått ett första läge, och säger
        // det igen om iframen laddas om. Svara varje gång med aktuellt läge.
        setReady(true);
        send();
      } else if (e.data.type === "state") handlers.current.onState?.(e.data);
      else if (e.data.type === "key") handlers.current.onKey?.(e.data.key);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // send läser bara refs; lyssnaren ska sättas upp en gång.
  }, []);

  // Skicka läget först när scenrutan sagt "ready" — ett meddelande till en
  // iframe som inte hunnit starta försvinner tyst.
  useEffect(() => {
    if (ready) send();
  }, [ready, slide, step, live]);

  useEffect(() => {
    if (!ready || !live || !navigation) return;
    const command: StageCommand = { channel: STAGE_CHANNEL, type: "navigate", direction: navigation.direction };
    frameRef.current?.contentWindow?.postMessage(command, window.location.origin);
  }, [ready, live, navigation]);

  return (
    <div
      ref={boxRef}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}`,
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <iframe
        ref={frameRef}
        src={src}
        title={label}
        tabIndex={interactive ? 0 : -1}
        aria-hidden={interactive ? undefined : true}
        allow="autoplay; fullscreen"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: interactive ? "auto" : "none",
          opacity: scale > 0 ? 1 : 0,
        }}
      />
    </div>
  );
}
