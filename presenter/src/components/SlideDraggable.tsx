"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useInlineEdit } from "@/lib/inline-edit";

/**
 * SlideDraggable — gör figuren och symbolen i withSlideBg flyttbara i R-läget.
 *
 * Byggd 2026-09-03 på Joels fråga om man kan dra bilderna fritt. Lånar
 * mönstret från FloatingImage: pointerdown med tröskel, livepositionering
 * i procent av sliden (så att det stämmer även när förhandsvisningen är
 * nedskalad), och updateProp vid släpp. Ett hörnhandtag ändrar höjden.
 *
 * Utanför R-läget renderar den bara sitt barn på angiven plats — ingen
 * lyssnare, inga handtag, ingen skillnad mot förut.
 *
 * Positionen sparas som `<kind>X` / `<kind>Y`: mittpunkten i procent av
 * slidens bredd och höjd. Finns de vinner de över `<kind>Align`; tas de bort
 * (designfliken: «Till läge») faller lagret tillbaka på läget.
 */

interface SlideDraggableProps {
  /** "figure" | "symbol" — prefix för props som skrivs. */
  kind: "figure" | "symbol";
  /** Position via ett fast läge (när X/Y saknas). */
  presetStyle: CSSProperties;
  /** Fri position, mittpunkt i procent av sliden. */
  x?: number;
  y?: number;
  /** Rotation i grader (figuren). Läggs på efter centreringen. */
  rotate?: number;
  /** Nuvarande höjd som CSS-längd, t.ex. "72vh". Skrivs om vid resize. */
  size: string;
  zIndex?: number;
  children: ReactNode;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function SlideDraggable({ kind, presetStyle, x, y, rotate = 0, size, zIndex, children }: SlideDraggableProps) {
  const { editMode, updateProp } = useInlineEdit();
  const ref = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const free = typeof x === "number" && typeof y === "number";

  useEffect(() => {
    if (!selected || !editMode) return;
    const off = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setSelected(false);
    };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [selected, editMode]);

  // I R-läget ligger innehållslagret (zIndex 1) över figur-/symbollagret
  // (zIndex 0) och fångar alla pekhändelser, även där lagret är tomt. Lyft
  // lagret medan redigering pågår så att figuren går att ta tag i; utanför
  // R-läget rörs ingenting.
  useEffect(() => {
    const layer = ref.current?.parentElement as HTMLElement | null;
    if (!layer || !editMode) return;
    const prev = layer.style.zIndex;
    layer.style.zIndex = "5";
    return () => {
      layer.style.zIndex = prev;
    };
  }, [editMode]);

  /** Slidens rektangel = lagrets offsetParent (absolut, inset 0 över sliden). */
  const slideRect = () => {
    const el = ref.current?.offsetParent as HTMLElement | null;
    return el ? el.getBoundingClientRect() : null;
  };

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!editMode || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(true);
      const el = ref.current;
      const rect = slideRect();
      if (!el || !rect) return;
      // Startpunkt: mittpunkten där den står nu, oavsett om den kom från ett
      // läge eller från fria koordinater.
      const box = el.getBoundingClientRect();
      const startCx = ((box.left + box.width / 2 - rect.left) / rect.width) * 100;
      const startCy = ((box.top + box.height / 2 - rect.top) / rect.height) * 100;
      const mx = e.clientX;
      const my = e.clientY;
      let moved = false;
      let cx = startCx;
      let cy = startCy;
      const onMove = (mv: PointerEvent) => {
        const dx = mv.clientX - mx;
        const dy = mv.clientY - my;
        if (!moved) {
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
          moved = true;
          setBusy(true);
          // Släpp läget: från och med nu positioneras mittpunkten fritt.
          Object.assign(el.style, { left: "", right: "", top: "", bottom: "" });
        }
        cx = clamp(startCx + (dx / rect.width) * 100, -20, 120);
        cy = clamp(startCy + (dy / rect.height) * 100, -20, 120);
        el.style.left = `${cx}%`;
        el.style.top = `${cy}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${rotate}deg)`;
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setBusy(false);
        if (!moved) return;
        updateProp(`${kind}X`, cx.toFixed(1));
        updateProp(`${kind}Y`, cy.toFixed(1));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [editMode, kind, rotate, updateProp],
  );

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      if (!editMode || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      setSelected(true);
      const el = ref.current;
      const rect = slideRect();
      if (!el || !rect) return;
      const box = el.getBoundingClientRect();
      const startH = box.height; // skärmpixlar (skalade)
      // Storleken sparas i vh. I R-läget är sliden en 1920×1080-duk som skalas
      // med transform, så skärmpixlar måste först delas med skalan och sedan
      // sättas i relation till dukens höjd — i presentationen är duken lika
      // med fönstret och skalan 1, så samma formel gäller där.
      const canvas = el.offsetParent as HTMLElement | null;
      const canvasH = canvas?.offsetHeight || rect.height;
      const scale = rect.height / canvasH || 1;
      const my = e.clientY;
      const mx = e.clientX;
      // Mittpunkten ska ligga still under resize — lås den först.
      const cx = ((box.left + box.width / 2 - rect.left) / rect.width) * 100;
      const cy = ((box.top + box.height / 2 - rect.top) / rect.height) * 100;
      let moved = false;
      let vh = (startH / scale / canvasH) * 100;
      const onMove = (mv: PointerEvent) => {
        const d = Math.max(mv.clientY - my, mv.clientX - mx);
        if (!moved) {
          if (Math.abs(d) < 4) return;
          moved = true;
          setBusy(true);
          Object.assign(el.style, { left: `${cx}%`, right: "", top: `${cy}%`, bottom: "", transform: `translate(-50%, -50%) rotate(${rotate}deg)` });
        }
        vh = clamp(((startH + d) / scale / canvasH) * 100, 6, 160);
        el.style.height = `${vh}vh`;
        el.style.width = "auto";
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setBusy(false);
        if (!moved) return;
        updateProp(`${kind}Size`, `${vh.toFixed(1)}vh`);
        if (!free) {
          updateProp(`${kind}X`, cx.toFixed(1));
          updateProp(`${kind}Y`, cy.toFixed(1));
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [editMode, free, kind, rotate, updateProp],
  );

  const pos: CSSProperties = free
    ? { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }
    : presetStyle;

  return (
    <div
      ref={ref}
      data-slide-draggable={kind}
      onPointerDown={editMode ? startDrag : undefined}
      style={{
        position: "absolute",
        height: size,
        width: "auto",
        zIndex,
        ...pos,
        pointerEvents: editMode ? "auto" : "none",
        cursor: editMode ? (busy ? "grabbing" : "grab") : undefined,
        outline: editMode && selected ? "2px dashed var(--accent)" : editMode ? "1px dashed color-mix(in srgb, var(--accent) 45%, transparent)" : "none",
        outlineOffset: 4,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {children}
      {editMode && selected ? (
        <div
          onPointerDown={startResize}
          title="Dra för att ändra storlek"
          style={{
            position: "absolute",
            right: -8,
            bottom: -8,
            width: 16,
            height: 16,
            background: "var(--accent)",
            border: "2px solid var(--bg)",
            cursor: "nwse-resize",
            pointerEvents: "auto",
          }}
        />
      ) : null}
    </div>
  );
}
