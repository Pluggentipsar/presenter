"use client";

import { motion } from "framer-motion";
import { EditableText, EditableMedia } from "@/lib/inline-edit";

interface VideoEmbedProps {
  src: string;
  title?: string;
  caption?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "9/16";
}

/**
 * Video som bäddas in i slide. Stödjer:
 * - Lokala mp4 (src="/video.mp4")
 * - YouTube (src="https://youtube.com/watch?v=..." eller "https://youtu.be/...")
 * - Vimeo (src="https://vimeo.com/...")
 * - Direkta iframe-URL:er
 */
export function VideoEmbed({
  src,
  title,
  caption,
  autoplay = false,
  loop = false,
  muted = false,
  aspectRatio = "16/9",
}: VideoEmbedProps) {
  const isLocal = /\.(mp4|webm|mov|m4v)$/i.test(src);
  const embedUrl = !isLocal ? toEmbedUrl(src, { autoplay, loop, muted }) : null;

  return (
    <div className="slide-container">
      <div className="flex w-full max-w-6xl flex-col gap-5">
        {title && (
          <motion.h2
            className="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}
        <motion.div
          className="relative w-full overflow-hidden rounded-xl bg-bg-surface"
          style={{
            aspectRatio,
            boxShadow: "0 0 40px rgba(0, 0, 0, 0.4)",
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <EditableMedia path="src" value={src} mediaType="video" label="Video">
            {isLocal ? (
              <video
                src={src}
                className="absolute inset-0 h-full w-full object-cover"
                controls
                autoPlay={autoplay}
                loop={loop}
                muted={muted || autoplay}
                playsInline
              />
            ) : (
              <iframe
                src={embedUrl ?? src}
                title={title ?? "Video"}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </EditableMedia>
        </motion.div>
        {caption && (
          <motion.p
            className="text-sm text-text-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <EditableText path="caption" value={caption ?? ""}>{caption}</EditableText>
          </motion.p>
        )}
      </div>
    </div>
  );
}

function toEmbedUrl(
  url: string,
  opts: { autoplay: boolean; loop: boolean; muted: boolean }
): string {
  try {
    const u = new URL(url);
    const params = new URLSearchParams();

    // YouTube
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
      const id = u.searchParams.get("v")!;
      if (opts.autoplay) params.set("autoplay", "1");
      if (opts.loop) {
        params.set("loop", "1");
        params.set("playlist", id);
      }
      if (opts.muted || opts.autoplay) params.set("mute", "1");
      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (opts.autoplay) params.set("autoplay", "1");
      if (opts.loop) {
        params.set("loop", "1");
        params.set("playlist", id);
      }
      if (opts.muted || opts.autoplay) params.set("mute", "1");
      return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }

    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      if (opts.autoplay) params.set("autoplay", "1");
      if (opts.loop) params.set("loop", "1");
      if (opts.muted || opts.autoplay) params.set("muted", "1");
      return `https://player.vimeo.com/video/${id}?${params.toString()}`;
    }

    // Redan en embed-URL eller något annat
    return url;
  } catch {
    return url;
  }
}
