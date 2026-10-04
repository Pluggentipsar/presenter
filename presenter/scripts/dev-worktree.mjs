#!/usr/bin/env node
// Startar dev-servern i en git-worktree på egen port.
//
//   node scripts/dev-worktree.mjs [port]        (standard 3010)
//
// I en worktree är node_modules en länk till huvudmappens. Turbopack vägrar läsa
// filer utanför sin rot, så roten måste vara den gemensamma föräldern till
// worktreen och de riktiga node_modules — det är vad PRESENTER_TURBOPACK_ROOT i
// next.config.ts är till för. Porten skiljer sig från 3000 så att huvudmappens
// server, som Joel presenterar och andra sessioner arbetar mot, får vara ifred.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = process.argv[2] ?? process.env.PORT ?? "3010";

const realModules = fs.realpathSync(path.join(root, "node_modules"));
const env = { ...process.env };
if (!realModules.startsWith(root + path.sep)) {
  const a = root.split(path.sep);
  const b = realModules.split(path.sep);
  let i = 0;
  while (i < a.length && i < b.length && a[i].toLowerCase() === b[i].toLowerCase()) i++;
  env.PRESENTER_TURBOPACK_ROOT = a.slice(0, i).join(path.sep);
  console.log(`[dev-worktree] node_modules är länkad → Turbopack-rot: ${env.PRESENTER_TURBOPACK_ROOT}`);
}

const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [next, "dev", "-p", String(port)], { cwd: root, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
