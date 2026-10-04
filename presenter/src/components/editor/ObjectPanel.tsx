"use client";

import type { ParsedComponent, PropValue } from "@/lib/mdx-parser";
import {
  alignBoxes,
  distributeBoxes,
  effectiveZ,
  formatPercent,
  newGroupId,
  objectKind,
  objectLabel,
  parsePercent,
  stackingOrder,
  stepLabel,
  stepRange,
  type AlignMode,
  type ObjectBox,
  type ObjectKind,
} from "@/lib/objects";
import { resolveSizeCqw } from "@/templates/FloatingText";
import { CROP_EVENT, type ObjectPatch } from "./ObjectLayer";

/**
 * Objekt-fliken i editorns panel: lagerlistan över slidens fria objekt och
 * det markerade objektets alla egenskaper — det som inte får plats i
 * verktygsraden vid objektet. Skriver samma props som objektlagret, så
 * duken och panelen är alltid överens.
 */

interface ObjectPanelProps {
  overlays: ParsedComponent[];
  selection: number[];
  onSelect: (indices: number[]) => void;
  onPatch: (patches: ObjectPatch[]) => void;
  onDelete: (indices: number[]) => void;
  onDuplicate: (indices: number[]) => void;
  onStepZ: (indices: number[], direction: 1 | -1, extreme: boolean) => void;
  onReplaceMedia: (index: number) => void;
  onEditText: (index: number) => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddText: () => void;
  onAddShape: (shape: "rect" | "ellipse" | "line" | "arrow") => void;
}

const INPUT =
  "rounded-md border border-white/10 bg-bg-surface/60 p-2 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none";
const LABEL = "text-xs uppercase tracking-[0.25em] text-text-muted";
const BTN =
  "rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent";
const BTN_ACTIVE = "rounded border border-accent bg-accent/15 px-2 py-1 text-xs text-accent";

const KIND_GLYPH: Record<ObjectKind, string> = {
  image: "▣",
  video: "▶",
  text: "T",
  shape: "◆",
  other: "◌",
};

const KIND_NAME: Record<ObjectKind, string> = {
  image: "Bild",
  video: "Video",
  text: "Text",
  shape: "Form",
  other: "Objekt",
};

const TEXT_COLORS = [
  { label: "Tema", value: null, swatch: "linear-gradient(135deg, #16150f 50%, #f4f2ec 50%)" },
  { label: "Vit", value: "#FFFFFF", swatch: "#FFFFFF" },
  { label: "Svart", value: "#0A0908", swatch: "#0A0908" },
  { label: "Accent", value: "var(--accent)", swatch: "linear-gradient(135deg, #243cff, #ec7e26)" },
] as const;

const BACKGROUNDS = [
  { label: "Ingen", value: null },
  { label: "Ljus", value: "rgba(255,255,255,0.88)" },
  { label: "Mörk", value: "rgba(10,9,8,0.78)" },
  { label: "Accent", value: "var(--accent)" },
] as const;

/** Rutor ur props (utan mätning) — räcker för justera/fördela i panelen. */
function boxFromProps(overlay: ParsedComponent): ObjectBox | null {
  const x = parsePercent(overlay.props.x);
  const y = parsePercent(overlay.props.y);
  const w = parsePercent(overlay.props.width);
  if (x === null || y === null || w === null) return null;
  const h = parsePercent(overlay.props.height);
  return { x, y, w, h: h ?? 0, rotation: Number(overlay.props.rotation) || 0 };
}

