import fs from "node:fs";

/**
 * Namnbyten som tål Windows (2 oktober 2026). Ett antivirusprogram, sökindexet eller en
 * synkroniseringstjänst kan hålla en nyss skriven fil öppen en kort stund, och då misslyckas
 * namnbytet med EPERM, EBUSY eller EACCES fast inget är fel. En export som skrev sin status
 * i samma ögonblick stannade då mitt i. Här försöker vi igen en stund innan vi ger upp.
 */

const TRANSIENT = new Set(["EPERM", "EBUSY", "EACCES"]);
const transient = (error: unknown) => TRANSIENT.has((error as NodeJS.ErrnoException)?.code ?? "");

/** Byt namn och försök igen i upp till ungefär åtta sekunder (stora filer som just skrivits klart). */
export async function renameWithRetry(from: string, to: string, tries = 12): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      if (attempt >= tries || !transient(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.min(1000, 50 * attempt * attempt)));
    }
  }
}

/** Samma sak synkront, med korta väntetider (små filer som statusen och valen). */
export function renameWithRetrySync(from: string, to: string, tries = 6): void {
  for (let attempt = 1; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      if (attempt >= tries || !transient(error)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25 * attempt);
    }
  }
}
