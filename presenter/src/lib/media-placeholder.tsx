/**
 * Media-platshållare för publik-vyn när presentationen har deploy: local-only.
 *
 * När presentatören kör från laptop (via npm run present / Cloudflare Tunnel)
 * behöver publiken fortfarande kunna följa slide-indexet och ta anteckningar.
 * Men bilder och videos ligger bara på presentatörens maskin och är inte
 * åtkomliga via deployed audience-vy.
 *
 * Istället för trasiga bilder: visa en platshållare som säger
 * "📷 Bild visas på presentatörens skärm" — publiken förstår att de missar
 * inget viktigt textuellt innehåll.
 */

"use client";

import type { ReactNode } from "react";

const PLACEHOLDER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  minHeight: "200px",
  background:
    "repeating-linear-gradient(45deg, rgba(236,126,38,0.06) 0px, rgba(236,126,38,0.06) 8px, rgba(236,126,38,0.12) 8px, rgba(236,126,38,0.12) 16px)",
  border: "2px dashed rgba(236, 126, 38, 0.35)",
  borderRadius: "0.75rem",
  color: "rgba(236, 126, 38, 0.85)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  fontSize: "clamp(0.8rem, 1.1vw, 1.05rem)",
  fontWeight: 500,
  letterSpacing: "0.03em",
  textAlign: "center",
  padding: "1.5rem",
  gap: "0.5rem",
};

interface MediaPlaceholderProps {
  type: "image" | "video" | "audio";
  /** Valfri text att visa istället för default. */
  label?: string;
}

/**
 * Visuell platshållare som ersätter img/video/audio i publikvyn
 * när `deploy: local-only` är satt.
 */
export function MediaPlaceholder({ type, label }: MediaPlaceholderProps): ReactNode {
  const icon = type === "video" ? "🎬" : type === "audio" ? "🔊" : "📷";
  const defaultLabel =
    type === "video"
      ? "Video visas på presentatörens skärm"
      : type === "audio"
        ? "Ljud spelas på presentatörens skärm"
        : "Bild visas på presentatörens skärm";

  return (
    <div style={PLACEHOLDER_STYLE} aria-label={label ?? defaultLabel}>
      <div style={{ fontSize: "2rem", opacity: 0.8 }} aria-hidden>
        {icon}
      </div>
      <div>{label ?? defaultLabel}</div>
    </div>
  );
}
