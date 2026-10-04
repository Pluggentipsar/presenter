"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  PresentationMeta,
  SlideGradientValue,
  SliderEffectValue,
} from "@/lib/types";
import { OVERLAY_TAGS, type ParsedPresentation, type ParsedComponent, type PropValue } from "@/lib/mdx-parser";
// Samma operationer som storyboarden använder. Editorns egna splice-varianter
// rörde bara slides-arrayen och lämnade positionsbunden frontmatter
// (hiddenSlides, slideAccents, slideGradients …) kvar på gamla index — fel
// slide blev dold och accentfärger gled. Nu delar båda vyerna en modell och
// en autosave, så de måste också dela remapping-logiken.
import {
  deleteSlideAt,
  duplicateSlide as duplicateSlideOp,
  reorderDeck,
} from "@/lib/deck-operations";
import { EditorFieldPanel } from "./EditorFieldPanel";
import {
  EditorDesignPanel,
  slideHasDesignOverride,
} from "./EditorDesignPanel";
import { EditorPreview } from "./EditorPreview";
import { parsePropPath, removeAtPath, setAtPath } from "@/lib/prop-path";
import { applyTextEdit, findTextSources, keepWrapping, removeTextHit, type TextEdit } from "@/lib/text-source";
import { formatSkipList, type StepConfig } from "@/lib/step-config";
import { EditorNavigator } from "./EditorNavigator";
import { SlideActions } from "./SlideActions";
import { uploadFloatingImage } from "@/lib/floating-image-actions";
import { bestClipboardImage } from "@/lib/clipboard-image";
import { AddImageModal } from "./AddImageModal";
import { deckColorVars } from "@/lib/deck-colors";
import { AddVideoModal } from "./AddVideoModal";
import { ObjectPanel } from "./ObjectPanel";
import type { ObjectPatch } from "./ObjectLayer";
import {
  DUPLICATE_OFFSET,
  defaultPlacement,
  expandGroups,
  extremeZ,
  newGroupId,
  formatPercent,
  objectKind,
  parsePercent,
  stepZ,
  type ObjectBox,
} from "@/lib/objects";


/**
 * Overlay-props som ska lagras som tal, inte sträng. Medvetet kort lista —
 * "2100" i beat eller "50" i en bredd ska förbli strängar, eftersom sådana
 * värden kan bära enhet i andra sammanhang.
 */
const NUMERIC_OVERLAY_PROPS = new Set(["rotation", "zIndex", "opacity"]);

/**
 * Kopierade objekt ligger i systemets urklipp som text med den här prefixen
 * följd av JSON — så går de att klistra in på en annan slide, i ett annat
 * deck eller i ett annat fönster. En minneskopia finns för fall där
 * webbläsaren inte släpper till urklippet.
 */
const OBJECT_CLIP_MARK = "presenter-objekt:";

interface ObjectClip {
  slug: string;
  slide: number;
  items: { tag: string; props: Record<string, PropValue>; content: string | null }[];
}

/**
 * Positionsbundna frontmatter-map:ar som designpanelen skriver i. Samma lista
 * som deck-operations remappar vid insert/delete/reorder — inga NYA nycklar
 * införs av panelen, så positionsdriften kan inte glömmas bort.
 */
const SLIDE_DESIGN_MAP_KEYS = [
  "slideGradients",
  "sliderEffects",
  "slideAccents",
  "slideTextColors",
  "slideMutedColors",
] as const;

/**
 * Slide-props som designpanelen äger. De följer sliden automatiskt vid
 * insert/delete/reorder eftersom de bor på sliden, inte på en position.
 */
const SLIDE_DESIGN_PROPS = [
  "background",
  "overlay",
  "overlayMode",
  "backgroundBlur",
] as const;

