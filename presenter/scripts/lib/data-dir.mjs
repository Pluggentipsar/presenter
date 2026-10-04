/**
 * Datorns egen mapp för Presenter: inställningar och nedladdade modeller och verktyg som inte hör till
 * repot (3 oktober 2026). Standard är `~/.presenter`, och `PRESENTER_DATA` väljer en annan.
 *
 * Den äldre mappen `~/.joelsai` på upphovspersonens datorer läses fortfarande när en fil bara finns
 * där, så att befintliga inställningar och modeller fungerar utan flytt. Nytt skrivs alltid i den
 * nya mappen.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function presenterDataDir(env = process.env) {
  return env.PRESENTER_DATA || path.join(os.homedir(), ".presenter");
}

const legacyDataDir = () => path.join(os.homedir(), ".joelsai");

/** Sökvägen till en fil i datamappen: den nya mappen, eller den äldre om filen bara finns där. */
export function dataPath(parts, env = process.env) {
  const fresh = path.join(presenterDataDir(env), ...parts);
  if (env.PRESENTER_DATA || fs.existsSync(fresh)) return fresh;
  const legacy = path.join(legacyDataDir(), ...parts);
  return fs.existsSync(legacy) ? legacy : fresh;
}
