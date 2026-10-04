import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Var Presenters egna verktyg och modeller ligger (2 oktober 2026), så att appen fungerar fristående:
 *
 * - **Verktygen** (ffmpeg och Avskrifts kommandoradsverktyg) packas med appen. Den installerade appen
 *   säger var med `PRESENTER_VERKTYG` (resources/verktyg, se electron/server.mjs). Ur repot ligger de i
 *   `presenter/.verktyg`, som `node scripts/hamta-verktyg.mjs` fyller.
 * - **Modellerna** (KB-Whisper, VoxRex) är för stora för installationsfilen och hämtas första gången de
 *   behövs, till `PRESENTER_MODELLER` eller appens datamapp (`%APPDATA%\Presenter\modeller`).
 */

export function toolsDir(): string | null {
  const candidates = [process.env.PRESENTER_VERKTYG, path.join(process.cwd(), ".verktyg")];
  return candidates.find((dir): dir is string => Boolean(dir && fs.existsSync(dir))) ?? null;
}

/** En fil bland de medpackade verktygen, om den finns. */
export function bundledTool(...parts: string[]): string | null {
  const dir = toolsDir();
  const file = dir ? path.join(dir, ...parts) : null;
  return file && fs.existsSync(file) ? file : null;
}

/** Appens datamapp, samma som Electron använder för appen Presenter. */
function appDataDir(): string {
  if (process.platform === "win32") return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "Presenter");
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "Presenter");
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), "Presenter");
}

export function modelsDir(): string {
  return process.env.PRESENTER_MODELLER || path.join(appDataDir(), "modeller");
}
