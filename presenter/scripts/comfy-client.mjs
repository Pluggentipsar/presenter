import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { dataPath, presenterDataDir } from "./lib/data-dir.mjs";

/** Inställningsfilen för ComfyUI på den här datorn: servern, och sökvägen till rembg. */
export function comfyConfigPath(env = process.env) {
  return env.COMFYUI_CONFIG || dataPath(["comfyui.json"], env);
}

function readComfyConfig(env = process.env) {
  const file = comfyConfigPath(env);
  try { const text = fs.readFileSync(file, "utf8"); return { file, config: JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text) }; }
  catch (error) {
    if (error.code === "ENOENT") return { file, config: null };
    throw new Error(`Kan inte läsa ComfyUI-inställningen i ${file}: ${error.message}`);
  }
}

export function normalizeServerUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("Ange en fullständig ComfyUI-adress med http:// eller https://.");
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error("Ogiltig ComfyUI-adress. Ange http:// eller https:// följt av servernamnet."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("ComfyUI-adressen måste vara HTTP(S), utan lösenord, frågeparametrar eller fragment.");
  }
  return url.href.replace(/\/+$/, "");
}

// En uttryckligen vald server ersätts aldrig tyst med en annan dator.
export function resolveComfyServer(explicit, env = process.env) {
  if (explicit !== undefined) return { url: normalizeServerUrl(explicit), source: "--server" };
  if (env.COMFYUI_URL) return { url: normalizeServerUrl(env.COMFYUI_URL), source: "COMFYUI_URL" };
  const { file, config } = readComfyConfig(env);
  if (!config?.server) return { url: "http://127.0.0.1:8188", source: "lokal standard" };
  return { url: normalizeServerUrl(config.server), source: file };
}

/** rembg för friläggning av bilder: REMBG_PATH, sedan `rembg` i inställningsfilen, sedan rembg i PATH. */
export function resolveRembg(env = process.env) {
  if (env.REMBG_PATH) return env.REMBG_PATH;
  const { config } = readComfyConfig(env);
  return typeof config?.rembg === "string" && config.rembg.trim() ? config.rembg.trim() : "rembg";
}

export async function comfyFetch(url, options = {}) {
  const { timeoutMs = 30_000, readAs, ...init } = options;
  // Endast läsningar återförsöks. Ett förlorat POST-svar får inte skapa dubbla GPU-jobb.
  const attempts = ["GET", "HEAD"].includes((init.method || "GET").toUpperCase()) ? 3 : 1;
  const transient = new Set(["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENETUNREACH", "ECONNREFUSED"]);
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
      if ([502, 503, 504].includes(response.status) && attempt + 1 < attempts) {
        await response.body?.cancel();
      } else if (readAs === "buffer") {
        if (!response.ok) throw new Error(`HTTP ${response.status} vid filhämtning`);
        // Läs hela filen inom försöket, så även ett avbrott mitt i överföringen kan återhämtas.
        return Buffer.from(await response.arrayBuffer());
      } else {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (error.name !== "TimeoutError" && !transient.has(error.cause?.code || error.code)) break;
    }
    if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  const cause = lastError?.name === "TimeoutError" ? "tidsgränsen överskreds" : (lastError?.cause?.code || lastError?.message);
  throw new Error(`Kunde inte nå ComfyUI (${cause}). Kontrollera nätverket (till exempel Tailscale) och att datorn med ComfyUI är igång.`, { cause: lastError });
}

export async function checkComfyServer(server, options = {}) {
  const response = await comfyFetch(`${normalizeServerUrl(server)}/system_stats`, { timeoutMs: 8_000, ...options });
  if (!response.ok) throw new Error(`ComfyUI svarade HTTP ${response.status}. Kontrollera serveradressen och åtkomsten.`);
  let stats;
  try { stats = await response.json(); } catch { throw new Error("Servern svarade, men inte med ComfyUI-data. Kontrollera adressen."); }
  if (!stats?.system || !Array.isArray(stats.devices)) throw new Error("Adressen svarar inte som ett ComfyUI-API.");
  return stats;
}

export async function saveComfyServer(server, env = process.env) {
  const url = normalizeServerUrl(server);
  // Kontroll före skrivning: en felaktig adress ersätter inte en fungerande inställning.
  const stats = await checkComfyServer(url);
  // Övriga inställningar (till exempel rembg) behålls. Nytt skrivs alltid i den nya datamappen.
  const { config } = readComfyConfig(env);
  const file = env.COMFYUI_CONFIG || path.join(presenterDataDir(env), "comfyui.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ ...(config ?? {}), server: url }, null, 2)}\n`, { mode: 0o600 });
  return { url, file, stats };
}

/** ffmpeg: FFMPEG_PATH, sedan den medpackade i presenter/.verktyg (scripts/hamta-verktyg.mjs), sedan ffmpeg i PATH. */
export function resolveFfmpeg(root, env = process.env) {
  if (env.FFMPEG_PATH) return env.FFMPEG_PATH;
  const bundled = path.join(root, ".verktyg", "ffmpeg", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  return fs.existsSync(bundled) ? bundled : "ffmpeg";
}

export function checkExecutable(command, args, label) {
  const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true, timeout: 10_000 });
  if (result.error || result.status !== 0) throw new Error(`${label} är inte tillgängligt på den här datorn (${command}). ${result.error?.message || result.stderr || "Kontrollera installationen."}`);
}
