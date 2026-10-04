import type { ReactNode } from "react";
import type { ReadNode } from "@/lib/share/article";

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

/** Lästextens inline-format: **fet**, *kursiv* och [länk](https://…). */
export function renderInline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = link[2];
      const safe = /^(https?:\/\/|\/|#|mailto:)/.test(href);
      if (!safe) return link[1];
      const external = /^https?:\/\//.test(href);
      return (
        <a key={i} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

export function ReadNodes({ nodes }: { nodes: ReadNode[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === "h") return <h3 key={i}>{renderInline(node.text)}</h3>;
        if (node.type === "quote") return <blockquote key={i}>{renderInline(node.text)}</blockquote>;
        if (node.type === "list")
          return (
            <ul key={i}>
              {node.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{renderInline(node.text)}</p>;
      })}
    </>
  );
}
