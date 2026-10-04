"use client";

/**
 * Delad logik för att hitta och läsa textblock i en renderad slide.
 * Används av PowerPoint-exporten (mäta upp textrutor) och av det
 * tillfälliga textredigeringsläget (göra blocken redigerbara).
 */

/** Display-värden som INTE är egna textblock — vi klättrar förbi dem. */
export const INLINE_DISPLAYS = new Set([
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "contents",
  "ruby",
]);

/**
 * Samla alla textbärande block-containers i slide-stage: gå igenom textnoder
 * och klättra upp till närmaste block-container (förbi inline/inline-block-
 * spans så ord-för-ord-reveals hålls ihop som ETT block).
 *
 * Returnerar en map container → dess textnoder i dokumentordning.
 */
export function collectTextNodeContainers(stage: HTMLElement): Map<HTMLElement, Text[]> {
  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  const ownNodes = new Map<HTMLElement, Text[]>();

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.textContent || !node.textContent.trim()) continue;
    let el: HTMLElement | null = node.parentElement;
    while (el && el !== stage) {
      const display = getComputedStyle(el).display;
      if (!INLINE_DISPLAYS.has(display)) break;
      el = el.parentElement;
    }
    if (!el || el === stage) continue;
    if (el.closest("svg")) continue;
    if (el.closest("[data-pdf-exclude='true']")) continue;
    const cls = el.className;
    if (typeof cls === "string" && (cls.includes("z-40") || cls.includes("z-50"))) continue;

    if (!ownNodes.has(el)) ownNodes.set(el, []);
    ownNodes.get(el)!.push(node);
  }

  return ownNodes;
}

/**
 * Bygg ett blocks text från dess textnoder, grupperade i rader via nodernas
 * faktiska y-position. Ord-för-ord-reveals renderar varje ord i en egen span
 * utan mellanslag emellan — `textContent`/`innerText` klistrar då ihop orden.
 * Radgruppering + join(" ") ger korrekt text OCH bevarar radbrytningar.
 */
export function buildBlockText(nodes: Text[], lineHeightPx: number): string {
  const parts: { text: string; top: number }[] = [];
  for (const n of nodes) {
    const t = n.textContent ?? "";
    if (!t.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rect = range.getClientRects()[0];
    parts.push({ text: t, top: rect ? rect.top : 0 });
  }
  if (parts.length === 0) return "";
  const lines: string[][] = [];
  let currentTop = Number.NEGATIVE_INFINITY;
  for (const p of parts) {
    if (Math.abs(p.top - currentTop) > lineHeightPx * 0.6) {
      lines.push([]);
      currentTop = p.top;
    }
    lines[lines.length - 1].push(p.text);
  }
  return lines
    .map((words) => words.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Radavstånd i px för ett element (för radgruppering och flatten). */
export function lineHeightPxOf(el: HTMLElement): number {
  const style = getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize) || 16;
  return style.lineHeight === "normal"
    ? fontSize * 1.2
    : parseFloat(style.lineHeight) || fontSize * 1.2;
}

/** Sökväg stage → element som barn-index ("2/0/5"). Stabil så länge DOM:en är det. */
export function domPathFrom(stage: HTMLElement, el: HTMLElement): string {
  const indices: number[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur !== stage) {
    const parent: HTMLElement | null = cur.parentElement;
    if (!parent) return "";
    indices.unshift(Array.prototype.indexOf.call(parent.children, cur));
    cur = parent;
  }
  return cur === stage ? indices.join("/") : "";
}

/** Slå upp ett element via sökväg från `domPathFrom`. */
export function resolveDomPath(stage: HTMLElement, path: string): HTMLElement | null {
  if (!path) return null;
  let cur: Element = stage;
  for (const part of path.split("/")) {
    const idx = parseInt(part, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= cur.children.length) return null;
    cur = cur.children[idx];
  }
  return cur instanceof HTMLElement ? cur : null;
}
