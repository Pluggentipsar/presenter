/**
 * `manus` är planeringslagret: hela decket som löpande dokument, där
 * `Utkast`-slides redigeras i flödet. Se `ManusWorkspace`.
 *
 * `oversikt` är den ljusa, täta vyn: en rad per slide, grupperad per akt, med
 * syftesraden synlig — den röda tråden på en sida. Se `OversiktWorkspace`.
 */
export type AuthoringMode = "storyboard" | "editor" | "manus" | "oversikt";

export type AuthoringSaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "conflict";
