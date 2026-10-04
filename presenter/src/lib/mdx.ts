import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type {
  BrandWatermark,
  PresentationFile,
  PresentationMeta,
  SlideGradientValue,
  SliderEffectValue,
} from "./types";
import { normalizeStoredGradient } from "./gradient-presets";
import { deckColorVars as readDeckColorVars } from "./deck-colors";
import { isPublicBuild, sanitizePublicSource } from "./share/public-source";

const CONTENT_DIR = path.join(process.cwd(), "content");

export function getPresentationSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPresentation(slug: string): PresentationFile | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const dateStr =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : data.date
        ? String(data.date)
        : undefined;

  const brand: BrandWatermark | undefined =
    data.brand && typeof data.brand === "object" && data.brand.logo
      ? {
          logo: String(data.brand.logo),
          tagline: data.brand.tagline ? String(data.brand.tagline) : undefined,
          position: data.brand.position ?? "bottom-left",
          size: data.brand.size ?? "1.5rem",
          opacity:
            typeof data.brand.opacity === "number" ? data.brand.opacity : 0.55,
          hideOnFirst:
            typeof data.brand.hideOnFirst === "boolean"
              ? data.brand.hideOnFirst
              : true,
        }
      : undefined;

  // Tags: accepterar array, comma-separerad string, eller saknas
  const tags: string[] | undefined = Array.isArray(data.tags)
    ? data.tags.map((t) => String(t).trim()).filter(Boolean)
    : typeof data.tags === "string"
      ? data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

  // sliderEffects: map slide-index → effekt-config. Accepterar både
  // string (legacy/kort-form) och { kind, color }-objekt.
  const sliderEffects: Record<string, SliderEffectValue> | undefined = (() => {
    const raw = data.sliderEffects;
    if (!raw || typeof raw !== "object") return undefined;
    const allowed = new Set([
      "dots",
      "flow",
      "aurora",
      "grain",
      "stardust",
      "mesh",
      "constellation",
      "ribbon",
    ]);
    const out: Record<string, SliderEffectValue> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const num = parseInt(k, 10);
      if (!Number.isFinite(num) || num < 1) continue;
      if (typeof v === "string" && allowed.has(v)) {
        out[String(num)] = v;
      } else if (v && typeof v === "object") {
        const obj = v as {
          kind?: unknown;
          color?: unknown;
          opacity?: unknown;
          speed?: unknown;
        };
        if (typeof obj.kind === "string" && allowed.has(obj.kind)) {
          const color =
            typeof obj.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(obj.color)
              ? obj.color
              : undefined;
          const opacity =
            typeof obj.opacity === "number" &&
            obj.opacity >= 0.1 &&
            obj.opacity <= 2
              ? obj.opacity
              : undefined;
          const speed =
            typeof obj.speed === "number" && obj.speed >= 0.1 && obj.speed <= 4
              ? obj.speed
              : undefined;
          // Kort-form bara när inget extra är satt
          if (color == null && opacity == null && speed == null) {
            out[String(num)] = obj.kind;
          } else {
            out[String(num)] = {
              kind: obj.kind,
              ...(color != null ? { color } : {}),
              ...(opacity != null ? { opacity } : {}),
              ...(speed != null ? { speed } : {}),
            };
          }
        }
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  // slideGradients: map slide-index → gradient-bakgrund. Accepterar både
  // string (preset-id, kort-form) och objekt-form.
  const slideGradients: Record<string, SlideGradientValue> | undefined = (() => {
    const raw = data.slideGradients;
    if (!raw || typeof raw !== "object") return undefined;
    const out: Record<string, SlideGradientValue> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const num = parseInt(k, 10);
      if (!Number.isFinite(num) || num < 1) continue;
      // Samma normalisering som skriv-vägen. Läser vi generösare än vi skriver
      // kan en fil se annorlunda ut i två lägen utan att någon rört den.
      const normalized = normalizeStoredGradient(v);
      if (normalized !== null) out[String(num)] = normalized;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  })();

  // slideAccents + slideTextColors: enkla maps slide-index → hex-färg.
  // Plus accentOverride + textOverride på presentation-nivå.
  const isHex = (v: unknown): v is string =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  const parseColorMap = (raw: unknown): Record<string, string> | undefined => {
    if (!raw || typeof raw !== "object") return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const num = parseInt(k, 10);
      if (!Number.isFinite(num) || num < 1) continue;
      if (isHex(v)) out[String(num)] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  };
  const slideAccents = parseColorMap(data.slideAccents);
  const slideTextColors = parseColorMap(data.slideTextColors);
  const slideMutedColors = parseColorMap(data.slideMutedColors);
  const accentOverride = isHex(data.accentOverride) ? data.accentOverride : undefined;
  const textOverride = isHex(data.textOverride) ? data.textOverride : undefined;
  const mutedOverride = isHex(data.mutedOverride) ? data.mutedOverride : undefined;
  // filmfarg + seriefarger: deckets egna färger (en filmserie), se lib/deck-colors.ts.
  const deckColors = readDeckColorVars(data);
  const deckColorVars = Object.keys(deckColors).length > 0 ? deckColors : undefined;

  // hiddenSlides: array av 1-indexerade slide-nummer som ska döljas
  // i presenter-läget. Accepterar både ren array och comma-separerad string.
  const hiddenSlides: number[] | undefined = (() => {
    const raw = data.hiddenSlides;
    if (Array.isArray(raw)) {
      const nums = raw
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.floor(n));
      return nums.length > 0 ? Array.from(new Set(nums)).sort((a, b) => a - b) : undefined;
    }
    if (typeof raw === "string") {
      const nums = raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.floor(n));
      return nums.length > 0 ? Array.from(new Set(nums)).sort((a, b) => a - b) : undefined;
    }
    return undefined;
  })();

  // cuts: versioner/cuts av presentationen (kortare bågar). Cyklas med K.
  // Frontmatter: `cuts: [{ id: kort, name: "Kort" }]` eller `cuts: [kort, lang]`.
  const cuts: { id: string; name: string }[] | undefined = (() => {
    const raw = data.cuts;
    if (!Array.isArray(raw)) return undefined;
    const out = raw
      .map((c: unknown) => {
        if (typeof c === "string") {
          const id = c.trim();
          return id ? { id, name: id } : null;
        }
        if (c && typeof c === "object" && "id" in c) {
          const obj = c as { id?: unknown; name?: unknown };
          const id = typeof obj.id === "string" ? obj.id.trim() : "";
          if (!id) return null;
          return { id, name: typeof obj.name === "string" ? obj.name : id };
        }
        return null;
      })
      .filter((c): c is { id: string; name: string } => c !== null);
    return out.length > 0 ? out : undefined;
  })();

  // File mtime → ISO-datum (YYYY-MM-DD)
  let updatedAt: string | undefined;
  try {
    const stat = fs.statSync(filePath);
    updatedAt = stat.mtime.toISOString().slice(0, 10);
  } catch {
    updatedAt = undefined;
  }

  // Slide-count: räknar top-level JSX-element som inte är <Notes>.
  // Enkel regex (inte AST) men tillräckligt exakt för översikten.
  const slideCount = (() => {
    const lines = content.split("\n");
    let count = 0;
    let insideNotes = false;
    for (const line of lines) {
      if (/^<\/Notes>/.test(line)) {
        insideNotes = false;
        continue;
      }
      if (/^<Notes>/.test(line)) {
        insideNotes = true;
        continue;
      }
      if (insideNotes) continue;
      if (/^<[A-Z][A-Za-z0-9]*/.test(line)) count++;
    }
    return count > 0 ? count : undefined;
  })();

  const meta: PresentationMeta = {
    slug,
    title: data.title ?? slug,
    event: data.event,
    author: data.author,
    date: dateStr,
    theme: data.theme ?? "default",
    description: data.description,
    brand,
    tags,
    hiddenSlides,
    cuts,
    sliderEffects,
    slideGradients,
    slideAccents,
    slideTextColors,
    slideMutedColors,
    accentOverride,
    deckColorVars,
    textOverride,
    mutedOverride,
    updatedAt,
    slideCount,
    ambient:
      data.ambient === true
        ? true
        : typeof data.ambient === "string"
          ? data.ambient
          : false,
    deploy:
      data.deploy === "cloud-media" ||
      data.deploy === "local-only" ||
      data.deploy === "full"
        ? data.deploy
        : undefined,
  };

  // Publik kopia för delning (scripts/dela-export.mjs sätter PRESENTER_PUBLIC=1):
  // manus, instruktioner och planeringsfält rensas ur källan innan något
  // renderas, och deckets ofta interna description följer inte med ut.
  // Se lib/share/public-source.ts. Utan miljövariabeln händer ingenting.
  if (isPublicBuild()) {
    return {
      meta: { ...meta, description: undefined },
      content: sanitizePublicSource(content, slug),
      raw: sanitizePublicSource(raw, slug),
    };
  }

  return { meta, content, raw };
}

export function getAllPresentations(): PresentationMeta[] {
  return getPresentationSlugs()
    .map((slug) => getPresentation(slug)?.meta)
    .filter((meta): meta is PresentationMeta => meta !== undefined)
    .sort((a, b) => {
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return a.title.localeCompare(b.title);
    });
}
