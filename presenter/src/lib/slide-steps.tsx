"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { firstStepBeforeCount, keptSteps, snapStep, type StepConfig } from "./step-config";

/**
 * Stegsystem för slides med flera byggda steg.
 */

interface SlideStepsContextValue {
  /** Changes between windows even when their scene stays mounted. */
  slideKey?: string | number;
  /** Registrera hur många steg sliden har (kallas från templates) */
  registerSteps: (count: number) => void;
  /** Aktuellt step (0-indexerat) */
  currentStep: number;
  /** Totalt antal steg registrerade */
  totalSteps: number;
  /** Valfri genväg till samma manuella steg som clickern använder. */
  goToStep?: (step: number) => void;
  /** Ett bakåtbyte ska visa sista steget redan innan registreringen är klar. */
  startAtLast?: boolean;
  /**
   * Lägena som visas (mallens egna index) när sliden har stegAv/hoppaSteg —
   * se lib/step-config.ts. Saknas när alla lägen visas.
   */
  visibleSteps?: number[];
  /** Slidens stegval. Editorns stegrad visar och ändrar dem. */
  stepConfig?: StepConfig;
}

const SlideStepsContext = createContext<SlideStepsContextValue | null>(null);

/**
 * Controller exposar via ref. Används av SlideViewer för att navigera
 * mellan steg utan att hamna i React-closure-helvetet.
 */
export interface StepController {
  /** Which mounted slide owns these steps during a cross-slide transition. */
  getSlideKey: () => string | number;
  /** Returnerar true om step togs, false om slide borde bytas */
  tryNextStep: () => boolean;
  /** Returnerar true om step togs, false om slide borde bytas */
  tryPrevStep: () => boolean;
  /** Sync-status för presenter-vyn */
  getTotalSteps: () => number;
  getCurrentStep: () => number;
}

interface SlideStepsProviderProps {
  slideKey: string | number;
  /** SlideViewer sätter sin ref här och får tillbaka ett kontroll-gränssnitt */
  controllerRef: React.MutableRefObject<StepController | null>;
  /** Gäller när en ny slide monteras. Direkta hopp börjar normalt på första. */
  initialStep?: "first" | "last";
  /** stegAv / hoppaSteg på sliden (lib/step-config.ts). Utan: alla mallens lägen. */
  config?: StepConfig;
  children: ReactNode;
}

/** Var i listan över visade lägen ligger det här läget? (Det senaste som inte är större.) */
function positionIn(kept: number[], step: number): number {
  let position = 0;
  kept.forEach((k, i) => {
    if (k <= step) position = i;
  });
  return position;
}

