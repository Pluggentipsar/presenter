import fs from "node:fs";
import path from "node:path";
import { cuesOf, slidesOf, toMarkdown, toSrt, toVtt, type Avskrift, type AvskriftWord } from "./avskrift";
import { transcribeTools } from "./avskrift-tools.server";
import { jobContext, launch, listExportFiles, runProcess, type Step } from "./export.server";
import { slideTitles } from "./titles.server";
import type { ExportStatus } from "./types";

/**
 * Avskriften av en inspelning (2 oktober 2026): det Joel faktiskt sa, ord för ord, kopplat till slide
 * och klicksteg via tidslinjen. Körs lokalt, inget lämnar datorn:
 * 1. Ljudet (samma underlag som exporten) som mono 16 kHz.
 * 2. KB-Whisper på grafikkortet (Avskrifts verktyg). En halvtimme tar ungefär en minut.
 * 3. VoxRex justerar ordens tider (DirectML, annars processorn), om modellen finns.
 * 4. Per slide: export/avskrift.md (läsbar), export/avskrift.json (ord, slides, klicksteg och
 *    undertexter, för läsläget) och undertexterna export/undertext.srt och .vtt.
 * Se docs/INSPELNING.md.
 */

interface WhisperOutput { segments: { start: number; end: number; text: string }[]; words: { start: number; end: number; text: string }[] }
interface AlignOutput { words: { start: number; end: number; text: string; aligned?: boolean }[] }

export async function startTranscription(slug: string, id: string): Promise<ExportStatus> {
  const context = await jobContext(slug, id);
  const { manifest, dir, basis, duration, job, ffmpeg, fresh, produce, wav, audioStep } = context;
  if (!audioStep) throw new Error("Inspelningen har inget ljud.");
  const avskrift = transcribeTools();
  if (!avskrift.ok) throw new Error(avskrift.note ?? "Avskriften går inte att köra på den här datorn.");

  const wav16 = path.join(basis, "ljud16k.wav");
  const whisperJson = path.join(basis, "whisper.json");
  const alignJson = path.join(basis, "ordtider.json");
  const canAlign = Boolean(avskrift.align && avskrift.alignDir && avskrift.voxrex);
  /** Verktygen säger inte hur långt de har kommit: uppskatta ur ljudets längd. */
  const estimate = (seconds: number, progress: (percent: number) => void) => {
    const started = Date.now();
    const timer = setInterval(() => progress(Math.min(95, ((Date.now() - started) / 1000 / Math.max(2, seconds)) * 100)), 500);
    return () => clearInterval(timer);
  };

  const plan: Step[] = [audioStep];
  plan.push({ label: "Avskriften", run: async progress => {
    if (!fresh(wav16, wav)) await produce(wav16, part => ffmpeg(["-i", wav, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", part], percent => progress(percent / 10)));
    if (fresh(whisperJson, wav16)) return;
    // KB-Whisper large på grafikkortet hinner ungefär trettio gånger snabbare än realtid.
    const stop = estimate(duration / 25 + 5, percent => progress(10 + percent * 0.9));
    try {
      await produce(whisperJson, part => runProcess(job, avskrift.whisper!, [avskrift.model!, wav16, part, "gpu"], () => {}).catch(() => runProcess(job, avskrift.whisper!, [avskrift.model!, wav16, part, "cpu"], () => {})));
    } finally {
      stop();
    }
  } });
  if (canAlign) plan.push({ label: "Ordtiderna", run: async progress => {
    if (fresh(alignJson, whisperJson)) return;
    const env = { ...process.env, PATH: `${avskrift.alignDir}${path.delimiter}${process.env.PATH ?? ""}` };
    const args = (device: string, out: string) => [path.join(avskrift.voxrex!, "model.fp16.onnx"), path.join(avskrift.voxrex!, "vocab.json"), wav16, whisperJson, out, device];
    const stop = estimate(duration / 200 + 4, progress);
    try {
      // DirectML på grafikkortet; går det inte, processorn (ungefär en tiondel av realtid).
      await produce(alignJson, part => runProcess(job, avskrift.align!, args("dml", part), () => {}, env).catch(() => runProcess(job, avskrift.align!, args("cpu", part), () => {}, env)));
    } finally {
      stop();
    }
  } });
  plan.push({ label: "Per slide", run: async () => {
    const whisper = JSON.parse(fs.readFileSync(whisperJson, "utf8")) as WhisperOutput;
    const aligned = canAlign && fs.existsSync(alignJson) ? (JSON.parse(fs.readFileSync(alignJson, "utf8")) as AlignOutput) : null;
    const words: AvskriftWord[] = (aligned?.words ?? whisper.words)
      .filter(word => word.text.trim())
      .map(word => ({ start: Math.round(word.start * 1000) / 1000, end: Math.round(Math.max(word.end, word.start) * 1000) / 1000, text: word.text.trim(), ...(aligned ? { aligned: (word as { aligned?: boolean }).aligned !== false } : {}) }));
    const titles = slideTitles(slug);
    const slides = slidesOf(manifest, words, titles);
    const cues = cuesOf(words);
    const model = path.basename(avskrift.model!).replace(/\.bin$/, "").replace(/^kb-whisper-/, "KB-Whisper ");
    const result: Avskrift = { version: 1, slug, id, model, aligned: Boolean(aligned), created: new Date().toISOString(), durationSeconds: duration, words, slides, cues };
    const started = new Date(manifest.started);
    const recorded = `${started.toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })} kl. ${String(started.getHours()).padStart(2, "0")}.${String(started.getMinutes()).padStart(2, "0")}`;
    const write = (name: string, content: string) => produce(path.join(dir, name), async part => fs.writeFileSync(part, content, "utf8"));
    await write("avskrift.json", JSON.stringify(result, null, 1));
    await write("avskrift.md", toMarkdown(result, manifest.title, recorded));
    await write("undertext.srt", toSrt(cues));
    await write("undertext.vtt", toVtt(cues));
  } });

  return launch(slug, id, job, plan, { kind: "avskrift", state: "kör", steps: [], step: 0, percent: 0, started: new Date().toISOString(), files: listExportFiles(slug, id) });
}
