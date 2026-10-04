// Låter skripten i scripts/ importera projektets .ts-moduler som de står i koden:
// "@/lib/x" blir src/lib/x.ts och relativa sökvägar utan filändelse får .ts.
// Node 24 kör .ts med typstrippning. JSX (.tsx) går inte att importera här, så
// skripten läser bara register och ren logik (stage-forms, step-config, mdx-parser).
//
// Hooken måste vara registrerad innan modulerna laddas. Importera därför den här
// filen först och ladda .ts-modulerna med `await import(...)` efteråt.
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "src");
const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();

// package.json saknar "type": "module" (Next behöver det så). Node varnar då för
// varje .ts-modul med import-syntax; varningen säger inget nytt här.
const emitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
  if (code === "MODULE_TYPELESS_PACKAGE_JSON") return;
  return emitWarning.call(this, warning, ...rest);
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null;
    if (specifier.startsWith("@/")) base = path.join(src, specifier.slice(2));
    else if (/^\.\.?\//.test(specifier) && context.parentURL?.startsWith("file:") && !path.extname(specifier)) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (base) {
      const hit = [base, `${base}.ts`, path.join(base, "index.ts")].find(isFile);
      if (hit) return nextResolve(pathToFileURL(hit).href, context);
    }
    return nextResolve(specifier, context);
  },
});
