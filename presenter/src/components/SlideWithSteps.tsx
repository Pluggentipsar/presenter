"use client";

import type { MutableRefObject, ReactNode } from "react";
import { SlideStepsProvider, type StepController } from "@/lib/slide-steps";
import type { StepConfig } from "@/lib/step-config";

interface SlideWithStepsProps {
  slideKey: number;
  controllerRef: MutableRefObject<StepController | null>;
  initialStep?: "first" | "last";
  /** stegAv / hoppaSteg på sliden — se lib/step-config.ts. */
  config?: StepConfig;
  children: ReactNode;
}

/**
 * Wrapper som tillhandahåller steps-context till sliden.
 * SlideViewer håller i controllerRef och kan läsa aktuella step-värden.
 */
export function SlideWithSteps({ slideKey, controllerRef, initialStep = "first", config, children }: SlideWithStepsProps) {
  return (
    <SlideStepsProvider slideKey={slideKey} controllerRef={controllerRef} initialStep={initialStep} config={config}>
      {children}
    </SlideStepsProvider>
  );
}
