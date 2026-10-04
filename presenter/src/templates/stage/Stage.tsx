"use client";

import { useMemo, type ReactNode } from "react";
import { EditableText } from "@/lib/inline-edit";
import { useLectureSteps } from "../shared/lecture-steps";
import { Canvas } from "./canvas";
import { PhotoBackdrop, PlayContext, Vatterljus, WaveBackdrop, parsePlay } from "./kit";
import { sceneStages } from "./scen-familjer";
import { VatterTravel } from "./world";
import { dawnFor } from "./world-store";
import { Adress, Chat, Credit, Media, Poster, Quote, Split, Stack, Stats, Title, Words, type FormProps } from "./forms";
import { Answer, Bok, Bredd, Bro, Bryt, Evidence, Friktion, Gym, Instruktion, Krets, Privat, Pussel, Raster, Sources, Tokens, Tvilling, Utdrag, Variation } from "./special";
import { Lyktor, Strander, Vecka } from "./rektor";
import { Bygga, Efter, Kurva, Mot, Sortera, Trappa } from "./rektor-arbete";
import { Detektor, Eftertext, Gapet, Genvag, Insattning, Lins, Ord, Taggig, Vagg, Verben } from "./lan";
import { Kran, Lateral, Poang } from "./rorelse";
import { PortalIn, Skala, VEIL, Zoom, kameraFor, platsFor, skalaFor, veilFor } from "./skala";
import { Berattelser, Brygga, Byra, Flode, Pyramid, Sandlada, Sidor, Slinga, Snoboll, Stege, Treord, Veckan } from "./tiopotenser";
import { Duken } from "./duken";
import { Sattning } from "./sattning";
import { Omslag, Presentation } from "./intro";
import { Nal } from "./nal";
import { resolveStageForm, stageFormFieldType, stageForms, type StageFormId, type StageLayout } from "./stage-forms";
import { resolveDeckColor } from "@/lib/deck-colors";
import s from "./stage.module.css";

type Props = { scene?: string; form?: string } & Record<string, unknown>;

const renderers: Record<StageFormId, (props: FormProps) => ReactNode> = {
  poster: Poster, quote: Quote, chat: Chat, words: Words, stats: Stats, split: Split, stack: Stack, media: Media, title: Title,
  raster: Raster, tokens: Tokens, gym: Gym, krets: Krets, pussel: Pussel, evidence: Evidence, sources: Sources,
  bro: Bro, variation: Variation, instruktion: Instruktion, bok: Bok, answer: Answer,
  friktion: Friktion, utdrag: Utdrag, bredd: Bredd, bryt: Bryt, tvilling: Tvilling, privat: Privat,
  lyktor: Lyktor, vecka: Vecka, strander: Strander,
  mot: Mot, bygga: Bygga, sortera: Sortera, kurva: Kurva, trappa: Trappa, efter: Efter,
  genvag: Genvag, detektor: Detektor, insattning: Insattning, vagg: Vagg, ord: Ord, verben: Verben, eftertext: Eftertext, lins: Lins, gapet: Gapet, taggig: Taggig,
  kran: Kran, lateral: Lateral, poang: Poang,
  zoom: Zoom, flode: Flode, sandlada: Sandlada, berattelser: Berattelser, snoboll: Snoboll, duken: Duken, stege: Stege,
  sidor: Sidor, slinga: Slinga, veckan: Veckan, pyramid: Pyramid, treord: Treord, byra: Byra, brygga: Brygga, sattning: Sattning,
  omslag: Omslag, presentation: Presentation,
  nal: Nal,
};

/** Former som vilar: här får vattnet röra sig. Läsytor står stilla. */
const flowing = new Set<StageFormId>(["poster", "quote", "title", "words", "pussel", "bro", "bok", "lyktor", "strander", "kurva", "efter", "kran", "eftertext", "zoom", "omslag", "gapet", "nal"]);

const text = (props: Props, key: string) => typeof props[key] === "string" ? props[key] as string : "";

function layoutFor(value: string, step: number, fallback: StageLayout): StageLayout {
  const parts = value.split(",").map(part => part.trim().replace("hörn", "horn")).filter(Boolean);
  const pick = parts[Math.min(step, parts.length - 1)];
  return pick === "talare" || pick === "full" || pick === "horn" ? pick : fallback;
}

/** Ljusets läge per steg i procent av bredden: fältet light (20,50,80) före formens eget. */
function lightFor(value: string, step: number, fallback?: number[]): number | undefined {
  const parts = value ? value.split(",").map(part => Number(part.trim())).filter(Number.isFinite) : fallback ?? [];
  if (!parts.length) return undefined;
  return Math.min(97, Math.max(3, parts[Math.min(step, parts.length - 1)]));
}

