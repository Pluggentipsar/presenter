import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Datorns egen mapp för Presenter: inställningar och nedladdade verktyg och modeller som inte hör till
 * repot (3 oktober 2026). Standard är `~/.presenter`, och `PRESENTER_DATA` väljer en annan. Samma regler
 * som scripts/lib/data-dir.mjs.
 *
 * Den äldre mappen `~/.joelsai` på upphovspersonens datorer läses när en fil bara finns där, så att
 * befintliga verktyg och modeller fungerar utan flytt.
 */
export function presenterDataDir(): string {
  return process.env.PRESENTER_DATA || path.join(os.homedir(), ".presenter");
}

/** Sökvägen till en fil i datamappen: den nya mappen, eller den äldre om filen bara finns där. */
export function dataPath(...parts: string[]): string {
  const fresh = path.join(presenterDataDir(), ...parts);
  if (process.env.PRESENTER_DATA || fs.existsSync(fresh)) return fresh;
  const legacy = path.join(os.homedir(), ".joelsai", ...parts);
  return fs.existsSync(legacy) ? legacy : fresh;
}

/**
 * Datorns inställningar för ComfyUI och verktygen (comfyui.json i datamappen, som scripts/comfy.mjs
 * skriver): `server`, `rembg` och `python` (en Python med torch och CUDA för friläggningen).
 */
export function machineSettings(): { server?: string; rembg?: string; python?: string } {
  const file = process.env.COMFYUI_CONFIG || dataPath("comfyui.json");
  try {
    const text = fs.readFileSync(file, "utf8");
    const value = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}
