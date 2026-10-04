/**
 * "Hämta senaste" — git pull utan terminal.
 *
 * Joel jobbar på flera datorer; laptopen måste hämta det som byggts på den andra.
 * Knappen gör det han annars gör för hand: `git pull --ff-only` i repot, `npm
 * install` om paketlistan ändrades, och en omstart av servern om skalet startade
 * den. Bara framspolning: har den här datorn egna commits som inte finns på
 * GitHub, eller ändringar som krockar, händer ingenting och beskedet säger varför.
 * Ospårade och sparade lokala ändringar rörs inte.
 *
 * Git måste finnas på datorn (Git for Windows). npm behövs bara när paketlistan
 * ändrats — saknas npm (den installerade appen på en dator utan Node) är
 * rådet att hämta en nyare app, som har paketen inbyggda.
 */

import { execFile } from "node:child_process";
import { repoDir, presenterDir } from "./server.mjs";

function run(command, args, cwd, shell = false) {
  return new Promise((resolve) => {
    // npm är ett .cmd-skript på Windows: Node kör det bara genom ett skal.
    execFile(command, args, { cwd, windowsHide: true, shell, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, code: error?.code ?? 0, out: `${stdout}${stderr}`.trim() });
    });
  });
}

const GIT_MISSING = "Git finns inte på den här datorn. Installera Git for Windows (git-scm.com) så fungerar \"Hämta senaste\".";

export async function hasGit() {
  return (await run("git", ["--version"], undefined)).ok;
}

export async function currentCommit() {
  const result = await run("git", ["log", "-1", "--format=%h · %s · %cd", "--date=format:%Y-%m-%d %H:%M"], repoDir);
  if (result.ok) return result.out;
  return result.code === "ENOENT" ? "okänd version (git saknas)" : "okänd version";
}

/**
 * Hämtar. Returnerar { changed, summary, needsInstall, needsRestart, message }.
 */
export async function pullLatest() {
  const nothing = (message) => ({ changed: false, summary: "", needsInstall: false, needsRestart: false, message });
  const head = await run("git", ["rev-parse", "HEAD"], repoDir);
  if (!head.ok) return nothing(head.code === "ENOENT" ? GIT_MISSING : `Kunde inte läsa repot:\n${head.out}`);
  const before = head.out;
  const pull = await run("git", ["pull", "--ff-only"], repoDir);
  if (!pull.ok) {
    const dirty = (await run("git", ["status", "--porcelain", "--untracked-files=no"], repoDir)).out;
    const why = /diverg|not possible to fast-forward|Not possible/i.test(pull.out)
      ? "Den här datorn har egna commits som inte finns på GitHub. Slå ihop dem i en terminal (git pull, eller push) — då kan knappen användas igen."
      : /overwritten by merge|local changes/i.test(pull.out)
        ? `Lokala ändringar skulle skrivas över:\n${dirty}\n\nSpara dem (commit) eller lägg dem åt sidan innan du hämtar.`
        : /Could not resolve host|unable to access|Connection/i.test(pull.out)
          ? "Ingen kontakt med GitHub. Kontrollera nätet."
          : pull.out;
    return nothing(why);
  }
  const after = (await run("git", ["rev-parse", "HEAD"], repoDir)).out;
  if (before === after) return nothing("Redan senaste versionen.");

  const log = (await run("git", ["log", "--format=%h  %s", `${before}..${after}`], repoDir)).out;
  const files = (await run("git", ["diff", "--name-only", before, after], repoDir)).out.split(/\r?\n/).filter(Boolean);
  const needsInstall = files.some((file) => /^presenter\/package(-lock)?\.json$/.test(file));
  const needsRestart = needsInstall || files.some((file) => /^presenter\/(next\.config|src\/app\/globals|electron\/)/.test(file));
  const count = log.split("\n").filter(Boolean).length;
  return {
    changed: true,
    summary: log,
    files,
    needsInstall,
    needsRestart,
    message: `Hämtade ${count} ${count === 1 ? "ändring" : "ändringar"}:\n\n${log}`,
  };
}

export async function installPackages() {
  const result = await run("npm", ["install", "--no-audit", "--no-fund"], presenterDir, process.platform === "win32");
  if (result.ok) return "Paketen är uppdaterade.";
  if (/not recognized|k.nns inte igen|ENOENT|not found/i.test(result.out) || result.code === "ENOENT") {
    return "Paketlistan ändrades, men npm finns inte på den här datorn. Hämta en nyare version av appen från GitHub — den har paketen inbyggda.";
  }
  return `npm install misslyckades:\n${result.out.slice(-800)}`;
}
