"use client";

import { useMemo, useState } from "react";
import type { ParsedComponent, PropValue } from "@/lib/mdx-parser";
import {
  deriveFallbackSchema,
  getTemplateSchemaOrFallback,
  type FieldSchema,
} from "@/lib/template-schemas";
import {
  UNIVERSAL_PROP_LABELS,
  clearsProp,
  countFilled,
  layoutFieldForm,
} from "@/lib/field-form";
import { getThemeList } from "@/lib/theme-override";
import { FieldInput } from "./FieldInput";
import { SizePills } from "./SizePills";
import { SubComponentList } from "./SubComponentList";

/**
 * Avgör om ett fält är ett storleks-fält och vilket bas-fält det hör till.
 * - "titleSize" → bas "title"
 * - "size" (standalone) → specialbas "__content__" om template har hasContent,
 *    annars "__firsttext__" (första text/multiline-fältet).
 */
function resolveSizeTarget(
  sizeFieldName: string,
  allFields: FieldSchema[],
  hasContent: boolean
): string | null {
  if (sizeFieldName === "size") {
    if (hasContent) return "__content__";
    // annars paira med första text/multiline-fältet
    const firstText = allFields.find(
      (f) => (f.type === "text" || f.type === "multiline") && f.name !== "size"
    );
    return firstText ? firstText.name : null;
  }
  const match = /^(.+)Size$/.exec(sizeFieldName);
  if (!match) return null;
  const base = match[1];
  if (allFields.some((f) => f.name === base)) return base;
  // "bulletSize" har ingen prop "bullet" men paras med content
  if (hasContent) return "__content__";
  return null;
}

interface EditorFieldPanelProps {
  slide: ParsedComponent;
  frontmatter: Record<string, unknown>;
  onUpdateProps: (update: Record<string, PropValue>) => void;
  /** Sätt eller radera (null) egenskaper — så att ett tömt fält inte lämnar `namn=""` i filen. */
  onApplyProps?: (update: Record<string, PropValue | null>) => void;
  onUpdateContent: (content: string) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateFrontmatter: (key: string, value: unknown) => void;
  // Children mutations (för Timeline/Comparison)
  onUpdateChildProps: (index: number, update: Record<string, PropValue>) => void;
  onUpdateChildContent: (index: number, content: string) => void;
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
  onMoveChild: (from: number, to: number) => void;
}