interface EditorViewProps {
  slug: string;
  meta: PresentationMeta;
  parsed: ParsedPresentation;
  setParsed: Dispatch<SetStateAction<ParsedPresentation>>;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  saveStatus: SaveStatus;
  saveError: string | null;
  flushSave: () => Promise<boolean>;
  onOpenStoryboard: () => void;
  /** Öppna manusläget — hela decket som löpande dokument. */
  onOpenManus: () => void;
  /** Öppna översikten — den ljusa, täta vyn med en rad per slide. */
  onOpenOversikt?: () => void;
  /** Öppna komponentgalleriet för en ny slide efter den angivna (0-baserad). */
  onOpenGallery: (afterIndex: number) => void;
  /** Hämta färdiga slides ur en annan föreläsning (skalets importfönster). */
  onOpenImport?: (afterIndex: number) => void;
  /** Öppna galleriet för att byta mall på sliden (0-baserad). */
  onChangeTemplate: (index: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  active?: boolean;
}

type SaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

export function EditorView({
  slug,
  meta,
  parsed,
  setParsed,
  activeIndex,
  setActiveIndex,
  saveStatus,
  saveError,
  flushSave,
  onOpenStoryboard,
  onOpenManus,
  onOpenOversikt,
  onOpenGallery,
  onOpenImport,
  onChangeTemplate,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  active = true,
}: EditorViewProps) {
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  // Inline-edit aktiveras per default när man går in i edit-vyn —
  // användaren kan stänga av med "Inline"-toggle eller "I"-tangenten.
  const [editMode, setEditMode] = useState(true);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  // Bakgrunds-modalerna delar komponent med overlay-modalerna men skriver till
  // slidens background-prop i stället för att lägga en ny overlay.
  const [bgImageModalOpen, setBgImageModalOpen] = useState(false);
  const [bgVideoModalOpen, setBgVideoModalOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"fields" | "design" | "objekt">("fields");
  // Objektlagret: markerade objekt (index i slidens overlays), textruta som
  // skrivs i just nu, och vilket objekt "Byt bild/video…" gäller (null = nytt).
  const [objectSelection, setObjectSelection] = useState<number[]>([]);
  const [editingObject, setEditingObject] = useState<number | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<number | null>(null);
  const objectClipboardRef = useRef<string | null>(null);
  // Hur många gånger samma kopia klistrats in — varje gång lite längre ner åt höger.
  const pasteCountRef = useRef(new Map<string, number>());
  // Kvittens efter inklistring — visas kort i verktygsraden.
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);
  // Keyboard shortcuts i editorn
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      // Ignorera om fokus är i input/textarea
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (inField) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, parsed.slides.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "n" || e.key === "m") {
        e.preventDefault();
        setNavigatorOpen((v) => !v);
      } else if (e.key === "e") {
        e.preventDefault();
        setPanelOpen((v) => !v);
      } else if (e.key === "d") {
        // D öppnar panelen direkt på Design. Står man redan där stänger den —
        // samma känsla som E ger för fältpanelen.
        e.preventDefault();
        setPanelOpen((open) => {
          if (open && panelTab === "design") return false;
          setPanelTab("design");
          return true;
        });
      } else if (e.key === "o") {
        e.preventDefault();
        setPanelOpen((open) => {
          if (open && panelTab === "objekt") return false;
          setPanelTab("objekt");
          return true;
        });
      } else if (e.key === "i") {
        e.preventDefault();
        setEditMode((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, panelTab, parsed.slides.length, setActiveIndex]);

  const activeSlide = parsed.slides[activeIndex];



  const returnToPresentation = useCallback(async () => {
    if (!(await flushSave())) return;

    if (window.self !== window.top) {
      window.parent.postMessage(
        {
          type: "presenter-editor-close",
          slideIndex: activeIndex,
        },
        window.location.origin,
      );
      return;
    }

    window.location.assign(`/${slug}?slide=${activeIndex + 1}`);
  }, [activeIndex, flushSave, slug]);

  const openStoryboard = useCallback(async () => {
    if (window.self !== window.top) {
      if (!(await flushSave())) return;
      (window.top ?? window).location.assign(`/${slug}/studio`);
      return;
    }
    // Authoring-skalet lever kvar, så vi kan byta vy omedelbart och låta
    // samma spar-kö arbeta färdigt i bakgrunden. Storyboard håller nya
    // preview-captures pausade tills filen faktiskt finns på disk.
    onOpenStoryboard();
    void flushSave();
  }, [flushSave, onOpenStoryboard, slug]);

  const openManus = useCallback(async () => {
    if (window.self !== window.top) {
      if (!(await flushSave())) return;
      (window.top ?? window).location.assign(`/${slug}/studio?mode=manus`);
      return;
    }
    onOpenManus();
    void flushSave();
  }, [flushSave, onOpenManus, slug]);

  const openOversikt = useCallback(async () => {
    if (window.self !== window.top) {
      if (!(await flushSave())) return;
      (window.top ?? window).location.assign(`/${slug}/studio?mode=oversikt`);
      return;
    }
    onOpenOversikt?.();
    void flushSave();
  }, [flushSave, onOpenOversikt, slug]);

  const utkastCount = useMemo(
    () => parsed.slides.filter((slide) => slide.tag === "Utkast").length,
    [parsed.slides],
  );

  // I inbäddat R-läge kan både föräldern och R-tangenten be editorn att
  // spara och lämna tillbaka kontrollen utan att presentationen avmonteras.
  useEffect(() => {
    if (window.self === window.top) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string };
      if (data.type === "presenter-editor-request-close") {
        void returnToPresentation();
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "r" && event.key !== "R") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      void returnToPresentation();
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("keydown", handleKey);
    };
  }, [returnToPresentation]);

  const updateSlideProps = useCallback(
    (propsUpdate: Record<string, PropValue>) => {
      setParsed((prev) => {
        const newSlides = [...prev.slides];
        const current = newSlides[activeIndex];
        newSlides[activeIndex] = {
          ...current,
          props: { ...current.props, ...propsUpdate },
        };
        return { ...prev, slides: newSlides };
      });
    },
    [activeIndex, setParsed]
  );

  /**
   * Sätt ELLER radera props på aktuell slide i en enda skrivning.
   *
   * updateSlideProps mergar rakt av, så `{ background: "" }` hade lämnat
   * `background=""` kvar i MDX:en. M-lägets updateSlideProp raderar explicit på
   * tom sträng — gör vi inte samma sak här skräpar filerna ner sig och
   * check:mdx-roundtrippen börjar gnälla. `null` och tom sträng betyder
   * "ta bort propen".
   */
  const applySlideProps = useCallback(
    (propsUpdate: Record<string, PropValue | null>) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        const props: Record<string, PropValue> = { ...current.props };
        for (const [name, value] of Object.entries(propsUpdate)) {
          if (value === null || value === "") delete props[name];
          else props[name] = value;
        }
        slides[activeIndex] = { ...current, props };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const removeSlideProps = useCallback(
    (names: string[]) => {
      applySlideProps(
        Object.fromEntries(names.map((name) => [name, null])),
      );
    },
    [applySlideProps]
  );

  /**
   * Skriv ett värde i en positionsbunden frontmatter-map (slideGradients,
   * slideAccents, …) för aktuell slide. `null` raderar posten, och sista
   * posten borta → hela nyckeln bort. Exakt samma semantik som M-lägets
   * server actions, så filen ser likadan ut oavsett vilket läge som skrev.
   *
   * Positionen läses ur activeIndex vid ANROPSTILLFÄLLET. Ingen debounce här:
   * AuthoringShell debouncar disk (320 ms) och grupperar historik (650 ms), och
   * en egen timer skulle dessutom kunna skriva mot fel position om Joel hinner
   * lägga till eller radera en slide innan den brinner av.
   */
  const setSlideMapValue = useCallback(
    (key: string, value: unknown | null) => {
      setParsed((prev) => {
        const position = String(activeIndex + 1);
        const raw = prev.frontmatter[key];
        const map: Record<string, unknown> =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? { ...(raw as Record<string, unknown>) }
            : {};
        if (value === null) delete map[position];
        else map[position] = value;
        const frontmatter = { ...prev.frontmatter };
        if (Object.keys(map).length > 0) frontmatter[key] = map;
        else delete frontmatter[key];
        return { ...prev, frontmatter };
      });
    },
    [activeIndex, setParsed]
  );

  /** Global (deck-bred) färg-override. `null` raderar nyckeln helt. */
  const setGlobalFrontmatterValue = useCallback(
    (key: string, value: string | null) => {
      setParsed((prev) => {
        const frontmatter = { ...prev.frontmatter };
        if (value === null) delete frontmatter[key];
        else frontmatter[key] = value;
        return { ...prev, frontmatter };
      });
    },
    [setParsed]
  );

  /**
   * Nollställ hela slidens design i EN skrivning.
   *
   * Ett setParsed = en historik-checkpoint = ett Ctrl+Z tar tillbaka allt.
   * Kedjade anrop hade gett Joel sju ångra-steg att klicka sig igenom.
   *
   * Allt sker som RADERING, aldrig som "skriv temats värde" — inskriven hex
   * hade låst sliden om han byter tema senare.
   */
  const resetSlideDesign = useCallback(() => {
    setParsed((prev) => {
      const position = String(activeIndex + 1);
      const frontmatter = { ...prev.frontmatter };
      for (const key of SLIDE_DESIGN_MAP_KEYS) {
        const raw = frontmatter[key];
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const map = { ...(raw as Record<string, unknown>) };
        delete map[position];
        if (Object.keys(map).length > 0) frontmatter[key] = map;
        else delete frontmatter[key];
      }

      const slides = [...prev.slides];
      const current = slides[activeIndex];
      if (current) {
        const props: Record<string, PropValue> = { ...current.props };
        for (const name of SLIDE_DESIGN_PROPS) delete props[name];
        slides[activeIndex] = { ...current, props };
      }

      return { ...prev, frontmatter, slides };
    });
  }, [activeIndex, setParsed]);

  const updateSlideContent = useCallback(
    (content: string) => {
      setParsed((prev) => {
        const newSlides = [...prev.slides];
        const current = newSlides[activeIndex];
        newSlides[activeIndex] = { ...current, content };
        return { ...prev, slides: newSlides };
      });
    },
    [activeIndex, setParsed]
  );

  // Adapter för inline-editorn: ta single prop+value och bygg ett
  // one-key-object som matchar updateSlideProps-signaturen.
  //
  // En sökväg in i en lista (`tiers[0].name`) sparades förut som ett eget
  // propnamn, och när filen lästes in igen var listan borta. Nu ändras posten
  // i listan — och läser mallen listan ur innehållet (där de flesta decken har
  // den) letas den visade texten upp där i stället.
  const updateSlidePropInline = useCallback(
    (propName: string, value: string, previous?: string, mode?: "remove") => {
      const segments = parsePropPath(propName);
      if (!segments || segments.length === 1) {
        updateSlideProps({ [propName]: mode === "remove" ? "" : value });
        return;
      }
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        const name = segments[0] as string;
        // "Ta bort" på en listpost: hela posten ur listan (tiers[1].name → tiers[1]).
        let lastIndex = -1;
        segments.forEach((segment, i) => {
          if (typeof segment === "number") lastIndex = i;
        });
        const nested =
          mode === "remove"
            ? removeAtPath(current.props[name], lastIndex > 0 ? segments.slice(1, lastIndex + 1) : segments.slice(1))
            : setAtPath(current.props[name], segments.slice(1), value);
        if (nested !== undefined) {
          slides[activeIndex] = { ...current, props: { ...current.props, [name]: nested as PropValue } };
          return { ...prev, slides };
        }
        const hit = previous ? findTextSources(current, previous).find((h) => h.quality >= 2) : undefined;
        const edit = !hit
          ? null
          : mode === "remove"
            ? removeTextHit(current, hit)
            : applyTextEdit(current, hit, keepWrapping(hit.raw, value));
        if (!edit) {
          console.warn(`Texten i ${propName} gick inte att hitta i sliden — ändra den under Fält.`);
          return prev;
        }
        slides[activeIndex] = {
          ...current,
          props: edit.props ? { ...current.props, ...edit.props } : current.props,
          content: edit.content ?? current.content,
        };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed, updateSlideProps]
  );

  // Stegraden under duken: vilka klicksteg som visas i presentationen.
  const updateStepConfig = useCallback(
    (config: StepConfig | undefined) => {
      applySlideProps({
        stegAv: config?.final ? true : null,
        hoppaSteg: config?.skip && config.skip.length > 0 ? formatSkipList(config.skip) : null,
      });
    },
    [applySlideProps]
  );

  // Skriv i sliden där mallen saknar handtag (EditorPreview → InlineTextFallback).
  const applyTextEditToSlide = useCallback(
    (edit: TextEdit) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        slides[activeIndex] = {
          ...current,
          props: edit.props ? { ...current.props, ...edit.props } : current.props,
          content: edit.content ?? current.content,
        };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const updateSlideNotes = useCallback(
    (notes: string) => {
      setParsed((prev) => {
        const newSlides = [...prev.slides];
        const current = newSlides[activeIndex];
        newSlides[activeIndex] = {
          ...current,
          notes: notes.trim() ? notes : undefined,
        };
        return { ...prev, slides: newSlides };
      });
    },
    [activeIndex, setParsed]
  );

  const updateFrontmatter = useCallback(
    (key: string, value: unknown) => {
      setParsed((prev) => ({
        ...prev,
        frontmatter: { ...prev.frontmatter, [key]: value },
      }));
    },
    [setParsed]
  );

  // --- Objekt: fria bilder, textrutor och videor ovanpå mallen ---
  //
  // Objektlagret (EditorPreview → ObjectLayer) och Objekt-fliken skriver
  // genom samma handtag här. Ett anrop = en setParsed = ett ångra-steg, så
  // ett drag över flera objekt tas tillbaka med ett Ctrl+Z.

  const selectObjects = useCallback(
    (indices: number[]) => {
      // En medlem i en grupp markerar hela gruppen, var markeringen än kommer ifrån.
      const expanded = expandGroups(activeSlide?.overlays ?? [], indices);
      setObjectSelection(expanded);
      if (expanded.length > 0) setPanelTab("objekt");
    },
    [activeSlide],
  );

  // Ny slide: ingen markering hänger kvar från den förra. Justeras under
  // renderingen (Reacts mönster för state som beror på en prop), inte i en
  // effekt — då hade den gamla markeringen hunnit ritas på fel slide.
  const [selectionSlide, setSelectionSlide] = useState(activeIndex);
  if (selectionSlide !== activeIndex) {
    setSelectionSlide(activeIndex);
    setObjectSelection([]);
    setEditingObject(null);
  }

  /**
   * Lägg till ett objekt på aktuell slide och markera det. Utan `at` hamnar
   * det mitt på sliden (förskjutet om något redan ligger där); med `at`
   * (släpp-punkt i procent) centreras det kring punkten.
   */
  const addObject = useCallback(
    (overlay: ParsedComponent, at?: { x: number; y: number }, editText = false) => {
      const existing = activeSlide?.overlays ?? [];
      const kind = objectKind(overlay.tag);
      const boxes: ObjectBox[] = existing.map((o) => ({
        x: parsePercent(o.props.x) ?? 0,
        y: parsePercent(o.props.y) ?? 0,
        w: parsePercent(o.props.width) ?? 0,
        h: parsePercent(o.props.height) ?? 0,
        rotation: 0,
      }));
      const place = defaultPlacement(kind, boxes);
      const w = parsePercent(overlay.props.width) ?? place.w;
      // Bildens höjd är okänd tills den laddats: uppskatta 4:3 för centreringen.
      const x = at ? at.x - w / 2 : place.x;
      const y = at ? at.y - (kind === "text" ? 3 : w * 0.66) : place.y;
      const props: Record<string, PropValue> = {
        ...overlay.props,
        x: formatPercent(Math.max(-10, x)),
        y: formatPercent(Math.max(-10, y)),
        width: formatPercent(w),
      };
      const newIndex = existing.length;
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        slides[activeIndex] = {
          ...current,
          overlays: [...(current.overlays ?? []), { ...overlay, props }],
        };
        return { ...prev, slides };
      });
      selectObjects([newIndex]);
      if (editText) setEditingObject(newIndex);
    },
    [activeIndex, activeSlide, selectObjects, setParsed],
  );

  const addOverlayImage = useCallback(
    (src: string, at?: { x: number; y: number }) =>
      addObject({ tag: "FloatingImage", props: { src, width: "30%" }, content: null, children: [] }, at),
    [addObject],
  );

  const addOverlayVideo = useCallback(
    (src: string, at?: { x: number; y: number }) =>
      addObject({ tag: "FloatingVideo", props: { src, width: "34%" }, content: null, children: [] }, at),
    [addObject],
  );

  // En tom textruta öppnas direkt för skrivning; inklistrad text läggs som den är.
  const addOverlayText = useCallback(
    (text = "", at?: { x: number; y: number }) =>
      addObject({ tag: "FloatingText", props: { text, width: "34%", size: "md" }, content: null, children: [] }, at, text === ""),
    [addObject],
  );

  // Linje och pil är tunna rutor: höjden är tjockleken, rotationen riktningen.
  const addOverlayShape = useCallback(
    (shape: "rect" | "ellipse" | "line" | "arrow") => {
      const thin = shape === "line" || shape === "arrow";
      addObject({
        tag: "FloatingShape",
        props: { shape, width: thin ? "30%" : "20%", height: thin ? "1.2%" : "26%" },
        content: null,
        children: [],
      });
    },
    [addObject],
  );

  /** Skriv props (null/tom sträng tar bort) och/eller innehåll på flera objekt i en skrivning. */
  const patchObjects = useCallback(
    (patches: ObjectPatch[]) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current?.overlays) return prev;
        const overlays = [...current.overlays];
        for (const patch of patches) {
          const target = overlays[patch.index];
          if (!target) continue;
          const props: Record<string, PropValue> = { ...target.props };
          for (const [name, value] of Object.entries(patch.props)) {
            if (value === undefined) continue;
            if (value === null || value === "") delete props[name];
            else props[name] = value;
          }
          const next: ParsedComponent = { ...target, props };
          if (patch.content === null) next.content = null;
          else if (typeof patch.content === "string") next.content = patch.content;
          overlays[patch.index] = next;
        }
        slides[activeIndex] = { ...current, overlays };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed],
  );

  const deleteObjects = useCallback(
    (indices: number[]) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current?.overlays) return prev;
        const overlays = current.overlays.filter((_, i) => !indices.includes(i));
        slides[activeIndex] = { ...current, overlays: overlays.length > 0 ? overlays : undefined };
        return { ...prev, slides };
      });
      setObjectSelection([]);
      setEditingObject(null);
    },
    [activeIndex, setParsed],
  );

  // Kopian hamnar snett nedanför och blir den markerade, som i ritprogram.
  const duplicateObjects = useCallback(
    (indices: number[]) => {
      const count = activeSlide?.overlays?.length ?? 0;
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current?.overlays) return prev;
        const source = current.overlays;
        const copies = indices
          .map((i) => source[i])
          .filter((o): o is ParsedComponent => Boolean(o))
          .map((o) => ({
            ...o,
            props: {
              ...o.props,
              x: formatPercent((parsePercent(o.props.x) ?? 0) + DUPLICATE_OFFSET),
              y: formatPercent((parsePercent(o.props.y) ?? 0) + DUPLICATE_OFFSET),
            },
          }));
        slides[activeIndex] = { ...current, overlays: [...source, ...copies] };
        return { ...prev, slides };
      });
      selectObjects(indices.map((_, k) => count + k));
    },
    [activeIndex, activeSlide, selectObjects, setParsed],
  );

  const stepObjectsZ = useCallback(
    (indices: number[], direction: 1 | -1, extreme: boolean) => {
      const overlays = activeSlide?.overlays ?? [];
      patchObjects(
        indices.map((index) => ({
          index,
          props: { zIndex: extreme ? extremeZ(overlays, direction) : stepZ(overlays, index, direction) },
        })),
      );
    },
    [activeSlide, patchObjects],
  );

  // "Byt bild/video…" öppnar samma väljare som "+ Bild", men skriver src på
  // det markerade objektet i stället för att lägga ett nytt.
  const replaceObjectMedia = useCallback(
    (index: number) => {
      const overlay = activeSlide?.overlays?.[index];
      if (!overlay) return;
      setReplaceTarget(index);
      if (objectKind(overlay.tag) === "video") setVideoModalOpen(true);
      else setImageModalOpen(true);
    },
    [activeSlide],
  );

  // Bildfiler släppta på duken laddas upp till deckets bildmapp och läggs där de släpptes.
  const dropFiles = useCallback(
    async (files: File[], at: { x: number; y: number }) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) {
        setPasteStatus("Bara bildfiler kan släppas på duken");
        return;
      }
      setPasteStatus(images.length === 1 ? "Laddar upp bilden…" : `Laddar upp ${images.length} bilder…`);
      try {
        let offset = 0;
        for (const file of images) {
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadFloatingImage(slug, formData);
          addOverlayImage(result.path, { x: at.x + offset, y: at.y + offset });
          offset += 3;
        }
        setPasteStatus(images.length === 1 ? "Bilden ligger på sliden" : "Bilderna ligger på sliden");
      } catch (err) {
        setPasteStatus(err instanceof Error ? err.message : "Kunde inte ladda upp bilden");
      }
    },
    [addOverlayImage, slug],
  );

  const copyObjects = useCallback(
    (indices: number[]) => {
      const overlays = activeSlide?.overlays ?? [];
      const items = indices
        .map((i) => overlays[i])
        .filter((o): o is ParsedComponent => Boolean(o))
        .map((o) => ({ tag: o.tag, props: o.props, content: o.content ?? null }));
      if (items.length === 0) return;
      const clip: ObjectClip = { slug, slide: activeIndex, items };
      const payload = OBJECT_CLIP_MARK + JSON.stringify(clip);
      objectClipboardRef.current = payload;
      navigator.clipboard?.writeText(payload).catch(() => {});
      setPasteStatus(items.length === 1 ? "Objektet kopierat" : `${items.length} objekt kopierade`);
    },
    [activeIndex, activeSlide, slug],
  );

  /** Klistra in kopierade objekt på aktuell slide och markera dem. */
  const pasteObjects = useCallback(
    (payload: string) => {
      let clip: Partial<ObjectClip>;
      try {
        clip = JSON.parse(payload.slice(OBJECT_CLIP_MARK.length)) as Partial<ObjectClip>;
      } catch {
        setPasteStatus("Kunde inte läsa de kopierade objekten");
        return;
      }
      const items = (clip.items ?? []).filter((item) => item && typeof item.tag === "string" && OVERLAY_TAGS.has(item.tag) && item.props);
      if (items.length === 0) return;
      const existing = activeSlide?.overlays ?? [];
      const count = existing.length;
      // Samma slide som kopian togs på: förskjut så att kopian syns, mer för varje inklistring.
      const sameSlide = clip.slug === slug && clip.slide === activeIndex;
      const times = (pasteCountRef.current.get(payload) ?? 0) + 1;
      pasteCountRef.current.set(payload, times);
      const offset = sameSlide ? DUPLICATE_OFFSET * times : 0;
      // Grupper får nya namn så att de inte smälter ihop med originalen.
      const groupMap = new Map<string, string>();
      const taken: ParsedComponent[] = [...existing];
      const added: ParsedComponent[] = items.map((item) => {
        const props: Record<string, PropValue> = { ...item.props };
        if (offset) {
          props.x = formatPercent((parsePercent(props.x) ?? 0) + offset);
          props.y = formatPercent((parsePercent(props.y) ?? 0) + offset);
        }
        if (typeof props.group === "string") {
          let mapped = groupMap.get(props.group);
          if (!mapped) {
            mapped = newGroupId(taken);
            groupMap.set(props.group, mapped);
            taken.push({ tag: item.tag, props: { group: mapped }, content: null, children: [] });
          }
          props.group = mapped;
        }
        return { tag: item.tag, props, content: item.content ?? null, children: [] };
      });
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        slides[activeIndex] = { ...current, overlays: [...(current.overlays ?? []), ...added] };
        return { ...prev, slides };
      });
      selectObjects(added.map((_, k) => count + k));
      setPasteStatus(added.length === 1 ? "Objektet inklistrat" : `${added.length} objekt inklistrade`);
    },
    [activeIndex, activeSlide, selectObjects, setParsed, slug],
  );

  // Klistra in direkt i R-läget: en bild i urklipp blir en FloatingImage,
  // markerad text blir en FloatingText. Båda hamnar som overlay på aktuell
  // slide och ärver temats typografi — därifrån flyttar och formar du den
  // som vilken annan overlay som helst.
  useEffect(() => {
    if (!active) return;

    const handlePaste = async (event: ClipboardEvent) => {
      const data = event.clipboardData;
      if (!data) return;

      // Skriver användaren i ett fält är inklistring deras egen sak — utom
      // för bilder, som ändå inte kan hamna i en textruta.
      const target = event.target as HTMLElement | null;
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      const imageFile = Array.from(data.files).find((f) =>
        f.type.startsWith("image/"),
      );

      if (imageFile) {
        event.preventDefault();
        setPasteStatus("Laddar upp bilden…");
        try {
          // paste-filen är webbläsarens bitmap-variant: platt, utan alfa och i
          // lägre upplösning. bestClipboardImage byter upp sig till urklippets
          // riktiga PNG när den går att läsa.
          const file = await bestClipboardImage(imageFile);
          const formData = new FormData();
          formData.append("file", file);
          const result = await uploadFloatingImage(slug, formData);
          addOverlayImage(result.path);
          setPasteStatus("Bilden inklistrad");
        } catch (err) {
          setPasteStatus(
            err instanceof Error ? err.message : "Kunde inte klistra in bilden",
          );
        }
        return;
      }

      if (inField) return;

      const text = data.getData("text/plain").trim();
      // Kopierade objekt (Ctrl+C i objektlagret) blir objekt igen — även på
      // en annan slide eller i ett annat deck. Utan urklippstext gäller
      // minneskopian.
      const payload = text.startsWith(OBJECT_CLIP_MARK) ? text : !text && objectClipboardRef.current ? objectClipboardRef.current : null;
      if (payload) {
        event.preventDefault();
        pasteObjects(payload);
        return;
      }
      if (!text) return;
      event.preventDefault();
      // Långa inklistringar blir oläsliga som textruta — kapa och låt
      // användaren korta ner själv i fältpanelen.
      addOverlayText(text.length > 400 ? `${text.slice(0, 400)}…` : text);
      setPasteStatus("Texten inklistrad");
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [active, addOverlayImage, addOverlayText, pasteObjects, slug]);

  // Kvittensen tonar bort av sig själv.
  useEffect(() => {
    if (!pasteStatus) return;
    const timer = window.setTimeout(() => setPasteStatus(null), 2600);
    return () => window.clearTimeout(timer);
  }, [pasteStatus]);

  const updateOverlayProp = useCallback(
    (overlayIndex: number, propName: string, value: string) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current?.overlays) return prev;
        const overlays = [...current.overlays];
        const target = overlays[overlayIndex];
        if (!target) return prev;
        // Tom sträng → ta bort prop helt (för booleans som noShadow=true/false)
        const newProps: Record<string, PropValue> = { ...target.props };
        if (value === "") {
          delete newProps[propName];
        } else if (value === "true") {
          newProps[propName] = true;
        } else if (value === "false") {
          newProps[propName] = false;
        } else if (NUMERIC_OVERLAY_PROPS.has(propName) && Number.isFinite(Number(value))) {
          // Talprops måste lagras som tal, annars serialiseras de som
          // rotation="12" i stället för rotation={12}. CSS klarar båda, men
          // MDX-filen ska se likadan ut oavsett om Claude eller editorn
          // skrev den.
          newProps[propName] = Number(value);
        } else {
          newProps[propName] = value;
        }
        overlays[overlayIndex] = { ...target, props: newProps };
        slides[activeIndex] = { ...current, overlays };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const deleteOverlay = useCallback(
    (overlayIndex: number) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current?.overlays) return prev;
        const overlays = current.overlays.filter((_, i) => i !== overlayIndex);
        slides[activeIndex] = {
          ...current,
          overlays: overlays.length > 0 ? overlays : undefined,
        };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const duplicateSlide = useCallback(() => {
    setParsed((prev) => duplicateSlideOp(prev, activeIndex));
    setActiveIndex((i) => i + 1);
  }, [activeIndex, setActiveIndex, setParsed]);

  const removeSlide = useCallback(() => {
    setParsed((prev) => deleteSlideAt(prev, activeIndex));
    setActiveIndex((i) =>
      Math.min(i, Math.max(0, parsed.slides.length - 2))
    );
  }, [activeIndex, parsed.slides.length, setActiveIndex, setParsed]);

  // --- Sub-component (children) mutations: TimelineEvent, ComparisonColumn ---

  const updateChildProps = useCallback(
    (childIndex: number, propsUpdate: Record<string, PropValue>) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        const children = [...current.children];
        const child = children[childIndex];
        if (!child) return prev;
        children[childIndex] = {
          ...child,
          props: { ...child.props, ...propsUpdate },
        };
        slides[activeIndex] = { ...current, children };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const updateChildContent = useCallback(
    (childIndex: number, content: string) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        const children = [...current.children];
        const child = children[childIndex];
        if (!child) return prev;
        children[childIndex] = { ...child, content };
        slides[activeIndex] = { ...current, children };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const addChild = useCallback(() => {
    setParsed((prev) => {
      const slides = [...prev.slides];
      const current = slides[activeIndex];
      if (!current) return prev;
      const childTag = current.tag === "Timeline" ? "TimelineEvent" : "ComparisonColumn";
      const newChild: ParsedComponent = {
        tag: childTag,
        props:
          childTag === "TimelineEvent"
            ? { date: "2026", title: "Ny händelse" }
            : { title: "Ny kolumn" },
        content: childTag === "TimelineEvent" ? "Beskrivning" : "- Ny punkt",
        children: [],
      };
      slides[activeIndex] = {
        ...current,
        children: [...current.children, newChild],
      };
      return { ...prev, slides };
    });
  }, [activeIndex, setParsed]);

  const removeChild = useCallback(
    (childIndex: number) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        const children = current.children.filter((_, i) => i !== childIndex);
        slides[activeIndex] = { ...current, children };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const moveChild = useCallback(
    (from: number, to: number) => {
      setParsed((prev) => {
        const slides = [...prev.slides];
        const current = slides[activeIndex];
        if (!current) return prev;
        if (to < 0 || to >= current.children.length) return prev;
        const children = [...current.children];
        const [moved] = children.splice(from, 1);
        children.splice(to, 0, moved);
        slides[activeIndex] = { ...current, children };
        return { ...prev, slides };
      });
    },
    [activeIndex, setParsed]
  );

  const reorderSlides = useCallback(
    (from: number, to: number) => {
      setParsed((prev) => {
        if (from < 0 || from >= prev.slides.length) return prev;
        if (to < 0 || to >= prev.slides.length) return prev;
        const order = prev.slides.map((_, index) => index);
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        return reorderDeck(prev, order);
      });
      // Håll fokus på den flyttade sliden
      setActiveIndex(to);
    },
    [setActiveIndex, setParsed]
  );

  const moveSlide = useCallback(
    (direction: -1 | 1) => {
      setParsed((prev) => {
        const target = activeIndex + direction;
        if (target < 0 || target >= prev.slides.length) return prev;
        const order = prev.slides.map((_, index) => index);
        [order[activeIndex], order[target]] = [order[target], order[activeIndex]];
        return reorderDeck(prev, order);
      });
      setActiveIndex((i) => i + direction);
    },
    [activeIndex, setActiveIndex, setParsed]
  );

  /* ── Designpanelens commit-adapter ──────────────────────────────────── */

  const setSlideGradientValue = useCallback(
    (value: SlideGradientValue | null) => {
      setSlideMapValue("slideGradients", value);
    },
    [setSlideMapValue]
  );

  const setSlideEffectValue = useCallback(
    (value: SliderEffectValue | null) => {
      setSlideMapValue("sliderEffects", value);
    },
    [setSlideMapValue]
  );

  const setDesignColor = useCallback(
    (prop: "accent" | "text" | "muted", value: string | null, scope: "slide" | "all") => {
      const SLIDE_KEYS = {
        accent: "slideAccents",
        text: "slideTextColors",
        muted: "slideMutedColors",
      } as const;
      const GLOBAL_KEYS = {
        accent: "accentOverride",
        text: "textOverride",
        muted: "mutedOverride",
      } as const;
      if (scope === "all") setGlobalFrontmatterValue(GLOBAL_KEYS[prop], value);
      else setSlideMapValue(SLIDE_KEYS[prop], value);
    },
    [setGlobalFrontmatterValue, setSlideMapValue]
  );

  const setBackgroundValue = useCallback(
    (value: string) => {
      applySlideProps({ background: value });
    },
    [applySlideProps]
  );

  const clearBackground = useCallback(() => {
    removeSlideProps([...SLIDE_DESIGN_PROPS]);
  }, [removeSlideProps]);

  const setBackgroundOverlay = useCallback(
    (overlay: number, mode: "dark" | "light") => {
      // Ett anrop → en historik-checkpoint, och overlayMode raderas när den
      // inte behövs precis som M-läget gör det.
      applySlideProps({
        overlay: overlay > 0 ? String(overlay) : null,
        overlayMode: overlay > 0 && mode === "light" ? "light" : null,
      });
    },
    [applySlideProps]
  );

  const setBackgroundBlur = useCallback(
    (px: number) => {
      // 0 = av → propen raderas, precis som overlay.
      applySlideProps({
        backgroundBlur: px > 0 ? String(Math.round(px)) : null,
      });
    },
    [applySlideProps]
  );

  const slideLabels = useMemo(
    () =>
      parsed.slides.map((s) => {
        const title =
          (s.props.title as string) ??
          (s.props.text as string) ??
          (s.props.question as string) ??
          (s.props.resultText as string) ??
          (s.content ? firstLine(s.content) : "") ??
          "";
        return { tag: s.tag, title: truncate(title, 40) };
      }),
    [parsed.slides]
  );

  const hasDesignOverride = slideHasDesignOverride(
    parsed.frontmatter,
    activeSlide,
    activeIndex,
  );

  const objectCount = activeSlide?.overlays?.length ?? 0;
  const total = parsed.slides.length;
  const goPrev = () => setActiveIndex((i) => Math.max(i - 1, 0));
  const goNext = () => setActiveIndex((i) => Math.min(i + 1, total - 1));

  return (
    <div className="editor-view flex h-screen flex-col overflow-hidden bg-bg text-text">
      {/* Kompakt single-row header */}
      <header className="flex items-center justify-between gap-3 border-b border-white/5 bg-bg/90 px-4 py-1.5 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => void returnToPresentation()}
            className="shrink-0 text-[0.65rem] uppercase tracking-[0.25em] text-text-muted transition-colors hover:text-accent"
            title="Tillbaka till presentation (R)"
          >
            ←
          </button>
          <h1 className="truncate text-sm font-medium text-text">{meta.title}</h1>
          <span className="hidden shrink-0 font-mono text-[0.65rem] text-text-muted/60 lg:inline">
            {slug}.mdx
          </span>
        </div>

        {/* Slide-nav i mitten */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            title="Föregående (k / ↑)"
          >
            ←
          </button>
          <button
            onClick={() => setNavigatorOpen(true)}
            className="flex items-center gap-2 rounded border border-white/10 bg-bg-surface/40 px-2.5 py-1 text-xs text-text transition-all hover:border-accent hover:text-accent"
            title="Öppna navigator (N)"
          >
            <span className="font-mono tabular-nums text-text-muted">
              {String(activeIndex + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
            </span>
            <span className="hidden truncate max-w-[180px] md:inline">
              {slideLabels[activeIndex]?.title || slideLabels[activeIndex]?.tag}
            </span>
          </button>
          <button
            onClick={goNext}
            disabled={activeIndex >= total - 1}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            title="Nästa (j / ↓)"
          >
            →
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SaveIndicator status={saveStatus} error={saveError} />
          <div className="flex rounded border border-white/10 bg-bg-surface/40">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-2 py-1 text-xs text-text-muted transition-colors hover:text-accent disabled:opacity-25"
              title="Ångra"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="border-l border-white/10 px-2 py-1 text-xs text-text-muted transition-colors hover:text-accent disabled:opacity-25"
              title="Gör om"
            >
              ↷
            </button>
          </div>
          {onOpenOversikt ? (
            <button
              type="button"
              onClick={() => void openOversikt()}
              className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
              title="Öppna översikten — den röda tråden, en rad per slide"
            >
              Översikt
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void openManus()}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Öppna manusläget — hela decket som löpande dokument"
          >
            Manus
            {utkastCount > 0 ? (
              <span className="ml-1.5 rounded bg-accent px-1 py-px font-mono text-[0.6rem] font-bold text-bg">
                {utkastCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => void openStoryboard()}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Öppna visuell storyboard"
          >
            Storyboard
          </button>
          <button
            onClick={() => setImageModalOpen(true)}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Lägg till bild som overlay på aktuell slide"
          >
            + Bild
          </button>
          <button
            onClick={() => setVideoModalOpen(true)}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Lägg till video som overlay på aktuell slide"
          >
            + Video
          </button>
          <button
            onClick={() => addOverlayText()}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Lägg till fri textruta som overlay på aktuell slide"
          >
            + Text
          </button>
          <button
            onClick={() => addOverlayShape("rect")}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Lägg till en form (rektangel — byt till ellips, linje eller pil i Objekt-fliken)"
          >
            + Form
          </button>
          {pasteStatus ? (
            <span
              aria-live="polite"
              className="rounded border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
            >
              {pasteStatus}
            </span>
          ) : null}
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`rounded border px-2 py-1 text-xs uppercase tracking-[0.1em] transition-all ${
              editMode
                ? "border-accent bg-accent/20 text-accent"
                : "border-white/10 bg-bg-surface/40 text-text-muted hover:border-accent hover:text-accent"
            }`}
            title="Inline-edit på/av (I) — klicka på text i preview för att redigera"
          >
            {editMode ? "● Inline" : "Inline"}
          </button>
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className="rounded border border-white/10 bg-bg-surface/40 px-2 py-1 text-xs text-text-muted transition-all hover:border-accent hover:text-accent"
            title="Toggla fält-panel (E)"
          >
            {panelOpen ? "Dölj ▸" : "◂ Visa"}
          </button>
          <button
            type="button"
            onClick={() => void returnToPresentation()}
            className="rounded border border-accent bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.15em] text-accent transition-all hover:bg-accent/20"
            title="Spara och visa presentationen från aktuell slide (R)"
          >
            Visa →
          </button>
        </div>
      </header>

      {/* Split: preview + fält-panel (kollapsbar) */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <EditorPreview
            slide={activeSlide}
            slideIndex={activeIndex}
            total={total}
            theme={(parsed.frontmatter.theme as string) ?? "default"}
            slideGradients={
              parsed.frontmatter.slideGradients as
                | Record<string, SlideGradientValue>
                | undefined
            }
            slideAccents={parsed.frontmatter.slideAccents as Record<string, string> | undefined}
            slideTextColors={parsed.frontmatter.slideTextColors as Record<string, string> | undefined}
            slideMutedColors={parsed.frontmatter.slideMutedColors as Record<string, string> | undefined}
            accentOverride={parsed.frontmatter.accentOverride as string | undefined}
            deckColorVars={deckColorVars(parsed.frontmatter)}
            textOverride={parsed.frontmatter.textOverride as string | undefined}
            mutedOverride={parsed.frontmatter.mutedOverride as string | undefined}
            editMode={editMode}
            onToggleEditMode={() => setEditMode((v) => !v)}
            onUpdateProp={updateSlidePropInline}
            onUpdateContent={updateSlideContent}
            onApplyTextEdit={applyTextEditToSlide}
            onStepConfigChange={updateStepConfig}
            onUpdateOverlayProp={updateOverlayProp}
            onDeleteOverlay={deleteOverlay}
            objectSelection={objectSelection}
            onObjectSelectionChange={selectObjects}
            editingObject={editingObject}
            onEditingObjectChange={setEditingObject}
            onPatchObjects={patchObjects}
            onDeleteObjects={deleteObjects}
            onDuplicateObjects={duplicateObjects}
            onStepObjectsZ={stepObjectsZ}
            onReplaceObjectMedia={replaceObjectMedia}
            onCopyObjects={copyObjects}
            onDropFiles={dropFiles}
          />
        </div>
        {panelOpen && (
          <aside className="flex w-full max-w-sm flex-col overflow-y-auto border-l border-white/5 bg-bg">
            <div className="border-b border-white/5 p-4">
              <SlideActions
                activeIndex={activeIndex}
                total={total}
                onAddAfter={() => onOpenGallery(activeIndex)}
                onImportAfter={onOpenImport ? () => onOpenImport(activeIndex) : undefined}
                onChangeTemplate={() => onChangeTemplate(activeIndex)}
                onDuplicate={duplicateSlide}
                onRemove={removeSlide}
                onMoveUp={() => moveSlide(-1)}
                onMoveDown={() => moveSlide(1)}
              />
            </div>
            {/* Samma flik-mönster som M-lägets live/design/share, så Joel
                känner igen sig när han byter läge. */}
            <div className="flex items-center gap-1 border-b border-white/5 px-4 py-2">
              {(
                [
                  ["fields", "Fält", "Textfält och innehåll (E)"],
                  ["design", "Design", "Bakgrund, gradient och färger (D)"],
                  ["objekt", "Objekt", "Fria bilder, textrutor och videor ovanpå mallen (O)"],
                ] as const
              ).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanelTab(id)}
                  title={hint}
                  aria-pressed={panelTab === id}
                  className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs uppercase tracking-[0.15em] transition-all ${
                    panelTab === id
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-white/10 bg-bg-surface/40 text-text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {label}
                  {id === "design" && hasDesignOverride ? (
                    <span
                      aria-hidden
                      title="Den här sliden har egna design-värden"
                      className="h-1.5 w-1.5 rounded-full bg-accent"
                    />
                  ) : null}
                  {id === "objekt" && objectCount > 0 ? (
                    <span className="rounded bg-accent/20 px-1 py-px font-mono text-[0.6rem] text-accent" title="Antal objekt på sliden">
                      {objectCount}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="flex-1 p-6">
              {activeSlide && panelTab === "fields" && (
                <EditorFieldPanel
                  onApplyProps={applySlideProps}
                  slide={activeSlide}
                  frontmatter={parsed.frontmatter}
                  onUpdateProps={updateSlideProps}
                  onUpdateContent={updateSlideContent}
                  onUpdateNotes={updateSlideNotes}
                  onUpdateFrontmatter={updateFrontmatter}
                  onUpdateChildProps={updateChildProps}
                  onUpdateChildContent={updateChildContent}
                  onAddChild={addChild}
                  onRemoveChild={removeChild}
                  onMoveChild={moveChild}
                />
              )}
              {activeSlide && panelTab === "design" && (
                <EditorDesignPanel
                  slide={activeSlide}
                  frontmatter={parsed.frontmatter}
                  slideIndex={activeIndex}
                  onSetGradient={setSlideGradientValue}
                  onSetEffect={setSlideEffectValue}
                  onSetColor={setDesignColor}
                  onSetBackgroundColor={setBackgroundValue}
                  onClearBackground={clearBackground}
                  onSetOverlay={setBackgroundOverlay}
                  onSetBlur={setBackgroundBlur}
                  onPickBackgroundImage={() => setBgImageModalOpen(true)}
                  onPickBackgroundVideo={() => setBgVideoModalOpen(true)}
                  onResetAll={resetSlideDesign}
                  onUpdateProps={updateSlideProps}
                  onApplyProps={applySlideProps}
                />
              )}
              {activeSlide && panelTab === "objekt" && (
                <ObjectPanel
                  overlays={activeSlide.overlays ?? []}
                  selection={objectSelection}
                  onSelect={selectObjects}
                  onPatch={patchObjects}
                  onDelete={deleteObjects}
                  onDuplicate={duplicateObjects}
                  onStepZ={stepObjectsZ}
                  onReplaceMedia={replaceObjectMedia}
                  onEditText={setEditingObject}
                  onAddImage={() => setImageModalOpen(true)}
                  onAddVideo={() => setVideoModalOpen(true)}
                  onAddText={() => addOverlayText()}
                  onAddShape={addOverlayShape}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Fullscreen slide-navigator (öppnas med N eller knapp) */}
      <EditorNavigator
        open={navigatorOpen}
        onClose={() => setNavigatorOpen(false)}
        labels={slideLabels}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        onReorder={reorderSlides}
      />

      {/* Lägg till bild som overlay på aktuell slide */}
      <AddImageModal
        open={imageModalOpen}
        slug={slug}
        onClose={() => {
          setImageModalOpen(false);
          setReplaceTarget(null);
        }}
        onPick={(src) => {
          if (replaceTarget !== null) patchObjects([{ index: replaceTarget, props: { src } }]);
          else addOverlayImage(src);
        }}
      />

      {/* Lägg till video som overlay på aktuell slide */}
      <AddVideoModal
        open={videoModalOpen}
        slug={slug}
        onClose={() => {
          setVideoModalOpen(false);
          setReplaceTarget(null);
        }}
        onPick={(src) => {
          if (replaceTarget !== null) patchObjects([{ index: replaceTarget, props: { src } }]);
          else addOverlayVideo(src);
        }}
      />

      {/* Samma väljare, men skriver slidens background-prop i stället för att
          lägga en overlay. */}
      <AddImageModal
        open={bgImageModalOpen}
        slug={slug}
        onClose={() => setBgImageModalOpen(false)}
        onPick={(path) => {
          setBackgroundValue(path);
          setBgImageModalOpen(false);
        }}
      />
      <AddVideoModal
        open={bgVideoModalOpen}
        slug={slug}
        onClose={() => setBgVideoModalOpen(false)}
        onPick={(path) => {
          setBackgroundValue(path);
          setBgVideoModalOpen(false);
        }}
      />

    </div>
  );
}

function SaveIndicator({ status, error }: { status: SaveStatus; error: string | null }) {
  if (status === "dirty") {
    return (
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
        Ändrad
      </span>
    );
  }
  if (status === "saving") {
    return (
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        Sparar...
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Sparat
      </span>
    );
  }
  if (status === "error" || status === "conflict") {
    return (
      <span
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-red-400"
        title={error ?? undefined}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        {status === "conflict" ? "Konflikt" : "Fel"}
      </span>
    );
  }
  return null;
}

function firstLine(s: string): string {
  return s.split("\n").find((l) => l.trim() !== "") ?? "";
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
