"use client";

import type { Avsandarprofil } from "@/lib/avsandare";

/**
 * Avsändarens bård längst ned på sliderna (lib/avsandare.ts), byggd ur en kommuns
 * grafiska profil.
 *
 * Spelaren lägger den på alla slides när profilen är påslagen, utom de som
 * markerar sin rot med data-no-avsandar-footer.
 *
 * Layout (matchar bardlangsnedpaenslide-mönstret):
 * - Tunn chevron (pil ner) i övre vänstra delen
 * - Horisontell linje genom hela bredden
 * - Avsändarens adress till vänster
 * - Logotypen till höger (för ljus eller mörk bakgrund)
 *
 * Tonen väljs av spelaren; data-tone på bården visar vilken som gäller.
 */
export function AvsandarFooter({
  profil,
  tone = "auto",
  hidden = false,
}: {
  profil: Avsandarprofil;
  tone?: "auto" | "light" | "dark";
  hidden?: boolean;
}) {
  const isDark = tone === "dark";
  const lineColor = isDark ? "rgba(255, 255, 255, 0.85)" : "#333333";
  const textColor = isDark ? "#FFFFFF" : "#333333";
  const logoSrc = isDark ? profil.logga.mork : profil.logga.ljus;

  return (
    <div
      data-avsandar-footer
      data-tone={isDark ? "dark" : "light"}
      data-hidden={hidden ? "true" : "false"}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 30,
        padding: "0 3.5rem 1.75rem 3.5rem",
        fontFamily: profil.typsnitt,
        opacity: hidden ? 0 : 1,
        transition: "opacity 0.25s ease-out",
      }}
    >
      {/*
        Linje med öppen chevron — linjen bryts där V-formen börjar.
        Chevronens udd hamnar ungefär över adressens tredje bokstav på raden under.
      */}
      <div
        style={{
          position: "relative",
          marginBottom: "1rem",
          height: "13px",
        }}
      >
        {/* Vänster linjesegment (0 → chevron-vänster-kant) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "1px",
            background: lineColor,
            width: "calc(2.5rem + 0px)",
          }}
        />
        {/* Öppen chevron — bara två sneda streck (ingen topplinje) */}
        <svg
          width="22"
          height="13"
          viewBox="0 0 22 13"
          style={{
            position: "absolute",
            left: "2.5rem",
            top: 0,
            display: "block",
          }}
          aria-hidden="true"
        >
          <path
            d="M 0 0 L 11 13 L 22 0"
            stroke={lineColor}
            strokeWidth="1"
            fill="none"
          />
        </svg>
        {/* Höger linjesegment (chevron-höger-kant → 100%) */}
        <div
          style={{
            position: "absolute",
            left: "calc(2.5rem + 22px)",
            right: 0,
            top: 0,
            height: "1px",
            background: lineColor,
          }}
        />
      </div>

      {/* Adress + logotyp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            color: textColor,
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "0.01em",
          }}
        >
          {profil.webb}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt={profil.logga.alt}
          style={{
            height: "2.4rem",
            width: "auto",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}
