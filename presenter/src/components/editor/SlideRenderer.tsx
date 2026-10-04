"use client";

import { useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ComponentType } from "react";
import type { ParsedComponent } from "@/lib/mdx-parser";
import { markdownToReact } from "@/lib/mini-markdown";
import { SlideStepsContext, SlideStepsProvider, type StepController } from "@/lib/slide-steps";
import { parseStepConfig, toggleSkip, type StepConfig } from "@/lib/step-config";
import { EditProvider } from "@/lib/inline-edit";
import { wrapWithSlideBg } from "../withSlideBg";
import * as Templates from "@/templates";

interface SlideRendererProps {
  stepControlsHost?: HTMLElement | null;
  slide: ParsedComponent;
  /** Unik key per slide — byts när slide ändras så state reset:as (steg-system) */
  slideKey: string | number;
  /** Inline-edit-mode: när true kan man klicka på text i preview för att redigera direkt. */
  editMode?: boolean;
  /** Callback när en prop uppdateras via inline-editorn. `previous` = texten som visades; mode "remove" = Ta bort. */
  onUpdateProp?: (propName: string, value: string, previous?: string, mode?: "remove") => void;
  /** Callback när markdown-children uppdateras via inline-editorn. */
  onUpdateContent?: (content: string) => void;
  /** Callback när en overlay-prop uppdateras (t.ex. FloatingImage's x/y/width). */
  onUpdateOverlayProp?: (overlayIndex: number, propName: string, value: string) => void;
  /** Callback för att ta bort en overlay från sliden. */
  onDeleteOverlay?: (overlayIndex: number) => void;
  /** Stegraden under duken ändrar slidens stegAv/hoppaSteg (lib/step-config.ts). */
  onStepConfigChange?: (config: StepConfig | undefined) => void;
}

/**
 * Renderar en ParsedComponent direkt som React-tree.
 *
 * Används av editorns live-preview: ändringar i fält ger omedelbar
 * visuell feedback, ingen iframe-reload, ingen save-latens.
 *
 * Wrappar i SlideStepsProvider så templates som använder useSlideSteps
 * (NumberedReveal, Timeline, PollQuestion m.fl.) fungerar korrekt.
 *
 * Wrappar också i EditProvider så templates som använder <EditableText>
 * får tillgång till edit-mode-flaggan och update-callbacks.
 */
export function SlideRenderer({
  stepControlsHost,
  slide,
  slideKey,
  editMode = false,
  onUpdateProp,
  onUpdateContent,
  onUpdateOverlayProp,
  onDeleteOverlay,
  onStepConfigChange,
}: SlideRendererProps) {
  const controllerRef = useRef<StepController | null>(null);
  const stepConfig = parseStepConfig(slide.props);

  // Piltangenterna driver stegen i förhandsvisningen.
  //
  // Providern har alltid funnits här, men ingenting anropade dess controller —
  // så ★-mallar registrerade sina steg och fastnade på det första. Man kunde
  // bygga en stegvis slide i R-läget utan att någonsin se den byggas.
  //
  // Vänster/höger är lediga i editorn: den navigerar mellan slides med j/k och
  // pil upp/ner. Samma tangenter som i presentationsvyn, så vanan följer med.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      // Skriver man i ett fält är pilarna textnavigering, inte stegning.
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
      ) {
        return;
      }
      const c = controllerRef.current;
      if (!c || c.getTotalSteps() < 2) return;
      const moved = e.key === "ArrowRight" ? c.tryNextStep() : c.tryPrevStep();
      if (moved) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <EditProvider
      editMode={editMode}
      slideContent={slide.content ?? ""}
      updateProp={onUpdateProp ?? (() => {})}
      updateContent={onUpdateContent ?? (() => {})}
    >
      <SlideStepsProvider key={`${slideKey}:${String(slide.props.scene ?? "")}`} slideKey={slideKey} controllerRef={controllerRef} config={stepConfig}>
        {renderComponent(slide, undefined, { onUpdateOverlayProp, onDeleteOverlay })}
        {stepControlsHost && <EditorStepControls host={stepControlsHost} onChange={onStepConfigChange} />}
      </SlideStepsProvider>
    </EditProvider>
  );
}

/**
 * Stegraden under duken: gå mellan slidens klicksteg, och välj vilka av mallens
 * steg som ska visas. En siffra per steg — klicka för att hoppa över det (det
 * som skulle ha kommit där kommer då med nästa klick) eller ta tillbaka det.
 * "Visa allt direkt" gör sliden färdig från början, utan klick. Sparas som
 * stegAv / hoppaSteg på sliden och gäller i spelaren (lib/step-config.ts).
 */
