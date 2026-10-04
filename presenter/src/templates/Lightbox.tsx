"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  /** Bild-URL att visa. Används om ingen video. */
  image?: string;
  /** Video-URL att spela i stora läget. */
  video?: string;
  /** Caption under media. */
  caption?: string;
  /**
   * Spela videon utan ljud. Default false — anropare som medvetet vill ha
   * tyst uppspelning sätter den själva. Kontrollerna finns kvar, så den som
   * ändå vill ha ljud kan slå på det i stunden.
   */
  muted?: boolean;
}

/**
 * Fullskärms-overlay som visar en bild eller video i förstorad storlek.
 * Stängs via klick utanför, ESC-tangent eller x-knappen.
 */
export function Lightbox({ open, onClose, image, video, caption, muted = false }: LightboxProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5,5,8,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "clamp(2rem, 5vw, 5rem)",
            cursor: "zoom-out",
          }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.25rem",
              cursor: "default",
            }}
          >
            {video ? (
              <video
                src={video}
                autoPlay
                controls
                loop
                muted={muted}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  borderRadius: "0.6rem",
                  boxShadow:
                    "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08) inset",
                }}
              />
            ) : image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                style={{
                  maxWidth: "90vw",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  borderRadius: "0.6rem",
                  boxShadow:
                    "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08) inset",
                }}
              />
            ) : null}
            {caption ? (
              <div
                style={{
                  fontFamily: "var(--font-body)",
                  fontStyle: "italic",
                  fontSize: "clamp(0.9rem, 1.1vw, 1.1rem)",
                  color: "rgba(245,246,250,0.6)",
                  textAlign: "center",
                  maxWidth: "50em",
                }}
              >
                {caption}
              </div>
            ) : null}
          </motion.div>

          {/* Close-knapp */}
          <button
            aria-label="Stäng"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "2rem",
              right: "2rem",
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(245,246,250,0.92)",
              fontSize: "1.5rem",
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}
          >
            ×
          </button>

          {/* ESC-hint */}
          <div
            style={{
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "rgba(245,246,250,0.6)",
            }}
          >
            Klicka utanför eller tryck ESC för att stänga
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
