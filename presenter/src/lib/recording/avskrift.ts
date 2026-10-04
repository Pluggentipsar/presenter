import { chaptersOf, clock } from "./timeline";
import type { RecordingManifest } from "./types";

/**
 * Avskriften som data (2 oktober 2026): orden med tider, fördelade på slides och klicksteg via
 * tidslinjen, och undertexter. Delas av servern (som skriver filerna) och sidan (som visar texten).
 * Inga Node-moduler här, så att sidan kan läsa den.
 */

export interface AvskriftWord {
  start: number;
  end: number;
  text: string;
  /** Om VoxRex kunde justera ordets tid (annars Whispers egen eller en uppskattning). */
  aligned?: boolean;
}

export interface AvskriftStep {
  step: number;
  start: number;
  end: number;
  text: string;
}

export interface AvskriftSlide {
  index: number;
  slideId?: string;
  title: string;
  start: number;
  end: number;
  text: string;
  steps: AvskriftStep[];
}

export interface AvskriftCue {
  start: number;
  end: number;
  text: string;
}

export interface Avskrift {
  version: 1;
  slug: string;
  id: string;
  model: string;
  aligned: boolean;
  created: string;
  durationSeconds: number;
  words: AvskriftWord[];
  slides: AvskriftSlide[];
  cues: AvskriftCue[];
}

const join = (words: AvskriftWord[]) => words.map(word => word.text.trim()).filter(Boolean).join(" ").replace(/\s+([,.!?;:])/g, "$1");

/**
 * Fördela orden på slides och klicksteg. En mening hör till läget där den började, så att texten
 * går att läsa även när klicket kom mitt i en mening; är meningen redan lång när klicket kommer
 * (mer än åtta sekunder) delas den vid klicket. Slidernas och stegens start och slut är klickens
 * tider, för ljudet per slide.
 */
export function slidesOf(manifest: RecordingManifest, words: AvskriftWord[], titles: Record<string, string> = {}): AvskriftSlide[] {
  const positions = manifest.timeline
    .filter(event => event.type === "position" && event.index !== undefined)
    .map(event => ({ t: event.t / 1000, index: event.index!, step: event.step ?? 1 }));
  const chapters = chaptersOf(manifest, titles);
  const at = (time: number) => {
    let found = positions[0];
    for (const position of positions) {
      if (position.t <= time + 0.05) found = position;
      else break;
    }
    return found;
  };
  // Tiden som avgör var ett ord hamnar: när dess mening började, högst åtta sekunder bakåt.
  const anchor: number[] = [];
  let sentenceStart = words[0]?.start ?? 0;
  words.forEach((word, i) => {
    if (i > 0 && /[.!?]["”»)]?$/.test(words[i - 1].text.trim())) sentenceStart = word.start;
    anchor.push(word.start - sentenceStart > 8 ? word.start : sentenceStart);
  });
  const slides: AvskriftSlide[] = [];
  for (const chapter of chapters) {
    const inChapter = words.filter((_, i) => anchor[i] >= chapter.start - 0.05 && anchor[i] < chapter.end - 0.05);
    const steps: AvskriftStep[] = [];
    for (const word of inChapter) {
      const step = at(anchor[words.indexOf(word)])?.step ?? 1;
      const last = steps[steps.length - 1];
      if (last && last.step === step) {
        last.end = word.end;
        last.text = `${last.text} ${word.text.trim()}`;
      } else steps.push({ step, start: word.start, end: word.end, text: word.text.trim() });
    }
    for (const step of steps) step.text = step.text.replace(/\s+([,.!?;:])/g, "$1");
    slides.push({ index: chapter.index, slideId: chapter.slideId, title: chapter.title, start: chapter.start, end: chapter.end, text: join(inChapter), steps });
  }
  return slides;
}

/**
 * Bryt en textrad i högst två rader nära mitten, med högst cirka 42 tecken per rad. Finns ett
 * skiljetecken nära mitten bryts raden efter det.
 */
function wrap(text: string): string {
  if (text.length <= 42) return text;
  const middle = text.length / 2;
  const cost = (i: number) => Math.abs(i - middle) - (/[.!?,;:]/.test(text[i - 1] ?? "") ? text.length * 0.2 : 0);
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== " " || Math.max(i, text.length - i - 1) > 46) continue;
    if (best < 0 || cost(i) < cost(best)) best = i;
  }
  return best < 0 ? text : `${text.slice(0, best)}\n${text.slice(best + 1)}`;
}