function EditorStepControls({ host, onChange }: { host: HTMLElement; onChange?: (config: StepConfig | undefined) => void }) {
  const steps = useContext(SlideStepsContext);
  if (!steps || steps.totalSteps < 2) return null;
  const total = steps.totalSteps;
  const visible = steps.visibleSteps ?? Array.from({ length: total }, (_, i) => i);
  const position = Math.max(0, visible.indexOf(steps.currentStep));
  const final = steps.stepConfig?.final === true;
  const skip = steps.stepConfig?.skip ?? [];
  const go = (at: number) => {
    const target = visible[at];
    if (target !== undefined) steps.goToStep?.(target);
  };
  return createPortal(<div className="flex items-center gap-2 text-xs text-text" aria-label="Klicksteg i förhandsvisningen">
    <button type="button" aria-label="Föregående klicksteg" title="Vänsterpil" disabled={position === 0} onClick={() => go(position - 1)} className="rounded border border-white/20 px-2 py-1 disabled:opacity-30">←</button>
    <span className="tabular-nums">Steg {position + 1}/{visible.length}</span>
    <button type="button" aria-label="Nästa klicksteg" title="Högerpil" disabled={position >= visible.length - 1} onClick={() => go(position + 1)} className="rounded border border-white/20 px-2 py-1 disabled:opacity-30">→</button>
    {onChange ? (
      <>
        <span aria-hidden className="mx-1 h-4 w-px bg-white/15" />
        <span className="text-text-muted" title="Klicka på en siffra för att hoppa över det steget i presentationen">Visa steg</span>
        {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
          const skipped = final ? n !== total : skip.includes(n);
          const current = steps.currentStep === n - 1;
          return (
            <button
              key={n}
              type="button"
              disabled={final}
              aria-pressed={!skipped}
              title={skipped ? `Steg ${n} hoppas över. Klicka för att visa det igen.` : n === 1 ? "Hoppa över utgångsläget: sliden börjar på nästa steg" : `Hoppa över steg ${n}: det kommer med nästa klick`}
              onClick={() => {
                const next = toggleSkip(skip, n);
                onChange(next.length > 0 ? { skip: next } : undefined);
              }}
              className={`h-6 min-w-6 rounded border px-1.5 font-mono tabular-nums disabled:cursor-default ${
                skipped
                  ? "border-white/10 text-text-muted/50 line-through"
                  : current
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-white/25 text-text"
              }`}
            >
              {n}
            </button>
          );
        })}
        <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-text-muted" title="Sliden visas färdig direkt, utan klick">
          <input
            type="checkbox"
            checked={final}
            onChange={(e) => onChange(e.target.checked ? { final: true } : skip.length > 0 ? { skip } : undefined)}
          />
          Visa allt direkt
        </label>
      </>
    ) : null}
  </div>, host);
}

interface RenderContext {
  onUpdateOverlayProp?: (overlayIndex: number, propName: string, value: string) => void;
  onDeleteOverlay?: (overlayIndex: number) => void;
}

/**
 * Slå upp en template i @/templates. Endast taggar som ser ut som
 * komponentnamn (versal initial) och vars export faktiskt är renderbar —
 * funktion, eller objekt som memo/forwardRef ger.
 */
function resolveFromTemplates(
  tag: string,
): ComponentType<Record<string, unknown>> | undefined {
  if (!/^[A-Z]/.test(tag)) return undefined;
  const candidate = (Templates as Record<string, unknown>)[tag];
  if (typeof candidate === "function") {
    return candidate as ComponentType<Record<string, unknown>>;
  }
  if (typeof candidate === "object" && candidate !== null && "$$typeof" in candidate) {
    return candidate as ComponentType<Record<string, unknown>>;
  }
  return undefined;
}

function renderComponent(
  comp: ParsedComponent,
  key?: React.Key,
  ctx: RenderContext = {},
): React.ReactNode {
  // Mallarna slås upp direkt i @/templates (3 oktober 2026). Ett handskrivet register låg
  // tidigare 25 mallar efter, och slides som renderade i presentationsvyn blev en röd
  // "Okänd template" i editorn. Wrappningen sker vid uppslagningen, så att varje mall får
  // samma bakgrund i previewn som i presentationen.
  const resolved = resolveFromTemplates(comp.tag);
  const Component = resolved ? wrapWithSlideBg(resolved) : undefined;

  if (!Component) {
    return (
      <div
        key={key}
        className="flex h-full items-center justify-center bg-red-950/40 p-8 text-center text-red-300"
      >
        <div>
          <div className="mb-2 font-mono text-xs uppercase tracking-wider text-red-400">
            Okänd template
          </div>
          <div className="font-mono">{comp.tag}</div>
        </div>
      </div>
    );
  }

  // Bygg children: nested ParsedComponents har företräde, annars markdown från content
  let children: React.ReactNode = null;
  if (comp.children.length > 0) {
    children = comp.children.map((c, i) => renderComponent(c, i, ctx));
  } else if (comp.content != null && comp.content.trim() !== "") {
    children = markdownToReact(comp.content);
  }

  // Filtrera bort null/undefined/true boolean props (MDX shorthand)
  const cleanProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(comp.props)) {
    if (v !== null && v !== undefined) cleanProps[k] = v;
  }

  const baseElement = (
    <Component key={key} {...cleanProps}>
      {children}
    </Component>
  );

  // Om sliden har overlays, wrap i SlideWithOverlays-container så overlays
  // (t.ex. FloatingImage) kan absolutpositioneras ovanpå templaten.
  // Varje overlay får en OverlayInstanceProvider med callbacks som muterar
  // PARENT slidens overlays-array (inte parent slidens egna props).
  if (comp.overlays && comp.overlays.length > 0) {
    const SlideWithOverlays = Templates.SlideWithOverlays as ComponentType<{
      children?: React.ReactNode;
    }>;
    const renderedOverlays = comp.overlays.map((overlay, i) => (
      <Templates.OverlayInstanceProvider
        key={`overlay-${i}`}
        value={{
          index: i,
          onUpdateProp: ctx.onUpdateOverlayProp
            ? (prop, val) => ctx.onUpdateOverlayProp?.(i, prop, val)
            : undefined,
          onDelete: ctx.onDeleteOverlay
            ? () => ctx.onDeleteOverlay?.(i)
            : undefined,
        }}
      >
        {renderComponent(overlay, `overlay-${i}-content`, ctx)}
      </Templates.OverlayInstanceProvider>
    ));

    if (SlideWithOverlays) {
      return (
        <SlideWithOverlays key={key}>
          {baseElement}
          {renderedOverlays}
        </SlideWithOverlays>
      );
    }
    // Fallback: enkel relative-container
    return (
      <div
        key={key}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        {baseElement}
        {renderedOverlays}
      </div>
    );
  }

  return baseElement;
}
