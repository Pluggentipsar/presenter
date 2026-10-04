"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { buildBackgroundCss } from "@/lib/background";

type Size = "sm" | "md" | "lg" | "xl";

interface OutroProps {
  /** Stor rubrik, default "Tack" */
  title?: string;
  /** Undertitel under rubriken */
  subtitle?: string;
  /** Kontaktinfo (email, webb, sociala) */
  email?: string;
  web?: string;
  socials?: string;
  /** URL att generera QR-kod för (tex materiallänk) */
  qrUrl?: string;
  /** Liten text under QR-koden */
  qrCaption?: string;
  /** Extra CTA under title/subtitle */
  cta?: string;
  titleSize?: Size;
  children?: ReactNode;
  /** Bakgrund — bildsökväg eller CSS-värde. */
  background?: string;
  /** Overlay-opacity 0-1 ovanpå bakgrunden. */
  overlay?: number | string;
  /** Overlay-färg. Default dark. */
  overlayMode?: "dark" | "light";
}

const TITLE_SIZES: Record<Size, string> = {
  sm: "clamp(2rem, 5vw, 3.5rem)",
  md: "clamp(3rem, 7vw, 5.5rem)",
  lg: "clamp(4rem, 9vw, 7rem)",
  xl: "clamp(5rem, 12vw, 9rem)",
};

/**
 * Outro-slide med stor rubrik (default "Tack"), kontakt, QR-kod och CTA.
 * Genererar QR-kod via qrserver.com (ingen extra beroende).
 *
 * <Outro
 *   title="Tack!"
 *   subtitle="Hör av dig - bygg vidare."
 *   email="namn@example.com"
 *   web="example.com/material"
 *   socials="@ditt_konto"
 *   qrUrl="https://example.com"
 *   qrCaption="Allt material"
 * />
 */
export function Outro({
  title = "Tack",
  subtitle,
  email,
  web,
  socials,
  qrUrl,
  qrCaption,
  cta,
  titleSize = "lg",
  children,
  background,
  overlay,
  overlayMode = "dark",
}: OutroProps) {
  const hasQr = !!qrUrl;
  const qrSrc = hasQr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=16&bgcolor=ffffff&color=000000&data=${encodeURIComponent(qrUrl)}`
    : "";
  const hasBackground = Boolean(background);

  return (
    <div
      className="slide-container"
      style={
        hasBackground
          ? { background: buildBackgroundCss(background, overlay, overlayMode) }
          : undefined
      }
    >
      <div
        className="flex w-full flex-col gap-10"
        style={{ maxWidth: "var(--slide-max-width)" }}
      >
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
          {/* Vänster: rubrik + meta */}
          <div className="flex flex-col gap-4">
            <motion.h1
              className="leading-[0.95]"
              style={{
                fontSize: TITLE_SIZES[titleSize],
                fontFamily: "var(--font-display)",
                fontWeight: "var(--heading-weight)",
                letterSpacing: "var(--heading-tracking)",
                textTransform: "var(--heading-case)" as "normal" | "uppercase",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <EditableText path="title" value={title ?? ""}>{title}</EditableText>
            </motion.h1>
            {subtitle && (
              <motion.p
                className="max-w-2xl text-[clamp(1.125rem,2vw,1.5rem)] leading-snug text-text-muted"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
              >
                <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
              </motion.p>
            )}
            {cta && (
              <motion.div
                className="mt-2 rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm uppercase tracking-[0.25em] text-accent md:text-base"
                style={{ borderRadius: "var(--radius)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                {cta}
              </motion.div>
            )}
          </div>

          {/* Höger: QR-kod */}
          {hasQr && (
            <motion.div
              className="flex flex-col items-center gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt={`QR-kod till ${qrUrl}`}
                className="h-40 w-40 rounded-md bg-white p-2 md:h-52 md:w-52"
                style={{ borderRadius: "var(--radius)" }}
              />
              {qrCaption && (
                <div className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  {qrCaption}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Kontaktraden */}
        {(email || web || socials) && (
          <motion.div
            className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-6 text-base uppercase tracking-[0.15em] text-text-muted md:text-lg"
            style={{ borderColor: "color-mix(in srgb, var(--text) 14%, transparent)" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {email && (
              <div className="flex items-center gap-2">
                <span className="text-accent">@</span>
                <span>{email}</span>
              </div>
            )}
            {email && web && <span className="text-accent">/</span>}
            {web && (
              <div className="flex items-center gap-2">
                <span className="text-accent">→</span>
                <span>{web}</span>
              </div>
            )}
            {web && socials && <span className="text-accent">/</span>}
            {socials && (
              <div className="flex items-center gap-2">
                <span className="text-accent">#</span>
                <span>{socials}</span>
              </div>
            )}
          </motion.div>
        )}

        {children && <div className="mt-2 text-text-muted">{children}</div>}
      </div>
    </div>
  );
}
