"use client";

/**
 * Videolagret i en bakgrunds-video (`background="/videos/…/foo.mp4"`).
 *
 * Egen klientkomponent av två skäl. Dels måste withSlideBg kunna renderas i
 * server-trädet (PresentationRenderer) — då får den inte själv använda hooks.
 * Dels ska videon bete sig olika i de två lägena:
 *
 *  - Presentation: autoplay, muted, loop. Så har det alltid fungerat.
 *  - R-läget: pausad på första bildrutan. Joel bläddrar med j/k flera gånger i
 *    sekunden, och då monteras och rivs videoelement i snabb följd. Autoplay
 *    där ger ryckig preview och onödig avkodning utan att visa något mer.
 *
 * VIKTIGT: bakgrundsvideo måste alltid provkörning-verifieras i
 * PRESENTATIONSLÄGET, inte i previewn. Preview-fönstret har en mer tillåtande
 * autoplay-policy, och codec-kravet (H.264 + AAC-LC + faststart) failar först i
 * en riktig browser.
 */

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";

export interface SlideBgVideoMode {
  /** Sant när videon renderas i editorns preview. */
  editor: boolean;
}

export const SlideBgVideoContext = createContext<SlideBgVideoMode>({
  editor: false,
});

export function SlideBgVideo({ src, poster }: { src: string; poster?: string }) {
  const { editor } = useContext(SlideBgVideoContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const still = Boolean(poster && (reducedMotion || failedSrc === src));
  const mediaStyle: CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", zIndex: 0,
  };

  useEffect(() => {
    const element = videoRef.current;
    if (!element || (!editor && !still)) return;
    // autoPlay={false} räcker inte alltid — en browser som redan börjat spela
    // efter en tidigare render fortsätter tills den uttryckligen pausas.
    element.pause();
  }, [editor, still]);

  if (still) {
    return <div aria-hidden style={{ ...mediaStyle,
      backgroundImage: `url("${poster}")`, backgroundSize: "cover", backgroundPosition: "center",
    }} />;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay={!editor}
      loop
      muted
      playsInline
      preload={editor ? "metadata" : "auto"}
      aria-hidden
      onError={() => setFailedSrc(src)}
      style={mediaStyle}
    />
  );
}
