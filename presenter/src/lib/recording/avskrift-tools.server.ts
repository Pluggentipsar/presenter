import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dataPath } from "../data-dir.server";
import type { ModelState } from "./types";
import { bundledTool, modelsDir } from "./verktyg.server";

/**
 * Avskriftens verktyg (2 oktober 2026), från Joels app Avskrift (github.com/Pluggentipsar/avskrift):
 * - `avskrift-textedit-probe.exe`: KB-Whisper (whisper.cpp på grafikkortet via Vulkan), svenska,
 *   ord med tider. Indata: mono 16 kHz PCM16. Utdata: JSON med segment och ord.
 * - `align.exe`: VoxRex (wav2vec2, CC0) justerar ordens tider med ONNX Runtime på DirectML. Whispers egna
 *   ordtider kan ligga en tredjedels sekund fel och i värsta fall mycket mer.
 *
 * Verktygen följer med appen (`.verktyg/avskrift`, se scripts/hamta-verktyg.mjs). Modellerna hämtas
 * första gången de behövs (modeller.server.ts) till appens modellmapp; finns Avskrift-appen på datorn
 * lånas dess modeller. Miljövariablerna AVSKRIFT_WHISPER, AVSKRIFT_MODEL, AVSKRIFT_ALIGN och
 * AVSKRIFT_VOXREX (en mapp) går före. Se docs/INSPELNING.md.
 */

export interface TranscribeTools {
  whisper: string | null;
  model: string | null;
  align: string | null;
  /** Mappen med DirectML.dll, som align.exe behöver i PATH. */
  alignDir: string | null;
  voxrex: string | null;
  ok: boolean;
  note?: string;
  models: ModelState & { tools: boolean };
}

const home = os.homedir();
const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
const avskriftApp = path.join(appData, "com.avskrift.app");
const exists = (file: string | undefined | null): file is string => Boolean(file && fs.existsSync(file));

/** KB-Whisper i storleksordning; den största som finns används. */
export const WHISPER_SIZES = ["large", "medium", "small", "tiny"] as const;

export function transcribeTools(): TranscribeTools {
  const whisper = [process.env.AVSKRIFT_WHISPER, bundledTool("avskrift", "avskrift-textedit-probe.exe"), dataPath("verktyg", "avskrift", "avskrift-textedit-probe.exe")].find(exists) ?? null;
  const align = [process.env.AVSKRIFT_ALIGN, bundledTool("avskrift", "align.exe"), dataPath("verktyg", "avskrift", "align.exe")].find(exists) ?? null;
  const alignDir = align && fs.existsSync(path.join(path.dirname(align), "DirectML.dll")) ? path.dirname(align) : null;

  let model: string | null = exists(process.env.AVSKRIFT_MODEL) ? process.env.AVSKRIFT_MODEL! : null;
  let size: string | null = model ? path.basename(model).replace(/^kb-whisper-|\.bin$/g, "") : null;
  for (const candidate of WHISPER_SIZES) {
    if (model) break;
    const found = [path.join(modelsDir(), `kb-whisper-${candidate}.bin`), path.join(avskriftApp, "whisper-models", `kb-whisper-${candidate}.bin`)].find(exists);
    if (found) { model = found; size = candidate; }
  }
  const voxrex = [process.env.AVSKRIFT_VOXREX, path.join(modelsDir(), "voxrex"), path.join(avskriftApp, "wordalign-sv"), dataPath("modeller", "voxrex")]
    .find(dir => exists(dir) && fs.existsSync(path.join(dir, "model.fp16.onnx")) && fs.existsSync(path.join(dir, "vocab.json"))) ?? null;

  const ok = Boolean(whisper && model);
  const note = !whisper
    ? "Avskriftens verktyg saknas i den här installationen av Presenter."
    : !model
      ? "Avskriften behöver KB-Whisper, som hämtas en gång till den här datorn."
      : !align || !alignDir || !voxrex
        ? "Ordtiderna justeras inte (VoxRex saknas), så orden får Whispers egna tider."
        : undefined;
  return { whisper, model, align, alignDir, voxrex, ok, note, models: { whisper: size, voxrex: Boolean(voxrex), tools: Boolean(whisper) } };
}
