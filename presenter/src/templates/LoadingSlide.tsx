"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";

interface LoadingSlideProps {
  variant?: "spinner" | "dots" | "pulse" | "progress" | "orbit";
  title?: string;
  subtitle?: string;
  children?: ReactNode;
}

/**
 * Loading/processing-slide med animerad indikator.
 * Bra som transition eller "AI tänker"-effekt.
 */
export function LoadingSlide({
  variant = "spinner",
  title,
  subtitle,
  children,
}: LoadingSlideProps) {
  return (
    <div className="slide-container">
      <div className="flex w-full flex-col items-center gap-10 text-center">
        <Indicator variant={variant} />
        {title && (
          <motion.h2
            className="text-[clamp(1.5rem,3vw,2.5rem)] leading-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: "var(--heading-weight)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <EditableText path="title" value={title ?? ""}>{title}</EditableText>
          </motion.h2>
        )}
        {subtitle && (
          <motion.p
            className="max-w-2xl text-lg text-text-muted md:text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <EditableText path="subtitle" value={subtitle ?? ""}>{subtitle}</EditableText>
          </motion.p>
        )}
        {children && <div className="slide-prose mt-4">{children}</div>}
      </div>
    </div>
  );
}

function Indicator({ variant }: { variant: LoadingSlideProps["variant"] }) {
  if (variant === "dots") {
    return (
      <div className="flex items-center gap-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-4 w-4 rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 16px var(--accent-glow)" }}
            animate={{ y: [0, -16, 0], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className="relative flex h-32 w-32 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: "var(--accent)" }}
            animate={{ scale: [0.6, 1.4], opacity: [0.8, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}
        <div
          className="h-8 w-8 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 24px var(--accent-glow)" }}
        />
      </div>
    );
  }

  if (variant === "progress") {
    return (
      <div className="w-80 max-w-full">
        <div className="h-1 overflow-hidden rounded-full" style={{ background: "var(--bg-surface)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--accent)", boxShadow: "0 0 12px var(--accent-glow)" }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  if (variant === "orbit") {
    return (
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div
          className="h-4 w-4 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }}
        />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.3,
            }}
          >
            <div
              className="absolute h-3 w-3 rounded-full"
              style={{
                top: 0,
                left: "50%",
                marginLeft: "-6px",
                background: "var(--accent)",
                opacity: 0.5 + i * 0.15,
                boxShadow: "0 0 12px var(--accent-glow)",
              }}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // Default: spinner
  return (
    <motion.div
      className="h-20 w-20 rounded-full border-4 border-transparent"
      style={{
        borderTopColor: "var(--accent)",
        borderRightColor: "var(--accent-dim)",
        boxShadow: "0 0 32px var(--accent-glow)",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
    />
  );
}
