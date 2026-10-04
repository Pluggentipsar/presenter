import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Miniatyrerna på disk — en gemensam lagring för alla som visar verkstaden på
 * den här datorn.
 *
 * Webbläsarens Cache Storage gäller en adress i ett program: Chrome på port
 * 3000, appens fönster på sin egen port och en arbetskopia på 3010 har var sin.
 * Utan en gemensam lagring fångade varje ny kombination om hela föreläsningen,
 * en slide i sekunden och med hackig verkstad under tiden. Här sparas varje
 * fångad bild en gång; nästa webbläsare läser filen i stället.
 *
 * Nyckeln är densamma som i Cache Storage: namnrymd (deckets slug, omslagen
 * eller mallgalleriets tema), id (slideId, decket, exemplet) och renderhash.
 * En ny hash för samma id ersätter den gamla filen, så mappen växer inte.
 *
 * Mappen `presenter/.miniatyrer/` är ignorerad i git: bilderna är härledda och
 * byggs upp igen av sig själva. Publika och skrivskyddade byggen har ingen
 * lagring (isLibraryReadOnly).
 */

const STORE_DIR = path.join(process.cwd(), ".miniatyrer");
/** En fångad WebP är 10–80 kB. Taket skyddar disken mot annat än miniatyrer. */
export const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;
const MAX_KEY_LENGTH = 400;

/**
 * Samma regel som bibliotekets isLibraryReadOnly (library.server.ts), men utan
 * att dra in biblioteket — och med det alla dess importer — i rutten.
 */
export function thumbnailStoreEnabled(): boolean {
  return !(Boolean(process.env.VERCEL) || process.env.PRESENTER_PUBLIC === "1" || process.env.PRESENTER_READONLY === "1");
}

/**
 * En del av nyckeln som filnamn. Bokstäver, siffror, punkt, bindestreck och
 * understreck står kvar; allt annat skrivs `~hex`. Långa delar får en hash, så
 * att sökvägen håller sig under Windows gräns.
 */
export function safePart(value: string): string {
  const encoded = [...value]
    .map((char) => (/^[A-Za-z0-9._-]$/.test(char) ? char : `~${char.codePointAt(0)!.toString(16)}`))
    .join("");
  if (encoded.length <= 80 && encoded !== "." && encoded !== "..") return encoded;
  const digest = crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
  return `${encoded.slice(0, 48)}~${digest}`;
}

export interface ThumbnailKey {
  scope: string;
  id: string;
  hash: string;
}

export function parseThumbnailKey(params: URLSearchParams): ThumbnailKey | null {
  const scope = params.get("s") ?? "";
  const id = params.get("i") ?? "";
  const hash = params.get("h") ?? "";
  if (!scope || !id || !hash) return null;
  if (scope.length > MAX_KEY_LENGTH || id.length > MAX_KEY_LENGTH || hash.length > MAX_KEY_LENGTH) return null;
  return { scope, id, hash };
}

function fileFor({ scope, id, hash }: ThumbnailKey): { dir: string; file: string; prefix: string } {
  const dir = path.join(STORE_DIR, safePart(scope));
  const prefix = `${safePart(id)}@`;
  return { dir, file: path.join(dir, `${prefix}${safePart(hash)}.webp`), prefix };
}

export function readThumbnail(key: ThumbnailKey): Buffer | null {
  try {
    return fs.readFileSync(fileFor(key).file);
  } catch {
    return null;
  }
}

/** Är det här en WebP-bild (RIFF….WEBP)? Annat sparas inte. */
export function isWebp(data: Uint8Array): boolean {
  return (
    data.length > 12 &&
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50
  );
}

let tmpCounter = 0;

/**
 * Spara en fångad bild och ta bort äldre bilder av samma id. Skrivs via en
 * temporär fil, så att en läsare aldrig får en halv bild.
 */
export function writeThumbnail(key: ThumbnailKey, data: Uint8Array): void {
  const { dir, file, prefix } = fileFor(key);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${tmpCounter++}`);
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
  const current = path.basename(file);
  for (const entry of fs.readdirSync(dir)) {
    if (entry !== current && entry.startsWith(prefix) && entry.endsWith(".webp")) {
      try {
        fs.unlinkSync(path.join(dir, entry));
      } catch {
        // En annan flik kan ha hunnit före. Det gör inget.
      }
    }
  }
}
