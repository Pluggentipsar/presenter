"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { MediaUrl } from "@/lib/extract-media-urls";

interface PresentationPreloaderProps {
  /** Slug för sessionStorage-cache — så vi slipper preloada om vid tillbakanavigering. */
  slug: string;
  /** Presentationens titel för loading-skärmen. */
  title: string;
  /** Alla media-URL:er att preloada. Genereras server-side via extractMediaUrls. */
  mediaUrls: MediaUrl[];
  /** Vad som ska renderas efter preload. */
  children: ReactNode;
}

type Status = "idle" | "loading" | "done" | "skipped";

const CACHE_KEY_PREFIX = "presentation-preloaded:";
const TIMEOUT_PER_RESOURCE = 10000; // 10s

/**
 * Preloadar alla media-resurser i en presentation och visar en snygg
 * loading-skärm under tiden. När allt är laddat (eller timeoutat)
 * rendereras children.
 *
 * Cache per slug i sessionStorage: andra gången du besöker samma
 * presentation i samma flik skippar den direkt.
 *
 * Opt-out: tryck Escape för att skippa preload manuellt. Eller lägg
 * `?noload=1` i URL:en.
 */
export function PresentationPreloader({
  slug,
  title,
  mediaUrls,
  children,
}: PresentationPreloaderProps) {
  // Deduplicera in case
  const urls = useMemo(() => {
    const seen = new Set<string>();
    return mediaUrls.filter((m) => {
      if (seen.has(m.url)) return false;
      seen.add(m.url);
      return true;
    });
  }, [mediaUrls]);

  const total = urls.length;
  const [loaded, setLoaded] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [currentResource, setCurrentResource] = useState<string>("");
  const skipRef = useRef(false);

  // Check cache + URL-flagga vid mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Opt-out via query-param
    const params = new URLSearchParams(window.location.search);
    if (params.get("noload") === "1") {
      setStatus("skipped");
      return;
    }

    // Cache-check
    try {
      const cached = sessionStorage.getItem(CACHE_KEY_PREFIX + slug);
      if (cached === "1") {
        setStatus("skipped");
        return;
      }
    } catch {
      // sessionStorage kan vara disabled
    }

    // Inget att ladda → skippa
    if (total === 0) {
      setStatus("done");
      return;
    }

    setStatus("loading");
  }, [slug, total]);

  // Escape-tangent för opt-out
  useEffect(() => {
    if (status !== "loading") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipRef.current = true;
        setStatus("skipped");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [status]);

  // Preloading-pipeline
  useEffect(() => {
    if (status !== "loading") return;
    if (total === 0) return;

    let cancelled = false;
    let completed = 0;

    const finish = () => {
      if (cancelled) return;
      try {
        sessionStorage.setItem(CACHE_KEY_PREFIX + slug, "1");
      } catch {
        // ignore
      }
      setStatus("done");
    };

    const onResourceDone = (url: string) => {
      if (cancelled || skipRef.current) return;
      completed += 1;
      setLoaded(completed);
      setCurrentResource(url);
      if (completed >= total) {
        finish();
      }
    };

    // Starta alla parallellt
    for (const { url, type } of urls) {
      preloadResource(url, type).finally(() => onResourceDone(url));
    }

    return () => {
      cancelled = true;
    };
  }, [status, urls, total, slug]);

  // Fade-out när status blir "done" eller "skipped"
  const showLoader = status === "loading";

  return (
    <>
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background:
                "radial-gradient(ellipse at 50% 30%, #1a1410 0%, #0a0908 60%, #05060a 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              fontFamily: "var(--font-body, system-ui)",
              color: "#F7F1E6",
            }}
          >
            <PulseGlow />
            <Progress
              total={total}
              loaded={loaded}
              title={title}
              currentResource={currentResource}
            />
            <HintEsc />
          </motion.div>
        )}
      </AnimatePresence>
      {status !== "loading" && children}
    </>
  );
}

// ============================================================================
// Preload-logik per resurs
// ============================================================================

