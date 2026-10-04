"use client";

import { motion } from "framer-motion";
import { Children, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode } from "react";
import { withAlpha } from "@/lib/gradient-presets";
import { unwrapLazy } from "@/lib/extract-text";

/**
 * TackSlide — bespoke avslutnings-slide med "Tack!" stort till vänster,
 * en hero-bild på föreläsaren centrerad, en bok-omslag-thumbnail nere
 * vänster, och en lista av kontakt-rader till höger med ikoner.
 *
 * Kontakt-raderna stödjer auto-detect av plattform:
 *   linkedin / li → linkedin.svg
 *   instagram / ig → instagram.svg
 *   gmail / mail → gmail.svg
 *   spotify → spotify.svg
 *   web / globe → globe SVG (inline)
 *
 * MDX-format:
 * ```mdx
 * <TackSlide
 *   chapter="§ Tack"
 *   title="Tack!"
 *   personImage="/bilder/.../portratt.png"
 *   bookImage="/bilder/.../bok.jpg"
 *   accent= "var(--accent)"
 *   background="..."
 * >
 * - linkedin · Förnamn Efternamn
 * - instagram · ditt_konto
 * - gmail · namn@example.com
 * - spotify · Din podd
 * - web · example.com
 * </TackSlide>
 * ```
 *
 * Per rad: `Plattform · Etikett`.
 */

type Platform =
  | "linkedin"
  | "instagram"
  | "gmail"
  | "spotify"
  | "web"
  | "default";

interface TackSlideProps {
  chapter?: string;
  /** Huvudtitel — default "Tack!". */
  title?: string;
  /** Optional underrubrik/kicker. */
  subtitle?: string;
  /** Path till hero-bild på föreläsaren (centerstage). */
  personImage?: string;
  /** Path till bok-omslag (visas mindre). */
  bookImage?: string;
  background?: string;
  accent?: string;
  /** Mörk overlay (0-1). Default 0.78. */
  overlay?: number | string;
  children?: ReactNode;
}

interface ContactRow {
  platform: Platform;
  label: string;
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

function normalizePlatform(s: string): Platform {
  const lower = s.toLowerCase().trim();
  if (lower === "linkedin" || lower === "li") return "linkedin";
  if (lower === "instagram" || lower === "ig") return "instagram";
  if (lower === "gmail" || lower === "mail" || lower === "email") return "gmail";
  if (lower === "spotify") return "spotify";
  if (lower === "web" || lower === "globe" || lower === "url") return "web";
  return "default";
}

function parseContacts(children: ReactNode): ContactRow[] {
  const out: ContactRow[] = [];
  const walkLi = (li: ReactElement<{ children?: ReactNode }>) => {
    const raw = extractText(li.props.children).trim();
    if (!raw) return;
    const parts = raw.split(/\s*·\s*/);
    const platform = normalizePlatform(parts[0] ?? "");
    const label = parts.slice(1).join(" · ").trim();
    if (!label) return;
    out.push({ platform, label });
  };
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode }>;
    const t = el.type;
    if (t === "ul" || t === "ol") {
      Children.forEach(el.props.children, (li) => {
        if (isValidElement(li) && (li as ReactElement).type === "li") {
          walkLi(li as ReactElement<{ children?: ReactNode }>);
        }
      });
    } else if (t === "li") {
      walkLi(el);
    }
  });
  return out;
}

function resolveBackground(bg: string | undefined, overlay: number): string {
  if (!bg) return "var(--slide-base, var(--bg))";
  if (bg.startsWith("/") || bg.startsWith("http")) {
    return `linear-gradient(rgba(10,9,8,${overlay}), rgba(10,9,8,${Math.min(1, overlay + 0.05)})), url('${bg}') center/cover no-repeat`;
  }
  return bg;
}

/**
 * När en foto-bakgrund anges läggs en mörk scrim ovanpå för läsbarhet —
 * då sitter all text på en garanterat mörk yta oavsett tema, och måste
 * därför vara fixerat ljus (annars blir var(--text) nästan svart text på
 * mörk scrim i ljusa teman som dagsljus). Utan foto-bakgrund följer
 * sliden temat (var(--bg)/var(--text)).
 */
function isPhotoBackground(bg: string | undefined): boolean {
  return !!bg && (bg.startsWith("/") || bg.startsWith("http"));
}

// Fixerat ljusa textfärger för text som ligger på den mörka foto-scrimen.
const ON_DARK_TEXT = "rgba(245,246,250,0.92)";
const ON_DARK_MUTED = "rgba(245,246,250,0.6)";

/** Hämta ikon-path för plattform — fallback till inline globe-SVG. */
function PlatformIcon({ platform, stroke }: { platform: Platform; stroke: string }) {
  if (platform === "web" || platform === "default") {
    // Inline globe SVG — färgas av textColor (följer tema / scrim)
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    );
  }
  const path = `/logos/${platform}.svg`;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={path}
      alt={platform}
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}

