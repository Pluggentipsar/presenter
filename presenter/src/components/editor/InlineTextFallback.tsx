"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { ParsedComponent } from "@/lib/mdx-parser";
import { InlinePopover } from "@/lib/inline-edit";
import { applyTextEdit, findTextSources, removeTextHit, type TextEdit, type TextHit } from "@/lib/text-source";
import { getTemplateSchemaOrFallback } from "@/lib/template-schemas";

/**
 * Skriv i sliden — också där mallen saknar redigeringshandtag.
 *
 * Mallar med `EditableText` sköter sig själva. För resten letar editorn upp
 * den klickade texten i slidens källa (lib/text-source.ts) och öppnar samma
 * redigeringsruta som handtagen har, vid texten. En streckad ram visar vid
 * pekaren vilken text som går att ändra; en text som hör till mallen (en fast
 * etikett, en räknare) ger ett kort besked i stället.
 *
 * Lyssnar på duken (`.presentation-root`) bredvid objektlagret. Objekt, handtag,
 * knappar, länkar, fält och media lämnas ifred.
 */

const SKIP =
  ".inline-edit-handle, .inline-edit-media, edit-text, [data-object-index], [data-object-layer], [data-inline-skip], button, a, input, textarea, select, video, iframe, audio, [contenteditable='true'], [contenteditable='plaintext-only']";
const MAX_DEPTH = 8;

interface Resolved {
  el: Element;
  hit: TextHit;
}

/**
 * Från det klickade elementet och uppåt: det djupaste elementet vars hela text
 * står i källan. En bit av en text (kvalitet 1) duger bara om inget element
 * högre upp matchar helt — ett ord i en ord-för-ord-animerad mening ska ge
 * hela meningen, inte ordet.
 */
function resolveTarget(target: Element, root: Element, slide: ParsedComponent): Resolved | null {
  let best: Resolved | null = null;
  let el: Element | null = target;
  for (let depth = 0; el && el !== root && depth < MAX_DEPTH; depth++, el = el.parentElement) {
    const text = el.textContent ?? "";
    if (!text.trim()) continue;
    if (text.length > 4000) break;
    const hit = findTextSources(slide, text)[0];
    if (!hit) continue;
    if (!best || hit.quality > best.hit.quality) best = { el, hit };
    if (hit.quality >= 2) break;
  }
  return best;
}

/**
 * Sliden som mallen visar den: också mallens egna standardtexter. "Tack!" på
 * en TackSlide utan title står inte i filen — men i schemat, och en ändring
 * skriver in den som en riktig prop. Samma sak med standardinnehållet när
 * sliden inte har något eget.
 */
function withDefaults(slide: ParsedComponent): ParsedComponent {
  const { schema } = getTemplateSchemaOrFallback(slide.tag, slide.props, Boolean(slide.content?.trim()));
  const props = { ...slide.props };
  for (const field of schema.fields) {
    if (props[field.name] !== undefined) continue;
    if ((field.type === "text" || field.type === "multiline") && typeof field.default === "string" && field.default.trim()) {
      props[field.name] = field.default;
    }
  }
  const content = slide.content?.trim() ? slide.content : (schema.defaultContent ?? slide.content);
  return { ...slide, props, content };
}

