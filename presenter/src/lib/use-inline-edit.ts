"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildBlockText,
  collectTextNodeContainers,
  domPathFrom,
  lineHeightPxOf,
  resolveDomPath,
} from "./text-blocks";

/**
 * Tillfälligt textredigeringsläge — "redigera i onlineläget".
 *
 * När läget är på blir alla textblock i sliden contentEditable: klicka på en
 * rubrik eller ett stycke och skriv om det direkt i webbläsaren. Ändringar
 * sparas i minnet (nyckel: slide-index + DOM-sökväg) och återappliceras när
 * en slide monteras om (slide-byte fram och tillbaka, steps, export-loopen).
 * INGET skrivs till disk eller server — allt försvinner vid omladdning.
 *
 * Poängen: gäster på Vercel-deployen (utan filsystemsåtkomst) kan justera
 * text och sedan spara ned via PDF-/PowerPoint-exporten, som fotograferar
 * DOM:en och därmed automatiskt får med ändringarna.
 *
 * Begränsningar (medvetna, för enkelhetens skull):
 * - Redigerad text blir "platt" — fetstils-spans och ord-för-ord-animationer
 *   i det redigerade blocket ersätts av ren text.
 * - Text i SVG/canvas går inte att redigera.
 */
export function useInlineEdit(
  stageRef: React.RefObject<HTMLElement | null>,
  slideIndex: number,
) {
  const [active, setActive] = useState(false);
  // Antal redigerade block — driver indikatorn i UI:t
  const [editCount, setEditCount] = useState(0);
  // key: `${slideIndex}:${domPath}` → { orig: texten före redigering, text: nuvarande }
  const editsRef = useRef(new Map<string, { orig: string; text: string }>());

  /** Gör alla textblock i aktuell slide redigerbara. Körs på intervall så
   *  block som dyker upp senare (steps, staggered mounts) också fångas. */
  useEffect(() => {
    if (!active) return;
    const stage = stageRef.current;
    if (!stage) return;

    const attach = () => {
      const containers = collectTextNodeContainers(stage);
      for (const el of containers.keys()) {
        if (el.dataset.inlineEditPath !== undefined) continue;
        el.dataset.inlineEditPath = domPathFrom(stage, el);
        // plaintext-only stoppar rich-text-inklistring där det stöds
        el.contentEditable = "plaintext-only";
        if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
      }
    };
    attach();
    const interval = setInterval(attach, 700);

    return () => {
      clearInterval(interval);
      for (const el of stage.querySelectorAll<HTMLElement>("[data-inline-edit-path]")) {
        el.removeAttribute("contenteditable");
        delete el.dataset.inlineEditPath;
      }
    };
  }, [active, slideIndex, stageRef]);

  /** Fokus: platta ut blocket till korrekt text (ord-för-ord-spans saknar
   *  mellanslag i textContent) och kom ihåg ursprungstexten. */
  useEffect(() => {
    if (!active) return;
    const stage = stageRef.current;
    if (!stage) return;

    const onFocusIn = (e: FocusEvent) => {
      const host = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(
        "[data-inline-edit-path]",
      );
      if (!host || host.dataset.inlineEditOrig !== undefined) return;
      const nodes = collectTextNodeContainers(stage).get(host) ?? [];
      const text = buildBlockText(nodes, lineHeightPxOf(host));
      host.dataset.inlineEditOrig = text;
      // Platta bara ut om strukturen kräver det (flera element-barn) —
      // annars behåller vi DOM:en och därmed caret-positionen.
      if (host.children.length > 0 && text && host.textContent !== text) {
        host.textContent = text;
      }
    };

    const onInput = (e: Event) => {
      const host = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(
        "[data-inline-edit-path]",
      );
      if (!host) return;
      const path = host.dataset.inlineEditPath;
      if (!path) return;
      const key = `${slideIndex}:${path}`;
      const orig = host.dataset.inlineEditOrig ?? host.textContent ?? "";
      editsRef.current.set(key, { orig, text: host.textContent ?? "" });
      setEditCount(editsRef.current.size);
    };

    stage.addEventListener("focusin", onFocusIn);
    stage.addEventListener("input", onInput);
    return () => {
      stage.removeEventListener("focusin", onFocusIn);
      stage.removeEventListener("input", onInput);
    };
  }, [active, slideIndex, stageRef]);

  /** Återapplicera ändringar på aktuell slide — körs på intervall så att
   *  ommonterade slides (navigation, export-loopen) får tillbaka sin text.
   *  Säkerhetsregel: skriv bara om elementets nuvarande text matchar den
   *  ursprungliga (eller redan redigerade) texten, så att en förskjuten
   *  DOM-sökväg aldrig skriver över fel element. */
  useEffect(() => {
    if (editCount === 0) return;
    const apply = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const prefix = `${slideIndex}:`;
      for (const [key, edit] of editsRef.current) {
        if (!key.startsWith(prefix)) continue;
        const el = resolveDomPath(stage, key.slice(prefix.length));
        if (!el) continue;
        if (el.contains(document.activeElement)) continue;
        const current = el.textContent ?? "";
        if (current === edit.text) continue;
        const nodes = collectTextNodeContainers(stage).get(el);
        const built = nodes ? buildBlockText(nodes, lineHeightPxOf(el)) : current;
        if (current === edit.orig || built === edit.orig) {
          el.textContent = edit.text;
        }
      }
    };
    apply();
    const interval = setInterval(apply, 600);
    return () => clearInterval(interval);
  }, [editCount, slideIndex, stageRef]);

  const toggle = useCallback(() => setActive((a) => !a), []);
  const discard = useCallback(() => {
    // Enklaste garantin för att allt är orört igen: ladda om sidan
    window.location.reload();
  }, []);

  return { active, toggle, editCount, discard, setActive };
}