export function TackSlide({
  chapter,
  title = "Tack!",
  subtitle,
  personImage,
  bookImage,
  background,
  accent = "var(--accent)",
  overlay = 0.78,
  children,
}: TackSlideProps) {
  const contacts = useMemo(() => parseContacts(children), [children]);
  const overlayNum = typeof overlay === "string" ? parseFloat(overlay) : overlay;

  // Explicit bakgrund (foto ELLER mörk gradient/färg) → behandla som mörk yta →
  // fixerat ljus text. Bara temaföljande (ingen bg, eller var(--…)) använder
  // var(--text). Annars blir en mörk gradient-bg + var(--text) osynlig på ljust tema.
  //
  // Testet var för trubbigt: det godtog bara en NAKEN var(--…) som
  // temaföljande. En gradient BYGGD av temavariabler —
  // "radial-gradient(…, var(--bg-surface), var(--bg))" — börjar med
  // "radial-gradient(" och dömdes därför som mörk. På dagsljus blev
  // följden vit text på vit botten: hela tacksliden var osynlig.
  //
  // En bakgrund är temaföljande om den hämtar sina färger ur temat och inte
  // blandar in egna. Finns url() eller en färgliteral är det ett foto eller
  // en medvetet mörk yta, och då ska texten fixeras ljus.
  const onDark =
    !!background &&
    !(
      background.includes("var(--") &&
      !/url\(|#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(background)
    );
  const textColor = onDark ? ON_DARK_TEXT : "var(--text)";
  const mutedColor = onDark ? ON_DARK_MUTED : "var(--text-muted)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: resolveBackground(background, overlayNum) }}
    >
      {chapter ? (
        <div
          style={{
            position: "absolute",
            top: "clamp(2rem, 4vh, 3.5rem)",
            right: "clamp(2rem, 4vw, 3.5rem)",
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.7rem, 0.9vw, 0.95rem)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: mutedColor,
            zIndex: 4,
          }}
        >
          {chapter}
        </div>
      ) : null}

      {/* Subtil accent-halo i centrum */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.0,
        }}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "70vmin",
          height: "70vmin",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, 0.19)} 0%, transparent 65%)`,
          filter: "blur(50px)",
          zIndex: 1,
        }}
      />

      {/* Joel-bilden — fixerad mot nederkanten, stor och dominant */}
      {personImage ? (
        <motion.div
          initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 1.4,
            delay: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            // Bredd capad så bilden inte krockar med kontakt-kolumnen.
            // Med korslagda armar tar bilden upp större horisontell yta än
            // ansiktet — så fotot dimensioneras smalare än mitten-zonen.
            width: "min(26vw, 56vh)",
            height: "94vh",
            zIndex: 3,
            pointerEvents: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={personImage}
            alt="Talaren"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom center",
              filter: `drop-shadow(0 -20px 60px rgba(0,0,0,0.7)) drop-shadow(0 0 120px ${withAlpha(accent, 0.2)})`,
            }}
          />
        </motion.div>
      ) : null}

      {/* Layout: 3 kolumner — vänster (Tack+bok), tom mitten (foto-zon), höger (kontakt).
          Smala kolumner ger generös foto-zon i mitten med rejält avstånd från text. */}
      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 22%) 1fr minmax(0, 24%)",
          padding: "clamp(2.5rem, 5vw, 5rem)",
          gap: "clamp(1rem, 2vw, 2rem)",
          alignItems: "center",
          zIndex: 2,
        }}
      >
        {/* VÄNSTER — Tack + bok */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(1.5rem, 3vh, 2.5rem)",
            alignItems: "flex-start",
          }}
        >
          <motion.h1
            initial={{ opacity: 0, x: -20, filter: "blur(12px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{
              duration: 1.0,
              delay: 0.3,
              ease: [0.22, 1.05, 0.36, 1],
            }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(4rem, 9vw, 9.5rem)",
              lineHeight: 0.85,
              letterSpacing: "-0.05em",
              color: textColor,
              margin: 0,
              textShadow: `0 0 60px ${withAlpha(accent, 0.4)}, 0 0 120px ${withAlpha(accent, 0.2)}`,
            }}
          >
            {title}
          </motion.h1>

          {subtitle ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.85, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
              style={{
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontSize: "clamp(1rem, 1.4vw, 1.4rem)",
                color: textColor,
                lineHeight: 1.4,
                maxWidth: "26ch",
              }}
            >
              {subtitle}
            </motion.div>
          ) : null}

          {bookImage ? (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.85, rotate: -8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: -4 }}
              transition={{
                duration: 0.9,
                delay: 1.2,
                ease: [0.22, 1.05, 0.36, 1],
              }}
              style={{
                width: "clamp(8rem, 13vw, 13rem)",
                aspectRatio: "3 / 4",
                position: "relative",
                marginTop: "clamp(0.6rem, 1.5vh, 1rem)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bookImage}
                alt="Bok-omslag"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "0.4rem",
                  boxShadow: `0 24px 50px -12px rgba(0,0,0,0.7), 0 0 40px ${withAlpha(accent, 0.2)}`,
                  border: `1px solid ${withAlpha(accent, 0.4)}`,
                }}
              />
            </motion.div>
          ) : null}
        </div>

        {/* MITTEN — tom spacer (Joel-bilden ligger absolut här) */}
        <div aria-hidden />

        {/* HÖGER — kontakt-rader */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "clamp(0.7rem, 1.4vh, 1.2rem)",
            justifyContent: "center",
            alignSelf: "center",
          }}
        >
          {contacts.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.55,
                delay: 1.4 + i * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "clamp(0.7rem, 1.2vw, 1.1rem)",
              }}
            >
              {/* Ikon-cirkel */}
              <div
                style={{
                  flexShrink: 0,
                  width: "clamp(2rem, 2.8vw, 2.8rem)",
                  height: "clamp(2rem, 2.8vw, 2.8rem)",
                  borderRadius: "0.4rem",
                  background: withAlpha(accent, 0.08),
                  border: `1px solid ${withAlpha(accent, 0.33)}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "clamp(0.35rem, 0.5vw, 0.5rem)",
                  boxShadow: `0 6px 18px -8px ${withAlpha(accent, 0.33)}`,
                }}
              >
                <PlatformIcon platform={row.platform} stroke={textColor} />
              </div>

              {/* Etikett */}
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: "clamp(0.95rem, 1.3vw, 1.3rem)",
                  color: textColor,
                  letterSpacing: "-0.005em",
                  lineHeight: 1.2,
                }}
              >
                {row.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
