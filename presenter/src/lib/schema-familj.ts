import type { TemplateSchema } from "./template-schemas";

/**
 * En familj av mallar som har sina scheman i sin egen mapp (3 oktober 2026). Schemaregistret
 * (template-schemas.ts) läser familjerna ur en enda lista, template-schemas-familjer.ts, i stället för
 * att importera varje föreläsnings scenregister. Den publika exporten skriver om den listan, så att
 * bara de familjer som följer med registreras.
 */
export interface SchemaFamily {
  /** Mallarnas grundscheman: fälten som gäller alla scener i mallen. */
  schemas: Record<string, TemplateSchema>;
  /**
   * Schemat för en viss slide när fälten beror på scenen, formen eller layouten. `null` betyder att
   * familjen inte känner igen sliden; då prövas nästa familj och sist grundschemat.
   */
  resolve?: (tag: string, props: Record<string, unknown>) => { schema: TemplateSchema; isFallback: false } | null;
}
