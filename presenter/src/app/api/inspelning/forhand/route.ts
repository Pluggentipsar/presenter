import fs from "node:fs";
import { cameraFrame, personFrame, slideFrame } from "@/lib/recording/forhand.server";
import { basisDir, previewRects, readPerson } from "@/lib/recording/export.server";
import { readChoices, readManifest, recordingsEnabled, validId, validSlug, writeChoices } from "@/lib/recording/store.server";
import { cleanChoices } from "@/lib/recording/export.server";
import type { BoxCorner } from "@/lib/recording/types";

/**
 * /api/inspelning/forhand: exportvyns förhandsbilder och valen per slide (2 oktober 2026).
 *
 * GET ?slug=&id=&corner=   — måtten för varje läge och storlek, om en frilagd bild finns, var personen
 *                            står i kamerabilden (friläggningens mätning) och valen.
 * GET ?slug=&id=&t=        — sliden vid tiden t (JPEG, 640 bred; &stor=1 ger 1280 för placeringsvyn).
 * GET ?slug=&id=&person=1  — Joel frilagd (PNG), när friläggningen finns.
 * GET ?slug=&id=&kamera=1  — kameran i rutans form (JPEG, 4:3).
 * PUT ?slug=               — spara valen per slide för föreläsningen ({ perSlide }).
 */

export const dynamic = "force-dynamic";

const CORNERS: BoxCorner[] = ["nh", "nv", "uh", "uv"];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const image = (file: string, type: string) => new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const params = new URL(request.url).searchParams;
  const slug = params.get("slug"), id = params.get("id");
  if (!validSlug(slug) || !validId(id) || !readManifest(slug, id)) return new Response("Okänd inspelning", { status: 404 });
  if (params.get("person") === "1") {
    const file = await personFrame(slug, id);
    return file ? image(file, "image/png") : new Response(null, { status: 404 });
  }
  if (params.get("kamera") === "1") {
    const file = await cameraFrame(slug, id);
    return file ? image(file, "image/jpeg") : new Response(null, { status: 404 });
  }
  const t = params.get("t");
  if (t !== null) {
    const seconds = Number(t);
    if (!Number.isFinite(seconds)) return new Response("Ogiltig tid", { status: 400 });
    const file = await slideFrame(slug, id, seconds, params.get("stor") === "1" ? 1280 : 640);
    return file ? image(file, "image/jpeg") : new Response(null, { status: 404 });
  }
  const corner = CORNERS.includes(params.get("corner") as BoxCorner) ? params.get("corner") as BoxCorner : "nh";
  const [cutout, camera] = await Promise.all([personFrame(slug, id), cameraFrame(slug, id)]);
  return json({ rects: previewRects(slug, id, corner), cutout: Boolean(cutout), camera: Boolean(camera), person: readPerson(basisDir(slug, id)), perSlide: cleanChoices(readChoices(slug)) ?? {} });
}

export async function PUT(request: Request) {
  if (!recordingsEnabled()) return new Response(null, { status: 404 });
  const slug = new URL(request.url).searchParams.get("slug");
  if (!validSlug(slug)) return new Response("Okänt deck", { status: 400 });
  const body = await request.json().catch(() => ({})) as { perSlide?: unknown };
  const perSlide = cleanChoices(body.perSlide) ?? {};
  writeChoices(slug, perSlide);
  return json({ perSlide });
}
