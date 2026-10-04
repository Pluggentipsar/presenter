/**
 * Minimal markdown → React konverterare.
 *
 * Hanterar det subset som våra MDX-templates faktiskt använder:
 *   - `- item` och `* item`  →  <ul><li>
 *   - `1. item`              →  <ol><li>
 *   - `# heading` upp till h6
 *   - blankrader avgränsar stycken → <p>
 *   - **bold**               →  <strong>
 *   - *italic*               →  <em>
 *   - `code`                 →  <code>
 *
 * Det räcker för våra templates (BulletBuild, Reflection, SideScrollList,
 * NumberedReveal m.fl. som extraherar ul/li från children).
 *
 * Obs: hoppar över rader som börjar med `<Tag` eller `</Tag` — de hanteras
 * av SlideRenderer rekursivt via ParsedComponent.children.
 */

import type { ReactNode } from "react";

export function markdownToReact(source: string): ReactNode {
  const rawLines = source.split("\n");
  // Filtrera bort JSX-tagg-rader (de hanteras separat som ParsedComponent.children)
  const lines = stripJsxBlocks(rawLines);
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const match = /^\s*[-*]\s+(.*)/.exec(lines[i]);
        if (match) items.push(<li key={key++}>{inline(match[1])}</li>);
        i++;
      }
      blocks.push(<ul key={key++}>{items}</ul>);
      continue;
    }

    // Numrerad lista
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const match = /^\s*\d+\.\s+(.*)/.exec(lines[i]);
        if (match) items.push(<li key={key++}>{inline(match[1])}</li>);
        i++;
      }
      blocks.push(<ol key={key++}>{items}</ol>);
      continue;
    }

    // Rubrik
    const hmatch = /^(#{1,6})\s+(.+)/.exec(trimmed);
    if (hmatch) {
      const level = hmatch[1].length;
      const text = hmatch[2];
      const Tag = (`h${level}` as unknown) as "h1";
      blocks.push(<Tag key={key++}>{inline(text)}</Tag>);
      i++;
      continue;
    }

    // Stycke
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^[-*]\s+/.test(lines[i].trim()) && !/^\d+\.\s+/.test(lines[i].trim()) && !/^#{1,6}\s+/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(<p key={key++}>{inline(paraLines.join(" "))}</p>);
    }
  }

  return blocks;
}

/**
 * Ta bort hela JSX-block (från `<Tag` till matchande `</Tag>` eller self-closing `/>`).
 * Vi använder en enkel heuristik: om en rad börjar med `<LargeCase`, hoppa över
 * tills vi hittar `</Samma>` eller `/>`.
 */
function stripJsxBlocks(lines: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimStart();
    const openMatch = /^<([A-Z][A-Za-z0-9]*)/.exec(trimmed);

    if (!openMatch) {
      result.push(lines[i]);
      i++;
      continue;
    }

    const tag = openMatch[1];

    // Self-closing på samma rad?
    if (/\/>\s*$/.test(trimmed)) {
      i++;
      continue;
    }

    // Leta upp matchande closing tag
    const closingRe = new RegExp(`</${tag}>`);
    let found = false;
    for (let j = i; j < lines.length; j++) {
      if (closingRe.test(lines[j])) {
        i = j + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      // Om ingen closing hittas, hoppa bara denna rad
      i++;
    }
  }

  return result;
}

/**
 * Inline-formatter: **bold**, *italic*, `code`.
 */
/**
 * Bara inline-markeringarna — **fet**, *kursiv*, `kod` — utan att svepa in
 * resultatet i ett <p>.
 *
 * Använd den här när texten redan står i ett element som bara får innehålla
 * phrasing content: <h1>–<h6>, <p>, <span>, <figcaption>. `markdownToReact`
 * lägger på ett <p> och ger då `<p>` i `<p>`, vilket är ogiltig HTML och
 * kraschar hydreringen i React 19.
 */
export function inlineMarkdown(text: string): ReactNode {
  return inline(text);
}

function inline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let buf = "";
  let key = 0;
  let i = 0;

  const flush = () => {
    if (buf) {
      parts.push(buf);
      buf = "";
    }
  };

  while (i < text.length) {
    // **bold**
    if (text.slice(i, i + 2) === "**") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        parts.push(<strong key={key++}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // *italic*
    if (text[i] === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && text[end - 1] !== " ") {
        flush();
        parts.push(<em key={key++}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    // `code`
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        parts.push(<code key={key++}>{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();
  return parts.length === 1 ? parts[0] : parts;
}
