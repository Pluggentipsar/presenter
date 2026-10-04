/**
 * Inspelningen av en föreläsning (2 oktober 2026): typer som delas av spelaren, servern och exporten.
 *
 * En inspelning är en mapp med upp till tre spår och en tidslinje:
 * - `ljud`: bara mikrofonen (läget Ljud, till exempel en föreläsning inför publik).
 * - `kamera`: kameran med mikrofonens ljud i samma fil, så att läpparna och ljudet håller ihop.
 * - `slides`: slidescenen, inspelad ur spelarens egen flik.
 * Tidslinjen säger vilken slide och vilket klicksteg som visades när, i mediets tid (pauser räknas bort).
 * Klicksteget är 1-baserat, samma som lästextens ankare `@slide <slideId> steg=N`.
 */

export type RecordingTrack = "ljud" | "kamera" | "slides";

export type RecordingMode = "ljud" | "kamera" | "film";

/** Vilka spår ett läge spelar in. */
export const MODE_TRACKS: Record<RecordingMode, RecordingTrack[]> = {
  ljud: ["ljud"],
  kamera: ["kamera"],
  film: ["kamera", "slides"],
};

export const MODE_LABELS: Record<RecordingMode, string> = {
  ljud: "Ljud",
  kamera: "Ljud och kamera",
  film: "Film: slides, kamera och ljud",
};

export interface TimelineEvent {
  /** Millisekunder i mediets tid sedan inspelningen startade. */
  t: number;
  type: "position" | "pause" | "resume" | "stop";
  /** Slidens plats i decket (0-baserad) när händelsen loggades. */
  index?: number;
  slideId?: string;
  /** Klicksteget, 1-baserat, och hur många lägen sliden har. */
  step?: number;
  steps?: number;
  title?: string;
  /**
   * Filmdeckens bildläge i det här läget: `talare` lämnar talarens yta fri, `horn` lämnar hörnet nere till
   * höger fritt (Joel liten), `full` är helbild utan Joel.
   */
  layout?: "talare" | "full" | "horn";
}

export interface TrackInfo {
  file: string;
  mime: string;
  /** När spåret började, i millisekunder efter inspelningens start (för synk mellan spåren). */
  startOffsetMs: number;
  bytes: number;
  /** Antal mottagna bitar. Nästa bit ska ha just det här löpnumret. */
  chunks?: number;
  /** Bitar som aldrig kom fram (bör alltid saknas). */
  gaps?: number;
  /** Slidesen: om spelaren kunde begränsa inspelningen till slidescenen (element), beskära (region) eller tog hela fliken. */
  capture?: "element" | "region" | "flik";
  /** Kameran: bildens storlek som enheten faktiskt gav. */
  width?: number;
  height?: number;
}

export interface RecordingManifest {
  version: 1;
  id: string;
  slug: string;
  title: string;
  mode: RecordingMode;
  /** ISO-tid för starten. */
  started: string;
  ended?: string;
  durationMs?: number;
  tracks: Partial<Record<RecordingTrack, TrackInfo>>;
  timeline: TimelineEvent[];
  devices?: { microphone?: string; camera?: string };
}

/** Säkra namn i sökvägar: deckets slug och inspelningens id. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,119}$/;
export const ID_PATTERN = /^\d{4}-\d{2}-\d{2}_\d{4}(?:-\d{1,2})?$/;
export const TRACKS: RecordingTrack[] = ["ljud", "kamera", "slides"];

/** Exportens bildlägen för den färdiga filmen. */
export type ExportLayout = "ruta" | "frilagd" | "sida" | "slides" | "kamera" | "ljud";

export const LAYOUT_LABELS: Record<ExportLayout, string> = {
  ruta: "Slides med dig i en ruta",
  frilagd: "Slides med dig frilagd i din yta",
  sida: "Slides och kamera sida vid sida",
  slides: "Bara slides, med ljudet",
  kamera: "Bara kameran",
  ljud: "Bara ljudet, med kapitel",
};

/** Vilka spår ett bildläge behöver. */
export const LAYOUT_NEEDS: Record<ExportLayout, RecordingTrack[]> = {
  ruta: ["slides", "kamera"],
  frilagd: ["slides", "kamera"],
  sida: ["slides", "kamera"],
  slides: ["slides"],
  kamera: ["kamera"],
  ljud: [],
};

/** Rutans hörn: nere höger, nere vänster, uppe höger, uppe vänster. */
export type BoxCorner = "nh" | "nv" | "uh" | "uv";
export type BoxSize = "liten" | "mellan" | "stor";

/**
 * Var du står i bildläget frilagd: som decket säger (stor i din yta vid `talare`, liten i hörnet vid
 * `horn`, borta vid helbild), eller liten i hörnet hela filmen utom vid helbild.
 */
export type PersonPlacement = "deck" | "corner";

export const PLACEMENT_LABELS: Record<PersonPlacement, string> = {
  deck: "Som decket säger",
  corner: "Liten i hörnet hela filmen",
};

export const CORNER_LABELS: Record<BoxCorner, string> = { nh: "Nere till höger", nv: "Nere till vänster", uh: "Uppe till höger", uv: "Uppe till vänster" };
export const SIZE_LABELS: Record<BoxSize, string> = { liten: "Liten", mellan: "Mellan", stor: "Stor" };

