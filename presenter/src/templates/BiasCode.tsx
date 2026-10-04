"use client";

import { motion } from "framer-motion";
import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode, CSSProperties } from "react";
import { useSlideSteps } from "@/lib/slide-steps";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * BiasCode — pedagogisk code-style explainer.
 *
 * Renderar innehållet som en simulerad code-editor med radnummer, syntax-
 * färger och stepped reveal av varje "block" (separerade av blankrader).
 * Tänkt för att förklara HUR något fungerar genom att visa det som
 * pseudo-kod med kommentarer.
 *
 * MDX-format — varje rad blir en code-line. Rader som börjar med `#`
 * blir kommentarer (gråskrivna, italic). Strängar i `"..."` får accent-
 * färg. Funktionsanrop `name(...)` får också accent. Blankrader
 * separerar blocks som avslöjas stegvis.
 *
 * ```mdx
 * <BiasCode
 *   chapter="§ Bias · Varför?"
 *   title="Datan formar mönstret. Mönstret formar svaret."
 *   filename="bias.py"
 *   accent= "var(--accent)"
 * >
 * training_data = internet.scrape()
 * # ── 92% engelska
 * # ── 87% från USA, UK, Indien
 * # ── 71% manligt författarskap
 *
 * patterns = ai.learn(training_data)
 * # "normal" = vanligast i datan
 * # vanligast ≠ representativt
 *
 * output = ai.generate("ledare")
 * # → reproducerar mönstret
 * # → WEIRD
 * </BiasCode>
 * ```
 */

interface BiasCodeProps {
  chapter?: string;
  title?: string;
  subtitle?: string;
  /** Filnamn som visas i editor-headern. Default "bias.py". */
  filename?: string;
  accent?: string;
  background?: string;
  overlay?: number;
  /** Om man vill att alla blocks ska vara synliga från start. Default false. */
  autoReveal?: boolean | string;
  children?: ReactNode;
}

interface CodeLine {
  text: string;
  isComment: boolean;
  isBlank: boolean;
}

interface CodeBlock {
  lines: CodeLine[];
  /** Index av första line i hela kod-listan (för line numbers). */
  startLine: number;
}

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (node == null || node === false) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

/**
 * Parsa children som MDX-lista. Varje li blir en code-line.
 * Items med innehåll `---` (eller `<hr>`-element) markerar block-separator.
 */
function parseLinesFromList(children: ReactNode): {
  lines: CodeLine[];
  separators: number[];
} {
  const lines: CodeLine[] = [];
  const separators: number[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const tag = el.type;
    if (tag === "ul" || tag === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (!isValidElement(li)) return;
        if ((li as ReactElement).type !== "li") return;
        const raw = extractText(
          (li as ReactElement<{ children?: ReactNode }>).props.children,
        );
        const trimmed = raw.trim();
        if (trimmed === "---") {
          separators.push(lines.length);
          return;
        }
        const trimmedFront = raw.replace(/^\s+/, "");
        // Stödjer både # och // som comment-prefix.
        // (MDX konverterar `# text` till heading, så // är säkrare default.)
        const isComment =
          trimmedFront.startsWith("//") || trimmedFront.startsWith("#");
        lines.push({ text: raw, isComment, isBlank: false });
      });
    }
  });
  return { lines, separators };
}

