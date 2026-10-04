import fs from "node:fs";
import path from "node:path";

let tmpCounter = 0;

/**
 * Skriv en fil atomärt: temp-fil → fsync → rename.
 *
 * `fs.writeFileSync` trunkerar målfilen innan den skriver. Dör processen
 * däremellan (dev-servern startas om, BSOD, strömavbrott) ligger decket
 * halvskrivet på disk och går inte att parsa. Med autosave var 320:e ms
 * under aktiv redigering är det fönstret öppet ofta.
 *
 * fsync före rename behövs för strömavbrottsfallet — annars kan filsystemet
 * låta rename nå disken före innehållet, och resultatet blir en tom fil där
 * det tidigare fanns en fungerande presentation.
 */
export function writeFileAtomic(filePath: string, contents: string): void {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}-${tmpCounter++}`);
  // En ny installation har ännu ingen content-mapp (den publika versionen, 3 oktober 2026).
  fs.mkdirSync(dir, { recursive: true });

  try {
    const fd = fs.openSync(tmp, "w");
    try {
      fs.writeFileSync(fd, contents, "utf-8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // Städning får inte maskera det ursprungliga felet.
    }
    throw err;
  }
}