/**
 * Undertexter ur orden: högst två rader och sex sekunder per text, ny text vid meningsslut och vid
 * en paus. Undertexterna följer talet, inte slidesen. En ensam kort rest slås ihop med texten före.
 */
export function cuesOf(words: AvskriftWord[]): AvskriftCue[] {
  const groups: AvskriftWord[][] = [];
  let current: AvskriftWord[] = [];
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
  };
  for (const word of words) {
    const previous = current[current.length - 1];
    if (previous) {
      const longer = join([...current, word]);
      if (longer.length > 84 || word.end - current[0].start > 6 || word.start - previous.end > 0.8) flush();
    }
    current.push(word);
    if (/[.!?]$/.test(word.text.trim()) && join(current).length >= 24) flush();
  }
  flush();
  for (let i = groups.length - 1; i > 0; i--) {
    const before = groups[i - 1], group = groups[i];
    const close = group[0].start - before[before.length - 1].end < 0.4;
    if (close && join(group).length < 12 && join([...before, ...group]).length <= 84) groups.splice(i - 1, 2, [...before, ...group]);
  }
  const cues: AvskriftCue[] = groups.map(group => ({ start: group[0].start, end: group[group.length - 1].end, text: wrap(join(group)) }));
  // Visa varje text minst en dryg sekund och lite efter sista ordet, utan att krocka med nästa.
  for (let i = 0; i < cues.length; i++) {
    const next = cues[i + 1]?.start ?? Infinity;
    cues[i].end = Math.min(next - 0.04, Math.max(cues[i].end + 0.3, cues[i].start + 1.2));
  }
  return cues.filter(cue => cue.end > cue.start);
}

const stamp = (seconds: number, separator: "," | ".") => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${separator}${String(rest).padStart(3, "0")}`;
};

export function toSrt(cues: AvskriftCue[]): string {
  return cues.map((cue, i) => `${i + 1}\n${stamp(cue.start, ",")} --> ${stamp(cue.end, ",")}\n${cue.text}\n`).join("\n");
}

export function toVtt(cues: AvskriftCue[]): string {
  return `WEBVTT\n\n${cues.map(cue => `${stamp(cue.start, ".")} --> ${stamp(cue.end, ".")}\n${cue.text}\n`).join("\n")}`;
}

/** Avskriften som läsbar text: en rubrik per slide med tiden, ett stycke per klicksteg. */
export function toMarkdown(avskrift: Avskrift, title: string, recorded: string): string {
  const lines = [`# ${title} · avskrift`, "", `Inspelad ${recorded} · ${clock(avskrift.durationSeconds)} · ${avskrift.model}${avskrift.aligned ? ", ordtider justerade med VoxRex" : ""}. Det som sades, ord för ord; inte redigerat.`, ""];
  for (const slide of avskrift.slides) {
    lines.push(`## ${slide.title} (${clock(slide.start)})`, "");
    if (!slide.steps.length) lines.push("*(inget sades här)*", "");
    for (const step of slide.steps) lines.push(step.text, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export interface AvskriftSentence {
  start: number;
  end: number;
  text: string;
}

/** Meningarna med tider, för lyssningsläget: den som sägs just nu markeras och går att klicka på. */
export function sentencesOf(words: AvskriftWord[]): AvskriftSentence[] {
  const out: AvskriftSentence[] = [];
  let current: AvskriftWord[] = [];
  for (const word of words) {
    current.push(word);
    if (/[.!?]["”»)]?$/.test(word.text.trim()) || current.length >= 40) {
      out.push({ start: current[0].start, end: word.end, text: join(current) });
      current = [];
    }
  }
  if (current.length) out.push({ start: current[0].start, end: current[current.length - 1].end, text: join(current) });
  return out;
}
