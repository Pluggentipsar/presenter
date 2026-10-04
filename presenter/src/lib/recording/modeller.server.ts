import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { renameWithRetry } from "./rename.server";
import { modelsDir } from "./verktyg.server";

/**
 * Avskriftens modeller hämtas första gången de behövs (2 oktober 2026). De är för stora för
 * installationsfilen. Källorna är publika och varje fil kontrolleras mot sin SHA-256:
 * - KB-Whisper (KBLab, Apache-2.0), GGML q5_0 från Hugging Face. Kontrollsummorna är Hugging Faces egna
 *   (X-Linked-ETag) och stämmer med Avskrift-appens nedladdade filer.
 * - VoxRex (KBLab/wav2vec2-large-voxrex-swedish, CC0 1.0) som ONNX i halv precision, från Avskrifts
 *   släpp models-wordalign-1, med Avskrifts kontrollsummor.
 */

interface ModelFile { url: string; path: string; bytes: number; sha256: string }
export interface ModelEntry { label: string; license: string; files: ModelFile[] }

const hf = (size: string) => `https://huggingface.co/KBLab/kb-whisper-${size}/resolve/main/ggml-model-q5_0.bin`;
const voxrex = (file: string) => `https://github.com/Pluggentipsar/avskrift/releases/download/models-wordalign-1/${file}`;

export const MODEL_CATALOGUE: Record<string, ModelEntry> = {
  "kb-whisper-large": {
    label: "KB-Whisper large",
    license: "Apache-2.0, KBLab",
    files: [{ url: hf("large"), path: "kb-whisper-large.bin", bytes: 1_081_140_203, sha256: "6d2863812d7410322bb7d8647a5c7260761300fa946714c9ed66d22bb30bcb19" }],
  },
  "kb-whisper-medium": {
    label: "KB-Whisper medium",
    license: "Apache-2.0, KBLab",
    files: [{ url: hf("medium"), path: "kb-whisper-medium.bin", bytes: 539_212_484, sha256: "7f8762e0ade9e0073674c0d5acae942a0b1ea98add9baa008ee89c94eaba43d0" }],
  },
  "kb-whisper-tiny": {
    label: "KB-Whisper tiny",
    license: "Apache-2.0, KBLab",
    files: [{ url: hf("tiny"), path: "kb-whisper-tiny.bin", bytes: 29_875_738, sha256: "98d46b7d23e5528d006e8a42e29eb0cb39b44bed94e1329f10f57d1fd15c658b" }],
  },
  voxrex: {
    label: "VoxRex (ordtider)",
    license: "CC0 1.0, KBLab",
    files: [
      { url: voxrex("model.fp16.onnx"), path: "voxrex/model.fp16.onnx", bytes: 631_530_679, sha256: "bc35af4d3c7dd95810ac1766ef882cbf6aeb6f42eaeb5e3a8cdb275d931b56b0" },
      { url: voxrex("vocab.json"), path: "voxrex/vocab.json", bytes: 421, sha256: "1d1b27eb4ed992f4560d4bccbb95e353f6a8a057faca71241dc7a863bc2cebb3" },
    ],
  },
};

export interface DownloadState { state: "hämtar" | "klar" | "fel"; got: number; total: number; message?: string }

const downloads = new Map<string, DownloadState>();

export function downloadStates(): Record<string, DownloadState> {
  return Object.fromEntries(downloads);
}

/** Hämta en modell i bakgrunden. Svarar direkt; sidan frågar sedan efter läget. */
export function startDownload(key: string): DownloadState {
  const entry = MODEL_CATALOGUE[key];
  if (!entry) throw new Error("Okänd modell.");
  const running = downloads.get(key);
  if (running?.state === "hämtar") return running;
  const state: DownloadState = { state: "hämtar", got: 0, total: entry.files.reduce((sum, file) => sum + file.bytes, 0) };
  downloads.set(key, state);
  void (async () => {
    try {
      for (const file of entry.files) {
        const target = path.join(modelsDir(), ...file.path.split("/"));
        if (fs.existsSync(target) && fs.statSync(target).size === file.bytes) { state.got += file.bytes; continue; }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const part = `${target}.part`;
        const response = await fetch(file.url, { redirect: "follow" });
        if (!response.ok || !response.body) throw new Error(`${file.url} svarade ${response.status}.`);
        const hash = crypto.createHash("sha256");
        const out = fs.createWriteStream(part);
        const before = state.got;
        for await (const chunk of Readable.fromWeb(response.body as unknown as WebReadableStream)) {
          hash.update(chunk as Buffer);
          if (!out.write(chunk)) await new Promise<void>(resolve => out.once("drain", () => resolve()));
          state.got += (chunk as Buffer).length;
        }
        await new Promise<void>((resolve, reject) => out.end((error?: Error | null) => (error ? reject(error) : resolve())));
        const digest = hash.digest("hex");
        if (digest !== file.sha256 || fs.statSync(part).size !== file.bytes) {
          fs.rmSync(part, { force: true });
          state.got = before;
          throw new Error(`${path.basename(file.path)} stämmer inte med sin kontrollsumma. Försök igen.`);
        }
        await renameWithRetry(part, target);
      }
      state.state = "klar";
    } catch (error) {
      state.state = "fel";
      state.message = error instanceof Error ? error.message : String(error);
    }
  })();
  return state;
}
