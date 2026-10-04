"use client";

import { Children, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";
import { QrCode } from "@/components/QrCode";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TryItNow — "sluta titta, börja göra". Publiken plockar upp mobilen mitt
 * i passet.
 *
 * En skärmdump av det som ska provas till vänster, en stor QR-kod till
 * höger, och två till fyra steg emellan så ingen fastnar. QR-koden genereras
 * lokalt via `qrcode`-paketet — inte via ett externt API, eftersom en slide
 * som kräver nät för att visa sin egen QR-kod är exakt fel sorts beroende
 * i en föreläsningssal med svag wifi.
 *
 * Ingen stegning: koden ska ligga uppe direkt och stanna, för folk skannar
 * i olika takt. Halon andas i stället, som en "skanna mig"-signal.
 *
 * MDX-format — ett steg per rad:
 * ```mdx
 * <TryItNow
 *   title="Testa nu. Själv."
 *   url="https://deepfake.civai.org"
 *   image="/visahurenkelt3.png"
 *   note="Inget konto. Inget som sparas."
 * >
 * - Skanna koden med mobilkameran.
 * - Tillåt kameran i webbläsaren.
 * - Välj en bakgrund — och se dig själv i den.
 * </TryItNow>
 * ```
 */

interface TryItNowProps {
  chapter?: string;
  kicker?: string;
  title?: string;
  subtitle?: string;
  /** Adressen QR-koden pekar på. Visas också i klartext under koden. */
  url: string;
  /** Etikett över QR-koden. */
  qrLabel?: string;
  /** Skärmdump eller mockup av det som ska provas. */
  image?: string;
  imageAlt?: string;
  /** Liten lugnande rad under stegen (t.ex. "inget konto behövs"). */
  note?: string;
  accent?: string;
  children?: ReactNode;
}

const QR_PX = 460;

function extractText(rawNode: ReactNode): string {
  const node = unwrapLazy(rawNode);
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return "";
}

function parseSteps(children: ReactNode): string[] {
  const out: string[] = [];
  const add = (raw: string) => {
    const t = raw.trim();
    if (t) out.push(t.replace(/\*\*/g, ""));
  };

  if (typeof children === "string") {
    for (const line of children.split("\n")) {
      const m = /^\s*-\s+(.*)$/.exec(line);
      if (m) add(m[1]);
    }
    return out;
  }

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    if (el.type === "ul" || el.type === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          add(
            extractText(
              (li as ReactElement<{ children?: ReactNode }>).props.children,
            ),
          );
        }
      });
    } else if (el.type === "li") {
      add(extractText(el.props.children));
    }
  });
  return out;
}

export function TryItNow({
  chapter,
  kicker,
  title,
  subtitle,
  url,
  qrLabel = "Skanna",
  image,
  imageAlt,
  note,
  accent = "var(--accent)",
  children,
}: TryItNowProps) {
  const steps = parseSteps(children);
  const eyebrow = kicker ?? chapter;
  const prettyUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: "var(--slide-base, var(--bg))",
        padding: "clamp(1.6rem, 3.4vh, 2.8rem) clamp(2rem, 4.5vw, 4.5rem)",
      }}
    >
      {/* QR-koden renderas i hög upplösning och skalas ned av wrappern —
          annars blir den suddig på projektorn. */}
      <style>{`.tryitnow-qr{width:100%;height:auto;display:block;border-radius:0.5rem}`}</style>

      {eyebrow ? (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.68rem, 0.9vw, 0.9rem)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <EditableText path={kicker ? "kicker" : "chapter"} value={eyebrow}>
            {eyebrow}
          </EditableText>
        </div>
      ) : null}

      {title ? (
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: "var(--heading-weight)",
            fontSize: "clamp(1.9rem, 3.6vw, 3.6rem)",
            letterSpacing: "var(--heading-tracking)",
            lineHeight: 1.05,
            color: "var(--text)",
            margin: "clamp(0.3rem, 0.9vh, 0.6rem) 0 0",
          }}
        >
          <EditableText path="title" value={title}>
            {title}
          </EditableText>
        </motion.h2>
      ) : null}

      {subtitle ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(0.9rem, 1.3vw, 1.3rem)",
            color: "var(--text-muted)",
            margin: "0.35rem 0 0",
            maxWidth: "44ch",
          }}
        >
          <EditableText path="subtitle" value={subtitle}>
            {subtitle}
          </EditableText>
        </motion.p>
      ) : null}

      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: image ? "minmax(0, 1.35fr) minmax(0, 1fr)" : "1fr",
          alignItems: "center",
          gap: "clamp(1.2rem, 3vw, 3rem)",
          paddingTop: "clamp(0.6rem, 1.6vh, 1.2rem)",
        }}
      >
        {image ? (
          <motion.img
            src={image}
            alt={imageAlt ?? ""}
            initial={{ opacity: 0, x: -26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : null}

        {/* QR + steg */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(0.5rem, 1.4vh, 1rem)",
            minWidth: 0,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "clamp(9rem, 15vw, 15rem)",
              padding: "clamp(0.5rem, 1vw, 0.85rem)",
              borderRadius: "0.75rem",
              background: "#ffffff",
              boxShadow: `0 24px 60px -24px ${withAlpha(accent, 0.6)}`,
            }}
          >
            {/* Andande halo — "skanna mig" utan att skriva det */}
            <motion.span
              aria-hidden
              animate={{ opacity: [0.25, 0.6, 0.25], scale: [1, 1.06, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                position: "absolute",
                inset: "-14%",
                borderRadius: "1.4rem",
                background: `radial-gradient(circle, ${withAlpha(
                  accent,
                  0.55,
                )} 0%, transparent 68%)`,
                filter: "blur(14px)",
                zIndex: -1,
                pointerEvents: "none",
              }}
            />
            <QrCode
              value={url}
              size={QR_PX}
              className="tryitnow-qr"
              alt={`QR-kod till ${prettyUrl}`}
            />
          </div>

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.62rem, 0.8vw, 0.8rem)",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: accent,
            }}
          >
            {qrLabel}
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(1rem, 1.7vw, 1.6rem)",
              letterSpacing: "-0.01em",
              color: "var(--text)",
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {prettyUrl}
          </div>

          {steps.length > 0 ? (
            <ol
              style={{
                listStyle: "none",
                margin: "clamp(0.2rem, 0.8vh, 0.5rem) 0 0",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: "clamp(0.2rem, 0.6vh, 0.42rem)",
                width: "100%",
                maxWidth: "26rem",
              }}
            >
              {steps.map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.35 + i * 0.12 }}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.55rem",
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.78rem, 1.05vw, 1.05rem)",
                    lineHeight: 1.35,
                    color: "var(--text)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75em",
                      color: accent,
                      flexShrink: 0,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{s}</span>
                </motion.li>
              ))}
            </ol>
          ) : null}

          {note ? (
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
                fontSize: "clamp(0.7rem, 0.95vw, 0.95rem)",
                color: "var(--text-muted)",
                textAlign: "center",
                maxWidth: "28rem",
              }}
            >
              <EditableText path="note" value={note}>
                {note}
              </EditableText>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
