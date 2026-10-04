"use client";

import { EditableMedia } from "@/lib/inline-edit";

interface FullscreenVideoProps {
  src: string;
  /** Poster-bild innan videon börjar. */
  poster?: string;
  /** Loopa videon. Default false — videon spelas rakt igenom. */
  loop?: boolean;
  /** Starta automatiskt. Default true. */
  autoPlay?: boolean;
  /** Mutad. Default true (krävs för autoplay i de flesta browsers). */
  muted?: boolean;
  /** Visa inbyggda kontroller. Default false — ren, distraktionsfri yta. */
  controls?: boolean;
  /** object-fit: cover fyller hela ytan (croppar); contain behåller hela bilden (letterbox). */
  fit?: "cover" | "contain";
  /** Bakgrundsfärg bakom videon när fit="contain". */
  background?: string;
}

/**
 * Ren, distraktionsfri videospelare på hela sliden. Inget text-overlay,
 * ingen gradient, inga kontroller som default. Tänkt för när videon
 * talar för sig själv (t.ex. demo-clips, wow-moments).
 */
export function FullscreenVideo({
  src,
  poster,
  loop = false,
  autoPlay = true,
  muted = true,
  controls = false,
  fit = "contain",
  background = "#000",
}: FullscreenVideoProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background }}
    >
      <EditableMedia path="src" value={src} mediaType="video" label="Video">
        <video
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          controls={controls}
          playsInline
          className="h-full w-full"
          style={{ objectFit: fit }}
        />
      </EditableMedia>
    </div>
  );
}
