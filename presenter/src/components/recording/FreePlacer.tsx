"use client";

import { useEffect, useRef, useState } from "react";
import type { FreeLayout, FreeRect } from "@/lib/recording/types";
import s from "./inspelningar.module.css";

/**
 * Placera dig fritt på en slide (2 oktober 2026). Sliden stort med dig ovanpå, som filmen kommer att
 * visa dig. Dra för att flytta och ta i hörnet för att ändra storleken. Frilagd skalar runt fötterna
 * (mitt under personen), så att du står kvar där du stod; rutan skalar runt sitt övre vänstra hörn.
 * Pilarna flyttar (Skift: mer), plus och minus ändrar storleken. Det som hamnar utanför bilden dämpas,
 * som i en beskärning. Måtten är filmens (1920 × 1080), samma som exporten använder.
 */

const W = 1920;
const H = 1080;
/** Hur mycket av dig som minst ska synas i bilden, i filmens bildpunkter. */
const VISIBLE = 60;

/** Var personen står i kamerabilden, som friläggningen mätte (underlag/mask.json). */
export interface PersonSummary { width: number; height: number; center: number; top: number; bottom: number; left?: number; right?: number }

export function FreePlacer({ title, frames, personImage, boxImage, person, layout, initial, presets, onSave, onCancel }: {
  title: string;
  /** Bildrutor ur inspelningen, en per klicksteg. Den sista visas först. */
  frames: { label: string; src: string }[];
  /** Du frilagd (hela kamerabilden, genomskinlig runt dig), eller null före friläggningen. */
  personImage: string | null;
  /** Kameran i rutans form (bildläget ruta), eller null. */
  boxImage: string | null;
  person: PersonSummary | null;
  layout: FreeLayout;
  initial: FreeRect;
  presets: { label: string; rect: FreeRect }[];
  onSave: (rect: FreeRect) => void;
  onCancel: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const select = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<FreeRect>(initial);
  const [frame, setFrame] = useState(Math.max(0, frames.length - 1));
  const [k, setK] = useState(0.5);
  const drag = useRef<{ kind: "move" | "size"; px: number; py: number; start: FreeRect; anchor: { x: number; y: number }; distance: number } | null>(null);

  useEffect(() => {
    const box = stage.current;
    if (!box) return;
    const update = () => setK(box.clientWidth / W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(box);
    select.current?.focus();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Lagrets mått: frilagd är hela kamerabilden (i kamerans bildpunkter), rutan är rutan.
  const unit = layout === "ruta" ? W : person?.width || W;
  const tall = layout === "ruta" ? (W * 3) / 4 : (unit * 9) / 16;
  // Personens ruta i lagret: friläggningens mätning, annars samma siluett som förhandsbilderna.
  const bounds = layout === "ruta"
    ? { left: 0, right: W, top: 0, bottom: tall }
    : person && person.left !== undefined && person.right !== undefined && person.right > person.left
      ? { left: person.left, right: person.right, top: person.top, bottom: person.bottom }
      : person
        ? { left: person.center - (person.bottom - person.top) * 0.28, right: person.center + (person.bottom - person.top) * 0.28, top: person.top, bottom: person.bottom }
        : { left: unit / 2 - tall * 0.22, right: unit / 2 + tall * 0.22, top: tall * 0.22, bottom: tall };
  const boxOf = (r: FreeRect) => {
    const f = r.w / unit;
    return { x: r.x + bounds.left * f, y: r.y + bounds.top * f, w: (bounds.right - bounds.left) * f, h: (bounds.bottom - bounds.top) * f };
  };
  /** Punkten som står still när storleken ändras: fötterna, eller rutans övre vänstra hörn. */
  const anchorOf = (r: FreeRect) => {
    const f = r.w / unit;
    return layout === "ruta" ? { x: r.x, y: r.y } : { x: r.x + ((bounds.left + bounds.right) / 2) * f, y: r.y + bounds.bottom * f };
  };
  /** Minst en bit av dig ska synas, annars går du inte att ta tag i. */
  const keep = (r: FreeRect): FreeRect => {
    const b = boxOf(r);
    const dx = b.x > W - VISIBLE ? W - VISIBLE - b.x : b.x + b.w < VISIBLE ? VISIBLE - b.x - b.w : 0;
    const dy = b.y > H - VISIBLE ? H - VISIBLE - b.y : b.y + b.h < VISIBLE ? VISIBLE - b.y - b.h : 0;
    return { ...r, x: r.x + dx, y: r.y + dy };
  };
  /** Ny bredd med ankaret kvar på samma ställe. */
  const resized = (r: FreeRect, width: number): FreeRect => {
    const w = Math.max(200, Math.min(W * 2, width));
    const anchor = anchorOf(r);
    if (layout === "ruta") return keep({ x: r.x, y: r.y, w });
    const f = w / unit;
    return keep({ x: anchor.x - ((bounds.left + bounds.right) / 2) * f, y: anchor.y - bounds.bottom * f, w });
  };

  const point = (event: React.PointerEvent) => {
    const box = stage.current!.getBoundingClientRect();
    return { x: (event.clientX - box.left) / k, y: (event.clientY - box.top) / k };
  };
  const begin = (kind: "move" | "size") => (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const anchor = anchorOf(rect);
    const at = point(event);
    drag.current = { kind, px: event.clientX, py: event.clientY, start: rect, anchor, distance: Math.max(1, Math.hypot(at.x - anchor.x, at.y - anchor.y)) };
  };
  const move = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current) return;
    if (current.kind === "move") {
      setRect(keep({ ...current.start, x: current.start.x + (event.clientX - current.px) / k, y: current.start.y + (event.clientY - current.py) / k }));
    } else {
      const at = point(event);
      setRect(resized(current.start, current.start.w * (Math.hypot(at.x - current.anchor.x, at.y - current.anchor.y) / current.distance)));
    }
  };
  const end = () => { drag.current = null; };
  const keys = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 40 : 8;
    if (event.key === "+" || event.key === "=") { event.preventDefault(); setRect(r => resized(r, r.w * 1.05)); return; }
    if (event.key === "-") { event.preventDefault(); setRect(r => resized(r, r.w / 1.05)); return; }
    const delta = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[event.key];
    if (!delta) return;
    event.preventDefault();
    setRect(r => keep({ ...r, x: r.x + delta[0], y: r.y + delta[1] }));
  };

  const box = boxOf(rect);
  const px = (value: number) => `${value * k}px`;
  return (
    <div className={s.placerBackdrop}>
      <div className={s.placer} role="dialog" aria-modal="true" aria-labelledby="placera-rubrik">
        <div className={s.placerHead}>
          <h3 id="placera-rubrik">Placera dig: {title}</h3>
          <p className={s.note}>Dra för att flytta och ta i hörnet för att ändra storleken. Pilarna flyttar, plus och minus ändrar storleken. Det som hamnar utanför bilden syns inte i filmen.</p>
        </div>
        {frames.length > 1 && (
          <div className={s.placerSteps} role="group" aria-label="Visa sliden vid klick">
            {frames.map((item, i) => <button key={item.src} type="button" aria-pressed={i === frame} onClick={() => setFrame(i)}>{item.label}</button>)}
          </div>
        )}
        <div className={s.placerView}>
          <div ref={stage} className={s.placerStage} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.placerFrame} src={frames[frame]?.src} alt="" draggable={false} />
            {layout === "ruta"
              ? boxImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className={s.box} src={boxImage} alt="" draggable={false} style={{ left: px(rect.x), top: px(rect.y), width: px(rect.w), height: px((rect.w * 3) / 4), borderRadius: px(22) }} />
                : <span className={s.box} style={{ left: px(rect.x), top: px(rect.y), width: px(rect.w), height: px((rect.w * 3) / 4), borderRadius: px(22) }} />
              : personImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className={s.person} src={personImage} alt="" draggable={false} style={{ left: px(rect.x), top: px(rect.y), width: px(rect.w) }} />
                : <span className={s.silhouette} style={{ left: px(box.x), top: px(box.y), width: px(box.w), height: px(box.h) }} />}
            <span className={s.placerMask} aria-hidden="true" />
            <div ref={select} className={s.placerSelect} style={{ left: px(box.x), top: px(box.y), width: px(box.w), height: px(box.h) }}
              tabIndex={0} role="slider" aria-label="Din plats på sliden" aria-valuenow={Math.round(rect.w)} aria-valuetext={`${Math.round(box.x)}, ${Math.round(box.y)}`}
              onPointerDown={begin("move")} onKeyDown={keys}>
              <span className={layout === "ruta" ? s.placerHandleCorner : s.placerHandle} onPointerDown={begin("size")} aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className={s.actions}>
          <label className={s.placerRange}>Storlek <input type="range" min={200} max={W * 2} step={10} value={Math.round(rect.w)} onChange={event => setRect(r => resized(r, Number(event.target.value)))} /></label>
          <span className={s.note}>Börja från</span>
          {presets.map(preset => <button key={preset.label} type="button" className={s.secondary} onClick={() => setRect(preset.rect)}>{preset.label}</button>)}
          <span className={s.placerSpacer} />
          <button type="button" className={s.secondary} onClick={onCancel}>Avbryt</button>
          <button type="button" className={s.primary} onClick={() => onSave({ x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w) })}>Spara placeringen</button>
        </div>
      </div>
    </div>
  );
}
