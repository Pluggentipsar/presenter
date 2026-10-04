import "server-only";

import { createHash } from "crypto";

/**
 * Innehållsrevision för en presentationsfil.
 *
 * Revisionen följer den serialiserade MDX-filen, inte filens mtime. Det gör
 * konfliktskyddet stabilt även när editor, git eller ett annat verktyg råkar
 * röra filens metadata utan att ändra innehållet.
 */
export function createDeckRevision(source: string): string {
  return createHash("sha256").update(source, "utf8").digest("hex").slice(0, 24);
}