export function ObjectPanel({
  overlays,
  selection,
  onSelect,
  onPatch,
  onDelete,
  onDuplicate,
  onStepZ,
  onReplaceMedia,
  onEditText,
  onAddImage,
  onAddVideo,
  onAddText,
  onAddShape,
}: ObjectPanelProps) {
  const order = stackingOrder(overlays).reverse();
  const nextGroupId = newGroupId(overlays);
  const single = selection.length === 1 ? overlays[selection[0]] : null;
  const singleIndex = selection[0];

  const set = (index: number, props: Record<string, PropValue | null | undefined>, content?: string | null) =>
    onPatch([{ index, props, content }]);

  const align = (mode: AlignMode) => {
    const boxes = selection.map((i) => boxFromProps(overlays[i]));
    if (boxes.some((b) => b === null)) return;
    const moved = alignBoxes(boxes as ObjectBox[], mode);
    onPatch(selection.map((i, k) => ({ index: i, props: { x: formatPercent(moved[k].x), y: formatPercent(moved[k].y) } })));
  };
  const distribute = (axis: "x" | "y") => {
    const boxes = selection.map((i) => boxFromProps(overlays[i]));
    if (boxes.some((b) => b === null)) return;
    const moved = distributeBoxes(boxes as ObjectBox[], axis);
    onPatch(selection.map((i, k) => ({ index: i, props: { x: formatPercent(moved[k].x), y: formatPercent(moved[k].y) } })));
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Lägg till */}
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={onAddText} className={BTN} title="Ny textruta mitt på sliden — skriv direkt">
            + Text
          </button>
          <button type="button" onClick={onAddImage} className={BTN} title="Lägg till en bild från datorn, bildbanken eller Pexels">
            + Bild
          </button>
          <button type="button" onClick={onAddVideo} className={BTN} title="Lägg till ett videoklipp">
            + Video
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-muted">Form:</span>
          {(
            [
              ["rect", "Rektangel"],
              ["ellipse", "Ellips"],
              ["line", "Linje"],
              ["arrow", "Pil"],
            ] as const
          ).map(([shape, label]) => (
            <button key={shape} type="button" onClick={() => onAddShape(shape)} className={BTN} title={`Lägg till ${label.toLowerCase()} i temats accentfärg`}>
              + {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted">
          Du kan också klistra in en bild eller text (Ctrl+V) eller dra in en bildfil på duken.
        </p>
      </section>

      {/* Lagerlistan */}
      <section className="flex flex-col gap-2">
        <h2 className={LABEL}>Objekt på sliden</h2>
        {overlays.length === 0 ? (
          <p className="text-sm text-text-muted">
            Inga fria objekt än. Objekt ligger ovanpå mallen och följer med sliden i filen.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {order.map((index) => {
              const overlay = overlays[index];
              const kind = objectKind(overlay.tag);
              const selected = selection.includes(index);
              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (e.shiftKey) onSelect(selected ? selection.filter((i) => i !== index) : [...selection, index]);
                      else onSelect([index]);
                    }}
                    onDoubleClick={() => {
                      if (kind === "text" && !overlay.props.locked) onEditText(index);
                    }}
                    aria-pressed={selected}
                    title={`${KIND_NAME[kind]} · lager ${effectiveZ(overlay)} · Shift+klick markerar flera`}
                    className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm transition-all ${
                      selected ? "border-accent bg-accent/10 text-text" : "border-white/10 bg-bg-surface/40 text-text-muted hover:border-accent/50 hover:text-text"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-center font-mono text-xs opacity-70" aria-hidden>
                      {KIND_GLYPH[kind]}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{objectLabel(overlay)}</span>
                    {typeof overlay.props.group === "string" ? (
                      <span className="shrink-0 font-mono text-[0.6rem] opacity-60" title={`Grupp ${overlay.props.group} — markeras och flyttas som ett`}>
                        ⧉
                      </span>
                    ) : null}
                    {stepLabel(overlay.props) ? (
                      <span className="shrink-0 rounded bg-accent/15 px-1 font-mono text-[0.6rem] text-accent" title="Klicksteg">
                        {stepLabel(overlay.props)}
                      </span>
                    ) : null}
                    {overlay.props.locked ? (
                      <span className="shrink-0 text-xs opacity-70" title="Låst">
                        🔒
                      </span>
                    ) : null}
                    <span className="shrink-0 font-mono text-[0.65rem] tabular-nums opacity-50" title="Lagernivå">
                      {effectiveZ(overlay)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Flera markerade */}
      {selection.length > 1 ? (
        <section className="flex flex-col gap-3 border-t border-white/5 pt-4">
          <h2 className={LABEL}>{selection.length} objekt markerade</h2>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-text-muted">Justera mot varandra</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["left", "Vänster"],
                  ["center", "Mitt"],
                  ["right", "Höger"],
                  ["top", "Topp"],
                  ["middle", "Mitten"],
                  ["bottom", "Botten"],
                ] as const
              ).map(([mode, label]) => (
                <button key={mode} type="button" className={BTN} onClick={() => align(mode)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {selection.length > 2 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">Jämna mellanrum</span>
              <div className="flex gap-1.5">
                <button type="button" className={BTN} onClick={() => distribute("x")}>
                  I sidled
                </button>
                <button type="button" className={BTN} onClick={() => distribute("y")}>
                  I höjdled
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={BTN} onClick={() => onPatch(selection.map((i) => ({ index: i, props: { group: nextGroupId } })))} title="Gruppera (Ctrl+G)">
              Gruppera
            </button>
            {selection.some((i) => typeof overlays[i]?.props.group === "string") ? (
              <button type="button" className={BTN} onClick={() => onPatch(selection.map((i) => ({ index: i, props: { group: null } })))} title="Dela upp (Ctrl+Shift+G)">
                Dela upp
              </button>
            ) : null}
            <button type="button" className={BTN} onClick={() => onDuplicate(selection)}>
              Duplicera
            </button>
            <button type="button" className={BTN} onClick={() => onStepZ(selection, 1, false)}>
              ↑ Framåt
            </button>
            <button type="button" className={BTN} onClick={() => onStepZ(selection, -1, false)}>
              ↓ Bakåt
            </button>
            <button type="button" className={`${BTN} hover:border-red-400 hover:text-red-400`} onClick={() => onDelete(selection)}>
              Ta bort
            </button>
          </div>
        </section>
      ) : null}

      {/* Ett markerat objekt */}
      {single ? (
        <SingleObject
          index={singleIndex}
          overlay={single}
          overlays={overlays}
          set={(props, content) => set(singleIndex, props, content)}
          onDelete={() => onDelete([singleIndex])}
          onDuplicate={() => onDuplicate([singleIndex])}
          onStepZ={(direction, extreme) => onStepZ([singleIndex], direction, extreme)}
          onReplaceMedia={() => onReplaceMedia(singleIndex)}
          onEditText={() => onEditText(singleIndex)}
        />
      ) : selection.length === 0 && overlays.length > 0 ? (
        <p className="text-xs text-text-muted">
          Klicka på ett objekt på duken eller i listan. Dra för att flytta, dra i handtagen för storlek, dubbelklicka på text för
          att skriva. Piltangenter knuffar, Delete tar bort, Ctrl+D duplicerar, Ctrl+] och Ctrl+[ ändrar ordningen.
        </p>
      ) : null}
    </div>
  );
}

/* ── Ett objekt ────────────────────────────────────────────────────────── */

function SingleObject({
  index,
  overlay,
  overlays,
  set,
  onDelete,
  onDuplicate,
  onStepZ,
  onReplaceMedia,
  onEditText,
}: {
  index: number;
  overlay: ParsedComponent;
  overlays: ParsedComponent[];
  set: (props: Record<string, PropValue | null | undefined>, content?: string | null) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStepZ: (direction: 1 | -1, extreme: boolean) => void;
  onReplaceMedia: () => void;
  onEditText: () => void;
}) {
  void overlays;
  const kind = objectKind(overlay.tag);
  const p = overlay.props;
  const locked = Boolean(p.locked);
  const opacity = p.opacity === undefined || p.opacity === "" ? 1 : Number(p.opacity);
  const rotation = Number(p.rotation) || 0;
  const heightPct = parsePercent(p.height);

  return (
    <div className="flex flex-col gap-6 border-t border-white/5 pt-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className={LABEL}>{KIND_NAME[kind]}</h2>
          <span className="rounded-sm border border-accent/30 bg-accent-dim px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-accent">
            {overlay.tag}
          </span>
        </div>
        <Field label="Namn i listan">
          <input
            type="text"
            value={typeof p.name === "string" ? p.name : ""}
            onChange={(e) => set({ name: e.target.value || null })}
            placeholder={objectLabel({ ...overlay, props: Object.fromEntries(Object.entries(p).filter(([k]) => k !== "name")) })}
            className={INPUT}
          />
        </Field>
      </section>

      {/* Läge och storlek */}
      <section className="flex flex-col gap-3">
        <h2 className={LABEL}>Läge och storlek</h2>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" unit="%" value={parsePercent(p.x)} raw={p.x} onChange={(v) => set({ x: formatPercent(v) })} />
          <NumberField label="Y" unit="%" value={parsePercent(p.y)} raw={p.y} onChange={(v) => set({ y: formatPercent(v) })} />
          <NumberField label="Bredd" unit="%" value={parsePercent(p.width)} raw={p.width} onChange={(v) => set({ width: formatPercent(Math.max(1, v)) })} />
          {kind === "text" ? (
            <NumberField label="Rotation" unit="°" value={rotation} onChange={(v) => set({ rotation: v === 0 ? null : Math.round(v) })} />
          ) : (
            <NumberField
              label="Höjd"
              unit="%"
              value={heightPct}
              raw={p.height}
              placeholder={kind === "shape" ? undefined : "auto"}
              clearable={kind !== "shape"}
              onChange={(v) => set({ height: formatPercent(Math.max(kind === "shape" ? 0.2 : 1, v)) })}
              onClear={kind === "shape" ? undefined : () => set({ height: null })}
            />
          )}
        </div>
        {kind !== "text" ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Rotation" unit="°" value={rotation} onChange={(v) => set({ rotation: v === 0 ? null : Math.round(v) })} />
            <RangeField
              label="Opacitet"
              value={Number.isFinite(opacity) ? opacity : 1}
              min={0.05}
              max={1}
              step={0.05}
              display={`${Math.round((Number.isFinite(opacity) ? opacity : 1) * 100)} %`}
              onChange={(v) => set({ opacity: v >= 1 ? null : Math.round(v * 100) / 100 })}
            />
          </div>
        ) : (
          <RangeField
            label="Opacitet"
            value={Number.isFinite(opacity) ? opacity : 1}
            min={0.05}
            max={1}
            step={0.05}
            display={`${Math.round((Number.isFinite(opacity) ? opacity : 1) * 100)} %`}
            onChange={(v) => set({ opacity: v >= 1 ? null : Math.round(v * 100) / 100 })}
          />
        )}
      </section>

      {/* Ordning */}
      <section className="flex flex-col gap-2">
        <h2 className={LABEL}>Ordning</h2>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={p.layer === "back" ? BTN_ACTIVE : BTN}
            onClick={() => set({ layer: p.layer === "back" ? null : "back", zIndex: null })}
            title="Bakom mallens innehåll men över bakgrunden — för dekor bakom rubriken"
          >
            {p.layer === "back" ? "● Bakom innehållet" : "Bakom innehållet"}
          </button>
          <button type="button" className={BTN} onClick={() => onStepZ(1, false)} title="Ett steg framåt (Ctrl+])">
            ↑ Framåt
          </button>
          <button type="button" className={BTN} onClick={() => onStepZ(-1, false)} title="Ett steg bakåt (Ctrl+[)">
            ↓ Bakåt
          </button>
          <button type="button" className={BTN} onClick={() => onStepZ(1, true)} title="Överst av objekten (Ctrl+Shift+])">
            Överst
          </button>
          <button type="button" className={BTN} onClick={() => onStepZ(-1, true)} title="Underst av objekten (Ctrl+Shift+[)">
            Underst
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={locked} onChange={(e) => set({ locked: e.target.checked ? true : null })} className="h-4 w-4 accent-cyan-500" />
          Lås — kan inte flyttas eller ändras av misstag på duken
        </label>
      </section>

      {/* Klicksteg — PowerPoints "visa vid klick", med clickerns steg */}
      <section className="flex flex-col gap-2">
        <h2 className={LABEL}>Klicksteg</h2>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Syns efter klick"
            value={stepRange(p.step, p.until).from}
            step={1}
            onChange={(v) => set({ step: v > 0 ? Math.trunc(v) : null })}
          />
          <NumberField
            label="Försvinner vid klick"
            value={stepRange(p.step, p.until).to}
            step={1}
            placeholder="aldrig"
            clearable
            onChange={(v) => set({ until: v > 0 ? Math.trunc(v) : null })}
            onClear={() => set({ until: null })}
          />
        </div>
        <p className="text-xs text-text-muted">
          0 = syns från början. Objekt på senare klick visas dämpade i editorn — stega med ← → under duken för att se sliden som publiken.
        </p>
      </section>

      {kind === "text" ? <TextProps p={p} overlay={overlay} set={set} onEditText={onEditText} locked={locked} /> : null}
      {kind === "image" ? (
        <ImageProps
          p={p}
          set={set}
          onReplaceMedia={onReplaceMedia}
          onCrop={() => window.dispatchEvent(new CustomEvent(CROP_EVENT, { detail: { index } }))}
        />
      ) : null}
      {kind === "video" ? <VideoProps p={p} set={set} onReplaceMedia={onReplaceMedia} /> : null}
      {kind === "shape" ? <ShapeProps p={p} set={set} /> : null}

      <section className="flex gap-1.5 border-t border-white/5 pt-4">
        <button type="button" className={BTN} onClick={onDuplicate} title="Duplicera (Ctrl+D)">
          Duplicera
        </button>
        <button type="button" className={`${BTN} hover:border-red-400 hover:text-red-400`} onClick={onDelete} title="Ta bort (Delete) — Ctrl+Z ångrar">
          Ta bort
        </button>
      </section>
    </div>
  );
}

/* ── Textens egenskaper ─────────────────────────────────────────────────── */

function TextProps({
  p,
  overlay,
  set,
  onEditText,
  locked,
}: {
  p: Record<string, PropValue>;
  overlay: ParsedComponent;
  set: (props: Record<string, PropValue | null | undefined>, content?: string | null) => void;
  onEditText: () => void;
  locked: boolean;
}) {
  const text = typeof p.text === "string" ? p.text : (overlay.content ?? "").trim();
  const size = resolveSizeCqw(p.size as string | number | undefined);
  const style = typeof p.style === "string" ? p.style : "display";
  const weight = typeof p.weight === "string" ? p.weight : typeof p.weight === "number" ? String(p.weight) : "medium";
  const alignValue = typeof p.align === "string" ? p.align : "left";
  const color = typeof p.color === "string" ? p.color : "";
  const background = typeof p.background === "string" && p.background !== "transparent" ? p.background : "";
  const lineHeight = p.lineHeight === undefined || p.lineHeight === "" ? 1.3 : Number(p.lineHeight) || 1.3;
  const isPresetColor = color === "" || TEXT_COLORS.some((c) => c.value === color);
  const isPresetBg = background === "" || BACKGROUNDS.some((b) => b.value === background);

  return (
    <>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className={LABEL}>Text</h2>
          <button type="button" className={BTN} onClick={onEditText} disabled={locked} title="Skriv direkt i rutan på duken (Enter)">
            Skriv på duken
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => set({ text: e.target.value }, overlay.content != null ? null : undefined)}
          rows={4}
          spellCheck
          className={`${INPUT} resize-y`}
          placeholder="Texten i rutan"
        />
        <p className="text-xs text-text-muted">
          <code className="font-mono">**fet**</code> blir accentfärg, <code className="font-mono">*kursiv*</code> kursiv. Ny rad = ny rad.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={LABEL}>Typografi</h2>
        <RangeField
          label="Storlek"
          value={size}
          min={1}
          max={60}
          step={0.5}
          display={`${Math.round(size * 10) / 10} — procent av rutans bredd`}
          onChange={(v) => set({ size: String(v) })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Typsnitt">
            <select value={style} onChange={(e) => set({ style: e.target.value === "display" ? null : e.target.value })} className={INPUT}>
              <option value="display">Rubrik (temats)</option>
              <option value="body">Löptext</option>
              <option value="mono">Mono</option>
            </select>
          </Field>
          <Field label="Vikt">
            <select value={weight} onChange={(e) => set({ weight: e.target.value === "medium" ? null : e.target.value })} className={INPUT}>
              <option value="regular">Normal</option>
              <option value="medium">Medium</option>
              <option value="bold">Fet</option>
              <option value="black">Extra fet</option>
              {!["regular", "medium", "bold", "black"].includes(weight) ? <option value={weight}>{weight}</option> : null}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Justering">
            <div className="flex gap-1">
              {(
                [
                  ["left", "Vänster"],
                  ["center", "Mitt"],
                  ["right", "Höger"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={alignValue === value ? BTN_ACTIVE : BTN}
                  onClick={() => set({ align: value === "left" ? null : value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <NumberField label="Radavstånd" value={lineHeight} step={0.05} onChange={(v) => set({ lineHeight: Math.abs(v - 1.3) < 0.001 ? null : Math.round(v * 100) / 100 })} />
        </div>
        <Field label="Färg">
          <div className="flex items-center gap-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                title={c.label}
                aria-label={`Textfärg ${c.label}`}
                aria-pressed={c.value === null ? color === "" || color === "var(--text)" : color === c.value}
                onClick={() => set({ color: c.value })}
                className="h-5 w-5 rounded-full border border-black/30 aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-1"
                style={{ background: c.swatch }}
              />
            ))}
            <input
              type="text"
              value={isPresetColor ? "" : color}
              onChange={(e) => set({ color: e.target.value || null })}
              placeholder="egen: #hex"
              className={`${INPUT} min-w-0 flex-1 py-1`}
            />
          </div>
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={LABEL}>Platta bakom texten</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.label}
              type="button"
              className={(b.value === null ? background === "" : background === b.value) ? BTN_ACTIVE : BTN}
              onClick={() => {
                if (b.value === null) set({ background: null, padding: null, radius: null });
                else set({ background: b.value, padding: p.padding && p.padding !== "0" ? undefined : "0.5em 0.7em", radius: p.radius && p.radius !== "0" ? undefined : "0.25em" });
              }}
            >
              {b.label}
            </button>
          ))}
          <input
            type="text"
            value={isPresetBg ? "" : background}
            onChange={(e) => set({ background: e.target.value || null })}
            placeholder="egen färg"
            className={`${INPUT} min-w-0 flex-1 py-1`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Marginal inuti">
            <input type="text" value={typeof p.padding === "string" && p.padding !== "0" ? p.padding : ""} onChange={(e) => set({ padding: e.target.value || null })} placeholder="t.ex. 0.5em 0.7em" className={INPUT} />
          </Field>
          <Field label="Hörnradie">
            <input type="text" value={typeof p.radius === "string" && p.radius !== "0" ? p.radius : ""} onChange={(e) => set({ radius: e.target.value || null })} placeholder="t.ex. 0.25em" className={INPUT} />
          </Field>
        </div>
      </section>
    </>
  );
}

/* ── Bildens egenskaper ─────────────────────────────────────────────────── */

function ImageProps({
  p,
  set,
  onReplaceMedia,
  onCrop,
}: {
  p: Record<string, PropValue>;
  set: (props: Record<string, PropValue | null | undefined>) => void;
  onReplaceMedia: () => void;
  onCrop: () => void;
}) {
  const blur = Number(p.blur) || 0;
  const brightness = p.brightness === undefined || p.brightness === "" ? 1 : Number(p.brightness) || 1;
  const flip = typeof p.flip === "string" ? p.flip : "";
  const src = typeof p.src === "string" ? p.src : "";
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className={LABEL}>Bild</h2>
        <div className="flex gap-1.5">
          <input type="text" value={src} onChange={(e) => set({ src: e.target.value })} placeholder="/bilder/…" className={`${INPUT} min-w-0 flex-1`} />
          <button type="button" onClick={onReplaceMedia} className={`${BTN} shrink-0`} title="Välj en annan bild">
            Byt…
          </button>
        </div>
        {src && !/\.(mp4|webm|mov)$/i.test(src) ? (
          <div className="overflow-hidden rounded border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="max-h-28 w-full object-contain" />
          </div>
        ) : null}
        <Field label="Alt-text">
          <input type="text" value={typeof p.alt === "string" ? p.alt : ""} onChange={(e) => set({ alt: e.target.value || null })} placeholder="Vad bilden visar" className={INPUT} />
        </Field>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={BTN} onClick={onCrop} disabled={Boolean(p.locked)} title="Beskär på duken: dra bilden i ramen, dra kanterna, zooma">
            Beskär…
          </button>
          {typeof p.crop === "string" || typeof p.height === "string" ? (
            <button type="button" className={BTN} onClick={() => set({ crop: null, height: null })} title="Ta bort ramen och visa hela bilden">
              Hela bilden
            </button>
          ) : null}
          {typeof p.crop === "string" ? <span className="font-mono text-[0.65rem] text-text-muted">utsnitt {p.crop}</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={LABEL}>Utseende</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={!p.noShadow} onChange={(e) => set({ noShadow: e.target.checked ? null : true })} className="h-4 w-4 accent-cyan-500" />
          Skugga (stäng av för frilagda bilder)
        </label>
        <RangeField label="Oskärpa" value={blur} min={0} max={24} step={1} display={blur ? `${blur} px` : "av"} onChange={(v) => set({ blur: v > 0 ? String(v) : null })} />
        <RangeField
          label="Ljusstyrka"
          value={brightness}
          min={0.3}
          max={1.6}
          step={0.05}
          display={brightness === 1 ? "oförändrad" : `${Math.round(brightness * 100)} %`}
          onChange={(v) => set({ brightness: Math.abs(v - 1) < 0.001 ? null : String(Math.round(v * 100) / 100) })}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Hörnradie">
            <div className="flex gap-1">
              <input type="text" value={typeof p.radius === "string" ? p.radius : ""} onChange={(e) => set({ radius: e.target.value || null })} placeholder="t.ex. 1rem" className={`${INPUT} min-w-0 flex-1`} />
              <button type="button" className={p.radius === "50%" ? BTN_ACTIVE : BTN} onClick={() => set({ radius: p.radius === "50%" ? null : "50%" })} title="Rund — cirkel om ramen är kvadratisk">
                ●
              </button>
            </div>
          </Field>
          <Field label="Spegla">
            <div className="flex gap-1">
              <button
                type="button"
                className={flip.includes("x") ? BTN_ACTIVE : BTN}
                onClick={() => {
                  const next = flip.includes("x") ? flip.replace("x", "") : `x${flip}`;
                  set({ flip: next || null });
                }}
                title="Spegla i sidled"
              >
                ⇋
              </button>
              <button
                type="button"
                className={flip.includes("y") ? BTN_ACTIVE : BTN}
                onClick={() => {
                  const next = flip.includes("y") ? flip.replace("y", "") : `${flip}y`;
                  set({ flip: next || null });
                }}
                title="Spegla i höjdled"
              >
                ⇵
              </button>
            </div>
          </Field>
        </div>
      </section>
    </>
  );
}

/* ── Videons egenskaper ─────────────────────────────────────────────────── */

function VideoProps({
  p,
  set,
  onReplaceMedia,
}: {
  p: Record<string, PropValue>;
  set: (props: Record<string, PropValue | null | undefined>) => void;
  onReplaceMedia: () => void;
}) {
  const src = typeof p.src === "string" ? p.src : "";
  const flag = (name: string, fallback: boolean) => (p[name] === undefined ? fallback : p[name] !== false && p[name] !== "false");
  const setFlag = (name: string, fallback: boolean, checked: boolean) => set({ [name]: checked === fallback ? null : checked });
  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className={LABEL}>Video</h2>
        <div className="flex gap-1.5">
          <input type="text" value={src} onChange={(e) => set({ src: e.target.value })} placeholder="/videos/… eller YouTube-länk" className={`${INPUT} min-w-0 flex-1`} />
          <button type="button" onClick={onReplaceMedia} className={`${BTN} shrink-0`} title="Välj ett annat klipp">
            Byt…
          </button>
        </div>
        <Field label="Stillbild innan start (poster)">
          <input type="text" value={typeof p.poster === "string" ? p.poster : ""} onChange={(e) => set({ poster: e.target.value || null })} placeholder="/bilder/…" className={INPUT} />
        </Field>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className={LABEL}>Uppspelning</h2>
        {(
          [
            ["autoplay", true, "Starta automatiskt"],
            ["loop", true, "Loopa"],
            ["muted", true, "Ljud av"],
            ["showControls", true, "Visa kontroller i spelaren"],
          ] as const
        ).map(([name, fallback, label]) => (
          <label key={name} className="flex cursor-pointer items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={flag(name, fallback)} onChange={(e) => setFlag(name, fallback, e.target.checked)} className="h-4 w-4 accent-cyan-500" />
            {label}
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={!p.noShadow} onChange={(e) => set({ noShadow: e.target.checked ? null : true })} className="h-4 w-4 accent-cyan-500" />
          Skugga
        </label>
        <Field label="Hörnradie">
          <input type="text" value={typeof p.radius === "string" ? p.radius : ""} onChange={(e) => set({ radius: e.target.value || null })} placeholder="t.ex. 1rem" className={INPUT} />
        </Field>
      </section>
    </>
  );
}

/* ── Formens egenskaper ─────────────────────────────────────────────────── */

const SHAPE_FILLS = [
  { label: "Accent", value: null, swatch: "linear-gradient(135deg, #243cff, #ec7e26)" },
  { label: "Bläck", value: "var(--text)", swatch: "#16150f" },
  { label: "Papper", value: "var(--bg-surface)", swatch: "#fbfaf6" },
  { label: "Vit", value: "#FFFFFF", swatch: "#FFFFFF" },
  { label: "Svart", value: "#0A0908", swatch: "#0A0908" },
] as const;

function ShapeProps({ p, set }: { p: Record<string, PropValue>; set: (props: Record<string, PropValue | null | undefined>) => void }) {
  const shape = typeof p.shape === "string" ? p.shape : "rect";
  const fill = typeof p.fill === "string" ? p.fill : "";
  const stroke = typeof p.stroke === "string" ? p.stroke : "";
  const isPresetFill = fill === "" || SHAPE_FILLS.some((f) => f.value === fill);
  const thin = shape === "line" || shape === "arrow";
  return (
    <section className="flex flex-col gap-3">
      <h2 className={LABEL}>Form</h2>
      <Field label="Slag">
        <select value={shape} onChange={(e) => set({ shape: e.target.value === "rect" ? null : e.target.value })} className={INPUT}>
          <option value="rect">Rektangel</option>
          <option value="ellipse">Ellips</option>
          <option value="line">Linje</option>
          <option value="arrow">Pil</option>
        </select>
      </Field>
      <Field label="Fyllning">
        <div className="flex items-center gap-2">
          {SHAPE_FILLS.map((f) => (
            <button
              key={f.label}
              type="button"
              title={f.label}
              aria-label={`Fyllning ${f.label}`}
              aria-pressed={f.value === null ? fill === "" : fill === f.value}
              onClick={() => set({ fill: f.value })}
              className="h-5 w-5 rounded-full border border-black/30 aria-pressed:ring-2 aria-pressed:ring-accent aria-pressed:ring-offset-1"
              style={{ background: f.swatch }}
            />
          ))}
          <input type="text" value={isPresetFill ? "" : fill} onChange={(e) => set({ fill: e.target.value || null })} placeholder="egen: #hex" className={`${INPUT} min-w-0 flex-1 py-1`} />
        </div>
      </Field>
      {thin ? (
        <p className="text-xs text-text-muted">Rutans höjd är linjens tjocklek, rotationen dess riktning. Pilspetsen följer tjockleken.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kontur (färg)">
            <input type="text" value={stroke} onChange={(e) => set({ stroke: e.target.value || null })} placeholder="t.ex. var(--text)" className={INPUT} />
          </Field>
          <Field label="Konturens tjocklek">
            <input type="text" value={typeof p.strokeWidth === "string" ? p.strokeWidth : ""} onChange={(e) => set({ strokeWidth: e.target.value || null })} placeholder="t.ex. 3px" className={INPUT} />
          </Field>
          {shape === "rect" ? (
            <Field label="Hörnradie">
              <input type="text" value={typeof p.radius === "string" ? p.radius : ""} onChange={(e) => set({ radius: e.target.value || null })} placeholder="t.ex. 0.5rem" className={INPUT} />
            </Field>
          ) : null}
        </div>
      )}
    </section>
  );
}

/* ── Fältbyggstenar ─────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      {children}
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  raw,
  step = 0.5,
  placeholder,
  clearable,
  onChange,
  onClear,
}: {
  label: string;
  unit?: string;
  value: number | null;
  /** Ursprungsvärdet när det inte är procent (t.ex. "280px") — visas som platshållare. */
  raw?: PropValue;
  step?: number;
  placeholder?: string;
  clearable?: boolean;
  onChange: (value: number) => void;
  onClear?: () => void;
}) {
  const hint = value === null && typeof raw === "string" && raw !== "" ? raw : placeholder;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">
        {label}
        {unit ? <span className="opacity-60"> {unit}</span> : null}
      </span>
      <div className="flex gap-1">
        <input
          type="number"
          step={step}
          value={value === null ? "" : Math.round(value * 10) / 10}
          placeholder={hint}
          onChange={(e) => {
            if (e.target.value === "") {
              onClear?.();
              return;
            }
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className={`${INPUT} min-w-0 flex-1 py-1`}
        />
        {clearable && value !== null && onClear ? (
          <button type="button" className={`${BTN} shrink-0`} onClick={onClear} title="Automatisk höjd (följer bilden)">
            auto
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="font-mono text-[0.65rem] text-text-muted">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500"
      />
    </div>
  );
}
