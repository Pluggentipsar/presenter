#!/usr/bin/env node
import { checkComfyServer, comfyConfigPath, resolveComfyServer, saveComfyServer } from "./comfy-client.mjs";

const [command = "status", value, ...extra] = process.argv.slice(2);

function printStats(url, stats) {
  console.log(`ComfyUI svarar: ${url}`);
  console.log(`Version: ${stats.system.comfyui_version || "okänd"}`);
  for (const device of stats.devices) console.log(`Enhet: ${device.name || device.type || "okänd"}`);
}

try {
  if (extra.length) throw new Error("För många argument. Kör node scripts/comfy.mjs help.");
  if (command === "configure") {
    const { url, file, stats } = await saveComfyServer(value);
    printStats(url, stats);
    console.log(`Sparat i ${file}. Bild- och videoskripten använder nu adressen automatiskt.`);
    if (process.env.COMFYUI_URL) console.log("Observera: COMFYUI_URL är satt och har företräde framför den sparade adressen.");
  } else if (command === "status") {
    const { url, source } = resolveComfyServer(value);
    console.log(`Vald server: ${url} (${source})`);
    printStats(url, await checkComfyServer(url));
  } else if (["help", "--help", "-h"].includes(command)) {
    console.log(`Användning:
  node scripts/comfy.mjs configure <serveradress>  Kontrollera och spara servern
  node scripts/comfy.mjs status [serveradress]    Kontrollera anslutning och GPU

Serverval: --server i bild/video > COMFYUI_URL > ${comfyConfigPath()} > localhost:8188.
Inställningen gäller alla projekt som använder dessa skript på samma dator.
COMFYUI_CONFIG kan ange en annan inställningsfil. Tailscale måste vara anslutet för åtkomst till hemmadatorn.`);
  } else {
    throw new Error(`Okänt kommando: ${command}. Kör node scripts/comfy.mjs help.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