export function EditorFieldPanel({
  slide,
  frontmatter,
  onUpdateProps,
  onApplyProps,
  onUpdateContent,
  onUpdateNotes,
  onUpdateFrontmatter,
  onUpdateChildProps,
  onUpdateChildContent,
  onAddChild,
  onRemoveChild,
  onMoveChild,
}: EditorFieldPanelProps) {
  const { schema, isFallback } = useMemo(
    () =>
      getTemplateSchemaOrFallback(
        slide.tag,
        slide.props as Record<string, unknown>,
        Boolean(slide.content && slide.content.trim().length > 0)
      ),
    [slide.tag, slide.props, slide.content]
  );
  const [fmOpen, setFmOpen] = useState(false);

  // Bygg mappning: bas-fält → pills-kontroll (för storleks-fält)
  const { baseFields, advancedFields, planningFields, extraFields, sizePairs, sizeForContent } = useMemo(() => {
    const pairs = new Map<string, FieldSchema>();
    let contentSize: FieldSchema | undefined;
    const paired = new Set<string>();
    const props = slide.props as Record<string, unknown>;
    const layout = layoutFieldForm(schema, props, isFallback);
    const visible = [...layout.main, ...layout.advanced];

    for (const f of visible) {
      const isSize = f.variant === "pills" || /Size$/.test(f.name) || f.name === "size";
      if (!isSize) continue;
      const target = resolveSizeTarget(f.name, visible, !!schema.hasContent);
      if (target === "__content__" && !contentSize) {
        contentSize = f;
        paired.add(f.name);
      } else if (target && target !== "__content__" && !pairs.has(target)) {
        pairs.set(target, f);
        paired.add(f.name);
      }
      // ingen target hittad — fältet står kvar som vanligt fält
    }

    // Egenskaper som står på sliden men inte i schemat: samma härledning som för
    // mallar utan schema, med svenska namn på lagren alla mallar kan bära.
    const extraProps = Object.fromEntries(layout.extra.map((name) => [name, props[name]]));
    const extras = deriveFallbackSchema(slide.tag, extraProps, false).fields.map((field) => ({
      ...field,
      label: UNIVERSAL_PROP_LABELS[field.name] ?? field.label,
    }));

    return {
      baseFields: layout.main.filter((f) => !paired.has(f.name)),
      advancedFields: layout.advanced.filter((f) => !paired.has(f.name)),
      planningFields: layout.planning,
      extraFields: extras,
      sizePairs: pairs,
      sizeForContent: contentSize,
    };
  }, [schema, isFallback, slide.tag, slide.props]);

  /** Ett tömt frivilligt fält tas bort ur filen i stället för att sparas som `namn=""`. */
  function setField(field: FieldSchema, value: PropValue) {
    if (onApplyProps && clearsProp(field, value)) onApplyProps({ [field.name]: null });
    else onUpdateProps({ [field.name]: value });
  }

  // schema är alltid definierat (eventuellt via fallback). Tom early-return
  // bara för defensiv robusthet.
  if (!schema) return null;

  function renderFields(fields: FieldSchema[]) {
    return (
      <div className="flex flex-col gap-4">
        {fields.map((field) => {
          const sizeField = sizePairs.get(field.name);
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              {sizeField && (
                <div className="flex justify-end">
                  <SizePills
                    field={sizeField}
                    value={slide.props[sizeField.name]}
                    onChange={(v) => onUpdateProps({ [sizeField.name]: v })}
                  />
                </div>
              )}
              <FieldInput
                field={field}
                value={slide.props[field.name] ?? field.default}
                onChange={(value) => setField(field, value)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  function renderFieldsSection() {
    if (baseFields.length === 0) return null;
    return (
      <section className="flex flex-col gap-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-text-muted">Fält</h2>
        {renderFields(baseFields)}
      </section>
    );
  }

  /** Hopfälld avdelning. Räknaren visar hur många av fälten som är ifyllda på sliden. */
  function renderFolded(title: string, fields: FieldSchema[], note?: string) {
    if (fields.length === 0) return null;
    const filled = countFilled(fields, slide.props as Record<string, unknown>);
    return (
      <details className="group border-t border-white/5 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs uppercase tracking-[0.25em] text-text-muted transition-colors hover:text-accent">
          <span>{title}</span>
          <span className="font-mono text-[0.7rem] normal-case tracking-normal opacity-70">
            {filled > 0 ? `${filled} av ${fields.length} ifyllda` : `${fields.length} fält`}
            <span className="ml-2 inline-block transition-transform group-open:rotate-90">▸</span>
          </span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {note ? <p className="text-xs text-text-muted">{note}</p> : null}
          {renderFields(fields)}
        </div>
      </details>
    );
  }

  function renderContentSection() {
    // Står det text mellan taggarna visas den, också när schemat inte räknar med
    // det (ett LiquidQuote med citatet som innehåll i stället för i `quote`).
    const written = !schema.childrenType && Boolean(slide.content && slide.content.trim());
    if (!schema.hasContent && !written) return null;
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-xs uppercase tracking-[0.25em] text-text-muted">
            {schema.contentLabel ?? "Innehåll (markdown)"}
          </label>
          {sizeForContent && (
            <SizePills
              field={sizeForContent}
              value={slide.props[sizeForContent.name]}
              onChange={(v) => onUpdateProps({ [sizeForContent.name]: v })}
            />
          )}
        </div>
        <textarea
          value={slide.content ?? ""}
          onChange={(e) => onUpdateContent(e.target.value)}
          rows={schema.contentFirst ? 5 : 10}
          spellCheck={false}
          className="rounded-md border border-white/10 bg-bg-surface/60 p-3 font-mono text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none"
          placeholder={schema.contentLabel ? undefined : "Markdown-innehåll, tex punktlista med -"}
        />
        {schema.contentHint ? (
          <p className="text-xs text-text-muted">{schema.contentHint}</p>
        ) : (
          <p className="text-xs text-text-muted">
            Tips: använd <code className="font-mono">-</code> för punktlista,{" "}
            <code className="font-mono">**fet**</code> för accent-färg.
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Template info */}
      <section>
        <div className="mb-1 flex items-center gap-3">
          <span className="rounded-sm border border-accent/30 bg-accent-dim px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-accent">
            {slide.tag}
          </span>
          {isFallback && (
            <span
              className="rounded-sm border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-wider text-yellow-300"
              title="Schema saknas — fält genererade från slide.props"
            >
              Auto-schema
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted">{schema.description}</p>
      </section>

      {/* Mallar där orden ÄR sliden (HookStatement, PromptWindow) har texten överst */}
      {schema.contentFirst ? renderContentSection() : null}

      {/* Fält för props — size-fält pairas med sitt bas-fält */}
      {renderFieldsSection()}

      {/* Nested children (Timeline → TimelineEvent, Comparison → ComparisonColumn) */}
      {schema.childrenType && schema.childrenType !== "slot" && (
        <SubComponentList
          children={slide.children}
          childTag={schema.childrenType}
          onUpdateChild={onUpdateChildProps}
          onUpdateChildContent={onUpdateChildContent}
          onAddChild={onAddChild}
          onRemoveChild={onRemoveChild}
          onMoveChild={onMoveChild}
        />
      )}

      {/* Content (för templates som har children) */}
      {schema.contentFirst ? null : renderContentSection()}

      {renderFolded("Fler inställningar", advancedFields)}

      {/* Notes */}
      <section className="flex flex-col gap-2">
        <label className="text-xs uppercase tracking-[0.25em] text-text-muted">
          Speaker notes
        </label>
        <textarea
          value={slide.notes ?? ""}
          onChange={(e) => onUpdateNotes(e.target.value)}
          rows={6}
          spellCheck
          className="rounded-md border border-white/10 bg-bg-surface/60 p-3 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none"
          placeholder="Anteckningar som bara du ser under presentationen..."
        />
      </section>

      {/* Planeringen följer med varje slide, vilken mall den än har */}
      <section className="flex flex-col gap-4 border-t border-white/5 pt-4">
        <h2 className="text-xs uppercase tracking-[0.25em] text-text-muted">Planering</h2>
        {renderFields(planningFields)}
      </section>

      {renderFolded(
        "Övriga egenskaper",
        extraFields,
        "Står på sliden men hör inte till mallens formulär: lager som figur, symbol och register, eller något som lagts dit i filen. Töm ett fält för att ta bort egenskapen.",
      )}

      {/* Kollapsbar frontmatter-panel (sällan-redigerad meta: titel, event, datum, tema) */}
      <section className="flex flex-col gap-3 border-t border-white/5 pt-4">
        <button
          onClick={() => setFmOpen((v) => !v)}
          className="flex items-center justify-between gap-2 text-left text-xs uppercase tracking-[0.25em] text-text-muted transition-colors hover:text-accent"
          aria-expanded={fmOpen}
        >
          <span>Presentation (meta &amp; tema)</span>
          <span className="font-mono text-[0.7rem] opacity-60">{fmOpen ? "▾" : "▸"}</span>
        </button>
        {fmOpen && (
          <div className="flex flex-col gap-4">
            <FrontmatterField
              label="Titel"
              value={(frontmatter.title as string) ?? ""}
              onChange={(v) => onUpdateFrontmatter("title", v)}
            />
            <FrontmatterField
              label="Event"
              value={(frontmatter.event as string) ?? ""}
              onChange={(v) => onUpdateFrontmatter("event", v)}
            />
            <FrontmatterField
              label="Datum"
              value={(frontmatter.date as string) ?? ""}
              onChange={(v) => onUpdateFrontmatter("date", v)}
            />
            <FrontmatterField
              label="Beskrivning"
              value={(frontmatter.description as string) ?? ""}
              onChange={(v) => onUpdateFrontmatter("description", v)}
              multiline
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text">Tema</label>
              <select
                value={(frontmatter.theme as string) ?? "default"}
                onChange={(e) => onUpdateFrontmatter("theme", e.target.value)}
                className="rounded-md border border-white/10 bg-bg-surface/60 p-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {/* Genereras ur temaregistret. Hårdkodad lista här listade 7
                    av 17 teman och saknade bland annat dagsljus — temat
                    en hel föreläsningsserie använder, vilket gjorde att man inte kunde
                    välja tillbaka det om man råkat byta. */}
                {getThemeList().map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function FrontmatterField({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="rounded-md border border-white/10 bg-bg-surface/60 p-2 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-md border border-white/10 bg-bg-surface/60 p-2 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none"
        />
      )}
    </div>
  );
}
