"use client";

import type { CSSProperties, ReactNode } from "react";
import { isValidElement } from "react";
import type { ReactElement } from "react";
import { useInlineEdit } from "@/lib/inline-edit";
import { useIsOverlay, useOverlayInstance } from "./SlideWithOverlays";
import { useObjectStep } from "./object-step";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * FloatingText — fri textruta ovanpå en slide. Stödjer **fet** (accentfärg)
 * och *kursiv* via markdown.
 *
 * Rutan ritar bara sig själv. Flytt, storlek, rotation, skrivning direkt i
 * rutan och egenskaperna sköts av editorns objektlager
 * (components/editor/ObjectLayer), som hittar rutan via data-object-index.
 *
 * MDX-format:
 * ```mdx
 * <FloatingText
 *   x="20%" y="30%" width="30%"
 *   align="left"
 *   size="lg"
 *   color="var(--text)"
 *   weight="bold"
 *   layer="front"
 * >
 * En **fri** textruta du kan flytta och dra ut storleken på.
 * </FloatingText>
 * ```
 */

type SizeKey = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

/**
 * SIZE_PRESETS — preset-namn → cqw-värde (% av container-bredd).
 * Container query units gör att texten skalar med wrapper-bredden,
 * så drar du i resize-hörnen växer fonten med boxen automatiskt.
 */
export const SIZE_PRESETS: Record<SizeKey, number> = {
  xs: 5,
  sm: 7,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
};

/**
 * Tolka size-prop som antingen preset-namn ("md") eller direkt cqw-värde
 * (sträng som "12" eller nummer 12). Returnerar cqw-värde 1-100.
 */
export function resolveSizeCqw(size: string | number | undefined): number {
  if (size == null) return SIZE_PRESETS.md;
  if (typeof size === "number") return Math.max(1, Math.min(100, size));
  // Strängar — kolla först om det är ett preset-namn
  if (size in SIZE_PRESETS) return SIZE_PRESETS[size as SizeKey];
  // Sen som numeriskt värde (t.ex. "12" eller "12cqw")
  const parsed = parseFloat(size);
  if (Number.isFinite(parsed)) return Math.max(1, Math.min(100, parsed));
  return SIZE_PRESETS.md;
}

interface FloatingTextProps {
  /** Texten — kan komma som children eller via `text`-prop. **bold** och *italic* stöds. */
  text?: string;
  /** Horisontell position som procent. */
  x?: string;
  /** Vertikal position som procent. */
  y?: string;
  /** Bredd. Default 25%. */
  width?: string;
  /** Höjd (auto om ej angiven). */
  height?: string;
  /**
   * Storlek på texten — antingen ett preset-namn (xs/sm/md/lg/xl/xxl) eller
   * ett direkt cqw-värde som sträng eller nummer (t.ex. "12" eller 12 = 12% av
   * container-bredden).
   */
  size?: SizeKey | string | number;
  /** Textfärg. Default temats. */
  color?: string;
  /** Vikt. Default 500. */
  weight?: "regular" | "medium" | "bold" | "black" | number;
  /** Justering. */
  align?: "left" | "center" | "right";
  /** Stil — "display" (rubrikfont) eller "body" (löptext). */
  style?: "display" | "body" | "mono";
  /** Bakgrund inom rutan (CSS-färg eller "transparent"). Default transparent. */
  background?: string;
  /** Padding. Default 0. */
  padding?: string;
  /** Border-radius. Default 0. */
  radius?: string;
  /** Rotation i grader. */
  rotation?: number;
  /** Opacitet 0-1. */
  opacity?: number;
  /** Z-index. */
  zIndex?: number;
  /** Layer — front (default) eller back. */
  layer?: "front" | "back";
  /** Accent (för **fet** text). */
  accent?: string;
  /** Radavstånd. Default 1.3. */
  lineHeight?: number | string;
  /** Syns efter så många klick (0 eller inget = från början). */
  step?: number | string;
  /** Försvinner vid det här klicket. */
  until?: number | string;
  /** Låst i editorn: går inte att flytta av misstag. */
  locked?: boolean;
  /** Namn i editorns lagerlista. */
  name?: string;
  children?: ReactNode;
}

export const WEIGHT_MAP: Record<string, number> = {
  regular: 400,
  medium: 500,
  bold: 700,
  black: 900,
};