function groupBlocks(
  lines: CodeLine[],
  separators: number[],
): CodeBlock[] {
  if (lines.length === 0) return [];
  const blocks: CodeBlock[] = [];
  // separators är indexer där blockslut ska ske (efter den indexens line)
  // Bygg block-gränser
  const sortedSeps = [...separators].sort((a, b) => a - b);
  let currentStart = 0;
  let lineNum = 1;
  for (const sep of sortedSeps) {
    if (sep > currentStart) {
      const blockLines = lines.slice(currentStart, sep);
      blocks.push({ lines: blockLines, startLine: lineNum });
      lineNum += blockLines.length;
    }
    currentStart = sep;
  }
  if (currentStart < lines.length) {
    const blockLines = lines.slice(currentStart);
    blocks.push({ lines: blockLines, startLine: lineNum });
  }
  return blocks;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    const a = overlay;
    return `linear-gradient(rgba(10,9,8,${a}), rgba(10,9,8,${Math.min(1, a + 0.08)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

// Tokenize en kodrad och returnera färgade fragment.
interface Token {
  text: string;
  kind: "plain" | "string" | "fn" | "keyword" | "number" | "op" | "comment";
}

const KEYWORDS = new Set([
  "if",
  "else",
  "for",
  "while",
  "return",
  "def",
  "class",
  "import",
  "from",
  "lambda",
  "and",
  "or",
  "not",
  "in",
  "is",
  "True",
  "False",
  "None",
  "let",
  "const",
  "var",
  "function",
  "async",
  "await",
]);

function tokenize(code: string, isComment: boolean): Token[] {
  if (isComment) return [{ text: code, kind: "comment" }];
  const tokens: Token[] = [];
  // Match strings, function calls, numbers, keywords, operators, plain
  const regex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_][A-Za-z0-9_]*)(\s*\()|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)|([=+\-*/<>!&|→≠≈]+)|(\s+)|(.)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(code)) !== null) {
    const [, str, fn, fnParen, ident, num, op, ws, other] = match;
    if (str !== undefined) {
      tokens.push({ text: str, kind: "string" });
    } else if (fn !== undefined) {
      tokens.push({ text: fn, kind: "fn" });
      tokens.push({ text: fnParen, kind: "plain" });
    } else if (ident !== undefined) {
      tokens.push({
        text: ident,
        kind: KEYWORDS.has(ident) ? "keyword" : "plain",
      });
    } else if (num !== undefined) {
      tokens.push({ text: num, kind: "number" });
    } else if (op !== undefined) {
      tokens.push({ text: op, kind: "op" });
    } else if (ws !== undefined) {
      tokens.push({ text: ws, kind: "plain" });
    } else if (other !== undefined) {
      tokens.push({ text: other, kind: "plain" });
    }
  }
  return tokens;
}

function tokenStyle(kind: Token["kind"], accent: string): CSSProperties {
  switch (kind) {
    case "string":
      return { color: "#a3d9a5" }; // green
    case "fn":
      return { color: accent, fontWeight: 600 };
    case "keyword":
      return { color: "#c084fc", fontWeight: 600 }; // purple
    case "number":
      return { color: "#f9a8d4" }; // pink
    case "op":
      return { color: accent };
    case "comment":
      return { color: "rgba(245,246,250,0.6)", fontStyle: "italic" };
    default:
      return { color: "rgba(245,246,250,0.92)" };
  }
}

export function BiasCode({
  chapter,
  title,
  subtitle,
  filename = "bias.py",
  accent = "var(--accent)",
  background,
  overlay = 0.65,
  autoReveal = false,
  children,
}: BiasCodeProps) {
  const { lines: allLines, separators } = parseLinesFromList(children);
  const blocks = groupBlocks(allLines, separators);

  const autoRevealBool =
    typeof autoReveal === "string" ? autoReveal !== "false" : autoReveal;
  // Steg 0 = inget visat. Steg N = visa block N-1. Total = blocks.length + 1.
  const totalSteps = autoRevealBool ? 0 : blocks.length + 1;
  const step = useSlideSteps(totalSteps);
  const visibleBlocks = autoRevealBool ? blocks.length : step;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlay) }}
    >
      {/* Chapter */}
      {chapter ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            zIndex: 5,
          }}
        >
          {chapter}
        </motion.div>
      ) : null}

      {/* Hårkorsmarkör */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: "clamp(3rem, 5vh, 4rem)",
          left: "clamp(3rem, 6vw, 6rem)",
          width: "3rem",
          height: "1px",
          background: accent,
          transformOrigin: "left",
          zIndex: 5,
        }}
      />

      {/* Titel + subtitle */}
      {title || subtitle ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(4vh, 6vh, 8vh)",
            left: "clamp(3rem, 6vw, 6rem)",
            right: "clamp(3rem, 6vw, 6rem)",
            zIndex: 4,
          }}
        >
          {title ? (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
                fontWeight: 700,
                letterSpacing: "-0.025em",
                lineHeight: 1.05,
                color: "var(--text)",
                maxWidth: "60ch",
              }}
            >
              {title}
            </motion.h2>
          ) : null}
          {subtitle ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                margin: "0.5rem 0 0",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(0.9rem, 1.2vw, 1.2rem)",
                fontWeight: 400,
                color: "var(--text-muted)",
                maxWidth: "70ch",
              }}
            >
              {subtitle}
            </motion.p>
          ) : null}
        </div>
      ) : null}

      {/* Code-editor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "absolute",
          top: title ? "clamp(20vh, 24vh, 28vh)" : "clamp(8vh, 12vh, 16vh)",
          bottom: "clamp(4vh, 6vh, 8vh)",
          left: "clamp(4rem, 8vw, 8rem)",
          right: "clamp(4rem, 8vw, 8rem)",
          background: "rgba(15,13,10,0.85)",
          border: "1px solid rgba(247,241,230,0.1)",
          borderRadius: "0.7rem",
          boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 80px ${withAlpha(accent, 0.07)}`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 3,
        }}
      >
        {/* Editor-header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.7rem 1rem",
            borderBottom: "1px solid rgba(247,241,230,0.08)",
            background: "rgba(20,18,16,0.6)",
          }}
        >
          <span
            style={{
              width: "0.65rem",
              height: "0.65rem",
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <span
            style={{
              width: "0.65rem",
              height: "0.65rem",
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <span
            style={{
              width: "0.65rem",
              height: "0.65rem",
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
          <span
            style={{
              marginLeft: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              color: "rgba(245,246,250,0.6)",
              letterSpacing: "0.04em",
            }}
          >
            {filename}
          </span>
        </div>

        {/* Code body */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "clamp(1.2rem, 2vw, 1.8rem) 0",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.95rem, 1.4vw, 1.4rem)",
            lineHeight: 1.65,
          }}
        >
          {blocks.slice(0, visibleBlocks).map((block, blockIdx) => (
            <motion.div
              key={blockIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              style={{
                marginBottom:
                  blockIdx < blocks.length - 1 ? "clamp(1rem, 1.8vh, 1.6rem)" : 0,
              }}
            >
              {block.lines.map((line, lineIdx) => {
                const tokens = tokenize(line.text, line.isComment);
                const lineNum = block.startLine + lineIdx;
                return (
                  <div
                    key={lineIdx}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "1.2rem",
                      paddingLeft: "clamp(1rem, 2vw, 1.6rem)",
                      paddingRight: "clamp(1rem, 2vw, 1.6rem)",
                    }}
                  >
                    {/* Line number */}
                    <span
                      style={{
                        flexShrink: 0,
                        width: "2.4ch",
                        textAlign: "right",
                        color: "rgba(247,241,230,0.25)",
                        fontSize: "0.85em",
                        userSelect: "none",
                      }}
                    >
                      {lineNum}
                    </span>
                    {/* Code line */}
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {tokens.map((tok, ti) => (
                        <span key={ti} style={tokenStyle(tok.kind, accent)}>
                          {tok.text}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          ))}

          {/* Cursor som blinkar längst ner i sista block (om inte alla blocks visade) */}
          {visibleBlocks < blocks.length ? (
            <div
              style={{
                paddingLeft: "calc(clamp(1rem, 2vw, 1.6rem) + 2.4ch + 1.2rem)",
                marginTop: "0.4rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "0.55rem",
                  height: "1.1em",
                  background: accent,
                  verticalAlign: "middle",
                  animation: "biascode-blink 1s steps(2) infinite",
                }}
              />
            </div>
          ) : null}
        </div>
      </motion.div>

      <style>{`
        @keyframes biascode-blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
