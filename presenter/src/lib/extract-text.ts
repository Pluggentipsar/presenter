import { isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";

/**
 * extractText — plattar ut MDX-children till text med **fet**- och *kursiv*-
 * markörer bevarade, så ord-för-ord-mallar kan parsa emfas ur riktig MDX.
 *
 * RSC-nyansen som motiverar en delad modul: när MDX-innehåll passerar
 * server→klient-gränsen anländer children till klientmallen som en
 * react.lazy-nod (Flight-referens), inte som element. isValidElement säger
 * nej till den, så utan uppackning renderar servern noll ord medan klienten
 * renderar alla — och hydreringen spricker på varje slide som läser sin text
 * ur children. Payloaden är i praktiken redan löst när mallen SSR:as, så
 * noden går att packa upp synkront.
 */

type LazyLike = {
  $$typeof: symbol;
  _init: (payload: unknown) => ReactNode;
  _payload: unknown;
};

const REACT_LAZY = Symbol.for("react.lazy");

/**
 * Exporterad separat för templates som behåller en egen extract-semantik
 * (andra markörer, br/p-hantering, join-separatorer) men ändå måste packa
 * upp Flight-referensen innan de läser children.
 */
export function unwrapLazy(node: ReactNode): ReactNode {
  let current: ReactNode = node;
  // while: uppackningen kan ge en ny lazy-nod när Flight outlinar delade träd.
  while (
    current != null &&
    typeof current === "object" &&
    (current as unknown as LazyLike).$$typeof === REACT_LAZY
  ) {
    try {
      const lazy = current as unknown as LazyLike;
      current = lazy._init(lazy._payload);
    } catch {
      // Pending eller rejected chunk — samma tomma utfall som före
      // uppackningen, hellre än att suspenda mitt i en synkron render.
      return null;
    }
  }
  return current;
}

export function extractText(node: ReactNode): string {
  const resolved = unwrapLazy(node);
  if (resolved == null || typeof resolved === "boolean") return "";
  if (typeof resolved === "string") return resolved;
  if (typeof resolved === "number") return String(resolved);
  if (Array.isArray(resolved)) return resolved.map(extractText).join("");
  if (isValidElement(resolved)) {
    const el = resolved as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    const inner = extractText(el.props.children);
    if (t === "strong") return `**${inner}**`;
    if (t === "em") return `*${inner}*`;
    // Mellanslag efter paragraf — annars limmas sista/första ordet i
    // angränsande stycken ihop när MDX inte skickar whitespace mellan block.
    if (t === "p") return `${inner} `;
    return inner;
  }
  return "";
}