export function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    if (t === "p") return inner + "\n";
    if (t === "br") return "\n";
    return inner;
  }
  return "";
}

function renderRich(text: string, accent: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <span
        key={lineIdx}
        style={{ display: "block" }}
      >
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return (
              <span key={i} style={{ color: accent, fontWeight: 700 }}>
                {p.slice(2, -2)}
              </span>
            );
          }
          if (p.startsWith("*") && p.endsWith("*")) {
            return (
              <em key={i} style={{ fontStyle: "italic" }}>
                {p.slice(1, -1)}
              </em>
            );
          }
          return <span key={i}>{p}</span>;
        })}
      </span>
    );
  });
}

export function FloatingText({
  text,
  x = "30%",
  y = "30%",
  width = "30%",
  height,
  size = "md",
  color = "var(--text)",
  weight = "medium",
  align = "left",
  style = "display",
  background = "transparent",
  padding = "0",
  radius = "0",
  rotation = 0,
  opacity = 1,
  zIndex,
  layer = "front",
  accent = "var(--accent)",
  lineHeight,
  step,
  until,
  locked,
  name: _name,
  children,
}: FloatingTextProps) {
  void _name;
  // Resolve size till cqw-nummer (stödjer både preset-namn och direkt värde)
  const sizeCqw = resolveSizeCqw(size);
  const { editMode } = useInlineEdit();
  const isOverlay = useIsOverlay();
  const { index } = useOverlayInstance();
  const shown = useObjectStep(step, until);

  const effectiveZIndex = zIndex ?? (layer === "back" ? 1 : 10);

  // Innehåll: text-prop eller children
  const rawText = text ?? extractText(children).trim();

  // Resolve weight
  const fontWeight =
    typeof weight === "number"
      ? weight
      : WEIGHT_MAP[weight] ?? 500;

  // Font-family baserat på style
  const fontFamily =
    style === "mono"
      ? "var(--font-mono)"
      : style === "body"
      ? "var(--font-body)"
      : "var(--font-display)";

  const lineHeightNum = lineHeight === undefined || lineHeight === "" ? 1.3 : Number(lineHeight) || 1.3;

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width,
    height: height || "auto",
    minHeight: editMode && !rawText ? "2rem" : undefined,
    transform: `rotate(${rotation}deg)`,
    // Klicksteg: dolt i spelaren, dämpat i editorn så att det går att placera.
    opacity: shown ? opacity : editMode ? 0.3 : 0,
    pointerEvents: shown || editMode ? undefined : "none",
    transition: "opacity 320ms ease",
    zIndex: effectiveZIndex,
    cursor: editMode && !locked ? "grab" : "default",
    userSelect: editMode ? "none" : "text",
    touchAction: "none",
    background,
    padding,
    borderRadius: radius,
    // Container query — gör att font-size i SIZE_MAP (cqw) skalas med
    // wrapper-bredden. När du drar för att ändra storlek växer fonten
    // automatiskt med boxen.
    containerType: "inline-size",
  };

  const textStyle: CSSProperties = {
    fontFamily,
    fontWeight,
    // cqw skalas dynamiskt med container-bredd. Min/max-clamp så texten
    // inte blir orimligt liten/stor när boxen är extrem.
    fontSize: `clamp(0.6rem, ${sizeCqw}cqw, 12rem)`,
    lineHeight: lineHeightNum,
    letterSpacing: "-0.005em",
    color,
    textAlign: align,
    margin: 0,
    pointerEvents: editMode ? "none" : "auto",
    width: "100%",
  };

  const contentElement = (
    <div
      data-object-index={editMode && isOverlay && index !== undefined ? index : undefined}
      data-object-kind={editMode ? "text" : undefined}
      data-object-locked={editMode && locked ? "" : undefined}
      data-object-hidden={editMode && !shown ? "" : undefined}
      style={wrapperStyle}
    >
      <div data-object-text="" style={textStyle}>
        {rawText ? (
          renderRich(rawText, accent)
        ) : editMode ? (
          <span
            style={{
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}
          >
            (dubbelklicka för att skriva)
          </span>
        ) : null}
      </div>
    </div>
  );

  // Overlay-mode: bara textrutan
  if (isOverlay) return contentElement;

  // Standalone-mode (sällan använt — främst som overlay)
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))" }}
    >
      {contentElement}
    </div>
  );
}