/** Separata spår att lämna bredvid filmen, för klippning. */
export type ExtraTrack = "slides" | "kamera" | "mask" | "du" | "ljud";

export const EXTRA_LABELS: Record<ExtraTrack, string> = {
  slides: "Slides (1080p, 30 bilder/s)",
  kamera: "Kameran med ljudet",
  mask: "Mask (vit där du är, för klippprogrammets track matte)",
  du: "Du frilagd med genomskinlig bakgrund (ProRes 4444, ungefär 3 GB per minut)",
  ljud: "Ljudet som WAV",
};

/**
 * Joels val för en enskild slide i filmen (2 oktober 2026). `deck` följer filmens regel (decket
 * eller placeringen); de andra gäller slidens alla klicksteg. I bildläget ruta betyder hörn och yta
 * bara att rutan syns.
 */
export type SlideChoiceMode = "deck" | "dold" | "horn" | "yta" | "fri";

/** Bildlägena där Joel kan placeras fritt. */
export type FreeLayout = "frilagd" | "ruta";

/**
 * En fri placering i filmens bild (1920 × 1080): var lagret börjar och hur brett det är. I bildläget
 * frilagd är lagret hela den frilagda kamerabilden (höjden w · 9/16), i bildläget ruta är det rutan
 * (höjden w · 3/4).
 */
export interface FreeRect { x: number; y: number; w: number }

export interface SlideChoice {
  mode: SlideChoiceMode;
  size?: BoxSize;
  /** De fria placeringarna, en per bildläge, eftersom en frilagd bild och en ruta inte har samma mått. */
  rects?: Partial<Record<FreeLayout, FreeRect>>;
}

export const isFreeLayout = (layout: ExportLayout): layout is FreeLayout => layout === "frilagd" || layout === "ruta";

export const SLIDE_CHOICE_LABELS: Record<SlideChoiceMode, string> = {
  deck: "Som filmen",
  dold: "Dold",
  horn: "Liten i hörnet",
  yta: "Stor i ytan",
  fri: "Fritt placerad",
};

/** Nyckeln för en slide i valen: slidens id, annars dess plats (#index). */
export const slideKey = (event: { slideId?: string; index?: number }) => event.slideId ?? `#${event.index ?? 0}`;

export interface ExportSettings {
  layout: ExportLayout;
  corner: BoxCorner;
  size: BoxSize;
  /** Bildläget frilagd: följ deckets bildlägen eller stå liten i hörnet. Helbild döljer dig alltid. */
  placement: PersonPlacement;
  /** Undantag per slide (nyckel: slideKey), sparade per föreläsning. */
  perSlide?: Record<string, SlideChoice>;
  /** Jämna ut ljudnivån i filmen (EBU R128, −16 LUFS). De separata spåren lämnas orörda. */
  loudness: boolean;
  extras: ExtraTrack[];
}

export const DEFAULT_EXPORT: ExportSettings = { layout: "ruta", corner: "nh", size: "mellan", placement: "deck", loudness: true, extras: [] };

export interface ExportFile {
  /** Filnamnet i inspelningens exportmapp. */
  name: string;
  label: string;
  bytes: number;
}

export interface ExportStatus {
  /** Filmexporten eller avskriften (de delar status, eftersom en inspelning kör ett jobb i taget). */
  kind?: "film" | "avskrift";
  state: "kör" | "klar" | "fel" | "avbruten";
  steps: string[];
  /** Index i steps för steget som pågår (eller det sista). */
  step: number;
  /** Hur långt det pågående steget har kommit, 0–100. */
  percent: number;
  message?: string;
  started: string;
  finished?: string;
  settings?: ExportSettings;
  files: ExportFile[];
}

/** H.264-kodarna som exporten kan använda (se export.server.ts). */
export type VideoEncoder = "h264_nvenc" | "h264_qsv" | "h264_amf" | "h264_mf" | "libx264" | "libopenh264";

export const ENCODER_LABELS: Record<VideoEncoder, string> = {
  h264_nvenc: "NVIDIA-kortet kodar filmen.",
  h264_qsv: "Intels grafik kodar filmen.",
  h264_amf: "AMD-kortet kodar filmen.",
  h264_mf: "Windows inbyggda kodare kodar filmen.",
  libx264: "Datorns processor kodar filmen; det tar en stund.",
  libopenh264: "Datorns processor kodar filmen (OpenH264); det tar en stund.",
};

/** Modellerna som avskriften behöver, och om de finns på den här datorn. */
export interface ModelState {
  /** Hittad KB-Whisper (storleken) eller null. */
  whisper: string | null;
  voxrex: boolean;
}

/** Vad datorn kan: ffmpeg, vilken kodare och friläggning (Robust Video Matting med torch och CUDA). */
export interface ExportTools {
  ffmpeg: boolean;
  encoder: VideoEncoder | null;
  matting: boolean;
  mattingNote?: string;
  /** Avskriften: Avskrifts verktyg med KB-Whisper (och VoxRex för ordtiderna). */
  transcribe: boolean;
  transcribeNote?: string;
  models?: ModelState & { tools: boolean };
}

/** Filändelsen för ett spår, ur MIME-typen som MediaRecorder gav. */
export function extensionFor(mime: string): string {
  return /mp4/.test(mime) ? "mp4" : "webm";
}