export function SlideStepsProvider({
  slideKey,
  controllerRef,
  initialStep = "first",
  config: configProp,
  children,
}: SlideStepsProviderProps) {
  // Stegvalet som värde, inte som objekt: en ny objektidentitet vid varje
  // rendering får inte räkna om lägena.
  const configKey = configProp ? JSON.stringify(configProp) : "";
  const config = useMemo<StepConfig | undefined>(() => (configKey ? JSON.parse(configKey) : undefined), [configKey]);
  const [totalSteps, setTotalSteps] = useState(0);
  // null följer det högsta registrerade antalet tills användaren tar ett steg.
  // Därmed fungerar bakåt även på en tidigare obesökt slide och när flera
  // komponenter registrerar olika antal steg i samma slide.
  const [selectedStep, setCurrentStep] = useState<number | null>(() =>
    initialStep === "last" ? null : firstStepBeforeCount(config),
  );
  const [owner, setOwner] = useState(slideKey);
  // Reset before rendering children, including when two adjacent windows keep
  // the same scene mounted. An effect would briefly expose the old answer.
  if (owner !== slideKey) {
    setOwner(slideKey);
    setTotalSteps(0);
    setCurrentStep(initialStep === "last" ? null : firstStepBeforeCount(config));
  }
  // Med stegAv/hoppaSteg visas bara vissa av mallens lägen. Utan dem är listan
  // null och allt nedan beter sig exakt som förut.
  const kept = useMemo(() => (config ? keptSteps(totalSteps, config) : null), [config, totalSteps]);
  const wantedStep = selectedStep ?? Math.max(0, totalSteps - 1);
  const currentStep = !kept
    ? wantedStep
    : config?.final
      ? Math.max(0, totalSteps - 1)
      : snapStep(wantedStep, kept);

  // Använd refs så controller-funktionerna alltid ser senaste state
  const totalStepsRef = useRef(0);
  const currentStepRef = useRef(0);
  const keptRef = useRef<number[] | null>(null);
  useLayoutEffect(() => {
    totalStepsRef.current = totalSteps;
    currentStepRef.current = currentStep;
    keptRef.current = kept;
  }, [totalSteps, currentStep, kept]);

  // A changed initialStep alone must not reset the current live step.

  const registerSteps = useCallback((count: number) => {
    setTotalSteps((prev) => Math.max(prev, count));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (!Number.isFinite(step)) return;
    const clamped = Math.max(0, Math.min(Math.trunc(step), totalStepsRef.current - 1));
    const next = keptRef.current ? snapStep(clamped, keptRef.current) : clamped;
    currentStepRef.current = next;
    setCurrentStep(next);
  }, []);

  // Sätt controller-ref så SlideViewer kan kalla den direkt
  useLayoutEffect(() => {
    const controller: StepController = {
      getSlideKey: () => slideKey,
      tryNextStep: () => {
        const kept = keptRef.current;
        if (kept) {
          const position = positionIn(kept, currentStepRef.current);
          if (position >= kept.length - 1) return false;
          const next = kept[position + 1];
          currentStepRef.current = next;
          setCurrentStep(next);
          return true;
        }
        const total = totalStepsRef.current;
        const curr = currentStepRef.current;
        if (curr < total - 1) {
          currentStepRef.current = curr + 1;
          setCurrentStep(curr + 1);
          return true;
        }
        return false;
      },
      tryPrevStep: () => {
        const kept = keptRef.current;
        if (kept) {
          const position = positionIn(kept, currentStepRef.current);
          if (position <= 0) return false;
          const previous = kept[position - 1];
          currentStepRef.current = previous;
          setCurrentStep(previous);
          return true;
        }
        const curr = currentStepRef.current;
        if (curr > 0) {
          currentStepRef.current = curr - 1;
          setCurrentStep(curr - 1);
          return true;
        }
        return false;
      },
      getTotalSteps: () => (keptRef.current ? keptRef.current.length : totalStepsRef.current),
      getCurrentStep: () =>
        keptRef.current ? positionIn(keptRef.current, currentStepRef.current) : currentStepRef.current,
    };
    controllerRef.current = controller;
    return () => {
      // En utgående slide får inte radera den nya slidens controller.
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [controllerRef, slideKey]);

  const value = useMemo(
    () => ({
      slideKey,
      registerSteps,
      currentStep,
      totalSteps,
      goToStep,
      // stegAv: mallen ska rita sitt slutläge redan i första renderingen,
      // som vid ett bakåtbyte — inte animera fram det.
      startAtLast: selectedStep === null || config?.final === true,
      ...(kept ? { visibleSteps: kept, stepConfig: config } : {}),
    }),
    [slideKey, registerSteps, currentStep, totalSteps, goToStep, selectedStep, config, kept]
  );

  return <SlideStepsContext.Provider value={value}>{children}</SlideStepsContext.Provider>;
}

/**
 * Hook för templates som vill använda steg. Registrerar `count` steg
 * och returnerar det aktuella stegets index.
 */
export function useSlideSteps(count: number): number {
  const ctx = useContext(SlideStepsContext);

  useLayoutEffect(() => {
    if (ctx && count > 0) {
      ctx.registerSteps(count);
    }
  }, [ctx, count]);

  // Mallens eget antal är känt i första renderingen. Visa därför sista
  // läget direkt vid bakåtbyte, utan en mellanbild av steg 0.
  return ctx
    ? ctx.startAtLast ? Math.max(ctx.currentStep, count - 1, 0) : ctx.currentStep
    : 0;
}

/**
 * Hook för SlideViewer. Returnerar controller-ref.
 */
export { SlideStepsContext };
