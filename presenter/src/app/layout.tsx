import type { Metadata } from "next";
import { AGARE } from "@/lib/agare";
import {
  Inter,
  Fraunces,
  Instrument_Serif,
  Playfair_Display,
  Space_Grotesk,
  Manrope,
  JetBrains_Mono,
  Open_Sans,
  Bungee,
  Bagel_Fat_One,
  Bricolage_Grotesque,
  Source_Serif_4,
  Archivo,
  IBM_Plex_Mono,
  Familjen_Grotesk,
  Newsreader,
  Caveat,
  Noto_Sans_Syriac,
  Noto_Naskh_Arabic,
  Atkinson_Hyperlegible,
  Overpass,
  Overpass_Mono,
  Doto,
  Schibsted_Grotesk,
  Barlow,
  Barlow_Semi_Condensed,
  Mulish,
} from "next/font/google";
import "./globals.css";

/* joelsai-temat: sajtens fyra röster. Archivo laddas MED breddaxeln —
   utan `axes: ["wdth"]` ignoreras `font-stretch: 76%` tyst och tavlan
   blir bred i stället för kondenserad. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const familjenGrotesk = Familjen_Grotesk({
  variable: "--font-familjen-grotesk",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

/* Markord i rummets skrifter (2026-09-03): syrisk
   skrift för assyriska, naskh för arabiska/persiska/sorani. Kurmanji är
   latin och går på Archivo. Läses av SlideMark via markLang. */
const notoSyriac = Noto_Sans_Syriac({
  variable: "--font-noto-syriac",
  subsets: ["syriac"],
  weight: ["400", "700", "900"],
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

const bagelFatOne = Bagel_Fat_One({
  variable: "--font-bagel-fat-one",
  subsets: ["latin"],
  weight: "400",
});

const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage-grotesque",
  subsets: ["latin"],
});

/* rost: brödtext och undertexter i ett typsnitt gjort för läsbarhet. */
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
});
/* protokoll: berättelsens röst. Kursiven laddas uttryckligen, annars
   syntetiserar webbläsaren en sned normalvikt; opsz ger rätt snitt i stora
   citat. */
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

/* linjen: skyltarnas grotesk (Overpass bygger på vägskyltarnas Highway
   Gothic), mono för tider och etiketter, och prickmatris för hållplatsskyltarna.
   Doto laddas med rundningsaxeln så att prickarna blir runda. */
const overpass = Overpass({
  variable: "--font-overpass",
  subsets: ["latin"],
});
const overpassMono = Overpass_Mono({
  variable: "--font-overpass-mono",
  subsets: ["latin"],
});
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  axes: ["ROND"],
});
/* Ett formprov (1 oktober 2026): verkstadsgrotesken i Smedjan och
   Mulish i Tonplattor. Barlow finns bara i fasta
   vikter, så de som används laddas uttryckligen. */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow-semi-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});
const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
});

/* tiopotenser: Schibsted Grotesk (Bakken & Bæck för Schibsted) bär
   både rubrik och läsning, variabel 400–900 så att scenernas 800 blir ett
   riktigt snitt. Kursiven laddas uttryckligen. */
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: AGARE.appTitel,
  description: AGARE.appBeskrivning,
  // Skalet känner igen sin server på ordet Presenter i sidan (electron/server.mjs), vad titeln än är.
  generator: "Presenter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sv"
      className={`${inter.variable} ${fraunces.variable} ${instrumentSerif.variable} ${playfair.variable} ${spaceGrotesk.variable} ${manrope.variable} ${jetbrainsMono.variable} ${openSans.variable} ${bungee.variable} ${bagelFatOne.variable} ${bricolageGrotesque.variable} ${sourceSerif4.variable} ${newsreader.variable} ${archivo.variable} ${ibmPlexMono.variable} ${familjenGrotesk.variable} ${caveat.variable} ${notoSyriac.variable} ${notoNaskh.variable} ${atkinson.variable} ${overpass.variable} ${overpassMono.variable} ${doto.variable} ${schibsted.variable} ${barlow.variable} ${barlowSemiCondensed.variable} ${mulish.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
