"use client";

import type { CSSProperties } from "react";
import { useInlineEdit } from "@/lib/inline-edit";
import { useIsOverlay, useOverlayInstance } from "./SlideWithOverlays";
import { useObjectStep } from "./object-step";

/**
 * FloatingShape — en form ovanpå en slide: rektangel, ellips, linje eller pil.
 *
 * Färgerna är temats roller som standard (accent, bläck, papper), så formen
 * följer med vid temabyte. Formen ritar bara sig själv; flytt, storlek och
 * rotation sköter editorns objektlager via data-object-index.
 *
 * ```mdx
 * <FloatingShape shape="rect" x="10%" y="20%" width="30%" height="25%" fill="var(--accent)" radius="0.5rem" />
 * <FloatingShape shape="ellipse" x="60%" y="30%" width="20%" height="35%" fill="var(--bg-surface)" stroke="var(--text)" strokeWidth="3px" />
 * <FloatingShape shape="arrow" x="10%" y="50%" width="30%" height="1.5%" fill="var(--text)" rotation={-20} />
 * ```
 *
 * Linje och pil fyller sin ruta: rutans höjd är tjockleken och rotationen
 * riktningen. Pilspetsen är tre gånger tjockleken och sticker ut över rutan.
 */

export type ShapeKind = "rect" | "ellipse" | "line" | "arrow";

interface FloatingShapeProps {
  shape?: ShapeKind;
  /** Läge och storlek i procent av sliden. */
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  /** Fyllning (CSS-färg eller temaroll). Default temats accent. */
  fill?: string;
  /** Kontur för rektangel och ellips. */
  stroke?: string;
  /** Konturens tjocklek (CSS-längd). Default ingen kontur. */
  strokeWidth?: string;
  /** Hörnradie för rektangel (CSS-längd). */
  radius?: string;
  /** Rotation i grader. */
  rotation?: number;
  /** Opacitet 0–1. */
  opacity?: number;
  zIndex?: number;
  layer?: "front" | "back";
  /** Syns efter så många klick (0 eller inget = från början). */
  step?: number | string;
  /** Försvinner vid det här klicket. */
  until?: number | string;
  /** Låst i editorn. */
  locked?: boolean;
  /** Namn i editorns lagerlista. */
  name?: string;
}

export function FloatingShape({
  shape = "rect",
  x = "30%",
  y = "30%",
  width = "20%",
  height,
  fill = "var(--accent)",
  stroke,
  strokeWidth,
  radius,
  rotation = 0,
  opacity = 1,
  zIndex,
  layer = "front",
  step,
  until,
  locked,
  name: _name,
}: FloatingShapeProps) {
  void _name;
  const { editMode } = useInlineEdit();
  const isOverlay = useIsOverlay();
  const { index } = useOverlayInstance();
  const shown = useObjectStep(step, until);
  const thin = shape === "line" || shape === "arrow";
  const effectiveZIndex = zIndex ?? (layer === "back" ? 1 : 10);
  const border = stroke && strokeWidth && strokeWidth !== "0" ? `${strokeWidth} solid ${stroke}` : undefined;

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height: height || (thin ? "1.2%" : "20%"),
    transform: `rotate(${rotation}deg)`,
    // Klicksteg: dolt i spelaren, dämpat i editorn så att det går att placera.
    opacity: shown ? opacity : editMode ? 0.3 : 0,
    pointerEvents: shown || editMode ? undefined : "none",
    transition: "opacity 320ms ease",
    zIndex: effectiveZIndex,
    cursor: editMode && !locked ? "grab" : "default",
    userSelect: "none",
    touchAction: "none",
    display: thin ? "flex" : undefined,
    alignItems: thin ? "center" : undefined,
  };

  const body = thin ? (
    <>
      <div style={{ flex: "1 1 auto", height: "100%", background: fill, minWidth: 0 }} />
      {shape === "arrow" ? (
        // Spetsen: tre gånger tjockleken, kvadratisk via aspect-ratio, klippt till en triangel.
        <div
          aria-hidden
          style={{
            flex: "0 0 auto",
            height: "300%",
            aspectRatio: "1 / 1",
            marginLeft: "-1px",
            background: fill,
            clipPath: "polygon(0 0, 100% 50%, 0 100%)",
          }}
        />
      ) : null}
    </>
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: fill,
        border,
        borderRadius: shape === "ellipse" ? "50%" : radius || 0,
        boxSizing: "border-box",
      }}
    />
  );

  const element = (
    <div
      data-object-index={editMode && isOverlay && index !== undefined ? index : undefined}
      data-object-kind={editMode ? "shape" : undefined}
      data-object-locked={editMode && locked ? "" : undefined}
      data-object-hidden={editMode && !shown ? "" : undefined}
      style={wrapperStyle}
    >
      {body}
    </div>
  );

  if (isOverlay) return element;

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--slide-base, var(--bg))" }}>
      {element}
    </div>
  );
}
