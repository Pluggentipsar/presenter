import type { SchemaFamily } from "./schema-familj";
import { stageFormsSchemaFamily } from "@/templates/stage/schema";
import { lectureSchemaFamily } from "@/templates/lecture/schema";

/**
 * Mallfamiljerna som har sina scheman i sina egna mappar (3 oktober 2026). Ordningen räknas: den första
 * familj vars resolve känner igen en slide avgör, och en senare familj kan ersätta ett grundschema
 * (Stage-motorns filmscener ersätter formernas grundschema). Den publika exporten skriver om listan.
 */
export const schemaFamilies: SchemaFamily[] = [
  stageFormsSchemaFamily,
  lectureSchemaFamily,
];
