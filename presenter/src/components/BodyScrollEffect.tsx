"use client";

import { useEffect } from "react";

/**
 * Sätter klassen `allow-scroll` på body medan komponenten är monterad.
 * Används på sidor som INTE är slides (startsida, presenter-vy) och behöver scroll.
 */
export function BodyScrollEffect() {
  useEffect(() => {
    document.body.classList.add("allow-scroll");
    return () => document.body.classList.remove("allow-scroll");
  }, []);
  return null;
}
