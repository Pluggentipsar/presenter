"use client";

import type { CSSProperties } from "react";
import { RichLines } from "./kit";
import type { FormProps } from "./forms";
import { clamp, rng, useStepClock } from "./sim";
import s from "./stage.module.css";
import c from "./sattning.module.css";

/*
 * Sättningen (visualiseringspasset 1 oktober 2026, kod-sliden): meningen sätts av en generativ
 * typografisk motor. Den prövar hundratals sättningar i hög fart (storlek, vikt, spärrning, radbrytning,
 * justering, en ord per rad, rutnät och lodrätt), saktar in och landar i den riktiga rubriken, som är
 * vanlig text och går att redigera. En räknare visar hur många sättningar som prövats.
 * Stilla lägen och granskningen visar den färdiga rubriken direkt.
 */

const SHUFFLE = { count: 347, seconds: 3.2, tau: .9 };
const FRAME = { x: 96, y: 150, w: 980, h: 600 };
const FINAL = { size: 92, weight: 760, width: 860 };
const ALIGN_NAMES = ["vänster", "mitten", "höger"] as const;

type Word = { text: string; soft: boolean };
type Placed = { x: number; y: number; size: number; weight: number; track: number; rotate: number };
type Layout = { words: Placed[]; size: number; weight: number; align: number };

function wordsOf(title: string): Word[] {
  return title.split("\n").flatMap(line => {
    const soft = line.startsWith("~");
    return line.replace(/^~/, "").split(/\s+/).filter(Boolean).map(text => ({ text, soft }));
  });
}

/** Bredd per tecken i em för en grotesk: smala, halvsmala, breda och versaler var för sig. */
function charWidth(ch: string) {
  if ("ijlI|.,:;'!".includes(ch)) return .27;
  if ("ftr".includes(ch)) return .37;
  if ("mwMW".includes(ch)) return ch === ch.toUpperCase() ? .94 : .86;
  if (ch !== ch.toLowerCase()) return .7;
  return .58;
}
/** Ordets bredd i bildpunkter, med vikten (tyngre är bredare) och spärrningen. */
const widthOf = (text: string, size: number, track: number, weight: number) =>
  [...text].reduce((sum, ch) => sum + charWidth(ch) + track, 0) * size * (.9 + (weight - 400) / 460 * .14);

/** Sättning nummer k: fröad, så samma nummer blir samma bild. De sista närmar sig den riktiga. */
function layoutFor(k: number, words: Word[]): Layout {
  const rand = rng(k * 7919 + 13);
  const near = clamp((k - (SHUFFLE.count - 14)) / 14);
  const sizes = [40, 52, 64, 80, 96, 112, 136];
  let size = sizes[Math.floor(rand() * sizes.length)];
  let weight = [400, 520, 650, 760, 860][Math.floor(rand() * 5)];
  const track = -.06 + rand() * .08;
  let align = Math.floor(rand() * 3);
  let mode = Math.floor(rand() * 5);
  let width = 520 + rand() * (FRAME.w - 520);
  if (near > 0) { size = Math.round(size + (FINAL.size - size) * near); weight = FINAL.weight; align = 0; mode = 0; width = FINAL.width; }
  // Krymp tills sättningen ryms i ramen: ett ord per rad blir annars för högt, stora grader för långa.
  const rowsAt = (sz: number) => {
    if (mode === 2) return words.length;
    let rows = 1, used = 0;
    for (const word of words) {
      const w = widthOf(word.text, sz, track, weight);
      if (used && used + w > width) { rows++; used = 0; }
      used += w + sz * .3;
    }
    return rows;
  };
  if (mode <= 2) while (size > 30 && rowsAt(size) * size * 1.04 > FRAME.h) size = Math.floor(size * .88);
  const lineH = size * 1.04;
  const placed: Placed[] = [];
  if (mode === 3) {
    // Rutnät: ett ord per cell, fyra spalter.
    const cols = 4, cellW = FRAME.w / cols, cellH = Math.min(150, FRAME.h / Math.ceil(words.length / cols));
    const cellSize = Math.min(size, cellH * .7);
    words.forEach((_, i) => placed.push({ x: FRAME.x + (i % cols) * cellW, y: FRAME.y + Math.floor(i / cols) * cellH, size: cellSize, weight, track, rotate: 0 }));
  } else if (mode === 4) {
    // Lodrätt: raderna vrids och står bredvid varandra.
    const per = Math.max(1, Math.ceil(words.length / 4));
    words.forEach((_, i) => {
      const col = Math.floor(i / per), row = i % per;
      placed.push({ x: FRAME.x + 40 + col * size * 1.1, y: FRAME.y + FRAME.h - row * size * 2.6, size, weight, track, rotate: -90 });
    });
  } else {
    // Löptext (0, 1, 2) eller ett ord per rad (mode 2 bryter efter varje ord).
    const lines: number[][] = [[]];
    let used = 0;
    words.forEach((word, i) => {
      const w = widthOf(word.text, size, track, weight);
      if (lines[lines.length - 1].length && (mode === 2 || used + w > width)) { lines.push([]); used = 0; }
      lines[lines.length - 1].push(i);
      used += w + size * .3;
    });
    const top = FRAME.y + Math.max(0, (FRAME.h - lines.length * lineH) * (near > 0 ? .14 : rand()));
    lines.forEach((line, row) => {
      const lineW = line.reduce((sum, i) => sum + widthOf(words[i].text, size, track, weight) + size * .3, -size * .3);
      let x = FRAME.x + (align === 1 ? (width - lineW) / 2 : align === 2 ? width - lineW : 0);
      line.forEach(i => { placed[i] = { x, y: top + row * lineH, size, weight, track, rotate: 0 }; x += widthOf(words[i].text, size, track, weight) + size * .3; });
    });
  }
  return { words: placed, size, weight, align };
}

export function Sattning({ t, edit, step, still }: FormProps) {
  const title = t("title");
  const words = wordsOf(title);
  const clock = useStepClock(step, still, SHUFFLE.seconds + 1);
  const { count, seconds, tau } = SHUFFLE;
  const k = Math.min(count, Math.round(count * (1 - Math.exp(-clock / tau)) / (1 - Math.exp(-seconds / tau))));
  const landed = clock >= seconds;
  const layout = layoutFor(Math.max(1, k), words);
  const label = t("counterLabel") || "Sättning";
  const params = landed ? `${FINAL.size} px · ${FINAL.weight} · ${ALIGN_NAMES[0]}` : `${layout.size} px · ${layout.weight} · ${ALIGN_NAMES[layout.align]}`;
  return <div className={c.sat} data-landed={landed} data-still={still}>
    <p className={c.counter} aria-hidden="true"><span>{label}</span><b>{String(landed ? count : k).padStart(4, "0")}</b><span>{params}</span></p>
    {!landed && <div className={c.shuffle} aria-hidden="true">
      {words.map((word, i) => {
        const p = layout.words[i];
        if (!p) return null;
        return <span key={i} data-soft={word.soft || undefined}
          style={{ left: p.x, top: p.y, fontSize: p.size, fontWeight: p.weight, letterSpacing: `${p.track}em`, rotate: `${p.rotate}deg` } as CSSProperties}>{word.text}</span>;
      })}
    </div>}
    <h2 className={`${c.final} ${s.reveal}`} data-on={landed} aria-hidden={!landed}>{edit("title", <RichLines text={title} emphasis={t("emphasis")} />)}</h2>
  </div>;
}