function labelFor(slide: ParsedComponent, hit: TextHit): string {
  const { schema } = getTemplateSchemaOrFallback(slide.tag, slide.props, Boolean(slide.content?.trim()));
  if (hit.kind === "prop" && hit.path) {
    const name = hit.path.split(/[.[]/)[0];
    const field = schema.fields.find((f) => f.name === name);
    const base = field?.label ?? name;
    return hit.path === name ? base : `${base} · ${hit.path.slice(name.length).replace(/^\./, "")}`;
  }
  const content = schema.contentLabel ?? "Texten";
  return hit.label === "Texten" ? content : `${content} · ${hit.label.toLocaleLowerCase("sv")}`;
}

interface InlineTextFallbackProps {
  rootRef: RefObject<HTMLDivElement | null>;
  slide: ParsedComponent;
  onApply: (edit: TextEdit) => void;
}

export function InlineTextFallback({ rootRef, slide, onApply }: InlineTextFallbackProps) {
  // Sliden med mallens standardtexter ifyllda — det är så den ser ut på duken.
  const slideRef = useRef(slide);
  useLayoutEffect(() => {
    slideRef.current = withDefaults(slide);
  }, [slide]);
  const [editing, setEditing] = useState<{ anchor: { current: HTMLElement | null }; hit: TextHit; label: string } | null>(null);
  const [hover, setHover] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [notice, setNotice] = useState<{ left: number; top: number; text: string } | null>(null);
  const editingRef = useRef(false);
  useLayoutEffect(() => {
    editingRef.current = editing !== null;
  }, [editing]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let down: { x: number; y: number } | null = null;
    let frame = 0;
    let lastTarget: Element | null = null;
    let noticeTimer = 0;

    const onPointerDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (editingRef.current || e.buttons !== 0) return;
      const target = e.target as Element | null;
      if (target === lastTarget) return;
      lastTarget = target;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!target || target.closest(SKIP)) {
          setHover(null);
          return;
        }
        const resolved = resolveTarget(target, root, slideRef.current);
        if (!resolved) {
          setHover(null);
          return;
        }
        const rect = resolved.el.getBoundingClientRect();
        setHover({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      });
    };
    const onPointerLeave = () => {
      lastTarget = null;
      cancelAnimationFrame(frame);
      setHover(null);
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.defaultPrevented) return;
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return;
      const target = e.target as Element | null;
      if (!target || !root.contains(target) || target.closest(SKIP)) return;
      const resolved = resolveTarget(target, root, slideRef.current);
      if (!resolved) {
        // Bara när man faktiskt klickade på text — inte på tom yta.
        if (!(target.textContent ?? "").trim()) return;
        window.clearTimeout(noticeTimer);
        setNotice({ left: e.clientX, top: e.clientY, text: "Texten hör till mallen. Det som går att ändra finns under Fält (E)." });
        noticeTimer = window.setTimeout(() => setNotice(null), 2600);
        return;
      }
      setHover(null);
      setNotice(null);
      setEditing({ anchor: { current: resolved.el as HTMLElement }, hit: resolved.hit, label: labelFor(slideRef.current, resolved.hit) });
    };

    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("click", onClick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(noticeTimer);
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("click", onClick);
    };
  }, [rootRef]);

  const close = useCallback(() => setEditing(null), []);
  const commit = useCallback(
    (value: string) => {
      if (!editing) return;
      setEditing(null);
      if (value === editing.hit.raw) return;
      const edit = applyTextEdit(slideRef.current, editing.hit, value);
      if (edit) onApply(edit);
    },
    [editing, onApply],
  );

  const remove = useCallback(() => {
    if (!editing) return;
    setEditing(null);
    const edit = removeTextHit(slideRef.current, editing.hit);
    if (edit) onApply(edit);
  }, [editing, onApply]);

  if (typeof document === "undefined") return null;
  return (
    <>
      {hover && !editing
        ? createPortal(
            <div
              aria-hidden
              style={{
                position: "fixed",
                left: hover.left - 3,
                top: hover.top - 3,
                width: hover.width + 6,
                height: hover.height + 6,
                outline: "2px dashed rgba(236, 126, 38, 0.55)",
                borderRadius: 3,
                pointerEvents: "none",
                zIndex: 40,
              }}
            />,
            document.body,
          )
        : null}
      {notice
        ? createPortal(
            <div
              role="status"
              style={{
                position: "fixed",
                left: Math.min(notice.left + 12, window.innerWidth - 300),
                top: notice.top + 14,
                maxWidth: 280,
                zIndex: 10000,
                background: "#161616",
                color: "#F7F1E6",
                border: "1px solid rgba(236, 126, 38, 0.5)",
                borderRadius: 6,
                padding: "6px 10px",
                font: "12px/1.4 system-ui, -apple-system, sans-serif",
                pointerEvents: "none",
              }}
            >
              {notice.text}
            </div>,
            document.body,
          )
        : null}
      {editing ? (
        <InlinePopover
          anchorRef={editing.anchor}
          initialValue={editing.hit.raw}
          multiline={editing.hit.raw.includes("\n") || editing.hit.raw.length > 70}
          label={editing.label}
          onCommit={commit}
          onCancel={close}
          onRemove={remove}
        />
      ) : null}
    </>
  );
}
