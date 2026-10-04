"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { ParsedComponent } from "@/lib/mdx-parser";
import type { SlideGradientValue } from "@/lib/types";
import { resolveGradient } from "@/lib/gradient-presets";
import { getTheme, themeToCssVars } from "@/themes";
import { SlideGradientLayer } from "../SlideGradientLayer";
import { SlideBgVideoContext } from "../SlideBgVideo";
import { SlideRenderer } from "./SlideRenderer";
import { ObjectLayer, type ObjectPatch } from "./ObjectLayer";
import { InlineTextFallback } from "./InlineTextFallback";
import type { TextEdit } from "@/lib/text-source";
import type { StepConfig } from "@/lib/step-config";

interface EditorPreviewProps {
  slide: ParsedComponent | undefined;
  slideIndex: number;
  total: number;
  theme?: string;
  /** Per-slide gradient-bakgrund (1-indexerat) — samma map som presentationen läser. */
  slideGradients?: Record<string, SlideGradientValue>;
  /** Per-slide accent-override (1-indexerat). */
  slideAccents?: Record<string, string>;
  /** Per-slide text-override. */
  slideTextColors?: Record<string, string>;
  /** Per-slide muted-text-override. */
  slideMutedColors?: Record<string, string>;
  /** Global accent-override. */
  accentOverride?: string;
  /** Deckets egna färger (filmfarg, seriefarger) som CSS-variabler. Se lib/deck-colors.ts. */
  deckColorVars?: Record<string, string>;
  /** Global text-override. */
  textOverride?: string;
  /** Global muted-override. */
  mutedOverride?: string;
  /** Inline-edit-mode på/av. */
  editMode?: boolean;
  /** Toggle inline-edit. */
  onToggleEditMode?: () => void;
  /** Uppdatera en prop på aktiv slide. `previous` är texten som visades. */
  onUpdateProp?: (propName: string, value: string, previous?: string, mode?: "remove") => void;
  /** Skriv i sliden där mallen saknar handtag: ändringen räknad ur källan (lib/text-source.ts). */
  onApplyTextEdit?: (edit: TextEdit) => void;
  /** Stegraden: vilka klicksteg som visas (stegAv / hoppaSteg). */
  onStepConfigChange?: (config: StepConfig | undefined) => void;
  /** Uppdatera markdown-children på aktiv slide. */
  onUpdateContent?: (content: string) => void;
  /** Uppdatera en prop på en av aktiv slides overlays. */
  onUpdateOverlayProp?: (overlayIndex: number, propName: string, value: string) => void;
  /** Ta bort en overlay från aktiv slide. */
  onDeleteOverlay?: (overlayIndex: number) => void;

  /* Objektlagret */
  objectSelection: number[];
  onObjectSelectionChange: (indices: number[]) => void;
  editingObject: number | null;
  onEditingObjectChange: (index: number | null) => void;
  onPatchObjects: (patches: ObjectPatch[]) => void;
  onDeleteObjects: (indices: number[]) => void;
  onDuplicateObjects: (indices: number[]) => void;
  onStepObjectsZ: (indices: number[], direction: 1 | -1, extreme: boolean) => void;
  onReplaceObjectMedia: (index: number) => void;
  onCopyObjects: (indices: number[]) => void;
  /** Filer släppta på duken, med släpp-punkten i procent av sliden. */
  onDropFiles?: (files: File[], at: { x: number; y: number }) => void;
}

// Designstorlek som presentation-views är byggda för.
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

// Konstant referens — ett nytt objekt per render hade gjort om context-värdet
// och remountat hela videolagret varje gång Joel trycker j eller k.
const EDITOR_VIDEO_MODE = { editor: true } as const;

type ZoomMode = "fit" | number;

/**
 * Live-preview som renderar aktuell slide direkt i React.
 *
 * Storlekssättning:
 *  - "fit" (default): största 16:9-rektangeln som får plats,
 *    1920×1080 skalas till containerns bredd.
 *  - Number (0.5–3): manuell zoom, multiplicerar fit-scalen.
 *    Containern får overflow:auto så man kan scrolla vid > 1×.
 */
