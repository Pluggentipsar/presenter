/**
 * Ägaren av den här installationen av Presenter. Fyll i dina egna uppgifter; tomma fält visas inte.
 * - namn, bio och lankar: presentationen av föreläsaren på delningssidan
 * - webbplats: länken i delningssidans sidhuvud, och exemplet i mallarnas adressfält
 * - namn: också standardförfattaren i nya deck och i PPTX-exporten
 * - kontakt: raderna i en ny TackSlide, "plattform · text" (linkedin, instagram, gmail, spotify, web)
 * - standardtema: förvalt tema för nya deck
 * - appTitel och appBeskrivning: appens sidtitel och beskrivning
 * - publikAdress: där appen ligger publikt, om den gör det. Delningsexporten skriver om appens
 *   sidlänkar dit (miljövariabeln PRESENTER_PUBLIC_ORIGIN går före).
 */
export const AGARE = {
  namn: "",
  bio: "",
  lankar: [] as { label: string; href: string }[],
  webbplats: null as { label: string; href: string } | null,
  kontakt: ["linkedin · Ditt namn", "web · example.com"],
  standardtema: "glas",
  appTitel: "Presenter",
  appBeskrivning: "Ett presentationsverktyg för föreläsningar",
  publikAdress: "",
};
