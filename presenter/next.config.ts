import type { NextConfig } from "next";
import path from "path";

// Pinna workspace-roten till presenter/ (där `next build` startar).
// Annars detekterar Turbopack root-monorepots package-lock.json
// (skapad av Scalingos npm install) och letar deps i fel mapp.
// path.resolve(".") funkar i både CJS och ESM till skillnad från
// __dirname eller import.meta.url.
// En separat git-worktree kan återanvända node_modules via junction. Vid
// lokal verifiering får testroten då sättas till den gemensamma föräldern;
// normal dev, CI och deploy använder fortfarande presenter/ som tidigare.
const projectRoot = process.env.PRESENTER_TURBOPACK_ROOT
  ? path.resolve(process.env.PRESENTER_TURBOPACK_ROOT)
  : path.resolve(".");

// outputFileTracingRoot orsakar "path doubling" på `vercel build` med
// Turbopack i monorepo → manifestet hamnar fel och deployen kraschar
// (vercel/next.js#88579). På Vercel är Root Directory redan satt till
// presenter/, så pinningen behövs inte där — applicera den bara utanför
// Vercel (dvs för Scalingo och lokalt). Vercel sätter env VERCEL=1.
const isVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  // Delningsexporten (scripts/dela-export.mjs) bygger till en egen mapp så att
  // ett produktionsbygge aldrig rör den körande dev-serverns .next. Mönstret
  // presenter/.next-*/ är redan ignorerat i git. Utan variabeln: som vanligt.
  ...(process.env.PRESENTER_DIST_DIR ? { distDir: process.env.PRESENTER_DIST_DIR } : {}),
  // Den publika kopian ligger på en statisk värd utan /_next/image-tjänst.
  // next/image får då peka direkt på filen i public/. Bara i exportbygget.
  // Adresser med avslutande snedstreck (/slug/las/) motsvarar mappar med index.html,
  // vilket varje statisk värd kan servera. Bara i exportbygget.
  ...(process.env.PRESENTER_PUBLIC === "1" ? { images: { unoptimized: true }, trailingSlash: true } : {}),
  turbopack: {
    root: projectRoot,
  },
  ...(isVercel ? {} : { outputFileTracingRoot: projectRoot }),
  // Håll serverless-funktionerna under Vercels 250 MB-gräns. Next spårade
  // in HELA public/bilder/** (bildbanken från alla presentationer, ~250 MB
  // efter att .vercelignore strippat video/ljud) i [slug]-funktionen — men
  // funktionen läser aldrig bildfiler vid request; webbläsaren hämtar dem
  // som statiska assets från CDN. Exkludera public/** ur spårningen.
  // Ledande **/ krävs för att matcha oavsett om trace-roten är presenter/
  // eller repo-roten (Vercel sätter outputFileTracingRoot=/vercel/path0).
  // Nyckeln "*" matchas med contains:true → gäller alla routes.
  outputFileTracingExcludes: {
    "*": ["**/public/**"],
  },
  // Tillåt Next.js dev-resurser (_next/*) åt tunnel-värdnamn så
  // `npm run present` fungerar. Cloudflare quick tunnels får
  // slumpmässiga subdomäner under trycloudflare.com, ngrok liknande.
  // Lägg till egna named tunnel-domäner här vid behov.
  allowedDevOrigins: [
    // Codex visar den lokala presentationen via 127.0.0.1 även när
    // devservern startas med localhost. Tillåt båda lokala adresserna.
    "127.0.0.1",
    "localhost",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
    "172.20.*.*",
    "192.168.*.*",
  ],
  experimental: {
    // Default body-limit för Server Actions är 1 MB. Höjs så FloatingVideo-
    // uploads går igenom. Sanity-check, inte tekniskt krav — uppladdning
    // sker lokalt (Cloudflare-tunneln används bara för att visa, inte ladda
    // upp). Minnesförbrukningen är ~filstorlek under uppladdning.
    serverActions: {
      bodySizeLimit: "500mb",
    },
    // Appens snabba läge (electron/server.mjs) bygger om när koden ändrats.
    // Med byggcachen på disk går ett nytt bygge på en bråkdel av tiden. Bara
    // när appen ber om det — Vercel, Scalingo och delningsexporten bygger som förut.
    ...(process.env.PRESENTER_APP_BUILD === "1" ? { turbopackFileSystemCacheForBuild: true } : {}),
  },
  // Appens snabba läge typkontrollerar inte vid bygget: kontrollen tar tjugo av
  // ett ombyggets tjugofem sekunder, och koden typkontrolleras redan där den
  // skrivs (npx tsc). Ett bygge som inte går att kompilera stoppas ändå.
  ...(process.env.PRESENTER_APP_BUILD === "1" ? { typescript: { ignoreBuildErrors: true } } : {}),
};

export default nextConfig;