/** Filmscenerna (fältet scene) kopplas via scen-familjer.ts; utan dem ritar motorn bara former. */
const SceneStage = sceneStages[0];

/**
 * Stage. Filmscener för greenscreen-inspelning.
 * `form` väljer en visuell handling med innehåll i props (se stage-forms.ts);
 * `scene` väljer någon av formprovets fyra scener (se stage-scenes.ts).
 */
export function Stage(props: Props) {
  const form = resolveStageForm(props.form);
  if (form) return <FormStage form={form} props={props} />;
  return SceneStage ? <SceneStage props={props} /> : null;
}

function FormStage({ form, props }: { form: StageFormId; props: Props }) {
  const definition = stageForms[form];
  const count = definition.steps(props);
  const { step, still } = useLectureSteps(count);
  const layout = layoutFor(text(props, "layout") || (definition.layouts ?? []).join(","), step, definition.layout);
  const t = (key: string) => text(props, key);
  const edit = (key: string, node?: ReactNode) => <EditableText path={key} value={t(key)} multiline={stageFormFieldType(key) === "multiline"} neutralWrapper>
    {node ?? <span>{t(key)}</span>}
  </EditableText>;
  // Stora affischer får en lägre horisont, så att ljuslinjen inte skär genom texten.
  const horizon = Math.min(.97, Math.max(.4, Number(t("horizon").replace(",", ".")) || (form === "poster" && t("size") === "xl" ? .87 : definition.horizon)));
  const ambient = t("ambient") || (flowing.has(form) ? "flow" : "still");
  // Ljuset kan vandra längs horisonten; utan light står det där bildläget sätter det.
  const light = lightFor(t("light"), step, definition.light);
  const lightX = light !== undefined ? light * 16 : layout === "talare" ? 1312 : 800;
  const Render = renderers[form];
  const backdrop = t("backdrop");
  const playValue = t("play");
  const plays = useMemo(() => parsePlay(playValue), [playValue]);
  // Tiopotenserna (skala.tsx): med fältet skala är zoomen slidens värld i stället för sjön.
  const zoom = skalaFor(t("skala"), step);
  const scaled = Number.isFinite(zoom);
  // Ett foto eller vågen är slidens eget rum; under Vätterresan tonar det in över sjön i stället för att resa.
  const room = t("background")
    ? <PhotoBackdrop src={t("background")} alt={t("backgroundAlt")} dim={step > 0 || t("dim") === "ja"} />
    : scaled ? null
    : backdrop === "vag" || backdrop === "vag-delad"
      ? <WaveBackdrop shared={backdrop === "vag-delad"} still={still || ambient === "still"} />
      // Bara temats bakgrund, utan sjön: motorn i en föreläsning med annan profil (snabbare till finish, 30 september).
      : backdrop === "tema" ? <div className={s.themeRoom} aria-hidden="true" /> : null;
  return <Canvas scene={form} step={step} layout={layout} still={still} label={definition.label} light={light} day={t("tone") === "dag"} dawn={dawnFor(t("dygn"), step)} enter={t("enter")} skala={scaled ? zoom : undefined} film={resolveDeckColor(t("filmfarg")) ?? ""}>
    {scaled
      ? <Skala z={zoom} veil={veilFor(t("vy"), step, form === "zoom" ? VEIL.full : flowing.has(form) ? VEIL.dov : VEIL.mork)} label={platsFor(t("plats"), step)} hud={form === "zoom" ? "stor" : "liten"}
        kamera={kameraFor(t("kamera"), step)} dawn={dawnFor(t("dygn"), step)} />
      : !room && <Vatterljus horizon={horizon} still={still || ambient !== "flow"} />}
    <VatterTravel room={room}>
      <PlayContext.Provider value={plays}>
        <div className={s.formLayer} data-form={form}>
          <Render t={t} edit={edit} step={step} count={count} still={still} layout={layout} horizonY={horizon * 900} lightX={lightX} />
        </div>
      </PlayContext.Provider>
      <Credit t={t} edit={edit} />
      <Adress t={t} edit={edit} />
    </VatterTravel>
    {/* Rörelsepasset: sliden öppnas ur bryggans portal, bara framåt (stilla visar den direkt). */}
    {scaled && t("inkomst") === "portal" && !still && <PortalIn z={zoom} />}
  </Canvas>;
}
