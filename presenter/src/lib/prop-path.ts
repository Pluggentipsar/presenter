/**
 * Sökvägar till en del av en prop: `tiers[0].name`, `voices.2.quote`,
 * `levels[1].items[3]`.
 *
 * Mallar som visar en lista ur en array-prop låter varje post redigeras i
 * sliden med en sådan sökväg (EditableText path="tiers[0].name"). Förut
 * sparades sökvägen som ett eget propnamn — `tiers[0].name="Blå"` — och när
 * filen lästes in igen var hela listan borta. Nu uppdateras posten inne i
 * arrayen och resten av listan står kvar.
 *
 * Ren TypeScript: används av slide-editorn och testas i scripts/prop-path.test.ts.
 */

export type PathSegment = string | number;

/**
 * Dela upp en sökväg. Första delen är alltid propens namn. `[3]` och `.3` är
 * ett index; `.namn` en nyckel. Returnerar null för en sökväg som inte går att
 * läsa, så att anroparen inte gissar.
 */
export function parsePropPath(path: string): PathSegment[] | null {
  const head = /^[A-Za-z_$][A-Za-z0-9_$-]*/.exec(path);
  if (!head) return null;
  const segments: PathSegment[] = [head[0]];
  let rest = path.slice(head[0].length);
  while (rest.length > 0) {
    const index = /^\[(\d+)\]/.exec(rest);
    if (index) {
      segments.push(Number(index[1]));
      rest = rest.slice(index[0].length);
      continue;
    }
    const key = /^\.([A-Za-z0-9_$-]+)/.exec(rest);
    if (key) {
      segments.push(/^\d+$/.test(key[1]) ? Number(key[1]) : key[1]);
      rest = rest.slice(key[0].length);
      continue;
    }
    return null;
  }
  return segments;
}

/** Pekar sökvägen in i en prop (mer än bara propnamnet)? */
export function isNestedPropPath(path: string): boolean {
  const segments = parsePropPath(path);
  return segments !== null && segments.length > 1;
}

export function getAtPath(root: unknown, segments: PathSegment[]): unknown {
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === "number") {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
    } else {
      if (typeof current !== "object" || Array.isArray(current)) return undefined;
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

/**
 * Sätt ett värde längst in på sökvägen utan att ändra originalet. Varje nivå
 * på vägen måste redan finnas och ha rätt form (en array för ett index, ett
 * objekt för en nyckel). Annars returneras undefined och ingenting ändras —
 * en lista som mallen fyller med egna standardvärden får inte ersättas av en
 * lista med en enda post.
 */
export function setAtPath(root: unknown, segments: PathSegment[], value: unknown): unknown {
  if (segments.length === 0) return value;
  const [segment, ...rest] = segments;
  if (typeof segment === "number") {
    if (!Array.isArray(root) || segment < 0 || segment >= root.length) return undefined;
    const inner = rest.length === 0 ? value : setAtPath(root[segment], rest, value);
    if (inner === undefined) return undefined;
    const copy = root.slice();
    copy[segment] = inner;
    return copy;
  }
  if (root === null || typeof root !== "object" || Array.isArray(root)) return undefined;
  const record = root as Record<string, unknown>;
  if (rest.length > 0 && !(segment in record)) return undefined;
  const inner = rest.length === 0 ? value : setAtPath(record[segment], rest, value);
  if (inner === undefined) return undefined;
  return { ...record, [segment]: inner };
}

/**
 * Ta bort posten längst in på sökvägen: ett element ur en array, en nyckel ur
 * ett objekt. Samma krav på form som setAtPath.
 */
export function removeAtPath(root: unknown, segments: PathSegment[]): unknown {
  if (segments.length === 0) return undefined;
  const [segment, ...rest] = segments;
  if (typeof segment === "number") {
    if (!Array.isArray(root) || segment < 0 || segment >= root.length) return undefined;
    if (rest.length === 0) return root.filter((_, i) => i !== segment);
    const inner = removeAtPath(root[segment], rest);
    if (inner === undefined) return undefined;
    const copy = root.slice();
    copy[segment] = inner;
    return copy;
  }
  if (root === null || typeof root !== "object" || Array.isArray(root)) return undefined;
  const record = root as Record<string, unknown>;
  if (!(segment in record)) return undefined;
  if (rest.length === 0) {
    const copy = { ...record };
    delete copy[segment];
    return copy;
  }
  const inner = removeAtPath(record[segment], rest);
  if (inner === undefined) return undefined;
  return { ...record, [segment]: inner };
}