function preloadResource(url: string, type: "image" | "video" | "audio"): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(), TIMEOUT_PER_RESOURCE);
    const done = () => {
      clearTimeout(timeout);
      resolve();
    };

    if (type === "image") {
      const img = new Image();
      img.onload = done;
      img.onerror = done; // Fail-safe: räkna som klar även vid 404
      img.src = url;
    } else if (type === "video") {
      // Videos använder <link rel="preload">-strategin: starta download
      // via dummy-video-element men vänta bara på metadata (snabbt).
      // Full video får laddas medan loader visas, fortsatt i bakgrunden.
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = done;
      video.onerror = done;
      video.src = url;
      // Börja "browser-level preload" via hidden link
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);
    } else {
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = done;
      audio.onerror = done;
      audio.src = url;
    }
  });
}

// ============================================================================
// UI-komponenter för loading-skärmen
// ============================================================================

function PulseGlow() {
  return (
    <div
      style={{
        position: "relative",
        width: "200px",
        height: "200px",
        marginBottom: "3rem",
      }}
    >
      {/* Yttersta puls */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.4, 0.1, 0.4],
        }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "radial-gradient(circle, #EC7E26 0%, transparent 60%)",
        }}
      />
      {/* Mellan-puls */}
      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.6, 0.2, 0.6],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
        style={{
          position: "absolute",
          inset: "20%",
          borderRadius: "50%",
          background: "radial-gradient(circle, #EC7E26 0%, transparent 65%)",
        }}
      />
      {/* Innersta kärnan — roterande */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: "35%",
          borderRadius: "50%",
          border: "1px solid rgba(236, 126, 38, 0.5)",
          borderTopColor: "#EC7E26",
          borderRightColor: "#EC7E26",
        }}
      />
      {/* Centrum-prick */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          background: "#EC7E26",
          boxShadow: "0 0 20px #EC7E26, 0 0 40px #EC7E26aa",
        }}
      />
    </div>
  );
}

function Progress({
  total,
  loaded,
  title,
  currentResource,
}: {
  total: number;
  loaded: number;
  title: string;
  currentResource: string;
}) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
  const shortPath = shortenUrl(currentResource);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        maxWidth: "40rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: "0.75rem",
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "rgba(236, 126, 38, 0.75)",
          fontWeight: 600,
        }}
      >
        Förbereder presentationen
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        style={{
          fontFamily: "var(--font-display, serif)",
          fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
          fontWeight: 600,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          color: "#F7F1E6",
          margin: 0,
          maxWidth: "24em",
        }}
      >
        {title}
      </motion.h1>

      {/* Progress-bar */}
      <div
        style={{
          width: "min(22rem, 70vw)",
          height: "3px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "2px",
          overflow: "hidden",
          marginTop: "1rem",
        }}
      >
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            height: "100%",
            background:
              "linear-gradient(90deg, #EC7E26 0%, #F5A64D 50%, #EC7E26 100%)",
            boxShadow: "0 0 12px #EC7E26aa",
          }}
        />
      </div>

      {/* Räknare */}
      <div
        style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: "0.72rem",
          letterSpacing: "0.15em",
          color: "rgba(247, 241, 230, 0.55)",
          marginTop: "0.2rem",
        }}
      >
        {loaded} / {total} · {pct}%
      </div>

      {/* Nuvarande resurs (subtil) */}
      <div
        style={{
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: "0.68rem",
          color: "rgba(247, 241, 230, 0.3)",
          height: "1em",
          marginTop: "0.8rem",
          fontStyle: "italic",
        }}
      >
        {shortPath ? `laddar ${shortPath}` : ""}
      </div>
    </div>
  );
}

function HintEsc() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      transition={{ duration: 1.5, delay: 2 }}
      style={{
        position: "absolute",
        bottom: "2rem",
        fontFamily: "var(--font-mono, ui-monospace)",
        fontSize: "0.65rem",
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: "rgba(247, 241, 230, 0.4)",
      }}
    >
      <kbd
        style={{
          padding: "1px 6px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "3px",
          fontSize: "0.7rem",
          marginRight: "0.5em",
        }}
      >
        Esc
      </kbd>
      skippa preload
    </motion.div>
  );
}

// ============================================================================
// Utils
// ============================================================================

function shortenUrl(url: string): string {
  if (!url) return "";
  // Strippa bort protocol + host för externa
  if (url.startsWith("http")) {
    try {
      const u = new URL(url);
      const path = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
      return path.slice(0, 40);
    } catch {
      return url.slice(0, 40);
    }
  }
  // Lokalt path: ta bara filnamnet
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1]?.slice(0, 40) ?? url;
}
