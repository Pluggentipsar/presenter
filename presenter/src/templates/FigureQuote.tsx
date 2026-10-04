"use client";

import { motion } from "framer-motion";
import { EditableText } from "@/lib/inline-edit";

type QuoteSize = "md" | "lg" | "xl";

interface FigureQuoteProps {
  /** Själva citatet */
  quote: string;
  /** Namn på den som sagt det */
  attribution?: string;
  /** Årtal, roll eller annat sammanhang som visas efter namnet */
  context?: string;
  /** Bild av personen — läggs flush mot nedre och angivna sido-kanten */
  image?: string;
  alt?: string;
  /** Fotobakgrund */
  background?: string;
  /** Vilket hörn bilden ligger i — default "bottom-right" */
  imageCorner?: "bottom-right" | "bottom-left";
  /** Overlay-mörker 0-1 (default 0.55) */
  darken?: number;
  /** Citatets textstorlek */
  quoteSize?: QuoteSize;
}

const QUOTE_SIZES: Record<QuoteSize, string> = {
  md: "clamp(2.2rem, 3.8vw, 4.2rem)",
  lg: "clamp(2.6rem, 4.6vw, 5.2rem)",
  xl: "clamp(3rem, 5.4vw, 6.2rem)",
};

/**
 * Citat + figurbild i hörnet. Bakgrund + mörk diagonal gradient så
 * textsidan blir tydligt läsbar medan bildsidan andas. Bilden ligger
 * flush mot nedre och angivna sido-kanten — använd transparent PNG
 * för bästa resultat.
 */
export function FigureQuote({
  quote,
  attribution,
  context,
  image,
  alt = "",
  background = "",
  imageCorner = "bottom-right",
  darken = 0.55,
  quoteSize = "xl",
}: FigureQuoteProps) {
  const imageRight = imageCorner === "bottom-right";
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--slide-base, var(--bg))", color: "var(--text)" }}
    >
      {/* Fotobakgrund */}
      {background ? (
        <img
          src={background}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: "cover" }}
        />
      ) : null}

      {/* Diagonal mörk gradient — mörkare på text-sidan, ljusare kring bilden */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to ${imageRight ? "bottom right" : "bottom left"}, rgba(10,9,8,${Math.min(0.92, darken + 0.25)}) 0%, rgba(10,9,8,${darken}) 45%, rgba(10,9,8,${Math.max(0, darken - 0.3)}) 100%)`,
        }}
      />

      {/* Two-column grid */}
      <div
        className="relative h-full w-full"
        style={{
          display: "grid",
          gridTemplateColumns: imageRight ? "1.1fr 1fr" : "1fr 1.1fr",
          zIndex: 2,
        }}
      >
        {/* Text-kolumn */}
        <div
          style={{
            gridColumn: imageRight ? 1 : 2,
            gridRow: 1,
            padding: "clamp(3rem, 5vw, 5rem)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <motion.blockquote
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: QUOTE_SIZES[quoteSize],
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "rgba(245,246,250,0.92)",
              margin: 0,
              quotes: '"\\201D" "\\201D"',
            }}
          >
            <EditableText
              path="quote"
              value={quote ?? ""}
              label="Citat"
              sizeControls={[
                { prop: "quoteSize", current: quoteSize, options: ["md", "lg", "xl"], label: "Storlek" },
              ]}
            >{quote}</EditableText>
          </motion.blockquote>

          {attribution ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              style={{ marginTop: "clamp(1.4rem, 2.4vw, 2.4rem)" }}
            >
              <span
                style={{
                  display: "block",
                  width: "clamp(44px, 5.5vw, 80px)",
                  height: "2px",
                  background: "var(--accent)",
                  marginBottom: "0.85rem",
                }}
              />
              <cite
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
                  color: "rgba(245,246,250,0.92)",
                }}
              >
                <EditableText path="attribution" value={attribution ?? ""}>{attribution}</EditableText>
                {context ? (
                  <span style={{ color: "rgba(245,246,250,0.6)", marginLeft: "0.6em" }}>
                    — <EditableText path="context" value={context ?? ""}>{context}</EditableText>
                  </span>
                ) : null}
              </cite>
            </motion.div>
          ) : null}
        </div>

        {/* Bild-kolumn med figuren flush i hörnet */}
        <div
          style={{
            gridColumn: imageRight ? 2 : 1,
            gridRow: 1,
            position: "relative",
            minWidth: 0,
          }}
        >
          {image ? (
            <motion.img
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              src={image}
              alt={alt}
              style={{
                position: "absolute",
                bottom: 0,
                ...(imageRight ? { right: 0 } : { left: 0 }),
                maxHeight: "95vh",
                maxWidth: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
