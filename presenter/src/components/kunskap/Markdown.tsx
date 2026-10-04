"use client";

import { Children, isValidElement, useMemo, type MouseEvent, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingId, IMAGE_FILE, readWikilink, wikilinkPattern, type Resolved, type Resolver } from "@/lib/kunskap/lankar";
import s from "./kunskap.module.css";

/**
 * En sida i Kunskapsbanken som läsbar text (2 oktober 2026): GitHub-markdown (tabeller, listor,
 * genomstrykning) med Obsidians tillägg. [[wikilänkar]] blir länkar inom appen, en ensam radbrytning
 * syns som i Obsidian (valvets "strict line breaks" är av), och rubrikerna får id så att
 * [[sida#Rubrik]] hamnar rätt. Rå HTML visas som text, aldrig som HTML.
 */

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  title?: string | null;
  children?: MdNode[];
}

/** [[mål|visas]] i löptext blir länknoder (wiki:mål#rubrik); ![[bild.png]] blir en bild. */
function remarkWikilinks() {
  const split = (value: string): MdNode[] => {
    const out: MdNode[] = [];
    let last = 0;
    for (const match of value.matchAll(wikilinkPattern())) {
      const at = match.index ?? 0;
      if (at > last) out.push({ type: "text", value: value.slice(last, at) });
      const link = readWikilink(match);
      const url = `wiki:${encodeURIComponent(link.target)}${link.heading ? `#${encodeURIComponent(link.heading)}` : ""}`;
      if (link.embed && IMAGE_FILE.test(link.target)) {
        out.push({ type: "image", url, alt: link.alias ?? link.target, title: null });
      } else {
        const name = link.target.split("/").pop() ?? "";
        const label = link.alias ?? (link.heading ? (name ? `${name} › ${link.heading}` : link.heading) : name);
        out.push({ type: "link", url, title: null, children: [{ type: "text", value: label }] });
      }
      last = at + match[0].length;
    }
    if (last < value.length) out.push({ type: "text", value: value.slice(last) });
    return out;
  };
  const visit = (node: MdNode) => {
    if (!node.children || node.type === "link" || node.type === "linkReference") return;
    const next: MdNode[] = [];
    for (const child of node.children) {
      if (child.type === "text" && child.value?.includes("[[")) next.push(...split(child.value));
      else {
        visit(child);
        next.push(child);
      }
    }
    node.children = next;
  };
  return (tree: MdNode) => visit(tree);
}

/** En ensam radbrytning i ett stycke syns, som i Obsidian. */
function remarkSoftBreaks() {
  const visit = (node: MdNode) => {
    if (!node.children) return;
    const next: MdNode[] = [];
    for (const child of node.children) {
      if (child.type === "text" && child.value?.includes("\n")) {
        child.value.split("\n").forEach((line, i) => {
          if (i > 0) next.push({ type: "break" });
          if (line) next.push({ type: "text", value: line });
        });
      } else {
        visit(child);
        next.push(child);
      }
    }
    node.children = next;
  };
  return (tree: MdNode) => visit(tree);
}

const PLUGINS = [remarkGfm, remarkWikilinks, remarkSoftBreaks];
const urlTransform = (url: string) => (url.startsWith("wiki:") ? url : defaultUrlTransform(url));

function textOf(children: ReactNode): string {
  let out = "";
  Children.forEach(children, child => {
    if (typeof child === "string" || typeof child === "number") out += child;
    else if (isValidElement<{ children?: ReactNode }>(child)) out += textOf(child.props.children);
  });
  return out;
}

const plainClick = (event: MouseEvent) => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export interface MarkdownLinks {
  resolver: Resolver;
  /** Adressen till en sida i appen (för högerklick och nya fönster). */
  noteHref: (path: string, heading?: string) => string;
  onNote: (path: string, heading?: string) => void;
  onDeck: (slug: string) => void;
  onMissing?: (target: string) => void;
}

export function Markdown({ source, from, links }: { source: string; from: string; links: MarkdownLinks }) {
  const components = useMemo<Components>(() => {
    const resolve = (href: string): Resolved => {
      if (href.startsWith("wiki:")) {
        const [target, heading] = href.slice(5).split("#");
        return links.resolver.wiki(from, { target: decodeURIComponent(target), heading: heading ? decodeURIComponent(heading) : undefined });
      }
      return links.resolver.url(from, href);
    };
    const heading = (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
      function Heading({ children }: { children?: ReactNode }) {
        return <Tag id={headingId(textOf(children))}>{children}</Tag>;
      };
    return {
      h1: heading("h1"),
      h2: heading("h2"),
      h3: heading("h3"),
      h4: heading("h4"),
      h5: heading("h5"),
      h6: heading("h6"),
      a({ href = "", children }) {
        const target = resolve(href);
        switch (target.kind) {
          case "note":
            return (
              <a className={s.link} href={links.noteHref(target.path, target.heading)} onClick={event => {
                if (!plainClick(event)) return;
                event.preventDefault();
                links.onNote(target.path, target.heading);
              }}>{children}</a>
            );
          case "deck":
            return (
              <a className={s.deckLink} href={`/${target.slug}/studio?mode=oversikt`} onClick={event => {
                if (!plainClick(event)) return;
                event.preventDefault();
                links.onDeck(target.slug);
              }}>{children}</a>
            );
          case "anchor":
            return (
              <a className={s.link} href={`#${headingId(target.heading)}`} onClick={event => {
                event.preventDefault();
                document.getElementById(headingId(target.heading))?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>{children}</a>
            );
          case "external":
            return <a className={s.external} href={target.url} target="_blank" rel="noreferrer">{children}</a>;
          case "file":
            return IMAGE_FILE.test(target.path)
              ? <a className={s.link} href={`/api/kunskap/fil?path=${encodeURIComponent(target.path)}`} target="_blank" rel="noreferrer">{children}</a>
              : <span className={s.fileRef} title={target.path}>{children}</span>;
          case "missing":
            return (
              <a className={s.missing} href="#" title="Sidan finns inte än" onClick={event => {
                event.preventDefault();
                links.onMissing?.(target.target);
              }}>{children}</a>
            );
        }
      },
      img({ src, alt }) {
        const value = typeof src === "string" ? src : "";
        let url = value;
        if (value.startsWith("wiki:")) url = `/api/kunskap/fil?namn=${encodeURIComponent(decodeURIComponent(value.slice(5).split("#")[0]))}&fran=${encodeURIComponent(from)}`;
        else if (!/^https?:/i.test(value)) {
          const target = links.resolver.url(from, value);
          if (target.kind !== "file") return <span className={s.fileRef}>{alt}</span>;
          url = `/api/kunskap/fil?path=${encodeURIComponent(target.path)}`;
        }
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={url} alt={alt ?? ""} loading="lazy" />;
      },
      table({ children }) {
        return (
          <div className={s.tableWrap}>
            <table>{children}</table>
          </div>
        );
      },
    };
  }, [from, links]);

  return (
    <div className={s.md}>
      <ReactMarkdown remarkPlugins={PLUGINS} components={components} urlTransform={urlTransform}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