export function EditorPreview({
  slide,
  slideIndex,
  total,
  theme,
  slideGradients,
  slideAccents,
  slideTextColors,
  slideMutedColors,
  accentOverride,
  deckColorVars,
  textOverride,
  mutedOverride,
  editMode = false,
  onToggleEditMode,
  onUpdateProp,
  onUpdateContent,
  onApplyTextEdit,
  onStepConfigChange,
  onUpdateOverlayProp,
  onDeleteOverlay,
  objectSelection,
  onObjectSelectionChange,
  editingObject,
  onEditingObjectChange,
  onPatchObjects,
  onDeleteObjects,
  onDuplicateObjects,
  onStepObjectsZ,
  onReplaceObjectMedia,
  onCopyObjects,
  onDropFiles,
}: EditorPreviewProps) {
  void onToggleEditMode;
  const themeTokens = getTheme(theme);
  const baseCssVars = themeToCssVars(themeTokens);
  // Override-ordning: tema → global override → per-slide override (slide vinner)
  const slideKey = String(slideIndex + 1);
  const cssVars: Record<string, string> = { ...baseCssVars };
  if (accentOverride) cssVars["--accent"] = accentOverride;
  if (textOverride) cssVars["--text"] = textOverride;
  if (mutedOverride) cssVars["--text-muted"] = mutedOverride;
  if (deckColorVars) Object.assign(cssVars, deckColorVars);
  const slideA = slideAccents?.[slideKey];
  const slideT = slideTextColors?.[slideKey];
  const slideM = slideMutedColors?.[slideKey];
  if (slideA) cssVars["--accent"] = slideA;
  if (slideT) cssVars["--text"] = slideT;
  if (slideM) cssVars["--text-muted"] = slideM;

  // Gradienten måste renderas HÄR, inte bara i presentationen. Annars designar
  // Joel blint i R-läget — och blind design i R-läget är precis det knöliga
  // han klagade på. Samma resolver, samma lager, samma --slide-base-knep som
  // SlideViewer använder.
  const gradientConfig = useMemo(
    () => resolveGradient(slideGradients?.[slideKey]),
    [slideGradients, slideKey],
  );
  if (gradientConfig) cssVars["--slide-base"] = "transparent";

  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  // Canvas-mått = exakt samma 16:9-yta som presentationens slide-scen
  // (SlideViewer): min(100vw, 100vh·16/9) × min(100vh, 100vw·9/16). Templates
  // sätter text i vw (t.ex. clamp(…, 2.6vw, …)) och FloatingImage i %. Renderar
  // vi editorn i en FAST 1920-canvas men presentationen i fönstrets verkliga
  // bredd, blir vw-texten en annan bråkdel av sliden i de två lägena — och då
  // hamnar en handplacerad bild "rätt" i editorn men fel i presentationen.
  // Genom att ge editorn samma viewport-relativa yta blir bråkdelarna lika.
  const [canvas, setCanvas] = useState({ w: DESIGN_WIDTH, h: DESIGN_HEIGHT });
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const [stepControlsHost, setStepControlsHost] = useState<HTMLDivElement | null>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      // Slide-ytan = den 16:9-yta presentationen får i FULLSKÄRM (normalläget).
      // Använd skärmens mått, INTE fönstrets: ett maximerat redigerings-fönster
      // har samma bredd som skärmen men lägre höjd (browser-chrome), vilket
      // annars skulle ge en smalare 16:9-yta än fullskärm → bild + vw-text
      // hamnar på en annan bråkdel än i den faktiska presentationen.
      const sw = window.screen?.width || window.innerWidth;
      const sh = window.screen?.height || window.innerHeight;
      const cw = Math.min(sw, (sh * 16) / 9);
      const ch = Math.min(sh, (sw * 9) / 16);
      setCanvas({ w: cw, h: ch });
      // Största skalan där hela slide-ytan får plats i preview-containern
      const s = Math.min(w / cw, h / ch);
      setFitScale(s);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    // Fönster-resize ändrar vw/vh även om panelen står still
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const effectiveScale = zoom === "fit" ? fitScale : fitScale * zoom;
  const displayPct = Math.round(effectiveScale * 100);

  // När zoom > fit: containern scrollar. När zoom = fit: centrera med flex.
  const isOverflow = zoom !== "fit" && zoom > 1;

  const overlays = slide?.overlays ?? [];

  // Släpp bildfiler på duken: punkten räknas om till procent av sliden.
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    setDropActive(false);
    if (!onDropFiles) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (files.length === 0) return;
    e.preventDefault();
    const rect = rootRef.current?.getBoundingClientRect();
    const at = rect
      ? { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }
      : { x: 50, y: 50 };
    onDropFiles(files, at);
  };

  return (
    <div className="flex h-full flex-col bg-black">
      <div
        ref={containerRef}
        className={`relative flex-1 bg-black ${
          isOverflow ? "overflow-auto" : "flex items-center justify-center overflow-hidden"
        }`}
        onDragOver={(e) => {
          if (!onDropFiles || !Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          if (!dropActive) setDropActive(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setDropActive(false);
        }}
        onDrop={handleDrop}
      >
        {slide && (
          <div
            ref={rootRef}
            className="presentation-root shrink-0"
            data-ornament={themeTokens.ornamentStyle}
            data-theme={theme ?? "default"}
            style={{
              position: "relative",
              width: canvas.w,
              height: canvas.h,
              // Duken är en storlekscontainer: mallar som sätter text i cqw/cqh
              // (språkföreläsningens scener) mäter mot duken, inte mot fönstret.
              // Utan det blev texten dubbelt så stor i editorn som i spelaren.
              containerType: "size",
              // bg-bg-klassen målade var(--bg) opakt och hade dolt
              // gradientlagret helt. Inline-bakgrunden blir transparent så
              // fort en gradient finns.
              background: gradientConfig ? "transparent" : "var(--bg)",
              backgroundImage: gradientConfig ? "none" : "var(--theme-slide-background, none)",
              transform: `scale(${effectiveScale})`,
              transformOrigin: isOverflow ? "top left" : "center center",
              // Vid overflow: reservera utrymme så scroll-barer hittar rätt
              marginBottom: isOverflow
                ? `${-(canvas.h * (1 - effectiveScale))}px`
                : undefined,
              marginRight: isOverflow
                ? `${-(canvas.w * (1 - effectiveScale))}px`
                : undefined,
              // Objektlagrets handtag räknar om sig med skalan så de är lika
              // stora på skärmen oavsett zoom.
              ["--editor-scale" as string]: String(effectiveScale),
              ...(cssVars as CSSProperties),
            }}
          >
            {/* Gradienten ligger INNANFÖR samma canvas.w × canvas.h-yta som
                sliden, till skillnad från presentationen där den täcker hela
                viewporten. På en icke-16:9-skärm letterboxas scenen där, och
                då blöder gradienten ut till skärmkanten medan en bild- eller
                videobakgrund stannar vid letterbox-kanten. */}
            {gradientConfig ? (
              <div className="absolute inset-0 overflow-hidden">
                <SlideGradientLayer config={gradientConfig} />
              </div>
            ) : null}
            <div
              className={`absolute inset-0${
                gradientConfig ? " slide-gradient-host" : ""
              }`}
            >
              <SlideBgVideoContext.Provider value={EDITOR_VIDEO_MODE}>
                <SlideRenderer
                  stepControlsHost={stepControlsHost}
                  slide={slide}
                  slideKey={`${slideIndex}-${slide.tag}`}
                  editMode={editMode}
                  onUpdateProp={onUpdateProp}
                  onUpdateContent={onUpdateContent}
                  onUpdateOverlayProp={onUpdateOverlayProp}
                  onDeleteOverlay={onDeleteOverlay}
                  onStepConfigChange={onStepConfigChange}
                />
              </SlideBgVideoContext.Provider>
            </div>
            {editMode ? (
              // Nyckeln byter lagret när sliden byts: inget pågående drag eller
              // gammal markering följer med till nästa slide.
              <ObjectLayer
                key={`${slideIndex}-${slide.tag}`}
                rootRef={rootRef}
                overlays={overlays}
                selection={objectSelection}
                onSelectionChange={onObjectSelectionChange}
                editingIndex={editingObject}
                onEditingChange={onEditingObjectChange}
                scale={effectiveScale}
                canvas={canvas}
                onPatch={onPatchObjects}
                onDelete={onDeleteObjects}
                onDuplicate={onDuplicateObjects}
                onStepZ={onStepObjectsZ}
                onReplaceMedia={onReplaceObjectMedia}
                onCopy={onCopyObjects}
                toolbarHost={toolbarHost}
              />
            ) : null}
            {editMode && onApplyTextEdit ? (
              <InlineTextFallback key={`text-${slideIndex}-${slide.tag}`} rootRef={rootRef} slide={slide} onApply={onApplyTextEdit} />
            ) : null}
          </div>
        )}
        {/* Verktygsraden för markerade objekt portalas hit — oskalat, ovanpå duken. */}
        <div ref={setToolbarHost} className="pointer-events-none absolute inset-0 z-20" />
        {dropActive ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-accent/10">
            <div className="rounded-lg border-2 border-dashed border-accent bg-bg/90 px-5 py-3 text-sm text-accent">
              Släpp för att lägga bilden på sliden
            </div>
          </div>
        ) : null}
      </div>

      {/* Zoom-kontroller nederst */}
      <div className="flex items-center justify-between border-t border-white/5 bg-bg-surface/30 px-3 py-1">
        <span className="text-[0.65rem] uppercase tracking-wider text-text-muted/60">
          Live · {slideIndex + 1}/{total}
        </span>
        <div ref={setStepControlsHost} />
        <div className="flex items-center gap-1">
          <ZoomButton
            onClick={() =>
              setZoom((z) => {
                const base = z === "fit" ? 1 : z;
                return Math.max(0.5, Math.round((base - 0.1) * 10) / 10);
              })
            }
            title="Mindre"
          >
            −
          </ZoomButton>
          <button
            onClick={() => setZoom("fit")}
            className={`min-w-[3.5rem] rounded px-2 py-0.5 text-[0.7rem] font-mono tabular-nums transition-all ${
              zoom === "fit"
                ? "bg-accent/20 text-accent"
                : "text-text-muted hover:text-text"
            }`}
            title="Anpassa till fönster"
          >
            {zoom === "fit" ? `fit ${displayPct}%` : `${displayPct}%`}
          </button>
          <ZoomButton
            onClick={() =>
              setZoom((z) => {
                const base = z === "fit" ? 1 : z;
                return Math.min(3, Math.round((base + 0.1) * 10) / 10);
              })
            }
            title="Större"
          >
            +
          </ZoomButton>
          <button
            onClick={() => setZoom(1)}
            className="ml-1 rounded border border-white/10 px-1.5 py-0.5 text-[0.65rem] text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Återställ till 100 %"
          >
            1:1
          </button>
        </div>
      </div>
    </div>
  );
}

function ZoomButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-sm text-text-muted transition-all hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  );
}
