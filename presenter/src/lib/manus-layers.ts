/**
 * Lagervalet i manusvyn — vilka rader som visas under varje slide i översikten.
 *
 * Valet ligger i localStorage: man växlar mellan tät översikt och genomläsning
 * flera gånger under ett arbetspass, och att börja om från noll varje gång vyn
 * öppnas är irriterande på ett sätt som märks.
 *
 * Det är byggt som en extern store i stället för useState + useEffect, av två
 * skäl. Servern har ingen localStorage, så ett annat startvärde på klienten
 * skulle ge hydration-mismatch — useSyncExternalStore hanterar just den skillnaden
 * genom att fråga efter en server-snapshot separat. Och store:n prenumererar på
 * `storage`, så två öppna studioflikar håller samma läge.
 */

export const LAYERS = [
  { key: "syfte", label: "Syfte" },
  { key: "manus", label: "Manus" },
  { key: "claude", label: "Till Claude/Codex" },
] as const;

export type LayerKey = (typeof LAYERS)[number]["key"];
export type LayerState = Readonly<Record<LayerKey, boolean>>;

const STORAGE_KEY = "manus-lager-v1";
const LAYERS_OFF: LayerState = { syfte: false, manus: false, claude: false };

const listeners = new Set<() => void>();

/**
 * Snapshotet måste vara referensstabilt mellan renders, annars loopar
 * useSyncExternalStore. Därför cachas det och byts bara när något ändras.
 */
let cache: LayerState | null = null;

function readStorage(): LayerState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return LAYERS_OFF;
    const parsed = JSON.parse(raw) as Partial<LayerState>;
    return {
      syfte: parsed.syfte === true,
      manus: parsed.manus === true,
      claude: parsed.claude === true,
    };
  } catch {
    // Privat läge, blockerad storage eller ett trasigt värde — kör med lagren av.
    return LAYERS_OFF;
  }
}

export function subscribeLayers(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    cache = null;
    listeners.forEach((listener) => listener());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getLayers(): LayerState {
  if (!cache) cache = readStorage();
  return cache;
}

/** Servern renderar alltid utan lager — klienten rättar det direkt efter hydrering. */
export function getServerLayers(): LayerState {
  return LAYERS_OFF;
}

export function toggleLayer(key: LayerKey): void {
  const next = { ...getLayers(), [key]: !getLayers()[key] };
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Går inte att spara — valet gäller ändå för den här sessionen.
  }
  listeners.forEach((listener) => listener());
}
