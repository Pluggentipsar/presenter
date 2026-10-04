"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ImageTextProps {
  image: string;
  alt?: string;
  layout?: "left" | "right";
  children: ReactNode;
}

export function ImageText({ image, alt = "", layout = "left", children }: ImageTextProps) {
  const imageOnLeft = layout === "left";

  return (
    <div className="slide-container">
      <div
        className={`grid w-full max-w-6xl grid-cols-1 gap-10 md:grid-cols-[45%_55%] ${
          imageOnLeft ? "" : "md:grid-flow-col-reverse md:[&>*:first-child]:col-start-2"
        }`}
      >
        <motion.div
          className="relative overflow-hidden rounded-xl bg-bg-surface"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={alt}
            className="h-full max-h-[70vh] w-full object-cover"
          />
        </motion.div>
        <motion.div
          className="slide-prose flex flex-col justify-center gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
